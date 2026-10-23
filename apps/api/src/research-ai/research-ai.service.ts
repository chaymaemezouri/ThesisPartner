import { Inject, Injectable } from '@nestjs/common';
import type { researchAiLocaleSchema, researchAiSynthesisSchema } from '@thesispartner/validation';
import type { z } from 'zod';
import { AppException } from '../common/errors/app.exception';
import { ThesisAccessService } from '../common/thesis-access/thesis-access.service';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  composeRulesSynthesis,
  contextPrompt,
  type SynthesisContext,
  type SynthesisLocale,
} from './compose-synthesis';

const GENERATE_ROLES = ['DOCTORAL_STUDENT'] as const;

type Locale = z.infer<typeof researchAiLocaleSchema>;
type Synthesis = z.infer<typeof researchAiSynthesisSchema>;

@Injectable()
export class ResearchAiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ThesisAccessService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async generate(actorId: string, thesisId: string, locale: Locale): Promise<Synthesis> {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: GENERATE_ROLES });
    const ctx = await this.loadContext(thesisId);
    if (!ctx) throw new AppException(404, 'NOT_FOUND', 'Thesis not found');

    if (this.env.OPENAI_API_KEY) {
      try {
        const openai = await this.generateWithOpenAi(ctx, locale, thesisId);
        if (openai) return openai;
      } catch {
        // Fall back to rules-based synthesis when the model call fails.
      }
    }

    const composed = composeRulesSynthesis(ctx, locale);
    return {
      thesisId,
      thesisTitle: ctx.thesisTitle,
      reportTitle: composed.reportTitle,
      generatedAt: new Date().toISOString(),
      source: 'RULES',
      locale,
      overview: composed.overview,
      sections: composed.sections,
    };
  }

  private async loadContext(thesisId: string): Promise<SynthesisContext | null> {
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: thesisId },
      select: {
        id: true,
        title: true,
        memberships: {
          where: { role: 'DOCTORAL_STUDENT' },
          take: 1,
          select: {
            user: { select: { profile: { select: { givenName: true, familyName: true } } } },
          },
        },
        objectives: {
          orderBy: { createdAt: 'asc' },
          take: 40,
          select: {
            id: true,
            title: true,
            status: true,
            progress: true,
            reviewMessage: true,
            tasks: {
              orderBy: { position: 'asc' },
              take: 40,
              select: { id: true, title: true, status: true },
            },
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          take: 40,
          select: {
            id: true,
            title: true,
            kind: true,
            study: {
              select: {
                status: true,
                summary: true,
                reviewMessage: true,
              },
            },
          },
        },
        remarks: {
          orderBy: { updatedAt: 'desc' },
          take: 40,
          select: {
            id: true,
            title: true,
            status: true,
            message: true,
            replies: {
              orderBy: { createdAt: 'asc' },
              take: 5,
              select: { message: true },
            },
          },
        },
        deliverables: {
          orderBy: { updatedAt: 'desc' },
          take: 40,
          select: {
            id: true,
            title: true,
            status: true,
            reviewMessage: true,
          },
        },
      },
    });
    if (!thesis) return null;

    const student = thesis.memberships[0]?.user.profile;
    const studentName = student ? `${student.givenName} ${student.familyName}`.trim() : null;

    return {
      thesisTitle: thesis.title,
      studentName,
      objectives: thesis.objectives.map((objective) => ({
        id: objective.id,
        title: objective.title,
        status: objective.status,
        progress: objective.progress,
        reviewMessage: objective.reviewMessage,
        tasks: objective.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
        })),
      })),
      documents: thesis.documents.map((document) => ({
        id: document.id,
        title: document.title,
        kind: document.kind,
        status: document.study?.status ?? 'TO_READ',
        summary: document.study?.summary ?? null,
        reviewMessage: document.study?.reviewMessage ?? null,
      })),
      remarks: thesis.remarks.map((remark) => ({
        id: remark.id,
        title: remark.title,
        status: remark.status,
        message: remark.message,
        replies: remark.replies.map((reply) => reply.message),
      })),
      deliverables: thesis.deliverables.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        reviewMessage: item.reviewMessage,
      })),
    };
  }

  private async generateWithOpenAi(
    ctx: SynthesisContext,
    locale: SynthesisLocale,
    thesisId: string,
  ): Promise<Synthesis | null> {
    const key = this.env.OPENAI_API_KEY;
    if (!key) return null;

    const system =
      locale === 'fr'
        ? 'Tu es Research AI pour ThesisPartner. Rédige un texte académique homogène sur le SUJET de la thèse, comme un court article. Le dossier JSON (objectifs, étapes, synthèses documentaires, remarques, livrables) sert de matière, mais tu ne dois PAS détailler chaque objectif, chaque étape ou chaque livrable un par un. Interdits: inventaire, sous-titres, listes, puces, phrases du type « concernant l’objectif… ». Écris 4 à 6 paragraphes fluides qui parlent du sujet. Réponds uniquement en JSON valide: {"reportTitle": string, "overview": string, "sections": []}.'
        : 'You are Research AI for ThesisPartner. Write a homogeneous academic text about the thesis SUBJECT, like a short article. The dossier JSON (objectives, steps, document syntheses, remarks, deliverables) is source material, but you must NOT detail each objective, step or deliverable one by one. Forbidden: inventory style, subtitles, lists, bullets, sentences like “regarding the objective…”. Write 4 to 6 fluent paragraphs about the subject. Reply with valid JSON only: {"reportTitle": string, "overview": string, "sections": []}.';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.env.OPENAI_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: contextPrompt(ctx, locale) },
        ],
      }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { overview?: unknown; reportTitle?: unknown };
    const fallback = composeRulesSynthesis(ctx, locale);
    const reportTitle = String(parsed.reportTitle ?? fallback.reportTitle)
      .trim()
      .slice(0, 300);

    return {
      thesisId,
      thesisTitle: ctx.thesisTitle,
      reportTitle: reportTitle.length > 0 ? reportTitle : fallback.reportTitle,
      generatedAt: new Date().toISOString(),
      source: 'OPENAI',
      locale,
      overview: String(parsed.overview ?? fallback.overview).slice(0, 16_000),
      sections: [],
    };
  }
}
