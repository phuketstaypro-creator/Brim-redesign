import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { inspectImageBytes, validateImageBytes } from '../src/content/image-metadata.mjs';
import { materializeMedia } from '../src/content/media.mjs';
import { mediaAssets } from '../src/data/media.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
const publicRoot = join(projectRoot, 'public');

function uint32(value) {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32BE(value);
  return bytes;
}

function isoBox(type, payload = Buffer.alloc(0)) {
  const size = Buffer.alloc(4);
  size.writeUInt32BE(payload.length + 8);
  return Buffer.concat([size, Buffer.from(type, 'ascii'), payload]);
}

function fullIsoBox(type, payload = Buffer.alloc(0), version = 0, flags = 0) {
  const header = Buffer.from([version, (flags >>> 16) & 0xff, (flags >>> 8) & 0xff, flags & 0xff]);
  return isoBox(type, Buffer.concat([header, payload]));
}

function avifFixture(width, height) {
  const ftyp = isoBox('ftyp', Buffer.concat([
    Buffer.from('avif', 'ascii'),
    uint32(0),
    Buffer.from('avif', 'ascii'),
    Buffer.from('mif1', 'ascii')
  ]));
  const ispe = fullIsoBox('ispe', Buffer.concat([uint32(width), uint32(height)]));
  const ipco = isoBox('ipco', ispe);
  const ipma = fullIsoBox('ipma', Buffer.from([
    0, 0, 0, 1, // entry count
    0, 1, // item id
    1, // association count
    1 // property index
  ]));
  const iprp = isoBox('iprp', Buffer.concat([ipco, ipma]));
  const pitm = fullIsoBox('pitm', Buffer.from([0, 1]));
  const meta = fullIsoBox('meta', Buffer.concat([pitm, iprp]));
  const mdat = isoBox('mdat', Buffer.from([0]));
  return Buffer.concat([ftyp, meta, mdat]);
}

function jpegFixture(width, height) {
  const sof = Buffer.from([
    0xff, 0xc0, 0x00, 0x0b,
    0x08,
    (height >>> 8) & 0xff, height & 0xff,
    (width >>> 8) & 0xff, width & 0xff,
    0x01, 0x01, 0x11, 0x00
  ]);
  const scan = Buffer.from([
    0xff, 0xda, 0x00, 0x08,
    0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
    0x01
  ]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), sof, scan, Buffer.from([0xff, 0xd9])]);
}

const gifFixture = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');
const pngFixture = readFileSync(join(publicRoot, 'assets', 'images', 'brhk-logo.png'));
const webpFixture = readFileSync(join(publicRoot, 'assets', 'images', 'initiation-001-portrait.webp'));

test('PNG, WebP, JPEG, GIF and AVIF expose intrinsic dimensions from their containers', () => {
  assert.deepEqual(inspectImageBytes(pngFixture, { extension: '.png', source: 'logo' }), {
    format: 'png', width: 280, height: 150
  });
  assert.deepEqual(inspectImageBytes(webpFixture, { extension: '.webp', source: 'portrait' }), {
    format: 'webp', width: 480, height: 720
  });
  assert.deepEqual(inspectImageBytes(jpegFixture(2, 3), { extension: '.jpg', source: 'jpeg fixture' }), {
    format: 'jpeg', width: 2, height: 3
  });
  assert.deepEqual(inspectImageBytes(gifFixture, { extension: '.gif', source: 'gif fixture' }), {
    format: 'gif', width: 1, height: 1
  });
  assert.deepEqual(inspectImageBytes(avifFixture(7, 11), { extension: '.avif', source: 'avif fixture' }), {
    format: 'avif', width: 7, height: 11
  });
});

test('HTML, mismatched signatures, truncated containers and corrupt PNG chunks are rejected', () => {
  assert.throws(
    () => inspectImageBytes(Buffer.from('<!doctype html><title>Not found</title>'), { extension: '.webp', source: '404.webp' }),
    /received HTML instead of image bytes/
  );
  assert.throws(
    () => inspectImageBytes(pngFixture, { extension: '.webp', source: 'wrong.webp' }),
    /WebP RIFF signature is missing/
  );

  const cases = [
    [pngFixture.subarray(0, -1), '.png'],
    [webpFixture.subarray(0, -1), '.webp'],
    [jpegFixture(2, 3).subarray(0, -2), '.jpeg'],
    [gifFixture.subarray(0, -1), '.gif'],
    [avifFixture(7, 11).subarray(0, -1), '.avif']
  ];
  for (const [bytes, extension] of cases) {
    assert.throws(
      () => inspectImageBytes(bytes, { extension, source: `truncated${extension}` }),
      /truncated|missing|size|length/i,
      extension
    );
  }

  const corruptPng = Buffer.from(pngFixture);
  const imageDataChunk = corruptPng.indexOf(Buffer.from('IDAT'));
  assert.ok(imageDataChunk > 0);
  corruptPng[imageDataChunk + 4] ^= 0x01;
  assert.throws(
    () => inspectImageBytes(corruptPng, { extension: '.png', source: 'corrupt.png' }),
    /checksum does not match/
  );
});

test('declared dimensions must match intrinsic dimensions', () => {
  assert.doesNotThrow(() => validateImageBytes(webpFixture, {
    extension: '.webp', width: 480, height: 720, source: 'portrait.webp'
  }));
  assert.throws(
    () => validateImageBytes(webpFixture, {
      extension: '.webp', width: 481, height: 720, source: 'portrait.webp'
    }),
    /declared dimensions 481x720 do not match intrinsic dimensions 480x720/
  );
});

test('invalid descriptors fail before their source is copied', (context) => {
  const distRoot = mkdtempSync(join(tmpdir(), 'brhk-media-invalid-'));
  context.after(() => rmSync(distRoot, { recursive: true, force: true }));
  assert.throws(
    () => materializeMedia([{
      id: 'bad-logo',
      sourcePath: 'assets/images/brhk-logo.png',
      width: 281,
      height: 150
    }], { publicRoot, distRoot }),
    /declared dimensions 281x150 do not match intrinsic dimensions 280x150/
  );
  assert.deepEqual(readdirSync(join(distRoot, 'assets', 'media')), []);
});

test('all first-party media renditions pass integrity validation and materialization', (context) => {
  const distRoot = mkdtempSync(join(tmpdir(), 'brhk-media-valid-'));
  context.after(() => rmSync(distRoot, { recursive: true, force: true }));
  const materialized = materializeMedia(mediaAssets, { publicRoot, distRoot });
  assert.equal(Object.keys(materialized).length, mediaAssets.length);
  assert.ok(readdirSync(join(distRoot, 'assets', 'media')).length >= mediaAssets.length);
});
