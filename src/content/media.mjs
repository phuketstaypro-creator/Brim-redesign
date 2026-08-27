import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, extname, join, resolve, sep } from 'node:path';
import { SUPPORTED_IMAGE_EXTENSIONS, validateImageBytes } from './image-metadata.mjs';

function safeId(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'media';
}

function sourceFile(publicRoot, sourcePath) {
  const relative = String(sourcePath || '').replace(/^[/\\]+/, '');
  const file = resolve(publicRoot, relative);
  if (file !== publicRoot && !file.startsWith(`${publicRoot}${sep}`)) {
    throw new Error(`Media source escapes public/: ${sourcePath}`);
  }
  if (!existsSync(file)) throw new Error(`Media source is missing: ${sourcePath}`);
  const extension = extname(file).toLowerCase();
  if (!SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
    throw new Error(`Unsupported media extension for ${sourcePath}: ${extension || '(none)'}`);
  }
  return { file, extension };
}

function numericDimension(value, field, mediaId) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${mediaId}: ${field} must be a positive integer`);
  }
  return number;
}

function descriptorSource(descriptor) {
  return descriptor?.sourcePath || descriptor?.path || descriptor?.src;
}

function copyDescriptor(descriptor, mediaId, label, context) {
  const width = numericDimension(descriptor?.width, `${label}.width`, mediaId);
  const height = numericDimension(descriptor?.height, `${label}.height`, mediaId);
  const { file, extension } = sourceFile(context.publicRoot, descriptorSource(descriptor));
  const bytes = readFileSync(file);
  validateImageBytes(bytes, {
    extension,
    width,
    height,
    source: descriptorSource(descriptor)
  });
  const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  const outputName = `${safeId(mediaId)}-${safeId(label)}.${digest}${extension}`;
  const outputFile = join(context.outputRoot, outputName);
  if (!context.copied.has(outputFile)) {
    copyFileSync(file, outputFile);
    context.copied.add(outputFile);
  }
  return {
    src: `/assets/media/${outputName}`,
    width,
    height,
    sourcePath: descriptorSource(descriptor),
    sourceName: basename(file)
  };
}

function materializeSet(asset, mediaId, context, key = 'desktop') {
  const primary = copyDescriptor(asset, mediaId, `${key}-${asset.width}`, context);
  const variants = (asset.variants || []).map((variant, index) =>
    copyDescriptor(variant, mediaId, `${key}-${variant.width || index}`, context)
  );
  const candidates = [...variants, primary]
    .filter((candidate, index, items) =>
      items.findIndex((item) => item.width === candidate.width) === index
    )
    .sort((a, b) => a.width - b.width);

  return {
    ...primary,
    srcset: candidates.map((candidate) => `${candidate.src} ${candidate.width}w`).join(', '),
    variants: candidates
  };
}

export function materializeMedia(media, { publicRoot, distRoot }) {
  const entries = Array.isArray(media)
    ? media.map((asset) => [asset?.id, asset])
    : Object.entries(media || {});
  if (!entries.length || entries.some(([mediaId, asset]) => !mediaId || !asset || typeof asset !== 'object')) {
    throw new Error('Content bundle media must contain valid assets with unique ids');
  }

  const outputRoot = join(distRoot, 'assets', 'media');
  mkdirSync(outputRoot, { recursive: true });
  const context = { publicRoot: resolve(publicRoot), outputRoot, copied: new Set() };

  return Object.fromEntries(entries.map(([mediaId, asset]) => {
    const desktop = materializeSet(asset, mediaId, context);
    const mobile = asset.mobile ? materializeSet(asset.mobile, mediaId, context, 'mobile') : null;
    return [mediaId, {
      ...asset,
      ...desktop,
      mobile,
      id: mediaId
    }];
  }));
}
