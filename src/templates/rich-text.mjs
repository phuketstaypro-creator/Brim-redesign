import { esc } from './components.mjs';
import { localHref } from '../i18n/render-context.mjs';

function safeHref(value) {
  const href = String(value || '');
  if (href.startsWith('/') && !href.startsWith('//')) return localHref(href);
  try {
    const url = new URL(href);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function renderBlock(block) {
  if (typeof block === 'string') return `<p>${esc(block)}</p>`;
  if (!block || typeof block !== 'object') return '';

  if (block.type === 'paragraph') return `<p>${esc(block.text)}</p>`;
  if (block.type === 'quote') return `<blockquote>${esc(block.text)}</blockquote>`;
  if (block.type === 'heading') {
    const level = Number(block.level) === 3 ? 3 : 2;
    return `<h${level}>${esc(block.text)}</h${level}>`;
  }
  if (block.type === 'list') {
    const tag = block.ordered ? 'ol' : 'ul';
    const items = Array.isArray(block.items) ? block.items : [];
    return `<${tag}>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</${tag}>`;
  }
  if (block.type === 'link') {
    const href = safeHref(block.href);
    return href ? `<p><a href="${esc(href)}">${esc(block.label || block.href)}</a></p>` : '';
  }
  return '';
}

export function renderRichText(body) {
  if (!body) return '';
  const blocks = Array.isArray(body) ? body : [body];
  return blocks.map(renderBlock).join('');
}
