import { expect, test } from '@playwright/test';

test('messaging stays readable for both participants on desktop and mobile', async ({ page }) => {
  test.setTimeout(90_000);
  const thesisId = '22222222-2222-4222-8222-222222222222';
  const conversationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const participants = [
    {
      userId: '11111111-1111-4111-8111-111111111111',
      displayName: 'Nora Bernard',
      avatarUrl: null,
    },
    {
      userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      displayName: 'Youssef El Amrani',
      avatarUrl: '/api/v1/users/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/avatar',
    },
  ];
  let actor = participants[0]!;
  const messages = Array.from({ length: 24 }, (_, index) => ({
    id: `33333333-3333-4333-8333-${String(index + 1).padStart(12, '0')}`,
    authorId: participants[index % 2]!.userId,
    authorName: participants[index % 2]!.displayName,
    body:
      index === 23
        ? 'Merci pour votre retour. Je vais préciser la méthodologie et vous envoyer la nouvelle version.'
        : index % 2 === 0
          ? 'Le protocole est clair. Pouvez-vous préciser le choix des indicateurs et la taille de l’échantillon ?'
          : 'Bonjour, voici mes questions concernant la prochaine étape du travail de recherche.',
    createdAt: `2026-10-${index < 12 ? '20' : '21'}T${String(9 + (index % 8)).padStart(2, '0')}:00:00.000Z`,
  }));
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === participants[1]!.avatarUrl) {
      await route.fulfill({
        path: 'public/tmp-avatars/youssef-el-amrani.jpg',
        contentType: 'image/jpeg',
      });
      return;
    }
    const summary = {
      id: conversationId,
      kind: 'DIRECT',
      title: null,
      thesisId,
      thesisTitle: 'Analyse des données et validation de la méthode',
      participants,
      lastMessage: { ...messages.at(-1)!, authorName: undefined },
      unread: true,
      updatedAt: '2026-10-21T16:00:00.000Z',
    };
    let body: unknown = {};
    if (path.endsWith('/auth/me'))
      body = {
        user: {
          id: actor.userId,
          displayName: actor.displayName,
          givenName: actor.displayName.split(' ')[0],
          familyName: actor.displayName.split(' ').slice(1).join(' '),
          email: 'demo@example.test',
          emailVerified: true,
        },
      };
    else if (path.endsWith('/supervision/theses'))
      body = {
        theses:
          actor === participants[0]
            ? [
                {
                  thesisId,
                  title: summary.thesisTitle,
                  status: 'ACTIVE',
                  discipline: null,
                  institution: null,
                  startedOn: null,
                  expectedDefenseOn: null,
                  durationYears: null,
                  progressPercentage: 50,
                  deliverableCount: 2,
                  pendingValidationCount: 0,
                  pendingDeliverables: [],
                  supervisors: [],
                  meetings: [],
                  doctoralStudent: {
                    id: participants[1]!.userId,
                    givenName: 'Youssef',
                    familyName: 'El Amrani',
                    avatarUrl: null,
                    institution: null,
                    specialty: null,
                  },
                  doctoralStudents: [],
                  objectiveSummary: { total: 2, inProgress: 1, completed: 1, overdue: 0 },
                },
              ]
            : [],
      };
    else if (path.endsWith('/messages/conversations'))
      body = {
        conversations: [summary],
        students:
          actor === participants[0]
            ? [{ userId: participants[1]!.userId, displayName: participants[1]!.displayName }]
            : [],
      };
    else if (path.endsWith(`/messages/conversations/${conversationId}`))
      body = {
        id: conversationId,
        kind: 'DIRECT',
        title: null,
        thesisId,
        thesisTitle: summary.thesisTitle,
        participants,
        createdById: participants[0]!.userId,
        messages,
      };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  for (const participant of participants) {
    actor = participant;
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 850 });
      await page.goto(`/messagerie/${conversationId}`);
      const composer = page.getByRole('textbox', { name: 'Message', exact: true });
      await expect(composer).toBeVisible();
      await expect(page.getByRole('list', { name: 'Messages', exact: true })).toBeVisible();
      if (participant === participants[0]) {
        const photo = page.locator('main header img');
        await expect(photo).toHaveAttribute('src', participants[1]!.avatarUrl!);
        await expect
          .poll(() => photo.evaluate((element) => (element as HTMLImageElement).naturalWidth))
          .toBeGreaterThan(0);
      }
      await composer.fill('Mon brouillon de réponse');
      await page.getByRole('button', { name: 'Émojis', exact: true }).click();
      const emojiPicker = page.getByRole('group', { name: 'Émojis', exact: true });
      await expect(emojiPicker).toBeVisible();
      const emojiBox = await emojiPicker.boundingBox();
      expect(emojiBox!.x).toBeGreaterThanOrEqual(0);
      expect(emojiBox!.y).toBeGreaterThanOrEqual(0);
      expect(emojiBox!.x + emojiBox!.width).toBeLessThanOrEqual(width);
      await emojiPicker.getByRole('button', { name: 'Fermer' }).click();
      await page.getByRole('button', { name: 'Détails de la conversation' }).click();
      const details = page.getByRole('dialog', { name: 'Détails de la conversation' });
      await expect(details.getByRole('list').getByRole('listitem')).toHaveCount(2);
      await details.getByRole('button', { name: 'Fermer' }).click();
      await expect(composer).toHaveValue('Mon brouillon de réponse');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe(
        '13px',
      );
      const box = await composer.boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(850);
      if (process.env.CAPTURE_UI) {
        await page.screenshot({
          path: `../../artifacts/messages/${participant === participants[0] ? 'supervisor' : 'student'}-${width}.png`,
        });
      }
      if (width === 375) {
        await page.getByRole('link', { name: 'Retour à la boîte' }).click();
        await expect(page.getByRole('searchbox')).toBeVisible();
        await page
          .getByRole('link', { name: /Nora Bernard|Youssef El Amrani/ })
          .filter({ has: page.locator('time') })
          .click();
        await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue(
          'Mon brouillon de réponse',
        );
      }
    }
  }
});
