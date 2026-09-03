import { expect, test } from '@playwright/test';

function captureBrowserErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

test('desktop language selector preserves the current logical route', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/en/sveden/common/', { waitUntil: 'networkidle' });

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#menu-button')).toBeHidden();

  const selector = page.locator('#primary-nav .language-disclosure');
  const summary = selector.locator('summary');
  await expect(summary).toBeVisible();
  await expect(summary).toHaveAccessibleName('Current language: English. Choose a language');
  await summary.click();

  await expect(selector).toHaveAttribute('open', '');
  await expect(selector.locator('a[href="/sveden/common/"]')).toHaveText('Русский');
  await expect(selector.locator('a[href="/en/sveden/common/"]')).toHaveAttribute('aria-current', 'page');
  const chinese = selector.locator('a[href="/zh/sveden/common/"]');
  await expect(chinese).toHaveText('中文');
  await chinese.click();

  await expect(page).toHaveURL(/\/zh\/sveden\/common\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('基本信息');
  await expect(page.locator('#primary-nav .language-disclosure a[href="/zh/sveden/common/"]')).toHaveAttribute('aria-current', 'page');
  expect(browserErrors).toEqual([]);
});

test('mobile language selector stays in the utility bar and keeps the news route', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/news/', { waitUntil: 'networkidle' });

  const menu = page.locator('#menu-button');
  const navigation = page.locator('#primary-nav');
  const utilitySelector = page.locator('.utility-language-selector');
  const languageSummary = utilitySelector.locator('> summary');
  await expect(menu).toBeVisible();
  await expect(menu).toHaveText('Menu');
  await expect(languageSummary).toBeVisible();
  await expect(languageSummary).toHaveAccessibleName('Current language: English. Choose a language');
  await expect(navigation.locator('.nav-language-item')).toBeHidden();

  const utilityBox = await page.locator('.utility').boundingBox();
  const headerBox = await page.locator('.site-header').boundingBox();
  const languageBox = await languageSummary.boundingBox();
  expect(languageBox?.y ?? Infinity).toBeLessThan(headerBox?.y ?? -Infinity);
  expect((languageBox?.x ?? 0) + (languageBox?.width ?? Infinity)).toBeLessThanOrEqual(utilityBox?.x + utilityBox?.width);
  expect(languageBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(languageBox?.height ?? 0).toBeGreaterThanOrEqual(44);

  await menu.click();
  await expect(menu).toHaveText('Close');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation).toHaveClass(/\bopen\b/);
  await expect(languageSummary).toBeVisible();
  await expect(navigation.locator('.nav-language-item')).toBeHidden();

  await languageSummary.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(utilitySelector).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(utilitySelector).not.toHaveAttribute('open', '');
  await expect(languageSummary).toBeFocused();
  await languageSummary.click();
  const chinese = utilitySelector.locator('.language-list a[href="/zh/news/"]');
  await expect(chinese).toBeVisible();
  await chinese.click();

  await expect(page).toHaveURL(/\/zh\/news\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('新闻');
  await expect(page.locator('#menu-button')).toHaveText('菜单');
  await expect(page.locator('.utility-language-selector > summary')).toBeVisible();
  await expect(page.locator('#primary-nav .nav-language-item')).toBeHidden();
  expect(browserErrors).toEqual([]);
});

test('English and Chinese search use localized controls, indexes and result links', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto('/en/', { waitUntil: 'networkidle' });
  await expect(page.locator('body')).toHaveAttribute('data-search-index', '/en/search-index.json');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Search the site' })).toBeVisible();
  await expect(page.locator('[data-search-close]')).toHaveText('Close');
  const englishInput = page.locator('#site-search');
  await englishInput.fill('b');
  await expect(page.locator('#search-results')).toHaveText('Enter at least two characters.');
  const englishIndex = page.waitForResponse((response) => new URL(response.url()).pathname === '/en/search-index.json');
  await englishInput.fill('Baikal');
  expect((await englishIndex).status()).toBe(200);
  await expect(page.locator('#search-results a[href="/en/news/balet-na-baikale/"]')).toBeVisible();
  await page.locator('[data-search-close]').click();

  await page.goto('/zh/', { waitUntil: 'networkidle' });
  await expect(page.locator('body')).toHaveAttribute('data-search-index', '/zh/search-index.json');
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await expect(page.getByRole('heading', { name: '站内搜索' })).toBeVisible();
  await expect(page.locator('[data-search-close]')).toHaveText('关闭');
  const chineseIndex = page.waitForResponse((response) => new URL(response.url()).pathname === '/zh/search-index.json');
  await page.locator('#site-search').fill('芭');
  expect((await chineseIndex).status()).toBe(200);
  await expect(page.locator('#search-results a[href="/zh/news/balet-na-baikale/"]')).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test('localized HTML and language navigation work with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  try {
    const englishResponse = await page.goto('/en/sveden/common/', { waitUntil: 'domcontentloaded' });
    expect(englishResponse?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('General Information');
    await expect(page.locator('main')).not.toContainText(/[А-Яа-яЁё]/);
    await expect(page.locator('#primary-nav .language-disclosure > summary')).toBeVisible();
    await page.locator('#primary-nav .language-disclosure > summary').click();
    await page.locator('#primary-nav .language-list a[href="/zh/sveden/common/"]').click();

    await expect(page).toHaveURL(/\/zh\/sveden\/common\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('基本信息');
    await expect(page.locator('main')).not.toContainText(/[А-Яа-яЁё]/);
    await expect(page.locator('main')).toContainText('尚未收到获准发布的材料');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/news/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.utility-language-selector > summary')).toBeVisible();
    await expect(page.locator('#primary-nav .nav-language-item')).toBeHidden();
    await page.locator('.utility-language-selector > summary').click();
    await page.locator('.utility-language-selector a[href="/zh/news/"]').click();
    await expect(page).toHaveURL(/\/zh\/news\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('新闻');
  } finally {
    await context.close();
  }
});

test('localized headers and pages never overflow mobile or desktop viewports', async ({ page }) => {
  const routes = ['/', '/en/', '/zh/'];
  const viewports = [
    { width: 320, height: 800 },
    { width: 390, height: 844 },
    { width: 1440, height: 1000 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'networkidle' });
      const metrics = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth
      }));
      expect(metrics.documentWidth, `${route} at ${viewport.width}px`).toBeLessThanOrEqual(metrics.viewportWidth);
      expect(metrics.bodyWidth, `${route} at ${viewport.width}px`).toBeLessThanOrEqual(metrics.viewportWidth);

      if (viewport.width <= 390) {
        await expect(page.locator('#menu-button')).toBeVisible();
        const utilitySummary = page.locator('.utility-language-selector > summary');
        await expect(utilitySummary).toBeVisible();
        const selectorBox = await utilitySummary.boundingBox();
        expect(selectorBox?.x ?? -1).toBeGreaterThanOrEqual(0);
        expect((selectorBox?.x ?? 0) + (selectorBox?.width ?? Infinity)).toBeLessThanOrEqual(viewport.width);
        await page.locator('#menu-button').click();
        await expect(utilitySummary).toBeVisible();
        await expect(page.locator('#primary-nav .nav-language-item')).toBeHidden();
        await page.locator('#menu-button').click();
      }
    }
  }
});
