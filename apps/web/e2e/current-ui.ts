import { expect, type Page } from '@playwright/test';

/** Locators that match the current French UI. Keep e2e specs on these helpers. */

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
