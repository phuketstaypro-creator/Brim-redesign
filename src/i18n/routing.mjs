import { DEFAULT_LOCALE, LOCALE_IDS, localeConfig } from './config.mjs';

export function normalizeLogicalRoute(route = '/') {
  const value = typeof route === 'string' && route.startsWith('/') ? route : '/';
  for (const locale of LOCALE_IDS) {
    const prefix = localeConfig(locale).prefix;
    if (prefix && (value === prefix || value.startsWith(`${prefix}/`))) {
      const logical = value.slice(prefix.length) || '/';
      return logical.endsWith('/') || /\.[a-z0-9]+$/i.test(logical) ? logical : `${logical}/`;
    }
  }
  return value;
}

export function publicRoute(locale = DEFAULT_LOCALE, route = '/') {
  if (typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//')) return route;
  if (route.startsWith('/assets/') || route.startsWith('/api/')) return route;
  const logical = normalizeLogicalRoute(route);
  const prefix = localeConfig(locale).prefix;
  if (logical === '/') return prefix ? `${prefix}/` : '/';
  return `${prefix}${logical}` || '/';
}

export function publicContentHref(locale = DEFAULT_LOCALE, value = '/') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return value;
  // Content routes have a trailing slash by contract. Root-relative files are
  // deployment-wide assets and must not be moved beneath a locale prefix.
  return value === '/' || value.endsWith('/') ? publicRoute(locale, value) : value;
}

export function routeAlternates(logicalRoute = '/') {
  const normalized = normalizeLogicalRoute(logicalRoute);
  return LOCALE_IDS.map((locale) => ({
    locale,
    ...localeConfig(locale),
    href: publicRoute(locale, normalized)
  }));
}
