import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const password = 'phrase-secrete-12';

test('a supervisor creates an objective that only that doctoral student can see', async ({
  page,
  request,
}) => {
  const stamp = Date.now().toString(36);
  const title = `Objectif e2e ${stamp}`;
  const ada = await register(request, `e2e-ada-${stamp}@example.test`, 'Ada', 'Martin');
  const bea = await register(request, `e2e-bea-${stamp}@example.test`, 'Bea', 'Martin');
  const noa = await register(request, `e2e-noa-${stamp}@example.test`, 'Noa', 'Bernard');
  const thesisA = await createThesis(request, ada.cookie, `These Ada ${stamp}`);
  const thesisB = await createThesis(request, bea.cookie, `These Bea ${stamp}`);
  await invite(request, ada.cookie, thesisA, noa.email);

  await login(page, noa.email);
  await page.goto('/encadrement');
  await expect(page.getByRole('heading', { name: 'Mes doctorants' })).toBeVisible();
  await expect(page.getByText('Ada Martin')).toBeVisible();
  await expect(page.getByText('Bea Martin')).toHaveCount(0);
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Ada Martin' })
    .getByRole('link', { name: 'Voir le suivi' })
    .click();
  await page.getByRole('button', { name: 'Nouvel objectif' }).click();
  await page.getByLabel('Titre').fill(title);
  await page.getByRole('button', { name: 'Créer l’objectif' }).click();
  await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();
  await page.getByRole('link', { name: new RegExp(title) }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  await logout(page, 'Noa Bernard');
  await login(page, ada.email);
  await page.goto('/objectifs');
  await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();
  await page.getByRole('link', { name: new RegExp(title) }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('Aucune tâche définie.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Modifier' })).toBeVisible();
  await page.goto('/objectifs');
  const ownTitle = `Etape doctorant ${stamp}`;
  await page.getByRole('button', { name: 'Nouvel objectif' }).click();
  await page.getByLabel('Titre').fill(ownTitle);
  await page.getByRole('button', { name: 'Créer l’objectif' }).click();
  await expect(page.getByRole('link', { name: new RegExp(ownTitle) })).toBeVisible();

  await logout(page, 'Ada Martin');
  await login(page, bea.email);
  await page.goto('/objectifs');
  await expect(page.getByText(title)).toHaveCount(0);
  await expect(page.getByRole('link', { name: /État de l.art/ })).toBeVisible();

  expect(thesisB).toBeTruthy();
});

async function register(
  request: APIRequestContext,
  email: string,
  givenName: string,
  familyName: string,
) {
  const response = await request.post('/api/v1/auth/register', {
    data: { email, password, givenName, familyName },
  });
  expect(response.status()).toBe(201);
  const cookie = response
    .headersArray()
    .filter((header) => header.name.toLowerCase() === 'set-cookie')
    .map((header) => header.value.split(';')[0])
    .join('; ');
  return { email, cookie };
}

async function createThesis(request: APIRequestContext, cookie: string, title: string) {
  const response = await request.post('/api/v1/theses', {
    headers: { cookie, 'x-csrf-token': csrf(cookie) },
    data: { title },
  });
  expect(response.status()).toBe(201);
  const body = (await response.json()) as { id: string };
  return body.id;
}

async function invite(request: APIRequestContext, cookie: string, thesisId: string, email: string) {
  const response = await request.post(`/api/v1/theses/${thesisId}/members`, {
    headers: { cookie, 'x-csrf-token': csrf(cookie) },
    data: { email, role: 'SUPERVISOR' },
  });
  expect(response.status()).toBe(201);
}

function csrf(cookie: string): string {
  const pair = cookie.split('; ').find((item) => item.startsWith('tp_csrf='));
  if (!pair) throw new Error('missing csrf cookie');
  return decodeURIComponent(pair.slice('tp_csrf='.length));
}

async function login(page: Page, email: string) {
  await page.goto('/connexion');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('heading', { name: /Bonjour/ })).toBeVisible();
}

async function logout(page: Page, displayName: string) {
  await page.getByRole('button', { name: displayName }).click();
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
}
