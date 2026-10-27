import { expect, test, type Page } from '@playwright/test';

const thesisId = '22222222-2222-4222-8222-222222222222';
const deliverableId = '55555555-5555-4555-8555-555555555555';
const author = {
  id: '44444444-4444-4444-8444-444444444444',
  givenName: 'Camille',
  familyName: 'Martin',
};
const profile = {
  ...author,
  displayName: 'Camille Martin',
  academicTitle: null,
  institution: 'Université de Lille',
  laboratory: null,
  doctoralSchool: null,
  specialty: null,
  city: null,
  country: null,
  orcid: null,
  avatarUrl: null,
  cvUrl: null,
  googleScholarUrl: null,
  linkedinUrl: null,
};
const { id: _profileId, ...academicProfile } = profile;
const thesis = {
  id: thesisId,
  title: 'Dynamique des écosystèmes côtiers',
  status: 'ACTIVE',
  discipline: 'Écologie',
  institution: null,
  startedOn: '2024-10-01',
  expectedDefenseOn: null,
  supervisors: [],
};
const listed = {
  id: deliverableId,
  thesisId,
  title: 'Chapitre 2 — Méthodologie',
  type: 'THESIS_CHAPTER',
  status: 'CHANGES_REQUESTED',
  dueDate: '2026-09-01',
  isOverdue: true,
  objective: {
    id: '33333333-3333-4333-8333-333333333333',
    title: 'Définir le protocole expérimental',
  },
  createdBy: author,
  taskId: null,
  versionCount: 2,
  latestVersionNumber: 2,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-18T10:00:00.000Z',
};
const file = {
  id: '99999999-9999-4999-8999-999999999999',
  originalName: 'chapitre-v2.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2516582,
  createdAt: '2026-10-17T10:00:00.000Z',
  uploadedBy: author,
};
const version = {
  id: '66666666-6666-4666-8666-666666666666',
  versionNumber: 2,
  title: null,
  changeSummary: 'Précisions sur le protocole et les données',
  createdBy: author,
  createdAt: file.createdAt,
  file,
};
const detail = {
  ...listed,
  description: 'Méthode de collecte, protocole expérimental et analyse des données.',
  versionsSummary: { count: 2, latestVersionNumber: 2, latestVersionCreatedAt: version.createdAt },
  reviewMessage: 'Précisez la taille de l’échantillon et justifiez le choix des indicateurs.',
  submittedAt: '2026-10-17T12:00:00.000Z',
  reviewedAt: '2026-10-18T10:00:00.000Z',
  reviewedBy: { ...author, givenName: 'Noa', familyName: 'Bernard' },
};

async function workspace(page: Page, supervisor = false, withFile = true) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = {};
    if (path.endsWith('/auth/me'))
      body = {
        user: {
          ...author,
          displayName: 'Camille Martin',
          email: 'camille@example.test',
          emailVerified: true,
          platformRole: 'USER',
        },
      };
    else if (path.endsWith('/dashboard'))
      body = {
        profile: academicProfile,
        thesis,
        progress: { percentage: 60, status: 'ON_TRACK' },
        workProgress: { percentage: 60 },
        profileCompletion: { percentage: 50, missingFields: [] },
        kpis: [],
        objectives: { total: 3, planned: 1, inProgress: 1, completed: 1, overdue: 0 },
        deliverables: {
          total: 3,
          draft: 1,
          submitted: 1,
          changesRequested: 1,
          validated: 0,
          overdue: 0,
        },
        upcomingDeadlines: [],
        recentActivity: [],
      };
    else if (path.endsWith('/supervision/theses'))
      body = {
        theses: supervisor
          ? [
              {
                thesisId,
                title: thesis.title,
                status: 'ACTIVE',
                discipline: null,
                institution: null,
                startedOn: null,
                expectedDefenseOn: null,
                durationYears: null,
                progressPercentage: 60,
                deliverableCount: 3,
                pendingValidationCount: 1,
                pendingDeliverables: [
                  {
                    id: deliverableId,
                    title: listed.title,
                    versionCount: 2,
                    latestVersionNumber: 2,
                    submittedAt: detail.submittedAt,
                  },
                ],
                supervisors: [],
                meetings: [],
                coverage: { writable: true, source: 'subscription', expiresAt: null },
                doctoralStudent: {
                  id: author.id,
                  givenName: author.givenName,
                  familyName: author.familyName,
                  avatarUrl: null,
                  institution: null,
                  specialty: null,
                },
                doctoralStudents: [],
                objectiveSummary: { total: 3, inProgress: 1, completed: 1, overdue: 0 },
              },
            ]
          : [],
      };
    else if (path.endsWith('/objectives')) body = { objectives: [] };
    else if (path.endsWith('/file/download'))
      body = {
        url: 'http://127.0.0.1:5173/api/preview.pdf',
        expiresAt: '2027-01-01T00:00:00.000Z',
      };
    else if (path.endsWith('/versions'))
      body = {
        versions: [
          { ...version, file: withFile ? file : null },
          {
            ...version,
            id: '77777777-7777-4777-8777-777777777777',
            versionNumber: 1,
            changeSummary: 'Première rédaction',
            file: null,
          },
        ],
      };
    else if (path.endsWith('/deliverables'))
      body = {
        deliverables: [
          listed,
          {
            ...listed,
            id: '88888888-8888-4888-8888-888888888888',
            title: 'Rapport de collecte des données',
            type: 'REPORT',
            dueDate: '2026-11-20',
            status: 'SUBMITTED',
            isOverdue: false,
          },
          {
            ...listed,
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            title: 'Présentation du séminaire doctoral',
            type: 'PRESENTATION',
            dueDate: null,
            status: 'DRAFT',
            isOverdue: false,
            versionCount: 0,
            latestVersionNumber: null,
          },
        ],
      };
    else if (path.endsWith(`/deliverables/${deliverableId}`))
      body = supervisor ? { ...detail, status: 'SUBMITTED' } : detail;
    else if (path.endsWith(`/theses/${thesisId}`))
      body = {
        id: thesisId,
        title: thesis.title,
        status: 'ACTIVE',
        discipline: null,
        institution: null,
        startedOn: null,
        expectedDefenseOn: null,
        role: 'SUPERVISOR',
        members: [
          {
            id: author.id,
            userId: author.id,
            displayName: 'Camille Martin',
            email: 'camille@example.test',
            role: 'DOCTORAL_STUDENT',
            academicTitle: null,
            institution: null,
            laboratory: null,
            doctoralSchool: null,
            specialty: null,
            avatarUrl: null,
          },
        ],
      };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  await page.route('**/api/preview.pdf', (route) =>
    route.fulfill({ path: 'e2e/fixtures/chapitre.pdf', contentType: 'application/pdf' }),
  );
}

test('deliverables are readable on desktop and mobile, with a clear deposit and current document', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await workspace(page, false, false);
  for (const width of [1440, 1024, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/livrables');
    await expect(page.getByRole('tablist', { name: 'Livrables' })).toBeVisible();
    await expect(page.getByRole('link', { name: listed.title })).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe(
      '13px',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width !== 1024)
      await page.screenshot({
        path: `../../artifacts/deliverables/list-${width}.png`,
        fullPage: true,
      });
    await page.getByRole('button', { name: 'Vue cartes' }).click();
    await expect(page.getByRole('button', { name: 'Vue cartes' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('list', { name: 'Livrables' }).getByRole('listitem')).toHaveCount(
      3,
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width !== 1024)
      await page.screenshot({
        path: `../../artifacts/deliverables/cards-${width}.png`,
        fullPage: true,
      });
    await page.getByRole('button', { name: 'En retard uniquement' }).click();
    await expect(page.getByRole('list', { name: 'Livrables' }).getByRole('listitem')).toHaveCount(
      1,
    );
    await page.getByRole('button', { name: 'Effacer les filtres' }).click();
    await page.getByRole('button', { name: 'Vue liste' }).click();
    await page.getByRole('button', { name: 'Nouveau livrable' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Enregistrer le brouillon' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Soumettre à l’encadrant' })).toBeVisible();
    await dialog.getByLabel('Choisir un fichier').setInputFiles('e2e/fixtures/chapitre.pdf');
    await expect(dialog.getByText('chapitre.pdf', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Nouveau livrable' })).toBeVisible();
    if (width === 375)
      await page.screenshot({ path: '../../artifacts/deliverables/deposit-mobile.png' });
    await dialog.getByRole('button', { name: 'Fermer', exact: true }).first().click();
    await page.getByRole('link', { name: listed.title }).click();
    await expect(page.getByRole('heading', { name: 'Prochaine action' })).toBeVisible();
    await expect(page.getByText(detail.reviewMessage)).toBeVisible();
    await expect(page.getByRole('list', { name: 'Historique des versions' })).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width !== 1024)
      await page.screenshot({
        path: `../../artifacts/deliverables/detail-${width}.png`,
        fullPage: true,
      });
    await page.getByRole('button', { name: 'Historique des versions' }).click();
    await expect(page.getByRole('list', { name: 'Historique des versions' })).toBeVisible();
  }
});

test('the supervisor opens a submitted document directly from the review queue', async ({
  page,
}) => {
  await workspace(page, true);
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/livrables');
    await expect(page.getByRole('tab', { name: 'À examiner (1)' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('link', { name: listed.title })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `../../artifacts/deliverables/review-${width}.png`,
      fullPage: true,
    });
    await page.getByRole('link', { name: listed.title }).click();
    await expect(page.getByRole('button', { name: 'Valider le livrable' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Demander des modifications' })).toBeVisible();
    const preview = page.getByRole('region', { name: 'Aperçu du document' });
    const canvas = preview.getByRole('img', { name: 'Page 1 sur 2' });
    await expect(canvas).toBeVisible({ timeout: 15000 });
    // Check real page pixels, rather than just the presence of an empty frame.
    expect(
      await canvas.evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const pixels = canvas
          .getContext('2d')!
          .getImageData(0, 0, canvas.width, canvas.height).data;
        return pixels.some((value, index) => index % 4 !== 3 && value < 200);
      }),
    ).toBe(true);
    await page.getByRole('button', { name: 'Page suivante' }).click();
    await expect(preview.getByRole('img', { name: 'Page 2 sur 2' })).toBeVisible();
    await page.getByRole('button', { name: 'Page précédente' }).click();
    await expect(canvas).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `../../artifacts/deliverables/pdf-${width}.png`,
      fullPage: true,
    });
  }
});

test('a broken PDF shows an error and can be retried', async ({ page }) => {
  await workspace(page, true);
  let failed = true;
  await page.route('**/api/preview.pdf', (route) =>
    failed
      ? route.fulfill({ body: 'invalid PDF', contentType: 'application/pdf' })
      : route.fulfill({ path: 'e2e/fixtures/chapitre.pdf', contentType: 'application/pdf' }),
  );
  await page.goto('/livrables');
  await page.getByRole('link', { name: listed.title }).click();
  const preview = page.getByRole('region', { name: 'Aperçu du document' });
  await expect(preview.getByRole('alert')).toBeVisible();
  await expect(preview.getByRole('link', { name: 'Ouvrir dans un nouvel onglet' })).toBeVisible();
  failed = false;
  await preview.getByRole('button', { name: 'Réessayer' }).click();
  await expect(preview.getByRole('img', { name: 'Page 1 sur 2' })).toBeVisible();
  await expect(preview.getByRole('alert')).toBeHidden();
});
