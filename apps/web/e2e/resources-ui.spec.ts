import { expect, test, type Page } from '@playwright/test';

const thesisId = '22222222-2222-4222-8222-222222222222';
const author = {
  id: '44444444-4444-4444-8444-444444444444',
  givenName: 'Youssef',
  familyName: 'El Amrani',
};
const profile = {
  givenName: author.givenName,
  familyName: author.familyName,
  displayName: 'Youssef El Amrani',
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
};
const thesis = {
  id: thesisId,
  title: 'Méthodes de recherche et données FAIR',
  status: 'ACTIVE',
  discipline: null,
  institution: null,
  startedOn: null,
  expectedDefenseOn: null,
  supervisors: [],
};
const firstDocument = {
  id: '55555555-5555-4555-8555-555555555555',
  title: 'Guide FAIR pour les données de thèse',
  kind: 'ARTICLE',
  authors: 'Camille Martin',
  reference: null,
  url: 'https://example.org/fair',
  fileName: null,
  access: 'SHARED',
  canOpen: true,
  importance: 'MEDIUM',
  priority: 'NORMAL',
  dueDate: null,
  overdue: false,
  instructions: null,
  objectiveId: null,
  objectiveTitle: null,
  taskId: null,
  stepTitle: null,
  status: 'SUBMITTED',
  summary: 'Une synthèse des principes FAIR pour la thèse.',
  methodology: null,
  results: null,
  limits: null,
  thesisLink: null,
  exploitation: null,
  subjectRelevance: 'UNSET',
  synthesisFileName: null,
  source: 'SUPERVISOR',
  mine: false,
  reviewMessage: null,
  sharedOn: '2026-10-22',
};
type TestDocument = Omit<typeof firstDocument, 'url' | 'summary'> & {
  url: string | null;
  summary: string | null;
};
const documents: TestDocument[] = [
  firstDocument,
  {
    ...firstDocument,
    id: '66666666-6666-4666-8666-666666666666',
    title: 'Mon article sur les données FAIR',
    url: null,
    status: 'TO_READ',
    source: 'STUDENT',
    mine: true,
    summary: null,
  },
  {
    ...firstDocument,
    id: '77777777-7777-4777-8777-777777777777',
    title: 'Rédiger un article scientifique',
    kind: 'REPORT',
    subjectRelevance: 'IMPORTANT',
    status: 'SYNTHESIS_DRAFT',
  },
];

async function mockDocuments(page: Page) {
  let supervisor = false;
  const mutations: string[] = [];
  const synthesisRequests: Array<{
    id: string;
    summary: string;
    subjectRelevance: string;
    submit?: boolean;
  }> = [];
  let rejectNextSynthesis = false;
  let currentDocuments = documents.map((item) => ({ ...item }));
  const desk = () => ({
    canManage: supervisor,
    objectives: [],
    documents: currentDocuments,
    summary: {
      proposed: 2,
      consulted: 2,
      drafts: 1,
      submitted: 1,
      validated: 0,
      priorityOpen: 0,
      overdue: 0,
    },
  });
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() !== 'GET') mutations.push(path);
    let body: unknown = {};
    if (path.endsWith('/auth/me'))
      body = {
        user: {
          ...author,
          displayName: profile.displayName,
          email: 'demo@example.test',
          emailVerified: true,
        },
      };
    else if (path.endsWith('/resources')) body = { canShare: supervisor, resources: [] };
    else if (path.endsWith('/dashboard'))
      body = {
        profile,
        thesis,
        progress: { percentage: 60, status: 'ON_TRACK' },
        workProgress: { percentage: 60 },
        profileCompletion: { percentage: 50, missingFields: [] },
        kpis: [],
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
                deliverableCount: 0,
                pendingValidationCount: 0,
                pendingDeliverables: [],
                supervisors: [],
                meetings: [],
                doctoralStudent: { ...author, avatarUrl: null, institution: null, specialty: null },
                doctoralStudents: [],
                objectiveSummary: { total: 0, inProgress: 0, completed: 0, overdue: 0 },
              },
            ]
          : [],
      };
    else if (path.endsWith('/documents')) body = desk();
    else if (path.endsWith('/synthesis')) {
      const id = path.split('/').at(-2)!;
      const payload = route.request().postDataJSON() as {
        summary: string;
        subjectRelevance: string;
        submit?: boolean;
      };
      synthesisRequests.push({ id, ...payload });
      if (rejectNextSynthesis) {
        rejectNextSynthesis = false;
        await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
        return;
      }
      currentDocuments = currentDocuments.map((item) =>
        item.id === id
          ? {
              ...item,
              summary: payload.summary,
              subjectRelevance: payload.subjectRelevance,
              status: payload.submit ? 'SUBMITTED' : 'SYNTHESIS_DRAFT',
            }
          : item,
      );
      body = desk();
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  return {
    mutations,
    synthesisRequests,
    setSupervisor: () => {
      supervisor = true;
    },
    rejectNextSynthesis: () => {
      rejectNextSynthesis = true;
    },
  };
}

test('document controls stay compact and preserve collapsed filters on mobile', async ({
  page,
}) => {
  const workspace = await mockDocuments(page);
  for (const width of [1440, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/ressources');
    const searchArea = page.getByRole('search', { name: 'Rechercher un document' });
    const search = searchArea.getByRole('searchbox');
    const filterButton = searchArea.getByRole('button', { name: /^Filtres/ });
    const kind = searchArea.getByRole('combobox', { name: 'Type', exact: true });
    await expect(search).toBeVisible();
    await expect(searchArea.getByRole('status')).toHaveText('2 sur 2 documents');
    const stats = page.locator('dl[aria-label="Résumé des documents"]');
    expect((await stats.boundingBox())!.height).toBeLessThan(60);
    expect((await searchArea.boundingBox())!.height).toBeLessThan(80);
    if (width < 640) {
      await expect(kind).not.toBeVisible();
      await expect(filterButton).toHaveAttribute('aria-expanded', 'false');
    } else {
      await expect(kind).toBeVisible();
      await expect(filterButton).not.toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (process.env.CAPTURE_UI)
      await page.screenshot({ path: `../../artifacts/resources/compact-controls-${width}.png` });
    await search.fill('REDIGER');
    await expect(searchArea.getByRole('status')).toHaveText('1 sur 2 documents');
    if (width < 640) await filterButton.click();
    await kind.selectOption('ARTICLE');
    await expect(page.getByText('Aucun document ne correspond à votre recherche.')).toBeVisible();
    await searchArea.getByRole('button', { name: 'Effacer les filtres' }).click();
    await expect(searchArea.getByRole('status')).toHaveText('2 sur 2 documents');
    await kind.selectOption('REPORT');
    await expect(searchArea.getByRole('status')).toHaveText('1 sur 2 documents');
    if (width < 640) {
      await expect(filterButton).toHaveText('Filtres (1)');
      await filterButton.click();
      await expect(kind).not.toBeVisible();
      await expect(searchArea.getByRole('status')).toHaveText('1 sur 2 documents');
      await filterButton.click();
      await expect(kind).toHaveValue('REPORT');
      await filterButton.click();
    }
    await searchArea.getByRole('button', { name: 'Effacer les filtres' }).click();
    await expect(searchArea.getByRole('status')).toHaveText('2 sur 2 documents');
    await page.getByRole('tab', { name: /Mes documents/ }).click();
    await expect(searchArea.getByRole('status')).toHaveText('1 sur 1 documents');
    await expect(
      page.getByRole('table').getByRole('button', { name: documents[1]!.title, exact: true }),
    ).toBeVisible();
  }
  expect(workspace.mutations).toEqual([]);
});

test('document search, combined filters and synthesis work on desktop and mobile', async ({
  page,
}) => {
  const workspace = await mockDocuments(page);

  for (const width of [1440, 1024, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/ressources');
    const search = page.getByRole('searchbox', { name: 'Rechercher un document' });
    await expect(search).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('2 sur 2 documents');
    const table = page.getByRole('table', { name: 'Mes documents' });
    await expect(
      table.getByRole('button', { name: firstDocument.title, exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe(
      '13px',
    );
    if (process.env.CAPTURE_UI)
      await page.screenshot({ path: `../../artifacts/resources/documents-${width}.png` });

    // Search ignores accents and case, including author names.
    await search.fill('REDIGER');
    await expect(page.getByRole('status')).toHaveText('1 sur 2 documents');
    await expect(
      table.getByRole('button', { name: documents[2]!.title, exact: true }),
    ).toBeVisible();
    if (width < 640) await page.getByRole('button', { name: /^Filtres/ }).click();
    await page.getByRole('combobox', { name: 'Type', exact: true }).selectOption('ARTICLE');
    await expect(page.getByText('Aucun document ne correspond à votre recherche.')).toBeVisible();
    await page.getByRole('button', { name: 'Effacer les filtres' }).first().click();
    await expect(page.getByRole('status')).toHaveText('2 sur 2 documents');
    await search.fill('camille martin');
    await expect(page.getByRole('status')).toHaveText('2 sur 2 documents');
    await search.fill('');
    await page.getByRole('combobox', { name: 'Statut', exact: true }).selectOption('SUBMITTED');
    await expect(page.getByRole('status')).toHaveText('1 sur 2 documents');
    const title = table.getByRole('button', { name: firstDocument.title, exact: true });
    await title.focus();
    await page.keyboard.press('Enter');
    await expect(title).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText(firstDocument.summary, { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Effacer les filtres' }).click();
    await expect(page.getByText(firstDocument.summary, { exact: false })).toHaveCount(0);
    await page.getByRole('button', { name: 'Ajouter mon document' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(dialog).not.toBeVisible();
  }

  workspace.setSupervisor();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/ressources');
  await expect(
    page.getByRole('button', { name: 'Ajouter un document', exact: true }),
  ).toBeVisible();
  await page.getByRole('searchbox').fill('youssef');
  await expect(page.getByRole('status')).toHaveText('3 sur 3 documents');
  await page.getByRole('combobox', { name: 'Type', exact: true }).selectOption('REPORT');
  await expect(page.getByRole('status')).toHaveText('1 sur 3 documents');
  await expect(page.getByRole('cell', { name: documents[2]!.title })).toBeVisible();
  // Browsing, filtering and cancelling the form must never write to the API.
  expect(workspace.mutations).toEqual([]);
});

for (const source of ['SUPERVISOR', 'STUDENT']) {
  test(`the student writes a synthesis then chooses relevance for a ${source} document`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    const workspace = await mockDocuments(page);
    const item = source === 'STUDENT' ? documents[1]! : documents[2]!;
    const relevance = source === 'STUDENT' ? 'NOT_IMPORTANT' : 'IMPORTANT';
    await page.goto('/ressources');
    if (source === 'STUDENT') await page.getByRole('tab', { name: /Mes documents/ }).click();
    const table = page.getByRole('table', { name: 'Mes documents' });
    const row = table
      .getByRole('row')
      .filter({ has: page.getByRole('button', { name: item.title, exact: true }) });
    await row
      .getByRole('button', {
        name: source === 'STUDENT' ? 'Ajouter une synthèse' : 'Poursuivre la synthèse',
      })
      .click();
    const form = page.getByRole('form', { name: `Synthèse — ${item.title}` });
    const summary = form.getByRole('textbox', { name: 'Résumé', exact: true });
    await summary.fill('');
    await form.getByRole('button', { name: 'Continuer', exact: true }).click();
    await expect(summary).toBeFocused();
    await expect(summary).toHaveAttribute('aria-invalid', 'true');
    expect(workspace.synthesisRequests).toHaveLength(0);
    const text = `Ma synthèse du document ${source}.`;
    await summary.fill(text);
    if (process.env.CAPTURE_UI)
      await page.screenshot({ path: `../../artifacts/resources/synthesis-${source}-write.png` });
    await form.getByRole('button', { name: 'Continuer', exact: true }).click();
    const select = form.getByRole('combobox', { name: 'Important pour mon sujet ?' });
    await expect(select).toBeVisible();
    // Even when a document already has an answer, it can be revised before submission.
    await select.selectOption('UNSET');
    await expect(
      form.getByRole('button', { name: 'Soumettre la synthèse', exact: true }),
    ).toBeDisabled();
    await form.getByRole('button', { name: 'Retour', exact: true }).click();
    await expect(summary).toHaveValue(text);
    await form.getByRole('button', { name: 'Enregistrer le brouillon' }).click();
    await expect(form.getByRole('status')).toHaveText('Brouillon enregistré.');
    await page.reload();
    if (source === 'STUDENT') await page.getByRole('tab', { name: /Mes documents/ }).click();
    await row.getByRole('button', { name: 'Poursuivre la synthèse' }).click();
    await expect(summary).toHaveValue(text);
    await form.getByRole('button', { name: 'Continuer', exact: true }).click();
    await select.selectOption(relevance);
    if (process.env.CAPTURE_UI)
      await page.screenshot({
        path: `../../artifacts/resources/synthesis-${source}-relevance.png`,
      });
    workspace.rejectNextSynthesis();
    await form.getByRole('button', { name: 'Soumettre la synthèse', exact: true }).click();
    await expect(form.getByRole('alert')).toBeVisible();
    await expect(select).toHaveValue(relevance);
    await form.getByRole('button', { name: 'Soumettre la synthèse', exact: true }).click();
    await expect(form).toHaveCount(0);
    await expect(row).toContainText('Synthèse soumise');
    await expect(row).toContainText(source === 'STUDENT' ? 'Non, peu pertinent' : 'Oui, important');
    await expect(page.getByText(text, { exact: false })).toBeVisible();
    await page.reload();
    if (source === 'STUDENT') await page.getByRole('tab', { name: /Mes documents/ }).click();
    await row.getByRole('button', { name: 'Voir la synthèse' }).click();
    await expect(page.getByText(text, { exact: false })).toBeVisible();
    expect(workspace.synthesisRequests).toHaveLength(3);
    expect(workspace.synthesisRequests[0]).toMatchObject({
      id: item.id,
      summary: text,
      subjectRelevance: 'UNSET',
    });
    expect(workspace.synthesisRequests[2]).toMatchObject({
      id: item.id,
      summary: text,
      subjectRelevance: relevance,
      submit: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
