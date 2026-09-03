import { DEFAULT_LOCALE, LOCALE_IDS, localeConfig } from './config.mjs';
import { normalizeLogicalRoute, publicContentHref } from './routing.mjs';

let activeLocale = DEFAULT_LOCALE;
let availableLocales = [...LOCALE_IDS];

export function configureRenderLocale(locale = DEFAULT_LOCALE, locales = LOCALE_IDS) {
  localeConfig(locale);
  const supported = [...new Set(locales)].filter((item) => LOCALE_IDS.includes(item));
  if (!supported.includes(locale)) throw new Error(`Active locale ${locale} is not available`);
  activeLocale = locale;
  availableLocales = supported;
}

export function currentLocale() {
  return localeConfig(activeLocale);
}

export function currentAvailableLocales() {
  return [...availableLocales];
}

export function message(key) {
  const config = currentLocale();
  if (!Object.hasOwn(config.messages, key)) throw new Error(`Missing UI message ${key} for locale ${config.id}`);
  return config.messages[key];
}

export function localHref(value) {
  return publicContentHref(activeLocale, value);
}

export function isCurrentRoute(route, href) {
  if (!route || !href || !String(href).startsWith('/')) return false;
  return normalizeLogicalRoute(route) === normalizeLogicalRoute(href);
}
