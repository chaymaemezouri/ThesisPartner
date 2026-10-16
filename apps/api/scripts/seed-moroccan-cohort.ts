/* eslint-disable no-console */
/**
 * Adds ten Moroccan doctoral students supervised by demo.encadrant@example.test.
 * Idempotent: an email that already has a thesis with that supervisor is left as-is.
 *
 * Usage: node infrastructure/scripts/run-with-env.mjs npm exec -w @thesispartner/api -- tsx scripts/seed-moroccan-cohort.ts
 */
import { Algorithm, hash } from '@node-rs/argon2';
import { PrismaClient, type DeliverableStatus, type ObjectiveStatus } from '@prisma/client';

const SUPERVISOR_EMAIL = (
  process.env.DEMO_SUPERVISOR_EMAIL ?? 'demo.encadrant@example.test'
).toLowerCase();
const PASSWORD = process.env.DEMO_PASSWORD ?? 'ThesisPartner2026!';

const prisma = new PrismaClient();

function day(year: number, month: number, dayOfMonth: number) {
  return new Date(Date.UTC(year, month - 1, dayOfMonth));
}

type ObjectiveSeed = {
  title: string;
  status: ObjectiveStatus;
  progress: number;
  dueDate: Date;
};

type StudentSeed = {
  email: string;
  givenName: string;
  familyName: string;
  city: string;
  institution: string;
  laboratory: string;
  doctoralSchool: string;
  specialty: string;
  title: string;
  discipline: string;
  startedOn: Date;
  expectedDefenseOn: Date;
  objectives: ObjectiveSeed[];
  deliverables: { title: string; status: DeliverableStatus; dueDate: Date }[];
  meeting?: { title: string; scheduledOn: Date };
};

const STUDENTS: StudentSeed[] = [
  {
    email: 'amina.benjelloun@example.test',
    givenName: 'Amina',
    familyName: 'Benjelloun',
    city: 'Rabat',
    institution: 'Université Mohammed V de Rabat',
    laboratory: 'Laboratoire de recherche en informatique et télécommunications',
    doctoralSchool: 'École doctorale Sciences et Technologies',
    specialty: 'Intelligence artificielle médicale',
    title: 'Apprentissage profond pour le dépistage précoce du diabète au Maroc',
    discipline: 'Informatique',
    startedOn: day(2022, 10, 1),
    expectedDefenseOn: day(2026, 12, 15),
    objectives: [
      {
        title: 'Revue des modèles de dépistage',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2023, 6, 30),
      },
      {
        title: 'Constitution de la cohorte hospitalière',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2024, 3, 1),
      },
      {
        title: 'Protocole éthique et anonymisation',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2024, 9, 15),
      },
      {
        title: 'Entraînement du modèle multimodal',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2025, 6, 1),
      },
      {
        title: 'Validation clinique à Rabat',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2025, 12, 1),
      },
      {
        title: 'Article de méthode',
        status: 'IN_PROGRESS',
        progress: 60,
        dueDate: day(2026, 11, 20),
      },
      {
        title: 'Rédaction du manuscrit',
        status: 'PLANNED',
        progress: 0,
        dueDate: day(2026, 10, 1),
      },
      {
        title: 'Préparation de la soutenance',
        status: 'PLANNED',
        progress: 0,
        dueDate: day(2026, 12, 1),
      },
    ],
    deliverables: [
      { title: 'Article — dépistage multimodal', status: 'SUBMITTED', dueDate: day(2026, 11, 20) },
      { title: 'Chapitre clinique', status: 'VALIDATED', dueDate: day(2025, 12, 1) },
    ],
    meeting: { title: 'Relecture de l’article', scheduledOn: day(2026, 10, 22) },
  },
  {
    email: 'yassine.elfassi@example.test',
    givenName: 'Yassine',
    familyName: 'El Fassi',
    city: 'Fès',
    institution: 'Université Sidi Mohamed Ben Abdellah',
    laboratory: 'Laboratoire des énergies renouvelables',
    doctoralSchool: 'Centre d’études doctorales Sciences et Techniques',
    specialty: 'Génie énergétique',
    title: 'Prévision de la production solaire des toitures de la médina de Fès',
    discipline: 'Génie énergétique',
    startedOn: day(2023, 1, 15),
    expectedDefenseOn: day(2027, 6, 30),
    objectives: [
      {
        title: 'Cartographier les toitures',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2024, 1, 15),
      },
      {
        title: 'Collecte des mesures d’irradiance',
        status: 'IN_PROGRESS',
        progress: 35,
        dueDate: day(2026, 2, 1),
      },
      {
        title: 'Modèle de prévision horaire',
        status: 'PLANNED',
        progress: 0,
        dueDate: day(2026, 9, 1),
      },
      {
        title: 'Comparaison avec les données ONEE',
        status: 'PLANNED',
        progress: 0,
        dueDate: day(2027, 1, 15),
      },
      { title: 'Rédaction', status: 'PLANNED', progress: 0, dueDate: day(2027, 5, 1) },
      { title: 'Soutenance', status: 'PLANNED', progress: 0, dueDate: day(2027, 6, 20) },
    ],
    deliverables: [
      { title: 'Rapport de mesures — hiver 2025', status: 'SUBMITTED', dueDate: day(2026, 3, 1) },
    ],
    meeting: { title: 'Point données manquantes', scheduledOn: day(2026, 10, 18) },
  },
  {
    email: 'salma.cherkaoui@example.test',
    givenName: 'Salma',
    familyName: 'Cherkaoui',
    city: 'Casablanca',
    institution: 'Université Hassan II de Casablanca',
    laboratory: 'Laboratoire d’informatique de Mohammedia',
    doctoralSchool: 'École doctorale Sciences de l’ingénieur',
    specialty: 'Traitement automatique des langues',
    title: 'Modèles de langue pour l’arabe marocain dans les services publics',
    discipline: 'Informatique',
    startedOn: day(2022, 11, 1),
    expectedDefenseOn: day(2026, 11, 30),
    objectives: [
      {
        title: 'Corpus darija annoté',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2023, 12, 1),
      },
      {
        title: 'État de l’art des modèles multilingues',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2024, 6, 1),
      },
      {
        title: 'Adaptation du modèle',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2025, 3, 1),
      },
      {
        title: 'Évaluation sur les démarches administratives',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2025, 11, 1),
      },
      { title: 'Article ACL', status: 'IN_PROGRESS', progress: 45, dueDate: day(2026, 12, 1) },
      { title: 'Chapitre résultats', status: 'PLANNED', progress: 0, dueDate: day(2026, 9, 1) },
      { title: 'Soutenance', status: 'PLANNED', progress: 0, dueDate: day(2026, 11, 15) },
    ],
    deliverables: [
      { title: 'Article — darija administrative', status: 'SUBMITTED', dueDate: day(2026, 10, 30) },
      { title: 'Jeu de phrases annotées', status: 'CHANGES_REQUESTED', dueDate: day(2026, 8, 15) },
    ],
    meeting: { title: 'Comité de suivi', scheduledOn: day(2026, 11, 4) },
  },
  {
    email: 'omar.idrissi@example.test',
    givenName: 'Omar',
    familyName: 'Idrissi',
    city: 'Marrakech',
    institution: 'Université Cadi Ayyad',
    laboratory: 'Laboratoire d’informatique et systèmes',
    doctoralSchool: 'Centre d’études doctorales Sciences et Techniques',
    specialty: 'Vision par ordinateur',
    title: 'Numérisation et reconnaissance des motifs du patrimoine de Marrakech',
    discipline: 'Informatique',
    startedOn: day(2024, 10, 1),
    expectedDefenseOn: day(2028, 9, 30),
    objectives: [
      {
        title: 'Choix des sites et autorisations',
        status: 'IN_PROGRESS',
        progress: 70,
        dueDate: day(2026, 12, 1),
      },
      {
        title: 'Protocole de prise de vue',
        status: 'PLANNED',
        progress: 0,
        dueDate: day(2027, 3, 1),
      },
      { title: 'Base d’images', status: 'PLANNED', progress: 0, dueDate: day(2027, 9, 1) },
      {
        title: 'Modèle de reconnaissance',
        status: 'PLANNED',
        progress: 0,
        dueDate: day(2028, 3, 1),
      },
      { title: 'Rédaction', status: 'PLANNED', progress: 0, dueDate: day(2028, 8, 1) },
    ],
    deliverables: [{ title: 'Note de cadrage', status: 'DRAFT', dueDate: day(2026, 12, 15) }],
  },
  {
    email: 'khadija.amrani@example.test',
    givenName: 'Khadija',
    familyName: 'Amrani',
    city: 'Oujda',
    institution: 'Université Mohammed Premier',
    laboratory: 'Laboratoire d’amélioration de la production agricole',
    doctoralSchool: 'Centre d’études doctorales Sciences et Techniques',
    specialty: 'Agriculture de précision',
    title: 'Irrigation intelligente des oliveraies de l’Oriental à partir d’images satellite',
    discipline: 'Agronomie',
    startedOn: day(2021, 11, 1),
    expectedDefenseOn: day(2026, 6, 30),
    objectives: [
      { title: 'Parcelles pilotes', status: 'COMPLETED', progress: 100, dueDate: day(2022, 6, 1) },
      { title: 'Séries Sentinel-2', status: 'COMPLETED', progress: 100, dueDate: day(2023, 6, 1) },
      {
        title: 'Indice de stress hydrique',
        status: 'IN_PROGRESS',
        progress: 25,
        dueDate: day(2026, 4, 1),
      },
      {
        title: 'Essai chez les coopératives',
        status: 'PLANNED',
        progress: 0,
        dueDate: day(2026, 5, 15),
      },
      { title: 'Article', status: 'PLANNED', progress: 0, dueDate: day(2026, 6, 1) },
      { title: 'Manuscrit', status: 'PLANNED', progress: 0, dueDate: day(2026, 6, 20) },
    ],
    deliverables: [
      { title: 'Cartes de stress hydrique', status: 'SUBMITTED', dueDate: day(2026, 5, 1) },
    ],
    meeting: { title: 'Bilan des parcelles', scheduledOn: day(2026, 10, 28) },
  },
  {
    email: 'mehdi.bennani@example.test',
    givenName: 'Mehdi',
    familyName: 'Bennani',
    city: 'Tanger',
    institution: 'Université Abdelmalek Essaâdi',
    laboratory: 'Laboratoire d’informatique et de télécommunications',
    doctoralSchool: 'Centre d’études doctorales Sciences et Techniques',
    specialty: 'Cybersécurité',
    title: 'Détection d’intrusions sur les réseaux portuaires de Tanger Med',
    discipline: 'Informatique',
    startedOn: day(2022, 9, 1),
    expectedDefenseOn: day(2026, 9, 30),
    objectives: [
      {
        title: 'Cartographie du réseau portuaire',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2023, 3, 1),
      },
      {
        title: 'Jeu d’attaques réalistes',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2023, 12, 1),
      },
      {
        title: 'Détecteur temps réel',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2024, 12, 1),
      },
      {
        title: 'Évaluation sur six mois',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2025, 8, 1),
      },
      { title: 'Article IEEE', status: 'COMPLETED', progress: 100, dueDate: day(2026, 2, 1) },
      {
        title: 'Chapitre déploiement',
        status: 'IN_PROGRESS',
        progress: 80,
        dueDate: day(2026, 11, 1),
      },
      { title: 'Soutenance', status: 'PLANNED', progress: 0, dueDate: day(2026, 9, 15) },
    ],
    deliverables: [
      { title: 'Article — détection portuaire', status: 'VALIDATED', dueDate: day(2026, 2, 1) },
      { title: 'Rapport de déploiement', status: 'DRAFT', dueDate: day(2026, 11, 1) },
    ],
    meeting: { title: 'Préparation du chapitre', scheduledOn: day(2026, 10, 16) },
  },
  {
    email: 'fatimazahra.alaoui@example.test',
    givenName: 'Fatima-Zahra',
    familyName: 'Alaoui',
    city: 'Rabat',
    institution: 'Université Mohammed V de Rabat',
    laboratory: 'Laboratoire des sciences de l’éducation',
    doctoralSchool: 'École doctorale Lettres et Sciences humaines',
    specialty: 'Sciences de l’éducation',
    title: 'Usage raisonné des assistants d’écriture dans les mémoires de master',
    discipline: 'Sciences de l’éducation',
    startedOn: day(2021, 10, 1),
    expectedDefenseOn: day(2026, 7, 15),
    objectives: [
      {
        title: 'Enquête auprès des encadrants',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2022, 6, 1),
      },
      {
        title: 'Grille d’intégrité académique',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2023, 1, 15),
      },
      {
        title: 'Expérimentation dans trois facultés',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2024, 6, 1),
      },
      {
        title: 'Analyse des entretiens',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2025, 1, 15),
      },
      { title: 'Article', status: 'COMPLETED', progress: 100, dueDate: day(2025, 9, 1) },
      { title: 'Chapitres 1 à 4', status: 'COMPLETED', progress: 100, dueDate: day(2026, 1, 15) },
      {
        title: 'Conclusion et recommandations',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2026, 4, 1),
      },
      {
        title: 'Dépôt du manuscrit',
        status: 'IN_PROGRESS',
        progress: 40,
        dueDate: day(2026, 11, 30),
      },
    ],
    deliverables: [
      { title: 'Manuscrit — version comité', status: 'SUBMITTED', dueDate: day(2026, 10, 25) },
    ],
    meeting: { title: 'Lecture du manuscrit', scheduledOn: day(2026, 10, 21) },
  },
  {
    email: 'hamza.tazi@example.test',
    givenName: 'Hamza',
    familyName: 'Tazi',
    city: 'Agadir',
    institution: 'Université Ibn Zohr',
    laboratory: 'Laboratoire des sciences de l’océan',
    doctoralSchool: 'Centre d’études doctorales Sciences et Techniques',
    specialty: 'Océanographie',
    title: 'Capteurs low-cost pour le suivi de la température côtière à Agadir',
    discipline: 'Océanographie',
    startedOn: day(2023, 10, 1),
    expectedDefenseOn: day(2027, 10, 1),
    objectives: [
      { title: 'Prototype de bouée', status: 'COMPLETED', progress: 100, dueDate: day(2024, 6, 1) },
      { title: 'Campagne en mer', status: 'IN_PROGRESS', progress: 15, dueDate: day(2026, 5, 1) },
      { title: 'Calibration des sondes', status: 'PLANNED', progress: 0, dueDate: day(2026, 8, 1) },
      {
        title: 'Comparaison avec l’INRH',
        status: 'PLANNED',
        progress: 0,
        dueDate: day(2026, 12, 1),
      },
      { title: 'Article', status: 'PLANNED', progress: 0, dueDate: day(2027, 4, 1) },
      {
        title: 'Chapitre instrumentation',
        status: 'PLANNED',
        progress: 0,
        dueDate: day(2027, 6, 1),
      },
      { title: 'Rédaction', status: 'PLANNED', progress: 0, dueDate: day(2027, 8, 1) },
      { title: 'Soutenance', status: 'PLANNED', progress: 0, dueDate: day(2027, 10, 1) },
    ],
    deliverables: [
      { title: 'Journal de campagne — printemps', status: 'SUBMITTED', dueDate: day(2026, 6, 1) },
      { title: 'Fiches de calibration', status: 'SUBMITTED', dueDate: day(2026, 7, 15) },
    ],
  },
  {
    email: 'imane.berrada@example.test',
    givenName: 'Imane',
    familyName: 'Berrada',
    city: 'Meknès',
    institution: 'Université Moulay Ismaïl',
    laboratory: 'Laboratoire de chimie des matériaux',
    doctoralSchool: 'Centre d’études doctorales Sciences et Techniques',
    specialty: 'Chimie des matériaux',
    title: 'Matériaux biosourcés pour l’isolation des habitats en terre de Meknès',
    discipline: 'Chimie',
    startedOn: day(2022, 12, 1),
    expectedDefenseOn: day(2027, 1, 31),
    objectives: [
      {
        title: 'Caractérisation des argiles locales',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2023, 9, 1),
      },
      {
        title: 'Formulations à base de paille',
        status: 'COMPLETED',
        progress: 100,
        dueDate: day(2024, 6, 1),
      },
      { title: 'Essais thermiques', status: 'COMPLETED', progress: 100, dueDate: day(2025, 6, 1) },
      {
        title: 'Vieillissement accéléré',
        status: 'IN_PROGRESS',
        progress: 50,
        dueDate: day(2026, 12, 15),
      },
      { title: 'Article', status: 'PLANNED', progress: 0, dueDate: day(2026, 11, 1) },
      { title: 'Manuscrit', status: 'PLANNED', progress: 0, dueDate: day(2027, 1, 15) },
    ],
    deliverables: [
      { title: 'Rapport d’essais thermiques', status: 'VALIDATED', dueDate: day(2025, 7, 1) },
      { title: 'Note de vieillissement', status: 'SUBMITTED', dueDate: day(2026, 10, 12) },
    ],
    meeting: { title: 'Choix des essais complémentaires', scheduledOn: day(2026, 11, 12) },
  },
  {
    email: 'anas.elouazzani@example.test',
    givenName: 'Anas',
    familyName: 'El Ouazzani',
    city: 'Tétouan',
    institution: 'Université Abdelmalek Essaâdi',
    laboratory: 'Laboratoire de géographie et d’aménagement',
    doctoralSchool: 'Centre d’études doctorales Lettres et Sciences humaines',
    specialty: 'Aménagement urbain',
    title: 'Mobilités quotidiennes et chaleur urbaine dans la médina de Tétouan',
    discipline: 'Géographie',
    startedOn: day(2024, 1, 8),
    expectedDefenseOn: day(2028, 1, 31),
    objectives: [
      { title: 'Enquête ménages', status: 'IN_PROGRESS', progress: 20, dueDate: day(2026, 3, 1) },
      {
        title: 'Relevés de température de rue',
        status: 'PLANNED',
        progress: 0,
        dueDate: day(2026, 9, 1),
      },
      {
        title: 'Cartographie des parcours',
        status: 'PLANNED',
        progress: 0,
        dueDate: day(2027, 3, 1),
      },
      { title: 'Rédaction', status: 'PLANNED', progress: 0, dueDate: day(2027, 12, 1) },
    ],
    deliverables: [{ title: 'Questionnaire ménages', status: 'DRAFT', dueDate: day(2026, 4, 1) }],
    meeting: { title: 'Cadrage de l’enquête', scheduledOn: day(2026, 10, 14) },
  },
];

async function main() {
  const supervisor = await prisma.user.findUnique({ where: { email: SUPERVISOR_EMAIL } });
  if (!supervisor) {
    throw new Error(`Supervisor not found: ${SUPERVISOR_EMAIL}`);
  }
  const passwordHash = await hash(PASSWORD, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  for (const student of STUDENTS) {
    const existing = await prisma.user.findUnique({ where: { email: student.email } });
    if (existing) {
      const already = await prisma.thesisMembership.findFirst({
        where: {
          userId: existing.id,
          role: 'DOCTORAL_STUDENT',
          thesis: { memberships: { some: { userId: supervisor.id, role: 'SUPERVISOR' } } },
        },
      });
      if (already) {
        console.log(`skip ${student.email}`);
        continue;
      }
    }

    const user =
      existing ??
      (await prisma.user.create({
        data: {
          email: student.email,
          passwordHash,
          emailVerifiedAt: new Date(),
          profile: {
            create: {
              givenName: student.givenName,
              familyName: student.familyName,
              displayName: `${student.givenName} ${student.familyName}`,
              institution: student.institution,
              laboratory: student.laboratory,
              doctoralSchool: student.doctoralSchool,
              specialty: student.specialty,
              academicTitle: 'Doctorant',
              city: student.city,
              country: 'Maroc',
            },
          },
        },
      }));

    const thesis = await prisma.thesis.create({
      data: {
        title: student.title,
        status: 'ACTIVE',
        discipline: student.discipline,
        institution: student.institution,
        startedOn: student.startedOn,
        expectedDefenseOn: student.expectedDefenseOn,
        memberships: {
          create: [
            { userId: user.id, role: 'DOCTORAL_STUDENT' },
            { userId: supervisor.id, role: 'SUPERVISOR' },
          ],
        },
      },
    });

    await prisma.objective.createMany({
      data: student.objectives.map((objective) => ({
        thesisId: thesis.id,
        title: objective.title,
        status: objective.status,
        progress: objective.progress,
        manualProgress: objective.progress,
        dueDate: objective.dueDate,
        completedAt: objective.status === 'COMPLETED' ? objective.dueDate : null,
        reviewStatus: objective.status === 'COMPLETED' ? 'APPROVED' : 'NOT_REQUESTED',
        origin: 'SUPERVISOR' as const,
        createdById: supervisor.id,
        responsibleUserId: user.id,
      })),
    });

    if (student.deliverables.length > 0) {
      await prisma.deliverable.createMany({
        data: student.deliverables.map((item) => ({
          thesisId: thesis.id,
          title: item.title,
          type: 'REPORT' as const,
          status: item.status,
          dueDate: item.dueDate,
          createdById: user.id,
          submittedAt:
            item.status === 'SUBMITTED' || item.status === 'VALIDATED' ? new Date() : null,
          reviewedAt:
            item.status === 'VALIDATED' || item.status === 'CHANGES_REQUESTED' ? new Date() : null,
          reviewedById:
            item.status === 'VALIDATED' || item.status === 'CHANGES_REQUESTED'
              ? supervisor.id
              : null,
        })),
      });
    }

    if (student.meeting) {
      await prisma.meeting.create({
        data: {
          thesisId: thesis.id,
          title: student.meeting.title,
          scheduledOn: student.meeting.scheduledOn,
          mode: 'IN_PERSON',
          status: 'PLANNED',
          location: student.city,
          createdById: supervisor.id,
        },
      });
    }

    console.log(`created ${student.givenName} ${student.familyName}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
