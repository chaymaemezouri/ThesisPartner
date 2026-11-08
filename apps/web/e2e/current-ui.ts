import { expect, type Page } from '@playwright/test';

/** Locators that match the current French UI. Keep e2e specs on these helpers. */

/** Seed localStorage so the first-login guide never opens in stubbed UI tests. */
export async function markFirstLoginGuideSeen(page: Page, userId: string) {
  await page.addInitScript((id: string) => {
    localStorage.setItem(`tp_guide_card_seen_v1:${id}:doctoral`, '1');
    localStorage.setItem(`tp_guide_card_seen_v1:${id}:supervisor`, '1');
  }, userId);
}

/** Close the one-shot first-login guide when it blocks the workspace. */
export async function dismissFirstLoginGuideIfPresent(page: Page) {
  const guide = page.getByRole('dialog', {
    name: /Doctorant — premiers pas|Encadrant — premiers pas/,
  });
  if (await guide.isVisible().catch(() => false)) {
    await guide.getByRole('button', { name: 'Fermer', exact: true }).click();
    await expect(guide).toBeHidden();
  }
}

export async function createObjectiveOnPage(page: Page, title: string) {
  await page.getByRole('button', { name: 'Nouvel objectif' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Titre').fill(title);
  await dialog.getByRole('button', { name: 'Créer l’objectif' }).click();
  await expect(dialog).toBeHidden();
}

export async function addObjectiveStep(page: Page, title: string) {
  await page.getByRole('button', { name: 'Nouvelle étape' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Titre').fill(title);
  await dialog.getByRole('button', { name: 'Ajouter l’étape' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('li').filter({ hasText: title })).toBeVisible();
}

export async function markStepDone(page: Page, title: string) {
  await page.getByRole('button', { name: title, exact: true }).click();
  await page.getByLabel(`Statut de ${title}`).selectOption({ label: 'Terminée' });
}

export async function revealVersionHistory(page: Page) {
  const history = page.getByRole('list', { name: 'Historique des versions' });
  if (await history.isVisible()) return history;
  await page.getByRole('button', { name: 'Historique des versions' }).click();
  await expect(history).toBeVisible();
  return history;
}
