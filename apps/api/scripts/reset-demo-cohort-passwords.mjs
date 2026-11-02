/** Upsert verified demo cohort accounts with the shared demo password. */
import { Algorithm, hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';

const password = process.env.DEMO_PASSWORD ?? 'ThesisPartner2026!';
const accounts = [
  {
    email: 'demo.doctorant@example.test',
    givenName: 'Youssef',
    familyName: 'El Amrani',
    academicTitle: 'Doctorant',
  },
  {
    email: 'demo.encadrant@example.test',
    givenName: 'Karim',
    familyName: 'El Mansouri',
    academicTitle: 'Professeur',
  },
  {
    email: 'amina.benjelloun@example.test',
    givenName: 'Amina',
    familyName: 'Benjelloun',
    academicTitle: 'Doctorante',
  },
  {
    email: 'yassine.elfassi@example.test',
    givenName: 'Yassine',
    familyName: 'El Fassi',
    academicTitle: 'Doctorant',
  },
  {
    email: 'salma.cherkaoui@example.test',
    givenName: 'Salma',
    familyName: 'Cherkaoui',
    academicTitle: 'Doctorante',
  },
  {
    email: 'omar.idrissi@example.test',
    givenName: 'Omar',
    familyName: 'Idrissi',
    academicTitle: 'Doctorant',
  },
  {
    email: 'imane.berrada@example.test',
    givenName: 'Imane',
    familyName: 'Berrada',
    academicTitle: 'Doctorante',
  },
  {
    email: 'hamza.tazi@example.test',
    givenName: 'Hamza',
    familyName: 'Tazi',
    academicTitle: 'Doctorant',
  },
  {
    email: 'fatima.alaoui@example.test',
    givenName: 'Fatima-Zahra',
    familyName: 'Alaoui',
    academicTitle: 'Doctorante',
  },
  {
    email: 'mehdi.bennani@example.test',
    givenName: 'Mehdi',
    familyName: 'Bennani',
    academicTitle: 'Doctorant',
  },
];

const prisma = new PrismaClient();
try {
  const passwordHash = await hash(password, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  for (const account of accounts) {
    const { email, ...identity } = account;
    const profile = {
      ...identity,
      displayName: `${identity.givenName} ${identity.familyName}`,
    };
    await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        emailVerifiedAt: new Date(),
        profile: { create: profile },
        trial: { create: { status: 'NOT_STARTED' } },
      },
      update: {
        passwordHash,
        emailVerifiedAt: new Date(),
        disabledAt: null,
        deletedAt: null,
        profile: { upsert: { create: profile, update: profile } },
      },
    });
  }
  process.stdout.write(`Verified demo cohort ready (${accounts.length} accounts).\n`);
} finally {
  await prisma.$disconnect();
}
