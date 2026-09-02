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

test('useful resources and college social links stay responsive and server-rendered', async ({ page }) => {
  const usefulLinks = [
    'https://bus.gov.ru/qrcode/rate/231927?agencyId=232834',
    'https://minkultrb.ru/',
    'https://edu.gov.ru/',
    'https://egov-buryatia.ru/minobr/',
    'https://culture.gov.ru/'
  ];

  for (const { width, height, columns } of [
    { width: 390, height: 844, columns: 1 },
    { width: 768, height: 1000, columns: 2 },
    { width: 1440, height: 1000, columns: 5 }
  ]) {
    await page.setViewportSize({ width, height });
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    const section = page.locator('.useful-links');
    await expect(section.getByRole('heading', { level: 2, name: 'Полезные ссылки' })).toBeVisible();
    await expect(section.locator('.useful-link-card')).toHaveCount(usefulLinks.length);
    for (const href of usefulLinks) {
      const link = section.locator(`a[href="${href}"]`);
      await expect(link, `${width}: ${href}`).toHaveCount(1);
      await expect(link).toHaveAttribute('rel', 'external');
    }

    const layout = await page.locator('.useful-links-grid').evaluate((grid) => ({
      columns: getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth
    }));
    expect(layout.columns, `${width}: useful link columns`).toBe(columns);
    expect(layout.documentWidth, `${width}: horizontal overflow`).toBeLessThanOrEqual(layout.viewportWidth);
  }

  const sectionOrder = await page.evaluate(() => {
    const useful = document.querySelector('.useful-links');
    const quick = document.querySelector('.quick-links');
    const footer = document.querySelector('.site-footer');
    return Boolean(useful && quick && footer
      && (useful.compareDocumentPosition(quick) & Node.DOCUMENT_POSITION_FOLLOWING)
      && (quick.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(sectionOrder).toBe(true);

  const footer = page.locator('footer');
  await expect(footer.getByRole('link', { name: 'БРХК во ВКонтакте' })).toHaveAttribute('href', 'https://vk.ru/uubrhk03');
  await expect(footer.getByRole('link', { name: 'БРХК в MAX' })).toHaveAttribute('href', 'https://max.ru/id323070083_gos');
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

test('news masonry packs natural-height cards without blank bands at every target width', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const targets = [
    { route: '/', name: 'home', count: 5 },
    { route: '/news/', name: 'archive', count: 6 }
  ];
  const widths = [320, 390, 768, 1440];
  const sourceOrders = new Map();

  for (const target of targets) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
      await page.goto(target.route, { waitUntil: 'networkidle' });
      const grid = page.locator('.editorial-news');
      await grid.scrollIntoViewIfNeeded();
      await expect(grid).toHaveAttribute('data-masonry', 'ready');

      const images = grid.locator('.editorial-media img');
      await expect.poll(() => images.evaluateAll((items) => items.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);
      await expect(grid).toHaveAttribute('data-masonry', 'ready');

      const metrics = await grid.evaluate((element) => {
        const gridBox = element.getBoundingClientRect();
        const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
        const cards = [...element.querySelectorAll(':scope > .editorial-card')].map((card) => {
          const cardBox = card.getBoundingClientRect();
          const linkBox = card.querySelector(':scope > a').getBoundingClientRect();
          const mediaBox = card.querySelector('.editorial-media').getBoundingClientRect();
          const copy = card.querySelector('.editorial-copy');
          const copyBox = copy.getBoundingClientRect();
          return {
            href: card.querySelector(':scope > a').getAttribute('href'),
            className: card.className,
            x: cardBox.x - gridBox.x,
            y: cardBox.y - gridBox.y,
            width: cardBox.width,
            height: cardBox.height,
            bottom: cardBox.bottom - gridBox.y,
            right: cardBox.right - gridBox.x,
            mediaCopySeam: copyBox.top - mediaBox.bottom,
            cardTopSeam: mediaBox.top - cardBox.top,
            cardBottomSeam: cardBox.bottom - copyBox.bottom,
            cardLinkDelta: cardBox.height - linkBox.height,
            contentDelta: linkBox.height - mediaBox.height - copyBox.height,
            copyOverflow: copy.scrollHeight - copy.clientHeight
          };
        });
        const lanes = new Map();
        for (const card of cards) {
          const lane = Math.round(card.x * 10) / 10;
          if (!lanes.has(lane)) lanes.set(lane, []);
          lanes.get(lane).push(card);
        }
        const laneGaps = [...lanes.values()].flatMap((items) => items
          .sort((left, right) => left.y - right.y)
          .slice(1)
          .map((item, index) => item.y - items[index].bottom));
        return {
          ready: element.dataset.masonry,
          gap,
          gridHeight: gridBox.height,
          gridWidth: gridBox.width,
          gridTail: gridBox.height - Math.max(...cards.map((card) => card.bottom)),
          laneCount: lanes.size,
          laneGaps,
          cards,
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth
        };
      });

      expect(metrics.ready, `${target.name}-${width}`).toBe('ready');
      expect(metrics.cards, `${target.name}-${width}`).toHaveLength(target.count);
      expect(metrics.laneCount, `${target.name}-${width}`).toBe(2);
      expect(Math.max(...metrics.cards.map((card) => card.width)) - Math.min(...metrics.cards.map((card) => card.width))).toBeLessThanOrEqual(1);
      expect(metrics.cards.every((card) => Math.abs(card.mediaCopySeam) <= 1)).toBe(true);
      expect(metrics.cards.every((card) => Math.abs(card.cardTopSeam) <= 1)).toBe(true);
      expect(metrics.cards.every((card) => Math.abs(card.cardBottomSeam) <= 1)).toBe(true);
      expect(metrics.cards.every((card) => Math.abs(card.cardLinkDelta) <= 1)).toBe(true);
      expect(metrics.cards.every((card) => Math.abs(card.contentDelta) <= 1)).toBe(true);
      expect(metrics.cards.every((card) => card.copyOverflow <= 1)).toBe(true);
      expect(metrics.cards.every((card) => card.right <= metrics.gridWidth + 1)).toBe(true);
      expect(metrics.cards.slice(1).every((card, index) => card.y + 1 >= metrics.cards[index].y)).toBe(true);
      expect(metrics.laneGaps.every((value) => Math.abs(value - metrics.gap) <= 1.5)).toBe(true);
      expect(Math.abs(metrics.gridTail)).toBeLessThanOrEqual(1);
      expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);

      const hrefs = metrics.cards.map((card) => card.href);
      if (!sourceOrders.has(target.name)) sourceOrders.set(target.name, hrefs);
      expect(hrefs).toEqual(sourceOrders.get(target.name));
      expect(metrics.cards.some((card) => card.className.includes('is-portrait'))).toBe(true);
      expect(metrics.cards.some((card) => card.className.includes('is-landscape'))).toBe(true);
      expect(metrics.cards.some((card) => card.className.includes('is-square'))).toBe(true);

      const screenshot = await grid.screenshot();
      await testInfo.attach(`news-${target.name}-${width}`, { body: screenshot, contentType: 'image/png' });
    }
  }

  const realMediaIds = await page.locator('.editorial-media img').evaluateAll((items) => items.map((image) => image.dataset.mediaId));
  expect(new Set(realMediaIds).size).toBeGreaterThanOrEqual(5);
  await expect(page.locator('.editorial-card.is-no-media')).toHaveCount(1);
});

test('server-rendered news remains complete and readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, locale: 'ru-RU' });
  const page = await context.newPage();
  await page.goto('/news/', { waitUntil: 'networkidle' });
  const grid = page.locator('.editorial-news');
  await expect(grid).not.toHaveAttribute('data-masonry', 'ready');
  await expect(grid.locator('.editorial-card')).toHaveCount(6);
  await expect(grid.locator('.editorial-card a')).toHaveCount(6);
  await expect(grid.locator('.editorial-card h3')).toHaveCount(6);

  const metrics = await grid.evaluate((element) => {
    const cards = [...element.querySelectorAll(':scope > .editorial-card')];
    return {
      columnCount: getComputedStyle(element).columnCount,
      lanes: new Set(cards.map((card) => Math.round(card.getBoundingClientRect().x))).size,
      seams: cards.map((card) => {
        const media = card.querySelector('.editorial-media').getBoundingClientRect();
        const copy = card.querySelector('.editorial-copy').getBoundingClientRect();
        return copy.top - media.bottom;
      })
    };
  });
  expect(metrics.columnCount).toBe('2');
  expect(metrics.lanes).toBe(2);
  expect(metrics.seams.every((value) => Math.abs(value) <= 1)).toBe(true);
  await context.close();
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
  await expect.poll(() => page.locator('.editorial-news').evaluate((grid) => new Set(
    [...grid.querySelectorAll(':scope > .editorial-card')].map((card) => Math.round(card.getBoundingClientRect().x))
  ).size)).toBe(1);
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
  await expect.poll(() => page.locator('.editorial-news').evaluate((grid) => new Set(
    [...grid.querySelectorAll(':scope > .editorial-card')].map((card) => Math.round(card.getBoundingClientRect().x))
  ).size)).toBe(2);
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
