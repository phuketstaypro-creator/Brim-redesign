import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { loadContent } from '../../src/content/load-content.mjs';
import { collectPublicRoutes } from '../../src/content/validate.mjs';

const projectRoot = resolve(import.meta.dirname, '../..');
const content = await loadContent({ env: { CONTENT_ADAPTER: 'local' }, cwd: projectRoot });
const publicRoutes = collectPublicRoutes(content);
const { svedenSections } = content;

function captureBrowserErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

test('all adapter routes return filled HTML without JavaScript rendering', async ({ request }) => {
  expect(new Set(publicRoutes).size).toBe(publicRoutes.length);

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

test('every referenced image URL is first-party, decodable and never HTML', async ({ page, request }) => {
  const assetUrls = new Set();
  for (const route of publicRoutes) {
    const html = await (await request.get(route)).text();
    for (const match of html.matchAll(/\b(?:src|href)="(\/assets\/(?:images|icons|media)\/[^"?#]+)"/g)) {
      assetUrls.add(match[1]);
    }
    for (const match of html.matchAll(/\bsrcset="([^"]+)"/g)) {
      for (const candidate of match[1].split(',')) assetUrls.add(candidate.trim().split(/\s+/)[0]);
    }
  }

  expect(assetUrls.size).toBeGreaterThan(20);
  for (const asset of assetUrls) {
    expect(asset.startsWith('/assets/'), asset).toBe(true);
    const response = await request.get(asset);
    expect(response.status(), asset).toBe(200);
    expect(response.headers()['content-type'], asset).toMatch(/^image\//);
    expect((await response.body()).byteLength, asset).toBeGreaterThan(100);
  }

  for (const route of ['/', '/news/', '/education/', '/gallery/']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const images = page.locator('img');
    const count = await images.count();
    expect(count, route).toBeGreaterThan(1);
    for (let index = 0; index < count; index += 1) {
      const target = images.nth(index);
      await target.scrollIntoViewIfNeeded();
      await expect.poll(() => target.evaluate((img) => img.complete && img.naturalWidth > 0), { message: `${route} image ${index}` }).toBe(true);
    }
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

  const realMediaIds = await page.locator('.editorial-media img').evaluateAll((images) => images.map((image) => image.dataset.mediaId));
  expect(new Set(realMediaIds).size).toBeGreaterThanOrEqual(5);
  await expect(page.locator('.editorial-card.is-no-media')).toHaveCount(1);

  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach('news-390', { body: screenshot, contentType: 'image/png' });
});

test('mobile menu opens the Sveden disclosure and closes it before the overlay on Escape', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'networkidle' });

  const menuButton = page.locator('#menu-button');
  const navigation = page.locator('#primary-nav');
  const firstNavigationSummary = navigation.locator('[data-nav-summary]').first();
  const svedenSummary = navigation.locator('[data-nav-summary]').filter({ hasText: 'Сведения' });
  const svedenDisclosure = svedenSummary.locator('..');

  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await menuButton.focus();
  await menuButton.press('Enter');

  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  await expect(menuButton).toHaveText('Закрыть');
  await expect(navigation).toHaveClass(/\bopen\b/);
  await expect(page.locator('body')).toHaveClass(/\bmenu-open\b/);
  await expect(firstNavigationSummary).toBeFocused();

  await svedenSummary.focus();
  await svedenSummary.press('Enter');
  await expect(svedenDisclosure).toHaveAttribute('open', '');
  await expect(svedenDisclosure.locator('a[href="/sveden/"]')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(svedenDisclosure).not.toHaveAttribute('open', '');
  await expect(svedenSummary).toBeFocused();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation).toHaveClass(/\bopen\b/);

  await page.keyboard.press('Escape');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await expect(menuButton).toHaveText('Меню');
  await expect(navigation).not.toHaveClass(/\bopen\b/);
  await expect(page.locator('body')).not.toHaveClass(/\bmenu-open\b/);
  await expect(menuButton).toBeFocused();
  expect(browserErrors).toEqual([]);
});

test('desktop hierarchical navigation supports click, keyboard, Escape and exact current state', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/sveden/common/', { waitUntil: 'networkidle' });

  const navigation = page.locator('#primary-nav');
  const collegeSummary = navigation.locator('[data-nav-summary]').filter({ hasText: 'Колледж' });
  const collegeDisclosure = collegeSummary.locator('..');
  const svedenSummary = navigation.locator('[data-nav-summary]').filter({ hasText: 'Сведения' });
  const svedenDisclosure = svedenSummary.locator('..');
  const currentLink = svedenDisclosure.locator('a[href="/sveden/common/"]');

  await collegeSummary.click();
  await expect(collegeDisclosure).toHaveAttribute('open', '');

  await svedenSummary.click();
  await expect(svedenDisclosure).toHaveAttribute('open', '');
  await expect(collegeDisclosure).not.toHaveAttribute('open', '');
  await expect(currentLink).toBeVisible();
  await expect(currentLink).toHaveAttribute('aria-current', 'page');
  await expect(svedenDisclosure.locator('a[aria-current="page"]')).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(svedenDisclosure).not.toHaveAttribute('open', '');
  await expect(svedenSummary).toBeFocused();

  await svedenSummary.press('Enter');
  await expect(svedenDisclosure).toHaveAttribute('open', '');
  await expect(currentLink).toHaveAttribute('aria-current', 'page');
  expect(browserErrors).toEqual([]);
});

test('Sveden index, contextual directory and site map preserve the information architecture', async ({ page }) => {
  const mandatorySections = svedenSections.filter((section) => section.group === 'mandatory');
  const legacySections = svedenSections.filter((section) => section.group === 'legacy');

  await page.goto('/sveden/', { waitUntil: 'networkidle' });
  const disclosureGroups = page.locator('.disclosure-group');
  await expect(disclosureGroups).toHaveCount(2);
  await expect(disclosureGroups.nth(0).getByRole('heading', { level: 2 })).toHaveText('Обязательные подразделы');
  await expect(disclosureGroups.nth(0).locator('.sveden-grid > a')).toHaveCount(mandatorySections.length);
  await expect(disclosureGroups.nth(1).getByRole('heading', { level: 2 })).toHaveText('Сервисы и открытость');
  for (const section of legacySections) {
    await expect(disclosureGroups.nth(1).locator(`a[href="${section.href}"]`)).toBeVisible();
  }
  await expect(disclosureGroups.nth(1).locator('a[href="/students/psychological-service/"]')).toBeVisible();

  await page.goto('/sveden/managers/', { waitUntil: 'networkidle' });
  const mandatoryDirectory = page.locator('.disclosure-directory details').nth(0);
  await expect(mandatoryDirectory).toHaveAttribute('open', '');
  await expect(mandatoryDirectory.locator('a[href="/sveden/managers/"]')).toHaveAttribute('aria-current', 'page');

  await page.goto('/students/psychological-service/', { waitUntil: 'networkidle' });
  const supplementalDirectory = page.locator('.disclosure-directory details').nth(1);
  await expect(supplementalDirectory).toHaveAttribute('open', '');
  await expect(supplementalDirectory.locator('a[href="/students/psychological-service/"]')).toHaveAttribute('aria-current', 'page');

  await page.goto('/sitemap/', { waitUntil: 'networkidle' });
  await expect(page.locator('.site-map-grid')).toBeVisible();
  await expect(page.locator('.site-map-section')).toHaveCount(7);
  await expect(page.locator('.site-map-grid a[href="/sveden/managers/"]')).toBeVisible();
  await expect(page.locator('.site-map-grid a[href="/students/psychological-service/"]').first()).toBeVisible();
  await expect(page.locator('.site-map-grid a[href="/resources/ballet-buryatia-dictionary/"]')).toBeVisible();
});

test('new institutional routes and hierarchical navigation remain filled with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, locale: 'ru-RU' });
  const page = await context.newPage();

  try {
    await page.goto('/students/psychological-service/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).not.toHaveClass(/\bnav-enhanced\b/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Психологическая служба');
    await expect(page.locator('.legal-note')).toContainText('Утверждённые материалы не переданы для публикации');
    await expect(page.locator('#primary-nav [data-nav-summary]').filter({ hasText: 'Сведения' })).toHaveCount(1);
    await expect(page.locator('#primary-nav a[href="/students/psychological-service/"]')).toHaveCount(2);
    await expect(page.locator('.disclosure-directory a[href="/students/psychological-service/"]')).toHaveAttribute('aria-current', 'page');

    await page.goto('/sveden/managers/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Руководство');
    await expect(page.locator('.disclosure-directory a[href="/sveden/managers/"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#primary-nav a[href="/sveden/managers/"]')).toHaveAttribute('aria-current', 'page');

    await page.goto('/sitemap/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Карта сайта');
    await expect(page.locator('.site-map-grid')).toBeVisible();
    await expect(page.locator('.site-map-grid a[href="/sveden/managers/"]')).toBeVisible();
    await expect(page.locator('.site-map-grid a[href="/culture-for-schoolchildren/roadmap/"]')).toBeVisible();
  } finally {
    await context.close();
  }
});

test('accessibility settings persist, reset and keep dialog focus deterministic', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('brhk-access'));
  await page.reload({ waitUntil: 'networkidle' });

  const trigger = page.locator('[data-access-open]');
  const panel = page.locator('#access-panel');
  const closeButton = panel.locator('[data-access-close]');
  const resetButton = panel.locator('[data-access-reset]');

  await trigger.focus();
  await trigger.press('Enter');
  await expect(panel).toHaveClass(/\bopen\b/);
  await expect(panel).toHaveAttribute('aria-hidden', 'false');
  await expect(closeButton).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(resetButton).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(closeButton).toBeFocused();

  await panel.getByRole('button', { name: 'A++', exact: true }).click();
  await panel.getByRole('button', { name: 'Контраст', exact: true }).click();
  await panel.getByRole('button', { name: 'Скрыть', exact: true }).click();
  await panel.getByRole('button', { name: 'Увеличенные', exact: true }).click();
  await panel.getByRole('button', { name: 'Выключить', exact: true }).click();

  await expect(page.locator('html')).toHaveAttribute('data-size', 'xlarge');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'contrast');
  await expect(page.locator('html')).toHaveAttribute('data-images', 'off');
  await expect(page.locator('html')).toHaveAttribute('data-spacing', 'wide');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('brhk-access')))).toEqual({
    size: 'xlarge',
    theme: 'contrast',
    images: 'off',
    spacing: 'wide',
    motion: 'off'
  });

  await page.keyboard.press('Escape');
  await expect(panel).toHaveAttribute('aria-hidden', 'true');
  await expect(trigger).toBeFocused();

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-size', 'xlarge');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'contrast');
  await expect(page.locator('html')).toHaveAttribute('data-images', 'off');
  await expect(page.locator('html')).toHaveAttribute('data-spacing', 'wide');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');

  await trigger.click();
  await expect(panel.getByRole('button', { name: 'A++', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByRole('button', { name: 'Контраст', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByRole('button', { name: 'Скрыть', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByRole('button', { name: 'Увеличенные', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByRole('button', { name: 'Выключить', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await resetButton.click();
  await expect(page.locator('html')).toHaveAttribute('data-size', 'normal');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'normal');
  await expect(page.locator('html')).toHaveAttribute('data-images', 'on');
  await expect(page.locator('html')).toHaveAttribute('data-spacing', 'normal');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('brhk-access')))).toEqual({
    size: 'normal',
    theme: 'normal',
    images: 'on',
    spacing: 'normal',
    motion: 'on'
  });

  await closeButton.click();
  await expect(panel).toHaveAttribute('aria-hidden', 'true');
  await expect(trigger).toBeFocused();
  expect(browserErrors).toEqual([]);
});

test('search dialog handles short queries, returns content and navigates to a result', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/', { waitUntil: 'networkidle' });

  const trigger = page.locator('[data-search-open]');
  const modal = page.locator('#search-modal');
  const input = page.locator('#site-search');
  const results = page.locator('#search-results');

  await trigger.click();
  await expect(modal).toHaveClass(/\bopen\b/);
  await expect(modal).toHaveAttribute('aria-hidden', 'false');
  await expect(input).toBeFocused();

  await input.fill('б');
  await expect(results).toHaveText('Введите минимум два символа.');
  await page.keyboard.press('Escape');
  await expect(modal).toHaveAttribute('aria-hidden', 'true');
  await expect(trigger).toBeFocused();

  await trigger.click();
  await input.fill('байкале');
  const result = results.getByRole('link', { name: /Балет на Байкале/i });
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute('href', '/news/balet-na-baikale/');
  await result.click();

  await expect(page).toHaveURL(/\/news\/balet-na-baikale\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Балет на Байкале');
  expect(browserErrors).toEqual([]);
});
