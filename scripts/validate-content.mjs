import { loadContentSet } from '../src/content/load-content.mjs';
import { collectPublicRoutes } from '../src/content/validate.mjs';
import { LOCALE_IDS } from '../src/i18n/config.mjs';

const contentSet = await loadContentSet({ env: process.env, cwd: process.cwd() });
const content = contentSet.locales[contentSet.defaultLocale];
const routes = collectPublicRoutes(content);
const adapter = String(process.env.CONTENT_ADAPTER || 'local').toLowerCase();
const requestedLocales = String(process.env.CONTENT_LOCALES || '')
  .split(',')
  .map((locale) => locale.trim().toLowerCase())
  .filter(Boolean);
const buildLocales = requestedLocales.length
  ? [...new Set(requestedLocales)]
  : contentSet.localized
    ? Object.keys(contentSet.locales)
    : adapter === 'local'
      ? [...LOCALE_IDS]
      : ['ru'];
const unsupportedLocales = buildLocales.filter((locale) => !LOCALE_IDS.includes(locale));
if (unsupportedLocales.length) throw new Error(`Unsupported CONTENT_LOCALES: ${unsupportedLocales.join(', ')}`);
if (contentSet.localized) {
  const unavailableLocales = buildLocales.filter((locale) => !Object.hasOwn(contentSet.locales, locale));
  if (unavailableLocales.length) {
    throw new Error(`CONTENT_LOCALES not supplied by the localized CMS export: ${unavailableLocales.join(', ')}`);
  }
}

console.log(JSON.stringify({
  schemaVersion: content.schemaVersion,
  adapter,
  contentFormat: contentSet.format,
  sourceLocales: Object.keys(contentSet.locales),
  buildLocales,
  defaultLocale: contentSet.defaultLocale,
  routes: routes.length,
  pages: Object.keys(content.pages).length,
  programs: content.programs.length,
  news: content.newsItems.length,
  events: content.events.length,
  employees: content.employees.length,
  documents: content.documents.length,
  sveden: content.svedenSections.length,
  media: content.media.length
}, null, 2));
