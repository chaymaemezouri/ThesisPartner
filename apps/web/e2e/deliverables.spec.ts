import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const password = 'phrase-secrete-12';

test('a doctoral student creates a deliverable that only the thesis supervisor can open', async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const stamp = Date.now().toString(36);
  const title = `Chapitre 2 ${stamp}`;
  const objectiveTitle = `Objectif livrable ${stamp}`;
  const ada = await register(request, `e2e-del-ada-${stamp}@example.test`, 'Ada', 'Martin');
  const bea = await register(request, `e2e-del-bea-${stamp}@example.test`, 'Bea', 'Bernard');
  const noa = await register(request, `e2e-del-noa-${stamp}@example.test`, 'Noa', 'Bernard');
  const thesisId = await createThesis(request, ada.cookie, `These livrables ${stamp}`);
  await createThesis(request, bea.cookie, `These bea ${stamp}`);
  await invite(request, ada.cookie, noa.cookie, thesisId, noa.email);

  await login(page, noa.email);
  await page.goto(`/encadrement/${thesisId}/objectifs`);
  await page.getByRole('button', { name: 'Nouvel objectif' }).click();
  await page.getByLabel('Titre').fill(objectiveTitle);
  await page.getByRole('button', { name: 'Créer l’objectif' }).click();
  await expect(page.getByRole('link', { name: new RegExp(objectiveTitle) })).toBeVisible();
  await logout(page, 'Noa Bernard');

  await login(page, ada.email);
  await page.goto('/livrables');
  await expect(page.getByText('Aucun livrable')).toBeVisible();
  await page.getByRole('button', { name: 'Nouveau livrable' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Titre').fill(title);
  await dialog.getByLabel('Type').selectOption({ label: 'Chapitre de thèse' });
  await dialog
    .getByLabel('Objectif associé')
    .selectOption({ label: `${objectiveTitle} · À venir` });
  await dialog.getByLabel('Échéance').fill('2026-10-12');
  await dialog.getByRole('button', { name: 'Enregistrer le brouillon' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('Chapitre de thèse')).toBeVisible();
  await expect(page.getByText('Brouillon', { exact: true })).toBeVisible();
  await expect(page.getByText('Aucune version pour l’instant.')).toBeVisible();

  await page.goto('/objectifs');
  await page.getByRole('link', { name: new RegExp(objectiveTitle) }).click();
  await page.getByRole('link', { name: 'Voir les livrables' }).click();
  await expect(page).toHaveURL(new RegExp(`objectiveId=`));
  await expect(page.getByText(title)).toBeVisible();
  await logout(page, 'Ada Martin');

  await login(page, noa.email);
  await page.goto(`/encadrement/${thesisId}/livrables`);
  await expect(page.getByText(title)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nouveau livrable' })).toHaveCount(0);
  await page.getByRole('link', { name: title, exact: true }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Modifier' })).toHaveCount(0);
  await page.goto(`/encadrement/${thesisId}/objectifs`);
  await page.getByRole('link', { name: new RegExp(objectiveTitle) }).click();
  await page.getByRole('link', { name: 'Voir les livrables' }).click();
  await expect(page).toHaveURL(new RegExp(`/encadrement/${thesisId}/livrables\\?objectiveId=`));
  await logout(page, 'Noa Bernard');

  await login(page, bea.email);
  await page.goto('/livrables');
  await expect(page.getByText(title)).toHaveCount(0);
});

test('a doctoral student records versions that the supervisor can only read', async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const stamp = Date.now().toString(36);
  const title = `Chapitre versions ${stamp}`;
  const ada = await register(request, `e2e-ver-ada-${stamp}@example.test`, 'Ada', 'Martin');
  const noa = await register(request, `e2e-ver-noa-${stamp}@example.test`, 'Noa', 'Bernard');
  const thesisId = await createThesis(request, ada.cookie, `These versions ${stamp}`);
  await invite(request, ada.cookie, noa.cookie, thesisId, noa.email);
  await createPlainDeliverable(request, ada.cookie, thesisId, title);

  await login(page, ada.email);
  await page.goto('/livrables');
  await page.getByRole('link', { name: new RegExp(title) }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('Aucune version pour l’instant.')).toBeVisible();
  await page.getByRole('button', { name: 'Créer la première version' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Résumé des modifications').fill('Première version du chapitre');
  await dialog.getByRole('button', { name: 'Enregistrer la version' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('V1')).toBeVisible();
  await expect(page.getByText('Première version du chapitre')).toBeVisible();

  await page.getByRole('button', { name: 'Ajouter une nouvelle version' }).click();
  await dialog.getByLabel('Résumé des modifications').fill('Ajout de la section Transformers');
  await dialog.getByRole('button', { name: 'Enregistrer la version' }).click();
  await expect(dialog).toBeHidden();
  const history = page.getByRole('list', { name: 'Historique des versions' });
  await expect(history.getByText('V2')).toBeVisible();
  await expect(history.getByText('V1')).toBeVisible();
  await expect(history.getByText('Dernière version')).toBeVisible();
  const second = await history.getByText('V2').boundingBox();
  const first = await history.getByText('V1').boundingBox();
  expect(second && first && second.y < first.y).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Historique des versions' }).click();
  await expect(history.getByText('V2')).toBeVisible();
  await expect(history.getByText('Première version du chapitre')).toBeVisible();
  await expect(page.getByText('Sans fichier')).toHaveCount(2);
  await logout(page, 'Ada Martin');

  await login(page, noa.email);
  await page.goto(`/encadrement/${thesisId}/livrables`);
  await page.getByRole('link', { name: title, exact: true }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await page.getByRole('button', { name: 'Historique des versions' }).click();
  await expect(page.getByText('V2')).toBeVisible();
  await expect(page.getByText('V1')).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Fil d’Ariane' }).getByRole('link', { name: 'Mes doctorants' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ajouter une nouvelle version' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Créer la première version' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ajouter un fichier' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Télécharger' })).toHaveCount(0);
});

test('a doctoral student uploads a file the supervisor can only download', async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const stamp = Date.now().toString(36);
  const title = `Chapitre fichier ${stamp}`;
  const ada = await register(request, `e2e-file-ada-${stamp}@example.test`, 'Ada', 'Martin');
  const noa = await register(request, `e2e-file-noa-${stamp}@example.test`, 'Noa', 'Bernard');
  const thesisId = await createThesis(request, ada.cookie, `These fichier ${stamp}`);
  await invite(request, ada.cookie, noa.cookie, thesisId, noa.email);
  await createPlainDeliverable(request, ada.cookie, thesisId, title);

  await login(page, ada.email);
  await page.goto('/livrables');
  await page.getByRole('link', { name: new RegExp(title) }).click();
  await page.getByRole('button', { name: 'Créer la première version' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Résumé des modifications').fill('Version avec document');
  await dialog.getByRole('button', { name: 'Enregistrer la version' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Sans fichier')).toBeVisible();
  await page.getByLabel('Choisir un fichier').setInputFiles('e2e/fixtures/chapitre.pdf');
  await expect(page.getByText('chapitre.pdf').first()).toBeVisible();
  await expect(page.getByText('· PDF ·')).toBeVisible();
  await page.reload();
  await expect(page.getByText('chapitre.pdf').first()).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger' }).click();
  const saved = await download;
  expect(saved.suggestedFilename()).toContain('chapitre.pdf');
  await logout(page, 'Ada Martin');

  await login(page, noa.email);
  await page.goto(`/encadrement/${thesisId}/livrables`);
  await page.getByRole('link', { name: title, exact: true }).click();
  await expect(page.getByText('chapitre.pdf').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Télécharger' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ajouter un fichier' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Supprimer' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Remplacer' })).toHaveCount(0);
});

test('deliverable filters stay in the address bar', async ({ page, request }) => {
  test.setTimeout(90_000);
  const stamp = Date.now().toString(36);
  const title = `Article anomalie ${stamp}`;
  const objectiveTitle = `Filtre objectif ${stamp}`;
  const ada = await register(request, `e2e-filter-ada-${stamp}@example.test`, 'Ines', 'Martin');
  const noa = await register(request, `e2e-filter-noa-${stamp}@example.test`, 'Noa', 'Bernard');
  const thesisId = await createThesis(request, ada.cookie, `These filtres ${stamp}`);
  await invite(request, ada.cookie, noa.cookie, thesisId, noa.email);
  const objectiveId = await createObjective(request, noa.cookie, thesisId, objectiveTitle);
  await createDeliverable(request, ada.cookie, thesisId, title, objectiveId);

  await login(page, ada.email);
  await page.goto('/livrables');
  await page.getByRole('tab', { name: 'Brouillons' }).click();
  await page.getByPlaceholder('Rechercher…').fill('anomalie');
  await page.getByRole('button', { name: 'Afficher les filtres' }).click();
  await page.getByLabel('Type', { exact: true }).selectOption({ label: 'Article' });
  await page.getByLabel('Objectif', { exact: true }).selectOption({ label: objectiveTitle });
  await expect(page).toHaveURL(/status=DRAFT/);
  await expect(page).toHaveURL(/search=anomalie/);
  await expect(page).toHaveURL(/type=ARTICLE/);
  await expect(page).toHaveURL(new RegExp(`objectiveId=${objectiveId}`));
  await page.reload();
  await expect(page.getByText(title)).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Brouillons' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
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

async function createObjective(
  request: APIRequestContext,
  cookie: string,
  thesisId: string,
  title: string,
) {
  const response = await request.post(`/api/v1/theses/${thesisId}/objectives`, {
    headers: { cookie, 'x-csrf-token': csrf(cookie) },
    data: { title },
  });
  expect(response.status()).toBe(201);
  const body = (await response.json()) as { id: string };
  return body.id;
}

async function createPlainDeliverable(
  request: APIRequestContext,
  cookie: string,
  thesisId: string,
  title: string,
) {
  const response = await request.post(`/api/v1/theses/${thesisId}/deliverables`, {
    headers: { cookie, 'x-csrf-token': csrf(cookie) },
    data: { title, type: 'THESIS_CHAPTER' },
  });
  expect(response.status()).toBe(201);
}

async function createDeliverable(
  request: APIRequestContext,
  cookie: string,
  thesisId: string,
  title: string,
  objectiveId: string,
) {
  const response = await request.post(`/api/v1/theses/${thesisId}/deliverables`, {
    headers: { cookie, 'x-csrf-token': csrf(cookie) },
    data: { title, type: 'ARTICLE', objectiveId, description: 'Detection d anomalie' },
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
