import { esc } from './components.mjs';

function activeAttribute(route, href) {
  if (!route || !href || !href.startsWith('/')) return '';
  if (href === '/') return route === '/' ? ' aria-current="page"' : '';
  return route.startsWith(href) ? ' aria-current="page"' : '';
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeUrl(value) {
  const url = asText(value);
  if (!url || /[\u0000-\u001f\u007f]/.test(url)) return '';
  return /^(?:\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test(url) ? url : '';
}

function absoluteUrl(base, path) {
  const safeBase = safeUrl(base);
  const safePath = safeUrl(path);
  if (!safePath) return safeBase;
  if (/^https?:\/\//i.test(safePath)) return safePath;
  if (!safeBase || !safePath.startsWith('/')) return safePath;
  return `${safeBase.replace(/\/$/, '')}${safePath}`;
}

function linkItems(items) {
  return asArray(items).flatMap((item) => {
    const href = safeUrl(item?.href);
    const label = asText(item?.label);
    return href && label ? [{ ...item, href, label }] : [];
  });
}

function navigation(items, route) {
  return linkItems(items).map(({ href, label, cta }) => {
    const className = cta ? ' class="nav-cta"' : '';
    return `<li><a${className} href="${esc(href)}"${activeAttribute(route, href)}>${esc(label)}</a></li>`;
  }).join('');
}

function inlineLinks(items) {
  return linkItems(items).map(({ href, label }) => `<a href="${esc(href)}">${esc(label)}</a>`).join('');
}

function logoImage(logo, className, alt) {
  const src = safeUrl(logo?.src);
  if (!src) return '';
  const width = Number.isInteger(logo?.width) && logo.width > 0 ? ` width="${logo.width}"` : '';
  const height = Number.isInteger(logo?.height) && logo.height > 0 ? ` height="${logo.height}"` : '';
  return `<img class="${className}" src="${esc(src)}"${width}${height} alt="${esc(alt)}">`;
}

function contactDetails(contacts) {
  const city = asText(contacts?.city);
  const addresses = asArray(contacts?.addresses).map(asText).filter(Boolean);
  const location = [city, ...addresses];
  const phone = asText(contacts?.phone);
  const phoneHref = safeUrl(contacts?.phoneHref);
  const email = asText(contacts?.email);
  const emailHref = safeUrl(contacts?.emailHref);
  const locationMarkup = location.length ? `<p>${location.map(esc).join('<br>')}</p>` : '';
  const phoneMarkup = phone ? (phoneHref ? `<a href="${esc(phoneHref)}">${esc(phone)}</a>` : `<p>${esc(phone)}</p>`) : '';
  const emailMarkup = email ? (emailHref ? `<a href="${esc(emailHref)}">${esc(email)}</a>` : `<p>${esc(email)}</p>`) : '';
  return `${locationMarkup}${phoneMarkup}${emailMarkup}`;
}

export function renderLayout({ site, route, title, description, content, cssHref, jsHref, image, type = 'website', noindex = false }) {
  const siteData = site || {};
  const canonicalBase = safeUrl(siteData.canonicalBase || siteData.baseUrl);
  const safeRoute = safeUrl(route) || '/';
  const canonical = absoluteUrl(canonicalBase, safeRoute);
  const suppliedTitle = asText(title);
  const defaultTitle = asText(siteData.defaultTitle || siteData.title || siteData.name);
  const shortName = asText(siteData.shortName);
  const pageTitle = suppliedTitle === asText(siteData.name)
    ? defaultTitle
    : [suppliedTitle || defaultTitle, shortName].filter(Boolean).join(' — ');
  const robots = noindex || siteData.staging !== false ? 'noindex, nofollow' : 'index, follow';
  const socialImage = absoluteUrl(canonicalBase, image || siteData.socialImage || siteData.assets?.stage?.src || siteData.assets?.logo?.src);
  const logo = siteData.assets?.logo || {};
  const brandName = asText(siteData.name);
  const brandLabel = asText(siteData.shortName || siteData.name);
  const brandAriaLabel = brandLabel ? `${brandLabel} — на главную` : 'На главную';
  const primaryNavigation = navigation(siteData.navigation, safeRoute);
  const utilityNavigation = inlineLinks(siteData.utilityNavigation);
  const quickLinks = inlineLinks(siteData.quickLinks);
  const footerNavigation = inlineLinks(siteData.footerNavigation);
  const legalNavigation = inlineLinks(siteData.legalNavigation);
  const footerStatus = asText(siteData.footer?.status);
  const footerDisclaimer = asText(siteData.footer?.disclaimer);

  return `<!doctype html>
<html lang="${esc(siteData.locale || 'ru')}" data-size="normal" data-theme="normal" data-images="on" data-spacing="normal" data-motion="on">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="${esc(siteData.themeColor)}">
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="${robots}">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:type" content="${esc(type)}">
  <meta property="og:title" content="${esc(pageTitle)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${esc(socialImage)}">
  <title>${esc(pageTitle)}</title>
  <link rel="canonical" href="${esc(canonical)}">
  <link rel="icon" type="image/png" href="/assets/icons/favicon-32.png" sizes="32x32">
  <link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="stylesheet" href="${esc(safeUrl(cssHref))}">
  <script defer src="${esc(safeUrl(jsHref))}"></script>
</head>
<body data-route="${esc(safeRoute)}">
  <a class="skip-link" href="#main">Перейти к содержанию</a>

  <div class="access-panel" id="access-panel" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="access-title">
    <div class="access-inner">
      <div class="modal-head"><h2 id="access-title">Настройки отображения</h2><button class="close-btn" type="button" data-access-close>Закрыть</button></div>
      <div class="access-grid">
        <fieldset><legend>Размер текста</legend><button type="button" data-setting="size" data-value="normal">A</button><button type="button" data-setting="size" data-value="large">A+</button><button type="button" data-setting="size" data-value="xlarge">A++</button></fieldset>
        <fieldset><legend>Цвет</legend><button type="button" data-setting="theme" data-value="normal">Обычный</button><button type="button" data-setting="theme" data-value="mono">Ч/б</button><button type="button" data-setting="theme" data-value="contrast">Контраст</button></fieldset>
        <fieldset><legend>Изображения</legend><button type="button" data-setting="images" data-value="on">Показывать</button><button type="button" data-setting="images" data-value="off">Скрыть</button></fieldset>
        <fieldset><legend>Интервалы</legend><button type="button" data-setting="spacing" data-value="normal">Обычные</button><button type="button" data-setting="spacing" data-value="wide">Увеличенные</button></fieldset>
        <fieldset><legend>Анимация</legend><button type="button" data-setting="motion" data-value="on">Включить</button><button type="button" data-setting="motion" data-value="off">Выключить</button></fieldset>
        <button class="button button-dark" type="button" data-access-reset>Сбросить</button>
      </div>
    </div>
  </div>

  <div class="search-modal" id="search-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="search-title">
    <div class="search-inner">
      <div class="modal-head"><h2 id="search-title">Поиск по сайту</h2><button class="close-btn" type="button" data-search-close>Закрыть</button></div>
      <label class="visually-hidden" for="site-search">Поисковый запрос</label>
      <input id="site-search" class="search-input" type="search" autocomplete="off" placeholder="Поступление, лицензия, ШКИ">
      <div class="search-results" id="search-results" aria-live="polite"><p>Введите минимум два символа.</p></div>
    </div>
  </div>

  <div class="utility"><div class="wrap utility-inner"><span class="utility-label">${esc(siteData.utilityLabel)}</span><div class="utility-actions"><button type="button" data-search-open>Поиск</button><button type="button" data-access-open>Версия для слабовидящих</button>${utilityNavigation}</div></div></div>

  <header class="site-header"><div class="wrap header-inner"><a class="brand" href="/" aria-label="${esc(brandAriaLabel)}"><span class="brand-logo-wrap" aria-hidden="true">${logoImage(logo, 'brand-logo', '')}</span><span class="brand-text">${esc(brandName)}</span></a><nav class="primary-nav" id="primary-nav" aria-label="Основная навигация"><ul>${primaryNavigation}</ul></nav><button class="menu-button" id="menu-button" type="button" aria-controls="primary-nav" aria-expanded="false">Меню</button></div></header>

  ${content}

  <section class="quick-links" aria-labelledby="quick-links-title"><div class="wrap quick-grid"><h2 id="quick-links-title">Быстрый доступ</h2>${quickLinks}</div></section>

  <footer class="site-footer"><div class="wrap footer-grid"><div class="footer-brand"><a class="footer-logo-link" href="/" aria-label="${esc(brandAriaLabel)}">${logoImage(logo, 'footer-logo', logo.alt || '')}</a><p>${esc(siteData.legalName)}</p></div><div><strong>Навигация</strong>${footerNavigation}</div><div><strong>Контакты</strong>${contactDetails(siteData.contacts)}</div><div><strong>Правовая информация</strong>${legalNavigation}</div></div><div class="wrap footer-bottom">${footerStatus ? `<span>${esc(footerStatus)}</span>` : ''}${footerDisclaimer ? `<span>${esc(footerDisclaimer)}</span>` : ''}</div></footer>
</body>
</html>`;
}
