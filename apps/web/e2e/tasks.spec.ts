import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const password = 'phrase-secrete-12';

test('a doctoral student completes tasks and the supervisor validates the objective', async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const stamp = Date.now().toString(36);
  const title = `Objectif taches ${stamp}`;
  const tasks = ['Rechercher', 'Lire', 'Rediger', 'Valider'].map((name) => `${name} ${stamp}`);
  const ada = await register(request, `e2e-task-ada-${stamp}@example.test`, 'Ada', 'Martin');
  const noa = await register(request, `e2e-task-noa-${stamp}@example.test`, 'Noa', 'Bernard');
  const thesisId = await createThesis(request, ada.cookie, `These taches ${stamp}`);
  await invite(request, ada.cookie, thesisId, noa.email);

  await login(page, noa.email);
  await page.goto('/encadrement');
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Ada Martin' })
    .getByRole('link', { name: 'Voir le suivi' })
    .click();
  await page.getByRole('button', { name: 'Nouvel objectif' }).click();
  await page.getByLabel('Titre').fill(title);
  await page.getByRole('button', { name: 'Créer l’objectif' }).click();
  await page.getByRole('link', { name: new RegExp(title) }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  for (const task of tasks) {
    await page.getByRole('button', { name: 'Ajouter une tâche' }).click();
    await page.getByLabel('Titre').fill(task);
    await page.getByRole('button', { name: 'Ajouter la tâche' }).click();
    await expect(page.locator('li').filter({ hasText: task })).toBeVisible();
  }

  await logout(page, 'Noa Bernard');
  await login(page, ada.email);
  await page.goto('/objectifs');
  await page.getByRole('link', { name: new RegExp(title) }).click();
  for (const task of tasks) {
    await page.getByLabel(`Statut de ${task}`).selectOption({ label: 'Terminée' });
  }
  await expect(page.getByText('100 %')).toBeVisible();
  await expect(page.getByText('4 / 4 tâches terminées')).toBeVisible();
  await page.getByRole('button', { name: 'Demander la validation' }).click();
  await expect(page.getByText('Validation demandée')).toBeVisible();

  await logout(page, 'Ada Martin');
  await login(page, noa.email);
  await page.goto('/encadrement');
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Ada Martin' })
    .getByRole('link', { name: 'Voir le suivi' })
    .click();
  await page.getByRole('link', { name: new RegExp(title) }).click();
  await expect(page.getByText('Validation demandée par le doctorant')).toBeVisible();
  await page.getByRole('button', { name: 'Valider l’objectif' }).click();
  await expect(page.getByText('Objectif terminé')).toBeVisible();

  await logout(page, 'Noa Bernard');
  await login(page, ada.email);
  await page.goto('/objectifs');
  await page.getByRole('link', { name: new RegExp(title) }).click();
  await expect(page.getByText('Objectif terminé')).toBeVisible();
  await expect(page.getByText('Validé par Noa Bernard')).toBeVisible();
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
  try {
    await expect(page.getByRole('heading', { name: /Bonjour/ })).toBeVisible();
  } catch (error) {
    console.error('E2E current URL:', page.url());
    console.error('E2E alerts:', await page.getByRole('alert').allTextContents());
    console.error('E2E page text:', (await page.locator('body').innerText()).slice(0, 1500));
    throw error;
  }
}

async function logout(page: Page, displayName: string) {
  await page.getByRole('button', { name: displayName }).click();
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
}
