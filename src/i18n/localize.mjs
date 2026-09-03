import { DEFAULT_LOCALE } from './config.mjs';
import { translations as englishTranslations } from './catalogs/en.mjs';
import { translations as chineseTranslations } from './catalogs/zh.mjs';

const catalogs = Object.freeze({ en: englishTranslations, zh: chineseTranslations });
const nonTranslatableKeys = new Set([
  'href', 'route', 'path', 'src', 'sourcePath', 'source', 'originalName', 'id', 'slug',
  'image', 'coverImage', 'mobileImage', 'publicationStatus', 'rightsStatus',
  'email', 'emailHref', 'phone', 'phoneHref', 'baseUrl', 'themeColor',
  'publishedAt', 'updatedAt', 'startsAt', 'fileType', 'editorialVariant', 'style'
]);

function hasCyrillic(value) {
  return typeof value === 'string' && /[А-Яа-яЁё]/.test(value);
}

function translateValue(value, translations, path = []) {
  if (typeof value === 'string') {
    const key = path.at(-1);
    if (nonTranslatableKeys.has(key) || !hasCyrillic(value)) return value;
    if (!Object.hasOwn(translations, value)) {
      throw new Error(`Missing translation for ${path.join('.') || '(root)'}: ${JSON.stringify(value)}`);
    }
    return translations[value];
  }
  if (Array.isArray(value)) return value.map((item, index) => translateValue(item, translations, [...path, String(index)]));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, translateValue(item, translations, [...path, key])]));
}

export function localizeContent(content, locale = DEFAULT_LOCALE) {
  if (locale === DEFAULT_LOCALE) return structuredClone(content);
  const translations = catalogs[locale];
  if (!translations) throw new Error(`No content translation catalog for locale ${locale}`);
  const localized = translateValue(content, translations);
  localized.site.locale = locale;
  return localized;
}

export function untranslatedContentStrings(content, locale) {
  if (locale === DEFAULT_LOCALE) return [];
  const translations = catalogs[locale] || {};
  const missing = [];
  function visit(value, path = []) {
    if (typeof value === 'string') {
      const key = path.at(-1);
      if (!nonTranslatableKeys.has(key) && hasCyrillic(value) && !Object.hasOwn(translations, value)) {
        missing.push({ path: path.join('.'), value });
      }
      return;
    }
    if (Array.isArray(value)) value.forEach((item, index) => visit(item, [...path, String(index)]));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => visit(item, [...path, key]));
  }
  visit(content);
  return missing;
}
