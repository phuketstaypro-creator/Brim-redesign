import { loadContent } from '../src/content/load-content.mjs';
import { collectPublicRoutes } from '../src/content/validate.mjs';

const content = await loadContent({ env: process.env, cwd: process.cwd() });
const routes = collectPublicRoutes(content);

console.log(JSON.stringify({
  schemaVersion: content.schemaVersion,
  adapter: String(process.env.CONTENT_ADAPTER || 'local').toLowerCase(),
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
