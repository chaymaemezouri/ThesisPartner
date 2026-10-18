import { expect, test, type Page } from '@playwright/test';

const widths = [1920, 1440, 1366, 1024, 768, 375];

const session = {
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'camille.martin@example.edu',
    emailVerified: true,
    givenName: 'Camille',
    familyName: 'Martin',
    displayName: 'Camille Martin',
  },
};

async function stubWorkspace(page: Page) {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    }),
  );
  await page.route('**/api/v1/dashboard', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profile: {
          givenName: 'Camille',
          familyName: 'Martin',
          displayName: 'Camille Martin',
          academicTitle: null,
          institution: null,
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
        },
        thesis: null,
        progress: { percentage: 0, status: 'NOT_STARTED' },
        workProgress: { percentage: 0 },
        profileCompletion: { percentage: 29, missingFields: ['institution'] },
        kpis: [
          { id: 'progress', value: '0' },
          { id: 'profile', value: '29' },
        ],
        objectives: { total: 0, planned: 0, inProgress: 0, completed: 0, overdue: 0 },
        deliverables: {
          total: 0,
          draft: 0,
          submitted: 0,
          changesRequested: 0,
          validated: 0,
          overdue: 0,
        },
        upcomingDeadlines: [],
        recentActivity: [],
      }),
    }),
  );
  await page.route('**/api/v1/health', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        checks: { api: 'ok', database: 'ok', redis: 'ok' },
      }),
    }),
  );
}

test('asks for a session before the workspace', async ({ page }) => {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        errors: [],
        requestId: 'e2e-auth',
      }),
    }),
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflows).toBe(false);
});

test('navigates from the dashboard to a module', async ({ page }) => {
  await stubWorkspace(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bonjour, Camille' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Objectifs' })
    .click();
  await expect(page.getByRole('heading', { name: 'Objectifs' })).toBeVisible();
  await expect(page.getByText('Aucune thèse associée')).toBeVisible();
  await expect(page.locator('#contenu').getByRole('link', { name: 'Profil' })).toBeVisible();
});

test('uses a drawer on a narrow viewport', async ({ page }) => {
  await stubWorkspace(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: 'Portfolio' }).click();
  await expect(page.getByRole('heading', { name: 'Portfolio' })).toBeVisible();
});

test('shows objectives without a horizontal scrollbar', async ({ page }) => {
  await stubWorkspace(page);
  await page.route('**/api/v1/dashboard', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profile: {
          givenName: 'Camille',
          familyName: 'Martin',
          displayName: 'Camille Martin',
          academicTitle: null,
          institution: null,
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
        },
        thesis: {
          id: '22222222-2222-4222-8222-222222222222',
          title: 'These cotiere',
          status: 'ACTIVE',
          discipline: null,
          institution: null,
          startedOn: null,
          expectedDefenseOn: null,
          supervisors: [],
        },
        progress: { percentage: 0, status: 'NOT_STARTED' },
        workProgress: { percentage: 0 },
        profileCompletion: { percentage: 0, missingFields: [] },
        objectives: { total: 1, planned: 0, inProgress: 1, completed: 0, overdue: 1 },
        deliverables: {
          total: 0,
          draft: 0,
          submitted: 0,
          changesRequested: 0,
          validated: 0,
          overdue: 0,
        },
        kpis: [{ id: 'progress', value: '0' }],
        upcomingDeadlines: [],
        recentActivity: [],
      }),
    }),
  );
  await page.route('**/api/v1/theses/**/objectives**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        objectives: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            thesisId: '22222222-2222-4222-8222-222222222222',
            title: 'Etat de l art',
            description: null,
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            startDate: null,
            dueDate: '2026-09-28',
            completedAt: null,
            progress: 70,
            progressMode: 'MANUAL',
            taskSummary: { total: 0, todo: 0, inProgress: 0, done: 0, cancelled: 0 },
            completionReview: {
              status: 'NOT_REQUESTED',
              requestedAt: null,
              validatedAt: null,
              message: null,
              validatedByName: null,
            },
            isOverdue: true,
            responsible: null,
            origin: 'SUPERVISOR',
            createdAt: '2026-09-01T00:00:00.000Z',
            updatedAt: '2026-09-02T00:00:00.000Z',
          },
        ],
      }),
    }),
  );
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/objectifs');
    await expect(page.getByRole('link', { name: /Etat de l art/ })).toBeVisible();
    await expect(page.getByText('70 %')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nouvel objectif' })).toBeVisible();
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  }
});

test('does not overflow horizontally', async ({ page }) => {
  await stubWorkspace(page);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  }
});
