/**
 * Runtime constants for the CMS-neutral content boundary.
 *
 * These are intentionally plain JavaScript contracts rather than types tied to
 * a framework or CMS SDK. An integration adapter only needs to return JSON-like
 * data matching ContentBundle.
 */

export const CONTENT_SCHEMA_VERSION = '1.0.0';

export const CONTENT_COLLECTION_KEYS = Object.freeze([
  'programs',
  'newsItems',
  'events',
  'employees',
  'documents',
  'svedenSections',
  'media'
]);

export const PUBLISHED_STATUSES = Object.freeze(['published', 'live']);

export const MEDIA_RIGHTS_STATUSES = Object.freeze([
  'owned',
  'licensed',
  'public-domain',
  'client-provided-pending-final-rights-check',
  'verification-required',
  'restricted'
]);

/**
 * @typedef {object} MediaVariant
 * @property {string} sourcePath Path relative to the public directory.
 * @property {string} src Public URL beginning with `/`.
 * @property {number} width Intrinsic width in CSS pixels.
 * @property {number} height Intrinsic height in CSS pixels.
 */

/**
 * @typedef {object} MediaAsset
 * @property {string} id Stable CMS-facing identifier.
 * @property {string} sourcePath Path relative to the public directory.
 * @property {string} src Public URL beginning with `/`.
 * @property {number} width Intrinsic width in CSS pixels.
 * @property {number} height Intrinsic height in CSS pixels.
 * @property {string} defaultAlt Factual fallback alternative text.
 * @property {string} source Provenance URL or `repository:` reference.
 * @property {string} originalName Original source filename when known.
 * @property {string} rightsStatus One of MEDIA_RIGHTS_STATUSES.
 * @property {string|null} credit Credit supplied with the source, if any.
 * @property {MediaVariant[]} variants Responsive alternatives.
 * @property {MediaVariant & {variants?: MediaVariant[]}|null} [mobile]
 */

/**
 * @typedef {object} ContentBundle
 * @property {string} schemaVersion
 * @property {Record<string, unknown>} site
 * @property {Record<string, Record<string, unknown>>} pages
 * @property {Record<string, unknown>[]} programs
 * @property {Record<string, unknown>[]} newsItems
 * @property {Record<string, unknown>[]} events
 * @property {Record<string, unknown>[]} employees
 * @property {Record<string, unknown>[]} documents
 * @property {Record<string, unknown>[]} svedenSections
 * @property {MediaAsset[]} media
 */

export class ContentContractError extends Error {
  constructor(issues, message = 'Content contract validation failed') {
    const normalizedIssues = Array.isArray(issues) ? issues : [String(issues)];
    super(`${message}:\n${normalizedIssues.map((issue) => `- ${issue}`).join('\n')}`);
    this.name = 'ContentContractError';
    this.issues = normalizedIssues;
  }
}

export function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function createEmptyContentBundle() {
  return {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    site: {},
    pages: {},
    programs: [],
    newsItems: [],
    events: [],
    employees: [],
    documents: [],
    svedenSections: [],
    media: []
  };
}
