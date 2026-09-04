import {
  CONTENT_LOCALE_IDS,
  CONTENT_SCHEMA_VERSION,
  LOCALIZED_CONTENT_FORMAT,
  ContentContractError,
  isPlainObject
} from './contracts.mjs';
import { loadJsonContent } from './adapters/json.mjs';
import { loadLocalContent } from './adapters/local.mjs';
import { assertLocalizedContentParity } from './locale-bundles.mjs';
import { normalizeContent } from './normalize.mjs';
import { validateContent } from './validate.mjs';

export const SUPPORTED_CONTENT_ADAPTERS = Object.freeze(['local', 'json']);

/**
 * Load, normalize and validate all public content before templates run.
 *
 * A trusted integration can pass an adapter function directly. Environment
 * variables can select only built-in adapters, so deployment configuration can
 * never cause arbitrary module execution.
 */
async function loadRawContent({ env, cwd, adapter }) {
  let rawContent;

  if (adapter !== undefined) {
    if (typeof adapter !== 'function') {
      throw new ContentContractError('Custom content adapter must be a function');
    }
    rawContent = await adapter({ env, cwd });
  } else {
    const adapterName = String(env.CONTENT_ADAPTER || 'local').trim().toLowerCase();
    if (adapterName === 'local') {
      rawContent = await loadLocalContent();
    } else if (adapterName === 'json') {
      rawContent = await loadJsonContent({ file: env.CMS_CONTENT_FILE, cwd });
    } else {
      throw new ContentContractError(
        `Unsupported CONTENT_ADAPTER ${JSON.stringify(adapterName)}; expected ${SUPPORTED_CONTENT_ADAPTERS.join(' or ')}`
      );
    }
  }

  return rawContent;
}

function isLocalizedEnvelope(value) {
  return isPlainObject(value)
    && (Object.hasOwn(value, 'format') || Object.hasOwn(value, 'defaultLocale') || Object.hasOwn(value, 'locales'));
}

function validateRawWorkflow(record, path, issues) {
  for (const field of ['published', 'draft']) {
    if (Object.hasOwn(record, field) && typeof record[field] !== 'boolean') {
      issues.push(`${path}.${field} must be a boolean when present`);
    }
  }
  for (const field of ['status', 'publicationStatus']) {
    if (Object.hasOwn(record, field) && (typeof record[field] !== 'string' || !record[field].trim())) {
      issues.push(`${path}.${field} must be a non-empty string when present`);
    }
  }

  if (
    typeof record.status === 'string'
    && record.status.trim()
    && typeof record.publicationStatus === 'string'
    && record.publicationStatus.trim()
    && record.status.trim().toLowerCase() !== record.publicationStatus.trim().toLowerCase()
  ) {
    issues.push(`${path}.status and ${path}.publicationStatus must match when both are present`);
  }
}

function validateRawRecord(record, path, issues, nestedFields = []) {
  if (!isPlainObject(record)) {
    issues.push(`${path} must be an object`);
    return;
  }
  validateRawWorkflow(record, path, issues);
  for (const field of nestedFields) {
    const value = record[field];
    if (value === undefined || value === null || !Array.isArray(value)) continue;
    value.forEach((item, index) => validateRawRecord(item, `${path}.${field}[${index}]`, issues));
  }
}

function assertCompleteContentBundle(bundle, path = 'content') {
  if (!isPlainObject(bundle)) {
    throw new ContentContractError(`${path} must be a ContentBundle object`, 'Raw content validation failed');
  }

  const required = [
    ['schemaVersion'],
    ['site'],
    ['pages'],
    ['programs'],
    ['newsItems', 'news'],
    ['events'],
    ['employees'],
    ['documents'],
    ['svedenSections', 'sveden'],
    ['media', 'mediaAssets']
  ];
  const issues = required
    .filter((aliases) => !aliases.some((field) => Object.hasOwn(bundle, field)))
    .map((aliases) => `${path} is missing required field ${aliases.join(' or ')}`);

  const selected = Object.fromEntries(required.map((aliases) => [
    aliases[0],
    aliases.find((field) => Object.hasOwn(bundle, field))
  ]));

  if (selected.site && !isPlainObject(bundle[selected.site])) issues.push(`${path}.${selected.site} must be an object`);
  if (selected.pages && !isPlainObject(bundle[selected.pages]) && !Array.isArray(bundle[selected.pages])) {
    issues.push(`${path}.${selected.pages} must be an object keyed by route or an array`);
  }
  for (const field of ['programs', 'newsItems', 'events', 'employees', 'documents', 'svedenSections']) {
    const sourceField = selected[field];
    if (sourceField && !Array.isArray(bundle[sourceField])) issues.push(`${path}.${sourceField} must be an array`);
  }
  if (selected.media && !Array.isArray(bundle[selected.media]) && !isPlainObject(bundle[selected.media])) {
    issues.push(`${path}.${selected.media} must be an array or object keyed by media ID`);
  }

  const nestedFields = {
    newsItems: ['attachments', 'gallery'],
    events: ['attachments'],
    svedenSections: ['documents']
  };
  for (const field of ['programs', 'newsItems', 'events', 'employees', 'documents', 'svedenSections']) {
    const sourceField = selected[field];
    const value = sourceField ? bundle[sourceField] : null;
    if (!Array.isArray(value)) continue;
    value.forEach((record, index) => validateRawRecord(
      record,
      `${path}.${sourceField}[${index}]`,
      issues,
      nestedFields[field] ?? []
    ));
  }

  if (selected.pages) {
    const pages = bundle[selected.pages];
    const entries = Array.isArray(pages) ? pages.map((record, index) => [index, record]) : Object.entries(pages ?? {});
    entries.forEach(([key, record]) => validateRawRecord(record, `${path}.${selected.pages}[${JSON.stringify(key)}]`, issues));
  }
  if (selected.media) {
    const media = bundle[selected.media];
    const entries = Array.isArray(media) ? media.map((record, index) => [index, record]) : Object.entries(media ?? {});
    entries.forEach(([key, record]) => validateRawRecord(record, `${path}.${selected.media}[${JSON.stringify(key)}]`, issues));
  }

  if (issues.length) throw new ContentContractError(issues, 'Raw content validation failed');
}

function loadLocalizedEnvelope(rawContent, env) {
  const issues = [];
  if (rawContent.format !== LOCALIZED_CONTENT_FORMAT) {
    issues.push(`format must be ${LOCALIZED_CONTENT_FORMAT}`);
  }
  if (rawContent.defaultLocale !== 'ru') {
    issues.push('defaultLocale must be ru');
  }
  if (!isPlainObject(rawContent.locales)) {
    issues.push('locales must be an object keyed by locale');
  }
  if (issues.length) throw new ContentContractError(issues, 'Localized content envelope validation failed');

  const rawLocaleEntries = Object.entries(rawContent.locales);
  if (!rawLocaleEntries.length) issues.push('locales must contain at least the ru bundle');
  for (const [locale, bundle] of rawLocaleEntries) {
    if (!CONTENT_LOCALE_IDS.includes(locale)) {
      issues.push(`locales contains unsupported locale ${JSON.stringify(locale)}`);
      continue;
    }
    if (!isPlainObject(bundle)) {
      issues.push(`locales.${locale} must be a ContentBundle object`);
      continue;
    }
    try {
      assertCompleteContentBundle(bundle, `locales.${locale}`);
    } catch (error) {
      issues.push(...error.issues);
      continue;
    }
    if (bundle.schemaVersion !== CONTENT_SCHEMA_VERSION) {
      issues.push(`locales.${locale}.schemaVersion must explicitly equal ${CONTENT_SCHEMA_VERSION}`);
    }
  }
  if (!Object.hasOwn(rawContent.locales, 'ru')) issues.push('locales.ru is required');
  if (issues.length) throw new ContentContractError(issues, 'Localized content envelope validation failed');

  const localeEntries = CONTENT_LOCALE_IDS
    .filter((locale) => Object.hasOwn(rawContent.locales, locale))
    .map((locale) => [locale, rawContent.locales[locale]]);
  const locales = Object.create(null);
  for (const [locale, bundle] of localeEntries) {
    const content = validateContent(normalizeContent(bundle, { siteUrl: env.SITE_URL }));
    if (content.site.locale !== locale) {
      issues.push(`locales.${locale}.site.locale must equal ${locale}`);
    }
    locales[locale] = content;
  }
  if (issues.length) throw new ContentContractError(issues, 'Localized content envelope validation failed');

  assertLocalizedContentParity(locales, rawContent.defaultLocale);
  return {
    format: LOCALIZED_CONTENT_FORMAT,
    localized: true,
    defaultLocale: rawContent.defaultLocale,
    locales
  };
}

/**
 * Load either one legacy ContentBundle or a reviewed bundle-per-locale export.
 * A single bundle remains the default API and is translated later by the build.
 */
export async function loadContentSet({ env = process.env, cwd = process.cwd(), adapter } = {}) {
  const rawContent = await loadRawContent({ env, cwd, adapter });
  if (isLocalizedEnvelope(rawContent)) return loadLocalizedEnvelope(rawContent, env);

  assertCompleteContentBundle(rawContent);
  const content = validateContent(normalizeContent(rawContent, { siteUrl: env.SITE_URL }));
  if (content.site.locale !== 'ru') {
    throw new ContentContractError(
      'content.site.locale must equal ru for a plain ContentBundle; use brhk-content-locales-v1 for translated bundles',
      'Raw content validation failed'
    );
  }
  return {
    format: 'content-bundle-v1',
    localized: false,
    defaultLocale: 'ru',
    locales: { ru: content }
  };
}

export async function loadContent(options = {}) {
  const contentSet = await loadContentSet(options);
  return contentSet.locales[contentSet.defaultLocale];
}

export default loadContent;
