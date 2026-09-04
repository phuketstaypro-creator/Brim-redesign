import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { loadContent } from '../src/content/load-content.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
const exportScript = join(projectRoot, 'scripts', 'export-reference-content.mjs');

test('handoff reference command exports a valid plain ContentBundle outside public assets', async () => {
  const output = join(projectRoot, `.tmp-handoff-reference-${process.pid}.json`);

  try {
    const result = spawnSync(process.execPath, [exportScript, '--output', output], {
      cwd: projectRoot,
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.ok(existsSync(output));
    assert.match(result.stdout, /Reference ContentBundle written/);

    const raw = JSON.parse(readFileSync(output, 'utf8'));
    const content = await loadContent({ cwd: projectRoot, adapter: async () => raw });
    assert.equal(content.schemaVersion, '1.0.0');
    assert.equal(content.site.locale, 'ru');
    assert.ok(Object.keys(content.pages).length > 0);
  } finally {
    rmSync(output, { force: true });
  }
});

test('handoff reference command refuses to publish the export through public', () => {
  const output = join(projectRoot, 'public', `.tmp-handoff-reference-${process.pid}.json`);
  const result = spawnSync(process.execPath, [exportScript, `--output=${output}`], {
    cwd: projectRoot,
    encoding: 'utf8'
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must not be written inside public/);
  assert.equal(existsSync(output), false);
});

test('README handoff commands and local documentation links stay executable', () => {
  const readme = readFileSync(join(projectRoot, 'README.md'), 'utf8');
  const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));

  for (const script of ['build', 'content:reference', 'validate:content', 'verify:cms', 'verify']) {
    assert.equal(typeof packageJson.scripts?.[script], 'string', `package script ${script} is missing`);
    assert.match(readme, new RegExp(`npm run ${script.replace(':', '\\:')}`), `README does not document npm run ${script}`);
  }
  for (const marker of ['ContentBundle', 'CONTENT_ADAPTER=json', 'CMS_CONTENT_FILE', 'ALLOW_INDEXING', '/sveden/', 'brhk-content-locales-v1']) {
    assert.ok(readme.includes(marker), `README is missing handoff marker ${marker}`);
  }

  const missingLinks = [...readme.matchAll(/\]\(([^)]+)\)/g)]
    .map((match) => match[1])
    .filter((target) => !/^(?:https?:|#)/.test(target))
    .filter((target) => !existsSync(resolve(projectRoot, target)));
  assert.deepEqual(missingLinks, [], `README contains missing local links: ${missingLinks.join(', ')}`);
});

test('local QA server uses image MIME types supported by the media contract', () => {
  const serverSource = readFileSync(join(projectRoot, 'scripts', 'dev.mjs'), 'utf8');
  for (const mapping of [
    "'.avif': 'image/avif'",
    "'.gif': 'image/gif'",
    "'.jpeg': 'image/jpeg'",
    "'.jpg': 'image/jpeg'",
    "'.png': 'image/png'",
    "'.webp': 'image/webp'"
  ]) {
    assert.ok(serverSource.includes(mapping), `missing dev-server MIME mapping: ${mapping}`);
  }
});
