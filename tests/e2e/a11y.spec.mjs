import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const representativeRoutes = [
  '/',
  '/education/',
  '/news/',
  '/sveden/',
  '/sveden/common/'
];

for (const route of representativeRoutes) {
  test(`${route} has no serious or critical axe violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const blocking = results.violations.filter((violation) =>
      violation.impact === 'critical' || violation.impact === 'serious'
    );
    const summary = blocking.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.flatMap((node) => node.target)
    }));
    expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
  });
}
