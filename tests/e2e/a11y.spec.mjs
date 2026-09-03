import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const representativeRoutes = [
  '/',
  '/education/',
  '/news/',
  '/sveden/',
  '/sveden/common/',
  '/sveden/managers/',
  '/students/psychological-service/',
  '/sitemap/'
];

async function blockingAxeViolations(page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations
    .filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.flatMap((node) => node.target)
    }));
}

for (const route of representativeRoutes) {
  test(`${route} has no serious or critical axe violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'networkidle' });
    const summary = await blockingAxeViolations(page);
    expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
  });
}

for (const route of ['/en/', '/en/sveden/common/', '/zh/', '/zh/sveden/common/']) {
  test(`${route} localized document has no serious or critical axe violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'networkidle' });
    const summary = await blockingAxeViolations(page);
    expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
  });
}

test('expanded desktop Sveden navigation has no serious or critical axe violations', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/sveden/common/', { waitUntil: 'networkidle' });
  await page.locator('#primary-nav [data-nav-summary]').filter({ hasText: 'Сведения' }).click();
  const summary = await blockingAxeViolations(page);
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
});

test('expanded mobile Sveden navigation has no serious or critical axe violations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.locator('#menu-button').click();
  await page.locator('#primary-nav [data-nav-summary]').filter({ hasText: 'Сведения' }).click();
  const summary = await blockingAxeViolations(page);
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
});

test('expanded desktop language selector has no serious or critical axe violations', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/en/sveden/common/', { waitUntil: 'networkidle' });
  await page.locator('.language-disclosure > summary').click();
  const summary = await blockingAxeViolations(page);
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
});

test('language selector inside the Chinese mobile menu has no serious or critical axe violations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/zh/', { waitUntil: 'networkidle' });
  await page.locator('#menu-button').click();
  await page.locator('.language-disclosure > summary').click();
  const summary = await blockingAxeViolations(page);
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
});
