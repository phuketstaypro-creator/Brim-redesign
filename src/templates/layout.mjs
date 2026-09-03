import { esc } from './components.mjs';
import { currentAvailableLocales, currentLocale, isCurrentRoute, localHref, message } from '../i18n/render-context.mjs';
import { normalizeLogicalRoute, publicRoute, routeAlternates } from '../i18n/routing.mjs';

function activeAttribute(route, href) {
  if (!route || !href || !href.startsWith('/')) return '';
  return isCurrentRoute(route, href) ? ' aria-current="page"' : '';
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

function navigationItems(items) {
  return asArray(items).flatMap((item) => {
    const label = asText(item?.label);
    const href = safeUrl(item?.href);
    const children = linkItems(item?.children).map((child) => ({
      ...child,
      group: asText(child.group)
    }));
    if (!label || (!href && !children.length)) return [];
    return [{ ...item, label, href, children }];
  });
}

function groupedNavigationChildren(children) {
  const groups = new Map();
  for (const child of children) {
    const key = child.group || '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(child);
  }
  return [...groups.entries()].map(([label, links]) => ({ label, links }));
}

function childNavigation(children, route, itemIndex) {
  return groupedNavigationChildren(children).map((group, groupIndex) => {
    const labelId = `nav-panel-label-${itemIndex}-${groupIndex}`;
    const label = group.label
      ? `<span class="nav-panel-label" id="${labelId}">${esc(group.label)}</span>`
      : '';
    const groupAttributes = group.label ? ` role="group" aria-labelledby="${labelId}"` : '';
    const links = group.links.map(({ href, label: childLabel }) => `<li><a href="${esc(localHref(href))}"${activeAttribute(route, href)} data-nav-child>${esc(childLabel)}</a></li>`).join('');
    return `<div class="nav-panel-group"${groupAttributes}>${label}<ul class="nav-panel-list">${links}</ul></div>`;
  }).join('');
}

function navigation(items, route) {
  return navigationItems(items).map(({ href, label, cta, children }, itemIndex) => {
    if (!children.length) {
      const className = cta ? ' class="nav-cta"' : '';
      return `<li class="nav-item"><a${className} href="${esc(localHref(href))}"${activeAttribute(route, href)}>${esc(label)}</a></li>`;
    }

    const groupIsActive = isCurrentRoute(route, href) || children.some((child) => isCurrentRoute(route, child.href));
    const activeClass = groupIsActive ? ' is-active' : '';
    const largeClass = children.length >= 8 ? ' is-large' : '';
    const overview = href
      ? `<a class="nav-overview" href="${esc(localHref(href))}"${activeAttribute(route, href)}><span>${esc(label)}</span><span aria-hidden="true">→</span></a>`
      : '';
    return `<li class="nav-item nav-item-group${activeClass}"><details class="nav-disclosure${largeClass}${activeClass}" data-nav-disclosure><summary data-nav-summary><span>${esc(label)}</span><span class="nav-summary-icon" aria-hidden="true"></span></summary><div class="nav-panel" data-nav-panel><div class="nav-panel-inner">${overview}<div class="nav-panel-groups">${childNavigation(children, route, itemIndex)}</div></div></div></details></li>`;
  }).join('');
}

function inlineLinks(items) {
  return linkItems(items).map(({ href, label }) => {
    const external = /^https?:\/\//i.test(href) ? ' rel="external"' : '';
    return `<a href="${esc(localHref(href))}"${external}>${esc(label)}</a>`;
  }).join('');
}

function externalHostname(href) {
  try {
    return new URL(href).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

function usefulLinkCards(items) {
  return linkItems(items).map(({ href, label }, index) => {
    const number = String(index + 1).padStart(2, '0');
    const hostname = externalHostname(href);
    const accent = index === 0 ? ' is-accent' : '';
    return `<li><a class="useful-link-card${accent}" href="${esc(href)}" rel="external"><span class="useful-link-meta">${number}</span><strong class="useful-link-title">${esc(label)}</strong><span class="useful-link-destination"><span>${esc(hostname)}</span><span class="useful-link-arrow" aria-hidden="true">↗</span></span></a></li>`;
  }).join('');
}

function languageNavigation(logicalRoute) {
  const locale = currentLocale();
  const available = currentAvailableLocales();
  const links = routeAlternates(logicalRoute).filter((alternate) => available.includes(alternate.locale)).map((alternate) => {
    const current = alternate.locale === locale.id ? ' aria-current="page"' : '';
    return `<li><a href="${esc(alternate.href)}" hreflang="${esc(alternate.hreflang)}" lang="${esc(alternate.htmlLang)}"${current}>${esc(alternate.nativeName)}</a></li>`;
  }).join('');
  return `<li class="nav-item nav-language-item"><details class="nav-disclosure language-disclosure" data-nav-disclosure><summary data-nav-summary><span class="language-current" aria-hidden="true">${esc(locale.shortLabel)}</span><span class="visually-hidden">${esc(message('currentLanguage'))}</span><span class="nav-summary-icon" aria-hidden="true"></span></summary><div class="nav-panel language-panel" data-nav-panel><div class="nav-panel-inner"><ul class="language-list" aria-label="${esc(message('availableLanguages'))}">${links}</ul></div></div></details></li>`;
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
  const locale = currentLocale();
  const availableLocales = currentAvailableLocales();
  const canonicalBase = safeUrl(siteData.canonicalBase || siteData.baseUrl);
  const logicalRoute = normalizeLogicalRoute(safeUrl(route) || '/');
  const safeRoute = publicRoute(locale.id, logicalRoute);
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
  const brandLabel = asText(siteData.shortName || siteData.name);
  const brandAriaLabel = brandLabel ? `${brandLabel} — ${message('toHome')}` : message('homeAria');
  const primaryNavigation = `${navigation(siteData.navigation, safeRoute)}${languageNavigation(logicalRoute)}`;
  const utilityNavigation = inlineLinks(siteData.utilityNavigation);
  const quickLinks = inlineLinks(siteData.quickLinks);
  const usefulLinks = usefulLinkCards(siteData.usefulLinks);
  const footerNavigation = inlineLinks(siteData.footerNavigation);
  const legalNavigation = inlineLinks(siteData.legalNavigation);
  const officialNavigation = inlineLinks(siteData.officialNavigation);
  const socialNavigation = inlineLinks(siteData.socialLinks);
  const footerStatus = asText(siteData.footer?.status);
  const footerDisclaimer = asText(siteData.footer?.disclaimer);
  const alternates = routeAlternates(logicalRoute).filter((alternate) => availableLocales.includes(alternate.locale));
  const russianAlternate = alternates.find((item) => item.locale === 'ru');
  const alternateLinks = [
    ...alternates.map((alternate) => `<link rel="alternate" hreflang="${esc(alternate.hreflang)}" href="${esc(absoluteUrl(canonicalBase, alternate.href))}">`),
    ...(russianAlternate ? [`<link rel="alternate" hreflang="x-default" href="${esc(absoluteUrl(canonicalBase, russianAlternate.href))}">`] : [])
  ].join('\n  ');
  const alternateOgLocales = alternates.filter((item) => item.locale !== locale.id).map((item) => `<meta property="og:locale:alternate" content="${esc(item.ogLocale)}">`).join('\n  ');
  const translationNotice = asText(message('translationNotice'));

  return `<!doctype html>
<html lang="${esc(locale.htmlLang)}" data-size="normal" data-theme="normal" data-images="on" data-spacing="normal" data-motion="on">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="${esc(siteData.themeColor)}">
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="${robots}">
  <meta property="og:locale" content="${esc(locale.ogLocale)}">
  ${alternateOgLocales}
  <meta property="og:type" content="${esc(type)}">
  <meta property="og:title" content="${esc(pageTitle)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${esc(socialImage)}">
  <title>${esc(pageTitle)}</title>
  <link rel="canonical" href="${esc(canonical)}">
  ${alternateLinks}
  <link rel="icon" type="image/png" href="/assets/icons/favicon-32.png" sizes="32x32">
  <link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
  <link rel="manifest" href="${esc(publicRoute(locale.id, '/manifest.webmanifest'))}">
  <link rel="stylesheet" href="${esc(safeUrl(cssHref))}">
  <script defer src="${esc(safeUrl(jsHref))}"></script>
</head>
<body data-route="${esc(safeRoute)}" data-locale="${esc(locale.htmlLang)}" data-search-index="${esc(publicRoute(locale.id, '/search-index.json'))}" data-search-min-length="${locale.searchMinLength}" data-menu-label="${esc(message('menu'))}" data-menu-close-label="${esc(message('closeMenu'))}" data-search-minimum="${esc(message('searchMinimum'))}" data-search-empty="${esc(message('searchEmpty'))}" data-search-unavailable="${esc(message('searchUnavailable'))}">
  <a class="skip-link" href="#main">${esc(message('skipToContent'))}</a>

  <div class="access-panel" id="access-panel" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="access-title">
    <div class="access-inner">
      <div class="modal-head"><h2 id="access-title">${esc(message('displaySettings'))}</h2><button class="close-btn" type="button" data-access-close>${esc(message('close'))}</button></div>
      <div class="access-grid">
        <fieldset><legend>${esc(message('textSize'))}</legend><button type="button" data-setting="size" data-value="normal">A</button><button type="button" data-setting="size" data-value="large">A+</button><button type="button" data-setting="size" data-value="xlarge">A++</button></fieldset>
        <fieldset><legend>${esc(message('color'))}</legend><button type="button" data-setting="theme" data-value="normal">${esc(message('normal'))}</button><button type="button" data-setting="theme" data-value="mono">${esc(message('monochrome'))}</button><button type="button" data-setting="theme" data-value="contrast">${esc(message('contrast'))}</button></fieldset>
        <fieldset><legend>${esc(message('images'))}</legend><button type="button" data-setting="images" data-value="on">${esc(message('show'))}</button><button type="button" data-setting="images" data-value="off">${esc(message('hide'))}</button></fieldset>
        <fieldset><legend>${esc(message('spacing'))}</legend><button type="button" data-setting="spacing" data-value="normal">${esc(message('normal'))}</button><button type="button" data-setting="spacing" data-value="wide">${esc(message('increased'))}</button></fieldset>
        <fieldset><legend>${esc(message('animation'))}</legend><button type="button" data-setting="motion" data-value="on">${esc(message('enable'))}</button><button type="button" data-setting="motion" data-value="off">${esc(message('disable'))}</button></fieldset>
        <button class="button button-dark" type="button" data-access-reset>${esc(message('reset'))}</button>
      </div>
    </div>
  </div>

  <div class="search-modal" id="search-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="search-title">
    <div class="search-inner">
      <div class="modal-head"><h2 id="search-title">${esc(message('searchSite'))}</h2><button class="close-btn" type="button" data-search-close>${esc(message('close'))}</button></div>
      <label class="visually-hidden" for="site-search">${esc(message('searchQuery'))}</label>
      <input id="site-search" class="search-input" type="search" autocomplete="off" placeholder="${esc(message('searchPlaceholder'))}">
      <div class="search-results" id="search-results" aria-live="polite"><p>${esc(message('searchMinimum'))}</p></div>
    </div>
  </div>

  <div class="utility"><div class="wrap utility-inner"><span class="utility-label">${esc(siteData.utilityLabel)}</span><div class="utility-actions"><button type="button" data-search-open>${esc(message('search'))}</button><button type="button" data-access-open>${esc(message('accessibleVersion'))}</button>${utilityNavigation}</div></div></div>

  <header class="site-header"><div class="wrap header-inner"><a class="brand" href="${esc(localHref('/'))}" aria-label="${esc(brandAriaLabel)}"><span class="brand-logo-wrap" aria-hidden="true">${logoImage(logo, 'brand-logo', '')}</span></a><nav class="primary-nav" id="primary-nav" aria-label="${esc(message('primaryNavigation'))}"><ul class="primary-nav-list" data-nav-list>${primaryNavigation}</ul></nav><button class="menu-button" id="menu-button" type="button" aria-controls="primary-nav" aria-expanded="false">${esc(message('menu'))}</button></div></header>

  ${content}

  ${usefulLinks ? `<section class="useful-links" aria-labelledby="useful-links-title"><div class="wrap"><div class="useful-links-head"><div><span class="useful-links-kicker">${esc(message('usefulKicker'))}</span><h2 id="useful-links-title">${esc(message('usefulTitle'))}</h2></div><p>${esc(message('usefulDescription'))}</p></div><ol class="useful-links-grid">${usefulLinks}</ol></div></section>` : ''}

  <section class="quick-links" aria-labelledby="quick-links-title"><div class="wrap quick-grid"><h2 id="quick-links-title">${esc(message('quickAccess'))}</h2>${quickLinks}</div></section>

  <footer class="site-footer"><div class="wrap footer-grid"><div class="footer-brand"><a class="footer-logo-link" href="${esc(localHref('/'))}" aria-label="${esc(brandAriaLabel)}">${logoImage(logo, 'footer-logo', logo.alt || '')}</a><p>${esc(siteData.legalName)}</p></div><div><strong>${esc(message('navigation'))}</strong>${footerNavigation}</div><div><strong>${esc(message('contacts'))}</strong>${contactDetails(siteData.contacts)}</div><div><strong>${esc(message('legalInformation'))}</strong>${legalNavigation}</div><div class="footer-resources"><strong>${esc(message('officialResources'))}</strong>${officialNavigation}${socialNavigation ? `<strong class="footer-social-title">${esc(message('socialNetworks'))}</strong><div class="footer-social-links">${socialNavigation}</div>` : ''}</div></div><div class="wrap footer-bottom">${footerStatus ? `<span>${esc(footerStatus)}</span>` : ''}${footerDisclaimer ? `<span>${esc(footerDisclaimer)}</span>` : ''}${translationNotice ? `<span class="translation-notice">${esc(translationNotice)}</span>` : ''}</div></footer>
</body>
</html>`;
}
