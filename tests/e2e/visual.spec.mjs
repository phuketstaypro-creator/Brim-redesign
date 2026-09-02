import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const output = resolve(import.meta.dirname, '../../artifacts/screenshots');
mkdirSync(output, { recursive: true });

const matrix = [
  { name: 'home-390', route: '/', width: 390, height: 844 },
  { name: 'home-768', route: '/', width: 768, height: 1000 },
  { name: 'home-1440', route: '/', width: 1440, height: 1000 },
  { name: 'news-320', route: '/news/', width: 320, height: 760 },
  { name: 'news-390', route: '/news/', width: 390, height: 844 },
  { name: 'news-768', route: '/news/', width: 768, height: 1000 },
  { name: 'news-1440', route: '/news/', width: 1440, height: 1000 },
  { name: 'education-390', route: '/education/', width: 390, height: 844 },
  { name: 'education-1440', route: '/education/', width: 1440, height: 1000 },
  { name: 'sveden-390', route: '/sveden/', width: 390, height: 844 },
  { name: 'sveden-1440', route: '/sveden/', width: 1440, height: 1000 },
  { name: 'sveden-managers-390', route: '/sveden/managers/', width: 390, height: 844 },
  { name: 'sveden-managers-1440', route: '/sveden/managers/', width: 1440, height: 1000 },
  { name: 'sitemap-390', route: '/sitemap/', width: 390, height: 844 },
  { name: 'sitemap-1440', route: '/sitemap/', width: 1440, height: 1000 },
  { name: 'menu-open-390', route: '/', width: 390, height: 844, state: 'menu', fullPage: false },
  { name: 'menu-sveden-open-390', route: '/', width: 390, height: 844, state: 'menu-sveden', fullPage: false },
  { name: 'nav-sveden-open-1440', route: '/sveden/common/', width: 1440, height: 1000, state: 'sveden-nav', fullPage: false },
  { name: 'accessibility-open-390', route: '/', width: 390, height: 844, state: 'accessibility', fullPage: false },
  { name: 'accessibility-large-header-1181', route: '/', width: 1181, height: 900, state: 'size-large', fullPage: false },
  { name: 'accessibility-xlarge-header-1181', route: '/', width: 1181, height: 900, state: 'size-xlarge', fullPage: false },
  { name: 'accessibility-xlarge-header-1440', route: '/', width: 1440, height: 900, state: 'size-xlarge', fullPage: false }
];

async function loadWholePage(page) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = await page.evaluate(() => window.innerHeight);
  for (let position = 0; position < total; position += step) {
    await page.evaluate((top) => window.scrollTo(0, top), position);
    await page.waitForTimeout(12);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function prepareState(page, state) {
  if (state?.startsWith('size-')) {
    const size = state.slice('size-'.length);
    await page.locator('[data-access-open]').click();
    await page.locator(`[data-setting="size"][data-value="${size}"]`).click();
    await page.locator('[data-access-close]').click();
    await expect(page.locator('html')).toHaveAttribute('data-size', size);
  }

  if (state === 'menu' || state === 'menu-sveden') {
    const button = page.locator('#menu-button');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#primary-nav')).toHaveClass(/\bopen\b/);
  }

  if (state === 'menu-sveden' || state === 'sveden-nav') {
    const summary = page.locator('#primary-nav [data-nav-summary]').filter({ hasText: 'Сведения' });
    const disclosure = summary.locator('..');
    await summary.click();
    await expect(disclosure).toHaveAttribute('open', '');
    await expect(disclosure.locator('a[href="/sveden/"]')).toBeVisible();
  }

  if (state === 'accessibility') {
    await page.locator('[data-access-open]').click();
    await expect(page.locator('#access-panel')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#access-panel [data-access-close]')).toBeFocused();
  }
}

for (const entry of matrix) {
  test(`${entry.name} renders without broken media or overflow`, async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.removeItem('brhk-access'));
    await page.setViewportSize({ width: entry.width, height: entry.height });
    const response = await page.goto(entry.route, { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    await loadWholePage(page);

    const metrics = await page.evaluate(async () => {
      const images = [...document.images];
      await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
      return {
        bodyText: document.body.innerText.trim().length,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        brokenImages: images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.currentSrc || image.src)
      };
    });

    expect(metrics.bodyText).toBeGreaterThan(500);
    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.brokenImages).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);

    await prepareState(page, entry.state);
    await page.screenshot({ path: join(output, `${entry.name}.png`), fullPage: entry.fullPage ?? true });
  });
}
