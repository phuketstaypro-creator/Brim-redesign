import { documents } from '../../data/documents.mjs';
import { employees } from '../../data/employees.mjs';
import { events } from '../../data/events.mjs';
import { mediaAssets } from '../../data/media.mjs';
import { newsItems } from '../../data/news.mjs';
import { pages } from '../../data/pages.mjs';
import { programs } from '../../data/programs.mjs';
import { site } from '../../data/site.mjs';
import { svedenSections } from '../../data/sveden.mjs';
import { CONTENT_SCHEMA_VERSION } from '../contracts.mjs';

/** Return the repository-managed content using the same shape as CMS adapters. */
export async function loadLocalContent() {
  return {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    site,
    pages,
    programs,
    newsItems,
    events,
    employees,
    documents,
    svedenSections,
    media: mediaAssets
  };
}

export default loadLocalContent;
