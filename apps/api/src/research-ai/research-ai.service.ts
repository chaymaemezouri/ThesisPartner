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
    await this.access.assertCanAccess({
      actorId,
      thesisId,
      allowedRoles: GENERATE_ROLES,
    });
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
            description: true,
            templateCode: true,
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
        description: objective.description,
        templateCode: objective.templateCode,
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
        ? 'Tu rédiges trois sections d’article scientifique, impersonnelles, au présent de l’indicatif: 1) Problématique 2) Résumé du sujet 3) État de l’art. Interdits: nom du doctorant, dossier, avancement, pourcentages, tâches, listes, ton administratif. Écris sur l’objet de recherche, comme dans une revue académique. JSON uniquement: {"reportTitle": string, "overview": string, "sections": [{"id":"problem","kind":"PROBLEM","title":"Problématique","summary":string,"status":null},{"id":"subject","kind":"SUBJECT_SUMMARY","title":"Résumé du sujet","summary":string,"status":null},{"id":"state-of-art","kind":"STATE_OF_ART","title":"État de l’art","summary":string,"status":null}]}.'
        : 'Write three impersonal scientific-article sections in the present tense: 1) Research problem 2) Subject summary 3) State of the art. Forbidden: doctoral student’s name, dossier, progress, percentages, tasks, lists, administrative tone. Write about the research object, as in an academic journal. JSON only: {"reportTitle": string, "overview": string, "sections": [{"id":"problem","kind":"PROBLEM","title":"Research problem","summary":string,"status":null},{"id":"subject","kind":"SUBJECT_SUMMARY","title":"Subject summary","summary":string,"status":null},{"id":"state-of-art","kind":"STATE_OF_ART","title":"State of the art","summary":string,"status":null}]}.';

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
    const parsed = JSON.parse(raw) as {
      overview?: unknown;
      reportTitle?: unknown;
      sections?: unknown;
    };
    const fallback = composeRulesSynthesis(ctx, locale);
    const reportTitle = String(parsed.reportTitle ?? fallback.reportTitle)
      .trim()
      .slice(0, 300);
    const sections = Array.isArray(parsed.sections)
      ? parsed.sections.reduce<typeof fallback.sections>((acc, item) => {
          if (!item || typeof item !== 'object') return acc;
          const row = item as { id?: unknown; kind?: unknown; title?: unknown; summary?: unknown };
          const kind = fallback.sections.find((section) => section.kind === row.kind);
          if (!kind || typeof row.summary !== 'string' || row.summary.trim().length === 0) {
            return acc;
          }
          acc.push({
            ...kind,
            title: String(row.title ?? kind.title).slice(0, 300),
            summary: row.summary.trim().slice(0, 4000),
          });
          return acc;
        }, [])
      : [];

    return {
      thesisId,
      thesisTitle: ctx.thesisTitle,
      reportTitle: reportTitle.length > 0 ? reportTitle : fallback.reportTitle,
      generatedAt: new Date().toISOString(),
      source: 'OPENAI',
      locale,
      overview: String(parsed.overview ?? fallback.overview).slice(0, 16_000),
      sections:
        sections.length === 3 && new Set(sections.map((item) => item.kind)).size === 3
          ? fallback.sections.map(
              (item) => sections.find((section) => section.kind === item.kind) ?? item,
            )
          : fallback.sections,
    };
  }
}
