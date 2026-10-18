/* eslint-disable no-console */
/**
 * Opt-in demo seed for a doctoral dashboard (~52% work progress).
 * Usage from repo root: npm run db:seed:demo
 *
 * DEMO_STUDENT_EMAIL (default demo.doctorant@example.test)
 * DEMO_SUPERVISOR_EMAIL (default demo.encadrant@example.test)
 * DEMO_PASSWORD (default ThesisPartner2026!)
 */
import { Algorithm, hash } from '@node-rs/argon2';
import {
  PrismaClient,
  type DeliverableStatus,
  type RemarkPriority,
  type RemarkStatus,
} from '@prisma/client';
import { STANDARD_OBJECTIVES } from '../src/objectives/standard-path.catalog';

const STUDENT_EMAIL = (
  process.env.DEMO_STUDENT_EMAIL ?? 'demo.doctorant@example.test'
).toLowerCase();
const SUPERVISOR_EMAIL = (
  process.env.DEMO_SUPERVISOR_EMAIL ?? 'demo.encadrant@example.test'
).toLowerCase();
const PASSWORD = process.env.DEMO_PASSWORD ?? 'ThesisPartner2026!';

const ARGON2 = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Tasks marked DONE per template; ANALYSE=1 → overall workProgress ≈ 52%. */
const DONE_BY_CODE: Record<string, number> = {
  PROBLEMATIQUE: 99,
  ETAT_ART: 99,
  METHODOLOGIE: 99,
  EXPERIMENTATION: 99,
  ANALYSE: 1,
  PUBLICATION: 0,
  REDACTION: 0,
  SOUTENANCE: 0,
};

const prisma = new PrismaClient();

function dateUTC(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

async function ensureTemplates() {
  const parked = await prisma.objectiveTemplate.findMany({ select: { id: true, position: true } });
  for (const row of parked) {
    await prisma.objectiveTemplate.update({
      where: { id: row.id },
      data: { position: row.position + 1000 },
    });
  }
  for (const [index, item] of STANDARD_OBJECTIVES.entries()) {
    const position = index + 1;
    const template = await prisma.objectiveTemplate.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        position,
        title: item.title,
        description: item.description,
      },
      update: {
        position,
        title: item.title,
        description: item.description,
      },
    });
    await prisma.taskTemplate.deleteMany({ where: { templateId: template.id } });
    if (item.tasks.length > 0) {
      await prisma.taskTemplate.createMany({
        data: item.tasks.map((task, taskIndex) => ({
          templateId: template.id,
          position: taskIndex + 1,
          title: task.title,
          description: task.description ?? null,
        })),
      });
    }
  }
}

async function upsertUser(input: {
  email: string;
  givenName: string;
  familyName: string;
  profile: {
    institution?: string;
    laboratory?: string;
    doctoralSchool?: string;
    specialty?: string;
    academicTitle?: string;
    city?: string;
    country?: string;
    orcid?: string;
    googleScholarUrl?: string;
  };
}) {
  const passwordHash = await hash(PASSWORD, ARGON2);
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
        profile: {
          update: {
            givenName: input.givenName,
            familyName: input.familyName,
            displayName: `${input.givenName} ${input.familyName}`,
            ...input.profile,
          },
        },
      },
    });
    return existing.id;
  }
  const created = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          givenName: input.givenName,
          familyName: input.familyName,
          displayName: `${input.givenName} ${input.familyName}`,
          ...input.profile,
        },
      },
    },
  });
  return created.id;
}

async function applyStandardPath(thesisId: string, actorId: string, studentId: string) {
  const templates = await prisma.objectiveTemplate.findMany({
    orderBy: { position: 'asc' },
    include: { tasks: { orderBy: { position: 'asc' } } },
  });
  const existing = await prisma.objective.findMany({
    where: { thesisId, templateCode: { not: null } },
    select: { templateCode: true },
  });
  const present = new Set(existing.map((row) => row.templateCode));
  for (const template of templates) {
    if (present.has(template.code)) continue;
    const objective = await prisma.objective.create({
      data: {
        thesisId,
        title: template.title,
        description: template.description,
        status: template.position === 1 ? 'IN_PROGRESS' : 'PLANNED',
        priority: 'MEDIUM',
        progress: 0,
        manualProgress: 0,
        origin: 'STANDARD_TEMPLATE',
        templateCode: template.code,
        createdById: actorId,
        responsibleUserId: studentId,
      },
    });
    if (template.tasks.length > 0) {
      await prisma.task.createMany({
        data: template.tasks.map((task) => ({
          objectiveId: objective.id,
          title: task.title,
          description: task.description,
          status: 'TODO' as const,
          position: task.position,
          origin: 'STANDARD_TEMPLATE' as const,
          createdById: actorId,
        })),
      });
    }
  }
}

function measureProgress(tasks: { status: string }[]) {
  const active = tasks.filter((task) => task.status !== 'CANCELLED');
  if (active.length === 0) return 0;
  const done = active.filter((task) => task.status === 'DONE').length;
  return Math.round((done / active.length) * 100);
}

function dueForCode(code: string | null) {
  const map: Record<string, Date> = {
    PROBLEMATIQUE: dateUTC(2025, 6, 30),
    ETAT_ART: dateUTC(2025, 12, 15),
    METHODOLOGIE: dateUTC(2026, 3, 20),
    EXPERIMENTATION: dateUTC(2026, 9, 20),
    ANALYSE: dateUTC(2026, 12, 1),
    PUBLICATION: dateUTC(2027, 4, 1),
    REDACTION: dateUTC(2027, 9, 1),
    SOUTENANCE: dateUTC(2027, 12, 15),
  };
  return code ? (map[code] ?? null) : null;
}

function startForCode(code: string | null) {
  const map: Record<string, Date> = {
    PROBLEMATIQUE: dateUTC(2024, 10, 1),
    ETAT_ART: dateUTC(2025, 1, 15),
    METHODOLOGIE: dateUTC(2025, 7, 1),
    EXPERIMENTATION: dateUTC(2026, 1, 10),
    ANALYSE: dateUTC(2026, 10, 1),
  };
  return code ? (map[code] ?? null) : null;
}

async function enrichProgress(thesisId: string) {
  const objectives = await prisma.objective.findMany({
    where: { thesisId },
    include: { tasks: { orderBy: { position: 'asc' } } },
  });
  const now = new Date();
  for (const objective of objectives) {
    const want = DONE_BY_CODE[objective.templateCode ?? ''] ?? 0;
    for (const [index, task] of objective.tasks.entries()) {
      const done = index < want;
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: done ? 'DONE' : index === want ? 'IN_PROGRESS' : 'TODO',
          completedAt: done ? now : null,
        },
      });
    }
    const refreshed = await prisma.task.findMany({ where: { objectiveId: objective.id } });
    const progress = measureProgress(refreshed);
    const allDone = refreshed.length > 0 && refreshed.every((task) => task.status === 'DONE');
    await prisma.objective.update({
      where: { id: objective.id },
      data: {
        progress,
        status: allDone ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'PLANNED',
        completedAt: allDone ? now : null,
        reviewStatus: allDone ? 'APPROVED' : 'NOT_REQUESTED',
        validatedAt: allDone ? now : null,
        dueDate: dueForCode(objective.templateCode),
        startDate: startForCode(objective.templateCode),
      },
    });
  }
}

async function seedDeliverablesAndRemarks(
  thesisId: string,
  studentId: string,
  supervisorId: string,
) {
  await prisma.remarkReply.deleteMany({ where: { remark: { thesisId } } });
  await prisma.remark.deleteMany({ where: { thesisId } });
  await prisma.deliverable.deleteMany({ where: { thesisId } });

  const byCode = Object.fromEntries(
    (
      await prisma.objective.findMany({
        where: { thesisId, templateCode: { not: null } },
        select: { id: true, templateCode: true },
      })
    ).map((row) => [row.templateCode!, row.id]),
  );

  type SeedDeliverable = {
    title: string;
    type: 'THESIS_CHAPTER' | 'PRESENTATION' | 'REPORT' | 'DATASET' | 'ARTICLE';
    status: DeliverableStatus;
    objectiveId?: string;
    dueDate: Date;
    description: string;
    versionSummary: string;
    submitted?: boolean;
    reviewed?: boolean;
    reviewMessage?: string;
  };

  const deliverables: SeedDeliverable[] = [
    {
      title: 'Chapitre 2 — État de l’art',
      type: 'THESIS_CHAPTER',
      status: 'DRAFT',
      objectiveId: byCode.ETAT_ART,
      dueDate: dateUTC(2026, 10, 5),
      description: 'Synthèse des approches de détection d’anomalies sur réseaux électriques.',
      versionSummary: 'Structure initiale du chapitre',
    },
    {
      title: 'Présentation de mi-parcours',
      type: 'PRESENTATION',
      status: 'VALIDATED',
      objectiveId: byCode.ETAT_ART,
      dueDate: dateUTC(2026, 9, 10),
      description: 'Slides présentés au comité de suivi.',
      versionSummary: 'Version présentée',
      reviewed: true,
      submitted: true,
    },
    {
      title: 'Protocole expérimental',
      type: 'REPORT',
      status: 'SUBMITTED',
      objectiveId: byCode.METHODOLOGIE,
      dueDate: dateUTC(2026, 3, 15),
      description: 'Protocole, jeux de données et métriques prévues.',
      versionSummary: 'Soumission pour revue',
      submitted: true,
    },
    {
      title: 'Jeu de données annoté (échantillon)',
      type: 'DATASET',
      status: 'CHANGES_REQUESTED',
      objectiveId: byCode.EXPERIMENTATION,
      dueDate: dateUTC(2026, 8, 1),
      description: 'Échantillon pour validation de la méthode.',
      versionSummary: 'Premier dépôt',
      reviewMessage: 'Préciser la licence et le schéma des labels.',
      reviewed: true,
      submitted: true,
    },
    {
      title: 'Article — draft méthode',
      type: 'ARTICLE',
      status: 'DRAFT',
      objectiveId: byCode.PUBLICATION,
      dueDate: dateUTC(2027, 2, 1),
      description: 'Brouillon pour une revue spécialisée.',
      versionSummary: 'Outline + introduction',
    },
  ];

  const created: { id: string; versionId: string; correctionVersionId?: string }[] = [];
  for (const item of deliverables) {
    const deliverable = await prisma.deliverable.create({
      data: {
        thesisId,
        title: item.title,
        description: item.description,
        type: item.type,
        status: item.status,
        objectiveId: item.objectiveId ?? null,
        dueDate: item.dueDate,
        createdById: studentId,
        submittedAt: item.submitted ? dateUTC(2026, 9, 1) : null,
        reviewedAt: item.reviewed ? dateUTC(2026, 9, 12) : null,
        reviewedById: item.reviewed ? supervisorId : null,
        reviewMessage: item.reviewMessage ?? null,
      },
    });
    const version = await prisma.deliverableVersion.create({
      data: {
        deliverableId: deliverable.id,
        versionNumber: 1,
        changeSummary: item.versionSummary,
        createdById: studentId,
      },
    });
    const correction =
      item.type === 'DATASET'
        ? await prisma.deliverableVersion.create({
            data: {
              deliverableId: deliverable.id,
              versionNumber: 2,
              changeSummary: 'Schéma des labels et licence ajoutés',
              createdById: studentId,
            },
          })
        : null;
    created.push({
      id: deliverable.id,
      versionId: version.id,
      correctionVersionId: correction?.id,
    });
  }

  const compareTask = byCode.ETAT_ART
    ? await prisma.task.findFirst({
        where: { objectiveId: byCode.ETAT_ART, title: 'Comparer les approches' },
        select: { id: true },
      })
    : null;

  type SeedReply = { author: 'student' | 'supervisor'; message: string };
  type SeedRemark = {
    title: string;
    message: string;
    status: RemarkStatus;
    priority: RemarkPriority;
    objectiveId?: string;
    taskId?: string;
    deliverableId?: string;
    deliverableVersionId?: string;
    correctionVersionId?: string;
    location?: string;
    resolvedAt?: Date;
    closedAt?: Date;
    replies?: SeedReply[];
  };

  const chapter = created[0];
  const slides = created[1];
  const protocol = created[2];
  const dataset = created[3];
  const article = created[4];

  const remarks: SeedRemark[] = [
    {
      title: 'Compléter la comparaison des baselines',
      message: 'Ajouter au moins deux baselines récentes (2023–2025) dans le chapitre 2.',
      status: 'OPEN',
      priority: 'HIGH',
      objectiveId: byCode.ETAT_ART,
      deliverableId: chapter?.id,
      deliverableVersionId: chapter?.versionId,
      location: 'Section 2.3',
    },
    {
      title: 'Documenter la licence du jeu de données',
      message:
        'Le README doit indiquer la licence, la source des traces et le schéma des labels avant toute réutilisation.',
      status: 'OPEN',
      priority: 'MEDIUM',
      objectiveId: byCode.EXPERIMENTATION,
      deliverableId: dataset?.id,
      deliverableVersionId: dataset?.versionId,
      location: 'README',
    },
    {
      title: 'Cadrer le calendrier de rédaction',
      message:
        'Proposez un calendrier chapitre par chapitre jusqu’à la soutenance, avec une date de relecture pour chacun.',
      status: 'OPEN',
      priority: 'LOW',
      objectiveId: byCode.REDACTION,
      location: 'Plan de thèse',
    },
    {
      title: 'Ajuster le protocole de validation croisée',
      message: 'Préciser le découpage temporel des folds pour éviter la fuite d’information.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      objectiveId: byCode.METHODOLOGIE,
      deliverableId: protocol?.id,
      deliverableVersionId: protocol?.versionId,
      location: 'Section 3.2',
      replies: [
        {
          author: 'student',
          message: 'Je prépare une figure du découpage temporel et une note méthodologique.',
        },
      ],
    },
    {
      title: 'Préciser la figure d’architecture',
      message:
        'La figure 1 du draft doit distinguer l’encodeur, le score d’anomalie et le seuil de décision.',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      objectiveId: byCode.PUBLICATION,
      taskId: compareTask?.id,
      deliverableId: article?.id,
      deliverableVersionId: article?.versionId,
      location: 'Figure 1',
      replies: [
        {
          author: 'student',
          message: 'Nouvelle version de la figure envoyée dans le draft, avec la légende.',
        },
        {
          author: 'supervisor',
          message:
            'La légende est claire. Ajoutez encore le jeu de données utilisé pour l’exemple.',
        },
      ],
    },
    {
      title: 'Clarifier la question de recherche',
      message:
        'La problématique est solide, mais la question principale doit être formulée de façon plus opérationnelle.',
      status: 'RESOLVED',
      priority: 'HIGH',
      objectiveId: byCode.PROBLEMATIQUE,
      location: 'Introduction',
      resolvedAt: dateUTC(2025, 5, 10),
      replies: [
        {
          author: 'student',
          message: 'Question reformulée autour de la détection précoce sur séries temporelles.',
        },
        {
          author: 'supervisor',
          message: 'Formulation acceptée en réunion du 10 mai. À reporter dans l’introduction.',
        },
      ],
    },
    {
      title: 'Corriger le schéma des labels',
      message: 'La version 1 ne distingue pas les anomalies rares des coupures planifiées.',
      status: 'RESOLVED',
      priority: 'MEDIUM',
      objectiveId: byCode.EXPERIMENTATION,
      deliverableId: dataset?.id,
      deliverableVersionId: dataset?.versionId,
      correctionVersionId: dataset?.correctionVersionId,
      location: 'Schéma des labels',
      resolvedAt: dateUTC(2026, 9, 18),
      replies: [
        {
          author: 'student',
          message: 'Version 2 déposée : labels séparés et licence indiquée dans le README.',
        },
      ],
    },
    {
      title: 'Alléger les slides de mi-parcours',
      message:
        'La présentation était claire. Gardez une slide de méthode et une slide de résultats.',
      status: 'CLOSED',
      priority: 'LOW',
      objectiveId: byCode.ETAT_ART,
      deliverableId: slides?.id,
      deliverableVersionId: slides?.versionId,
      location: 'Slides 4–6',
      closedAt: dateUTC(2026, 9, 12),
      replies: [
        {
          author: 'student',
          message:
            'Slides réduites à 12. La méthode et les premiers résultats tiennent chacun sur une slide.',
        },
        {
          author: 'supervisor',
          message: 'Version retenue pour le comité. Remarque fermée.',
        },
      ],
    },
    {
      title: 'Bien joué pour la mi-parcours',
      message: 'Le comité a suivi le propos. Poursuivre sur le protocole expérimental.',
      status: 'CLOSED',
      priority: 'LOW',
      objectiveId: byCode.ETAT_ART,
      deliverableId: slides?.id,
      closedAt: dateUTC(2026, 9, 20),
    },
  ];

  for (const item of remarks) {
    const remark = await prisma.remark.create({
      data: {
        thesisId,
        authorId: supervisorId,
        title: item.title,
        message: item.message,
        status: item.status,
        priority: item.priority,
        objectiveId: item.objectiveId ?? null,
        taskId: item.taskId ?? null,
        deliverableId: item.deliverableId ?? null,
        deliverableVersionId: item.deliverableVersionId ?? null,
        correctionVersionId: item.correctionVersionId ?? null,
        location: item.location ?? null,
        resolvedAt: item.resolvedAt ?? null,
        closedAt: item.closedAt ?? null,
      },
    });
    for (const reply of item.replies ?? []) {
      await prisma.remarkReply.create({
        data: {
          remarkId: remark.id,
          authorId: reply.author === 'student' ? studentId : supervisorId,
          message: reply.message,
        },
      });
    }
  }
}

async function main() {
  console.log('Seeding demo doctoral dashboard…');
  await ensureTemplates();

  const studentId = await upsertUser({
    email: STUDENT_EMAIL,
    givenName: 'Youssef',
    familyName: 'El Amrani',
    profile: {
      institution: 'Université Mohammed V de Rabat',
      laboratory: 'LRIT — Laboratoire de Recherche en Informatique et Télécommunications',
      doctoralSchool: 'Sciences et Techniques',
      specialty: 'Intelligence artificielle',
      academicTitle: 'Doctorant',
      city: 'Rabat',
      country: 'Maroc',
      orcid: '0000-0002-1825-0097',
      googleScholarUrl: 'https://scholar.google.com/',
    },
  });

  const supervisorId = await upsertUser({
    email: SUPERVISOR_EMAIL,
    givenName: 'Karim',
    familyName: 'El Mansouri',
    profile: {
      institution: 'Université Mohammed V de Rabat',
      laboratory: 'LRIT',
      academicTitle: 'Professeur',
      specialty: 'Apprentissage automatique',
      city: 'Rabat',
      country: 'Maroc',
    },
  });

  const membership = await prisma.thesisMembership.findFirst({
    where: { userId: studentId, role: 'DOCTORAL_STUDENT' },
    orderBy: { createdAt: 'asc' },
  });

  let thesisId = membership?.thesisId;
  if (!thesisId) {
    const thesis = await prisma.thesis.create({
      data: {
        title:
          'Apprentissage profond pour la détection d’anomalies dans les réseaux électriques intelligents',
        status: 'ACTIVE',
        discipline: 'Informatique',
        institution: 'Université Mohammed V de Rabat',
        startedOn: dateUTC(2024, 10, 1),
        expectedDefenseOn: dateUTC(2027, 12, 15),
        memberships: {
          create: [
            { userId: studentId, role: 'DOCTORAL_STUDENT' },
            { userId: supervisorId, role: 'SUPERVISOR' },
          ],
        },
      },
    });
    thesisId = thesis.id;
  } else {
    await prisma.thesis.update({
      where: { id: thesisId },
      data: {
        title:
          'Apprentissage profond pour la détection d’anomalies dans les réseaux électriques intelligents',
        status: 'ACTIVE',
        discipline: 'Informatique',
        institution: 'Université Mohammed V de Rabat',
        startedOn: dateUTC(2024, 10, 1),
        expectedDefenseOn: dateUTC(2027, 12, 15),
      },
    });
    const supervisor = await prisma.thesisMembership.findFirst({
      where: { thesisId, role: 'SUPERVISOR' },
    });
    if (!supervisor) {
      await prisma.thesisMembership.create({
        data: { thesisId, userId: supervisorId, role: 'SUPERVISOR' },
      });
    } else if (supervisor.userId !== supervisorId) {
      await prisma.thesisMembership.update({
        where: { id: supervisor.id },
        data: { userId: supervisorId },
      });
    }
  }

  await applyStandardPath(thesisId, studentId, studentId);
  await enrichProgress(thesisId);
  await seedDeliverablesAndRemarks(thesisId, studentId, supervisorId);

  const objectives = await prisma.objective.findMany({
    where: { thesisId, status: { not: 'CANCELLED' } },
    select: { progress: true },
  });
  const avg =
    objectives.length === 0
      ? 0
      : Math.round(objectives.reduce((sum, row) => sum + row.progress, 0) / objectives.length);
  const deliverableCount = await prisma.deliverable.count({ where: { thesisId } });
  const remarkCount = await prisma.remark.count({ where: { thesisId } });

  console.log('');
  console.log('Demo ready');
  console.log(`  Student      ${STUDENT_EMAIL}`);
  console.log(`  Supervisor   ${SUPERVISOR_EMAIL}`);
  console.log(`  Password     ${PASSWORD}`);
  console.log(`  Thesis       ${thesisId}`);
  console.log(`  Progress     ~${avg}%  (${objectives.length} objectives)`);
  console.log(`  Deliverables ${deliverableCount}`);
  console.log(`  Remarks      ${remarkCount}`);
  console.log('');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
