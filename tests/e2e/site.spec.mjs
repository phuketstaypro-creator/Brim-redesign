import { expect, test } from '@playwright/test';
import { newsItems } from '../../src/data/news.mjs';
import { pages } from '../../src/data/pages.mjs';
import { svedenSections } from '../../src/data/sveden.mjs';

const publicRoutes = ['/', ...Object.keys(pages), ...newsItems.map((item) => item.href)];

test('all 36 routes return filled HTML without JavaScript rendering', async ({ request }) => {
  expect(publicRoutes).toHaveLength(36);
  expect(new Set(publicRoutes).size).toBe(36);

  for (const route of publicRoutes) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    expect(response.headers()['content-type'], route).toContain('text/html');
    const html = await response.text();
    const mainText = (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    expect((html.match(/<h1(?:\s|>)/gi) || []).length, route).toBe(1);
    expect(mainText.length, `${route}: empty server-rendered main`).toBeGreaterThan(100);
    expect(html, route).not.toContain('raw.githubusercontent.com');
    expect(html, route).not.toContain('<div id="app"></div>');
    expect(html, route).not.toContain('Загружаем интерфейс');
  }
});

test('unknown routes return the real 404 document and status', async ({ page }) => {
  const response = await page.goto('/route-that-must-not-exist-404/', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle(/Страница не найдена/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Страница не найдена');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});

test('mandatory education and sveden information remains discoverable', async ({ page, request }) => {
  await page.goto('/education/');
  const additionalPrograms = page.locator('.education-program-list-additional');
  await expect(additionalPrograms).toContainText('Школа креативных индустрий');
  await expect(additionalPrograms).toContainText('Балет для всех');
  await expect(page.locator('main')).toContainText('ШКИ');
  await expect(page.locator('main')).not.toContainText('Новые проекты');

  const sveden = await (await request.get('/sveden/')).text();
  for (const section of svedenSections) {
    expect(sveden, section.href).toContain(`href="${section.href}"`);
    expect((await request.get(section.href)).status(), section.href).toBe(200);
  }
});

test('official logo and favicon are served as images', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('header img.brand-logo')).toHaveCount(1);
  await expect(page.locator('footer img.footer-logo')).toHaveCount(1);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/assets/icons/favicon-32.png');

  for (const locator of [page.locator('header img.brand-logo'), page.locator('footer img.footer-logo')]) {
    await expect.poll(() => locator.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  }

  for (const asset of ['/assets/images/brhk-logo.png', '/assets/icons/favicon-32.png']) {
    const response = await request.get(asset);
    expect(response.status(), asset).toBe(200);
    expect(response.headers()['content-type'], asset).toMatch(/^image\//);
    expect((await response.body()).byteLength, asset).toBeGreaterThan(100);
  }
});

test('news remains a two-column mixed editorial grid at 390px', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/news/', { waitUntil: 'networkidle' });

  const metrics = await page.locator('.editorial-news').evaluate((grid) => {
    const cards = [...grid.querySelectorAll('.editorial-card')];
    const narrowCards = cards.filter((card) => !card.classList.contains('is-wide') && !card.classList.contains('is-featured'));
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return {
        x: Math.round(box.x),
        width: Math.round(box.width),
        height: Math.round(box.height),
        right: Math.round(box.right)
      };
    };
    return {
      columns: getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean),
      classes: cards.map((card) => card.className),
      firstTwo: cards.slice(0, 2).map(rect),
      narrow: narrowCards.map(rect),
      cards: cards.map(rect),
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      gridScrollWidth: grid.scrollWidth,
      gridClientWidth: grid.clientWidth
    };
  });

  expect(metrics.columns).toHaveLength(2);
  expect(new Set(metrics.firstTwo.map((card) => card.x)).size).toBe(2);
  expect(metrics.firstTwo.every((card) => card.width < 200)).toBe(true);
  expect(metrics.classes.some((value) => value.includes('is-portrait'))).toBe(true);
  expect(metrics.classes.some((value) => value.includes('is-landscape'))).toBe(true);
  expect(metrics.classes.some((value) => value.includes('is-square'))).toBe(true);
  expect(new Set(metrics.narrow.map((card) => card.x)).size).toBeGreaterThanOrEqual(2);
  expect(new Set(metrics.cards.map((card) => card.height)).size).toBeGreaterThanOrEqual(3);
  expect(metrics.narrow.every((card) => card.width < 200)).toBe(true);
  expect(metrics.cards.every((card) => card.right <= metrics.viewportWidth + 1)).toBe(true);
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.gridScrollWidth).toBeLessThanOrEqual(metrics.gridClientWidth);

  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach('news-390', { body: screenshot, contentType: 'image/png' });
});
