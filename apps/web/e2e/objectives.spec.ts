import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { createObjectiveOnPage } from './current-ui';

const password = 'phrase-secrete-12';

test('a supervisor creates an objective that only that doctoral student can see', async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const stamp = Date.now().toString(36);
  const title = `Objectif e2e ${stamp}`;
  const ada = await register(request, `e2e-ada-${stamp}@example.test`, 'Ada', 'Martin');
  const bea = await register(request, `e2e-bea-${stamp}@example.test`, 'Bea', 'Martin');
  const noa = await register(request, `e2e-noa-${stamp}@example.test`, 'Noa', 'Bernard');
  const thesisA = await createThesis(request, ada.cookie, `These Ada ${stamp}`);
  const thesisB = await createThesis(request, bea.cookie, `These Bea ${stamp}`);
  await invite(request, ada.cookie, noa.cookie, thesisA, noa.email);

  await login(page, noa.email);
  await page.goto('/encadrement');
  await expect(page.getByRole('heading', { name: 'Mes doctorants' })).toBeVisible();
  await expect(page.getByText('Ada Martin')).toBeVisible();
  await expect(page.getByText('Bea Martin')).toHaveCount(0);
  await page.goto(`/encadrement/${thesisA}/objectifs`);
  await createObjectiveOnPage(page, title);
  await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();
  await page.getByRole('link', { name: new RegExp(title) }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  await logout(page, 'Noa Bernard');
  await login(page, ada.email);
  await page.goto('/objectifs');
  await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();
  await page.getByRole('link', { name: new RegExp(title) }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText(/Aucune étape/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Modifier' }).first()).toBeVisible();
  await page.goto('/objectifs');
  const ownTitle = `Etape doctorant ${stamp}`;
  await createObjectiveOnPage(page, ownTitle);
  await expect(page.getByRole('link', { name: new RegExp(ownTitle) })).toBeVisible();

  await logout(page, 'Ada Martin');
  await login(page, bea.email);
  await page.goto('/objectifs');
  await expect(page.getByText(title)).toHaveCount(0);
  await expect(page.getByRole('link', { name: /état de l.art/i })).toBeVisible();

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

async function invite(
  request: APIRequestContext,
  inviterCookie: string,
  inviteeCookie: string,
  thesisId: string,
  email: string,
) {
  const created = await request.post(`/api/v1/theses/${thesisId}/invitations`, {
    headers: { cookie: inviterCookie, 'x-csrf-token': csrf(inviterCookie) },
    data: { email, role: 'SUPERVISOR' },
  });
  expect(created.status()).toBe(201);
  const body = (await created.json()) as { id: string };
  const accepted = await request.post(`/api/v1/invitations/${body.id}/accept`, {
    headers: { cookie: inviteeCookie, 'x-csrf-token': csrf(inviteeCookie) },
    data: {},
  });
  expect(accepted.status()).toBe(200);
}

function csrf(cookie: string): string {
  const pair = cookie.split('; ').find((item) => item.startsWith('tp_csrf='));
  if (!pair) throw new Error('missing csrf cookie');
  return decodeURIComponent(pair.slice('tp_csrf='.length));
}

async function login(page: Page, email: string) {
  await page.goto('/connexion');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  try {
    await expect(page).not.toHaveURL(/connexion/);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  } catch (error) {
    const diagnostic = [
      `E2E current URL: ${page.url()}`,
      `E2E alerts: ${JSON.stringify(await page.getByRole('alert').allTextContents())}`,
      `E2E page text: ${(await page.locator('body').innerText()).slice(0, 1500)}`,
    ].join('\n');
    throw new Error(diagnostic, { cause: error });
  }
}

async function logout(page: Page, displayName: string) {
  await page.getByRole('button', { name: displayName }).click();
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
}
