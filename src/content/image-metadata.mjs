import { inflateSync } from 'node:zlib';

const FORMAT_BY_EXTENSION = new Map([
  ['.avif', 'avif'],
  ['.gif', 'gif'],
  ['.jpeg', 'jpeg'],
  ['.jpg', 'jpeg'],
  ['.png', 'png'],
  ['.webp', 'webp']
]);

export const SUPPORTED_IMAGE_EXTENSIONS = new Set(FORMAT_BY_EXTENSION.keys());

function invalid(source, reason) {
  throw new Error(`Invalid image payload for ${source}: ${reason}`);
}

function requireBytes(buffer, offset, length, source, context) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > buffer.length) {
    invalid(source, `truncated ${context}`);
  }
}

function requireDimensions(width, height, source, context) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    invalid(source, `${context} has invalid intrinsic dimensions ${width}x${height}`);
  }
  return { width, height };
}

function looksLikeHtml(buffer) {
  const prefix = buffer.subarray(0, Math.min(buffer.length, 256)).toString('utf8').trimStart().toLowerCase();
  return prefix.startsWith('<!doctype html') || prefix.startsWith('<html') || prefix.startsWith('<head') || prefix.startsWith('<body');
}

let crcTable;

function pngCrc32(buffer, start, end) {
  if (!crcTable) {
    crcTable = Array.from({ length: 256 }, (_, index) => {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
      }
      return value >>> 0;
    });
  }

  let crc = 0xffffffff;
  for (let index = start; index < end; index += 1) {
    crc = crcTable[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function inspectPng(buffer, source) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < signature.length || !buffer.subarray(0, signature.length).equals(signature)) {
    invalid(source, 'PNG signature is missing');
  }

  let offset = signature.length;
  let dimensions = null;
  let pixelLayout = null;
  let sawImageData = false;
  let sawEnd = false;
  let chunkIndex = 0;
  const imageData = [];

  while (offset < buffer.length) {
    requireBytes(buffer, offset, 12, source, 'PNG chunk header');
    const length = buffer.readUInt32BE(offset);
    const typeStart = offset + 4;
    const type = buffer.toString('ascii', typeStart, typeStart + 4);
    if (!/^[A-Za-z]{4}$/.test(type)) invalid(source, `PNG chunk ${chunkIndex + 1} has an invalid type`);

    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    requireBytes(buffer, dataStart, length + 4, source, `PNG ${type} chunk`);
    const expectedCrc = buffer.readUInt32BE(dataEnd);
    const actualCrc = pngCrc32(buffer, typeStart, dataEnd);
    if (expectedCrc !== actualCrc) invalid(source, `PNG ${type} chunk checksum does not match`);

    if (chunkIndex === 0 && type !== 'IHDR') invalid(source, 'PNG IHDR must be the first chunk');
    if (type === 'IHDR') {
      if (dimensions) invalid(source, 'PNG contains more than one IHDR chunk');
      if (length !== 13) invalid(source, 'PNG IHDR chunk must contain 13 bytes');
      dimensions = requireDimensions(
        buffer.readUInt32BE(dataStart),
        buffer.readUInt32BE(dataStart + 4),
        source,
        'PNG IHDR'
      );

      const bitDepth = buffer[dataStart + 8];
      const colorType = buffer[dataStart + 9];
      const allowedDepths = {
        0: [1, 2, 4, 8, 16],
        2: [8, 16],
        3: [1, 2, 4, 8],
        4: [8, 16],
        6: [8, 16]
      };
      if (!allowedDepths[colorType]?.includes(bitDepth)) invalid(source, 'PNG IHDR has an invalid bit-depth/color-type combination');
      if (buffer[dataStart + 10] !== 0 || buffer[dataStart + 11] !== 0 || buffer[dataStart + 12] > 1) {
        invalid(source, 'PNG IHDR uses unsupported compression, filtering, or interlace values');
      }
      pixelLayout = { bitDepth, colorType, interlace: buffer[dataStart + 12] };
    } else if (!dimensions) {
      invalid(source, 'PNG chunk appears before IHDR');
    }

    if (type === 'IDAT') {
      sawImageData = true;
      imageData.push(buffer.subarray(dataStart, dataEnd));
    }
    if (type === 'IEND') {
      if (length !== 0) invalid(source, 'PNG IEND chunk must be empty');
      sawEnd = true;
      offset = dataEnd + 4;
      if (offset !== buffer.length) invalid(source, 'PNG contains bytes after IEND');
      break;
    }

    offset = dataEnd + 4;
    chunkIndex += 1;
  }

  if (!dimensions) invalid(source, 'PNG IHDR chunk is missing');
  if (!sawImageData) invalid(source, 'PNG IDAT chunk is missing');
  if (!sawEnd) invalid(source, 'PNG IEND chunk is missing');

  const channelCount = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[pixelLayout.colorType];
  const scanlineLength = (width) => 1 + Math.ceil((width * channelCount * pixelLayout.bitDepth) / 8);
  let expectedInflatedLength;
  if (pixelLayout.interlace === 0) {
    expectedInflatedLength = dimensions.height * scanlineLength(dimensions.width);
  } else {
    const xStart = [0, 4, 0, 2, 0, 1, 0];
    const yStart = [0, 0, 4, 0, 2, 0, 1];
    const xStep = [8, 8, 4, 4, 2, 2, 1];
    const yStep = [8, 8, 8, 4, 4, 2, 2];
    expectedInflatedLength = xStart.reduce((total, start, pass) => {
      const passWidth = dimensions.width <= start ? 0 : Math.ceil((dimensions.width - start) / xStep[pass]);
      const passHeight = dimensions.height <= yStart[pass] ? 0 : Math.ceil((dimensions.height - yStart[pass]) / yStep[pass]);
      return total + (passWidth && passHeight ? passHeight * scanlineLength(passWidth) : 0);
    }, 0);
  }

  let inflated;
  try {
    inflated = inflateSync(Buffer.concat(imageData), { maxOutputLength: expectedInflatedLength + 1 });
  } catch {
    invalid(source, 'PNG IDAT compressed stream is incomplete or invalid');
  }
  if (inflated.length !== expectedInflatedLength) {
    invalid(source, `PNG pixel stream length is ${inflated.length}, expected ${expectedInflatedLength}`);
  }
  return { format: 'png', ...dimensions };
}

function skipGifSubBlocks(buffer, offset, source, context) {
  while (true) {
    requireBytes(buffer, offset, 1, source, `${context} sub-block length`);
    const length = buffer[offset];
    offset += 1;
    if (length === 0) return offset;
    requireBytes(buffer, offset, length, source, `${context} sub-block`);
    offset += length;
  }
}

function inspectGif(buffer, source) {
  requireBytes(buffer, 0, 13, source, 'GIF header');
  const signature = buffer.toString('ascii', 0, 6);
  if (signature !== 'GIF87a' && signature !== 'GIF89a') invalid(source, 'GIF signature is missing');

  const dimensions = requireDimensions(buffer.readUInt16LE(6), buffer.readUInt16LE(8), source, 'GIF logical screen');
  let offset = 13;
  const globalColorTable = (buffer[10] & 0x80) !== 0;
  if (globalColorTable) {
    const tableLength = 3 * (2 ** ((buffer[10] & 0x07) + 1));
    requireBytes(buffer, offset, tableLength, source, 'GIF global color table');
    offset += tableLength;
  }

  let imageCount = 0;
  let sawTrailer = false;
  while (offset < buffer.length) {
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0x3b) {
      sawTrailer = true;
      if (offset !== buffer.length) invalid(source, 'GIF contains bytes after its trailer');
      break;
    }

    if (marker === 0x21) {
      requireBytes(buffer, offset, 1, source, 'GIF extension label');
      const label = buffer[offset];
      offset += 1;
      offset = skipGifSubBlocks(buffer, offset, source, `GIF extension 0x${label.toString(16)}`);
      continue;
    }

    if (marker !== 0x2c) invalid(source, `GIF contains unknown block marker 0x${marker.toString(16)}`);
    requireBytes(buffer, offset, 9, source, 'GIF image descriptor');
    const left = buffer.readUInt16LE(offset);
    const top = buffer.readUInt16LE(offset + 2);
    const frameDimensions = requireDimensions(
      buffer.readUInt16LE(offset + 4),
      buffer.readUInt16LE(offset + 6),
      source,
      'GIF image descriptor'
    );
    if (left + frameDimensions.width > dimensions.width || top + frameDimensions.height > dimensions.height) {
      invalid(source, 'GIF image frame exceeds the logical screen');
    }
    const packed = buffer[offset + 8];
    offset += 9;
    if ((packed & 0x80) !== 0) {
      const tableLength = 3 * (2 ** ((packed & 0x07) + 1));
      requireBytes(buffer, offset, tableLength, source, 'GIF local color table');
      offset += tableLength;
    }
    requireBytes(buffer, offset, 1, source, 'GIF LZW code size');
    const codeSize = buffer[offset];
    if (codeSize < 2 || codeSize > 8) invalid(source, `GIF has invalid LZW code size ${codeSize}`);
    offset += 1;
    offset = skipGifSubBlocks(buffer, offset, source, 'GIF image data');
    imageCount += 1;
  }

  if (!imageCount) invalid(source, 'GIF does not contain an image frame');
  if (!sawTrailer) invalid(source, 'GIF trailer is missing');
  return { format: 'gif', ...dimensions };
}

const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3,
  0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb,
  0xcd, 0xce, 0xcf
]);

function nextJpegMarker(buffer, offset, source, context) {
  if (offset >= buffer.length || buffer[offset] !== 0xff) invalid(source, `${context} is missing a JPEG marker`);
  while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
  requireBytes(buffer, offset, 1, source, `${context} marker`);
  const marker = buffer[offset];
  if (marker === 0x00) invalid(source, `unexpected stuffed byte outside JPEG scan data`);
  return { marker, offset: offset + 1 };
}

function markerAfterJpegScan(buffer, offset, source) {
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    requireBytes(buffer, offset, 1, source, 'JPEG scan marker');
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    return { marker, offset };
  }
  invalid(source, 'JPEG scan data is truncated before EOI');
}

function inspectJpeg(buffer, source) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) invalid(source, 'JPEG SOI signature is missing');

  let offset = 2;
  let pendingMarker = null;
  let dimensions = null;
  let sawScan = false;

  while (offset < buffer.length || pendingMarker) {
    const markerInfo = pendingMarker || nextJpegMarker(buffer, offset, source, 'JPEG segment');
    pendingMarker = null;
    const { marker } = markerInfo;
    offset = markerInfo.offset;

    if (marker === 0xd9) {
      if (!dimensions) invalid(source, 'JPEG start-of-frame segment is missing');
      if (!sawScan) invalid(source, 'JPEG scan segment is missing');
      if (offset !== buffer.length) invalid(source, 'JPEG contains bytes after EOI');
      return { format: 'jpeg', ...dimensions };
    }
    if (marker === 0xd8) invalid(source, 'JPEG contains an unexpected SOI marker');
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;

    requireBytes(buffer, offset, 2, source, `JPEG 0x${marker.toString(16)} segment length`);
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2) invalid(source, `JPEG 0x${marker.toString(16)} segment has an invalid length`);
    const dataStart = offset + 2;
    const segmentEnd = offset + segmentLength;
    requireBytes(buffer, dataStart, segmentLength - 2, source, `JPEG 0x${marker.toString(16)} segment`);

    if (JPEG_START_OF_FRAME_MARKERS.has(marker)) {
      if (segmentLength < 8) invalid(source, 'JPEG start-of-frame segment is too short');
      const componentCount = buffer[dataStart + 5];
      if (!componentCount || segmentLength !== 8 + (3 * componentCount)) {
        invalid(source, 'JPEG start-of-frame component table is malformed');
      }
      const frameDimensions = requireDimensions(
        buffer.readUInt16BE(dataStart + 3),
        buffer.readUInt16BE(dataStart + 1),
        source,
        'JPEG frame'
      );
      if (dimensions && (dimensions.width !== frameDimensions.width || dimensions.height !== frameDimensions.height)) {
        invalid(source, 'JPEG contains conflicting frame dimensions');
      }
      dimensions = frameDimensions;
    }

    offset = segmentEnd;
    if (marker === 0xda) {
      if (!dimensions) invalid(source, 'JPEG scan appears before its start-of-frame segment');
      const componentCount = buffer[dataStart];
      if (!componentCount || segmentLength !== 6 + (2 * componentCount)) {
        invalid(source, 'JPEG scan component table is malformed');
      }
      sawScan = true;
      pendingMarker = markerAfterJpegScan(buffer, offset, source);
      offset = pendingMarker.offset;
    }
  }

  invalid(source, 'JPEG EOI marker is missing');
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function webpBitstreamDimensions(buffer, type, dataStart, length, source) {
  if (type === 'VP8 ') {
    if (length < 10) invalid(source, 'WebP VP8 frame is truncated');
    if ((buffer[dataStart] & 1) !== 0 || buffer[dataStart + 3] !== 0x9d || buffer[dataStart + 4] !== 0x01 || buffer[dataStart + 5] !== 0x2a) {
      invalid(source, 'WebP VP8 key-frame header is invalid');
    }
    return requireDimensions(
      buffer.readUInt16LE(dataStart + 6) & 0x3fff,
      buffer.readUInt16LE(dataStart + 8) & 0x3fff,
      source,
      'WebP VP8 frame'
    );
  }
  if (type === 'VP8L') {
    if (length < 5 || buffer[dataStart] !== 0x2f) invalid(source, 'WebP VP8L frame header is invalid or truncated');
    const packed = buffer.readUInt32LE(dataStart + 1);
    return requireDimensions(
      (packed & 0x3fff) + 1,
      ((packed >>> 14) & 0x3fff) + 1,
      source,
      'WebP VP8L frame'
    );
  }
  return null;
}

function inspectWebpAnimationFrame(buffer, start, end, source, frameDimensions) {
  let offset = start;
  let bitstreamDimensions = null;
  while (offset < end) {
    requireBytes(buffer, offset, 8, source, 'WebP ANMF subchunk header');
    const type = buffer.toString('ascii', offset, offset + 4);
    const length = buffer.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    requireBytes(buffer, dataStart, length, source, `WebP ANMF ${type} subchunk`);
    const paddedEnd = dataEnd + (length & 1);
    if (paddedEnd > end) invalid(source, `truncated WebP ANMF ${type} subchunk padding`);
    if ((length & 1) && buffer[dataEnd] !== 0) invalid(source, `WebP ANMF ${type} subchunk has non-zero padding`);
    if (type !== 'ALPH' && type !== 'VP8 ' && type !== 'VP8L') invalid(source, `unsupported WebP ANMF ${type} subchunk`);
    const candidate = webpBitstreamDimensions(buffer, type, dataStart, length, source);
    if (candidate) {
      if (bitstreamDimensions) invalid(source, 'WebP ANMF contains more than one image bitstream');
      bitstreamDimensions = candidate;
    }
    offset = paddedEnd;
  }
  if (offset !== end) invalid(source, 'WebP ANMF subchunk container is truncated');
  if (!bitstreamDimensions) invalid(source, 'WebP ANMF image bitstream is missing');
  if (bitstreamDimensions.width !== frameDimensions.width || bitstreamDimensions.height !== frameDimensions.height) {
    invalid(source, 'WebP ANMF frame dimensions do not match its image bitstream');
  }
}

function inspectWebp(buffer, source) {
  requireBytes(buffer, 0, 12, source, 'WebP RIFF header');
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    invalid(source, 'WebP RIFF signature is missing');
  }
  const declaredSize = buffer.readUInt32LE(4) + 8;
  if (declaredSize !== buffer.length) invalid(source, `WebP RIFF size is ${declaredSize}, but payload length is ${buffer.length}`);

  let offset = 12;
  let dimensions = null;
  let hasImageData = false;
  let sawExtendedHeader = false;
  let sawAnimation = false;
  let sawAnimationHeader = false;
  let sawAnimationFrame = false;

  while (offset < buffer.length) {
    requireBytes(buffer, offset, 8, source, 'WebP chunk header');
    const type = buffer.toString('ascii', offset, offset + 4);
    const length = buffer.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    requireBytes(buffer, dataStart, length, source, `WebP ${type} chunk`);
    const paddedEnd = dataEnd + (length & 1);
    requireBytes(buffer, dataEnd, length & 1, source, `WebP ${type} padding`);
    if ((length & 1) && buffer[dataEnd] !== 0) invalid(source, `WebP ${type} chunk has non-zero padding`);

    let chunkDimensions = null;
    if (type === 'VP8X') {
      if (offset !== 12) invalid(source, 'WebP VP8X must be the first chunk');
      if (length !== 10) invalid(source, 'WebP VP8X chunk must contain 10 bytes');
      if ((buffer[dataStart] & 0xc1) !== 0 || buffer[dataStart + 1] || buffer[dataStart + 2] || buffer[dataStart + 3]) {
        invalid(source, 'WebP VP8X contains non-zero reserved bits');
      }
      chunkDimensions = requireDimensions(
        readUInt24LE(buffer, dataStart + 4) + 1,
        readUInt24LE(buffer, dataStart + 7) + 1,
        source,
        'WebP VP8X canvas'
      );
      sawExtendedHeader = true;
      sawAnimation = (buffer[dataStart] & 0x02) !== 0;
    } else if (type === 'VP8 ' || type === 'VP8L') {
      chunkDimensions = webpBitstreamDimensions(buffer, type, dataStart, length, source);
      hasImageData = true;
    } else if (type === 'ANMF') {
      if (length < 16) invalid(source, 'WebP ANMF frame is truncated');
      const left = readUInt24LE(buffer, dataStart) * 2;
      const top = readUInt24LE(buffer, dataStart + 3) * 2;
      const frameDimensions = requireDimensions(
        readUInt24LE(buffer, dataStart + 6) + 1,
        readUInt24LE(buffer, dataStart + 9) + 1,
        source,
        'WebP ANMF frame'
      );
      if (!dimensions || left + frameDimensions.width > dimensions.width || top + frameDimensions.height > dimensions.height) {
        invalid(source, 'WebP ANMF frame exceeds or precedes its VP8X canvas');
      }
      inspectWebpAnimationFrame(buffer, dataStart + 16, dataEnd, source, frameDimensions);
      hasImageData = true;
      sawAnimationFrame = true;
    } else if (type === 'ANIM') {
      if (length !== 6) invalid(source, 'WebP ANIM chunk must contain 6 bytes');
      sawAnimationHeader = true;
    }

    if (chunkDimensions) {
      if (!dimensions || type === 'VP8X') {
        dimensions = chunkDimensions;
      } else if ((!sawExtendedHeader || !sawAnimation)
        && (dimensions.width !== chunkDimensions.width || dimensions.height !== chunkDimensions.height)) {
        invalid(source, 'WebP canvas and frame dimensions conflict');
      }
    }
    offset = paddedEnd;
  }

  if (offset !== buffer.length) invalid(source, 'WebP chunk container is truncated');
  if (!dimensions) invalid(source, 'WebP intrinsic dimensions are missing');
  if (!hasImageData) invalid(source, 'WebP image data chunk is missing');
  if (sawAnimation && (!sawAnimationHeader || !sawAnimationFrame)) invalid(source, 'WebP animation header or frame is missing');
  if (!sawAnimation && (sawAnimationHeader || sawAnimationFrame)) invalid(source, 'WebP animation chunks require the VP8X animation flag');
  return { format: 'webp', ...dimensions };
}

function readIsoBoxes(buffer, start, end, source, context) {
  const boxes = [];
  let offset = start;
  while (offset < end) {
    requireBytes(buffer, offset, 8, source, `${context} box header`);
    const size32 = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    let headerSize = 8;
    let size;
    if (size32 === 1) {
      requireBytes(buffer, offset, 16, source, `${context} extended box header`);
      const largeSize = buffer.readBigUInt64BE(offset + 8);
      if (largeSize > BigInt(Number.MAX_SAFE_INTEGER)) invalid(source, `${context} ${type} box is too large`);
      size = Number(largeSize);
      headerSize = 16;
    } else if (size32 === 0) {
      size = end - offset;
    } else {
      size = size32;
    }
    if (size < headerSize) invalid(source, `${context} ${type} box has an invalid size`);
    const boxEnd = offset + size;
    if (boxEnd > end) invalid(source, `truncated ${context} ${type} box`);
    boxes.push({ type, start: offset, dataStart: offset + headerSize, end: boxEnd, size, headerSize });
    offset = boxEnd;
  }
  if (offset !== end) invalid(source, `${context} box container is truncated`);
  return boxes;
}

function fullBoxVersionAndFlags(buffer, box, source) {
  requireBytes(buffer, box.dataStart, 4, source, `AVIF ${box.type} full-box header`);
  return {
    version: buffer[box.dataStart],
    flags: buffer.readUIntBE(box.dataStart + 1, 3),
    payloadStart: box.dataStart + 4
  };
}

function parseAvifPrimaryItem(buffer, pitm, source) {
  const { version, payloadStart } = fullBoxVersionAndFlags(buffer, pitm, source);
  if (version === 0) {
    requireBytes(buffer, payloadStart, 2, source, 'AVIF pitm item id');
    if (payloadStart + 2 !== pitm.end) invalid(source, 'AVIF pitm box has an invalid length');
    return buffer.readUInt16BE(payloadStart);
  }
  if (version === 1) {
    requireBytes(buffer, payloadStart, 4, source, 'AVIF pitm item id');
    if (payloadStart + 4 !== pitm.end) invalid(source, 'AVIF pitm box has an invalid length');
    return buffer.readUInt32BE(payloadStart);
  }
  invalid(source, `unsupported AVIF pitm version ${version}`);
}

function parseAvifAssociations(buffer, ipma, source) {
  const { version, flags, payloadStart } = fullBoxVersionAndFlags(buffer, ipma, source);
  if (version > 1) invalid(source, `unsupported AVIF ipma version ${version}`);
  requireBytes(buffer, payloadStart, 4, source, 'AVIF ipma entry count');
  const entryCount = buffer.readUInt32BE(payloadStart);
  let offset = payloadStart + 4;
  const associations = new Map();
  for (let entry = 0; entry < entryCount; entry += 1) {
    const idLength = version < 1 ? 2 : 4;
    requireBytes(buffer, offset, idLength + 1, source, 'AVIF ipma item association');
    const itemId = idLength === 2 ? buffer.readUInt16BE(offset) : buffer.readUInt32BE(offset);
    offset += idLength;
    const associationCount = buffer[offset];
    offset += 1;
    const propertyIndexes = [];
    for (let association = 0; association < associationCount; association += 1) {
      if ((flags & 1) !== 0) {
        requireBytes(buffer, offset, 2, source, 'AVIF ipma wide property association');
        propertyIndexes.push(buffer.readUInt16BE(offset) & 0x7fff);
        offset += 2;
      } else {
        requireBytes(buffer, offset, 1, source, 'AVIF ipma property association');
        propertyIndexes.push(buffer[offset] & 0x7f);
        offset += 1;
      }
    }
    associations.set(itemId, propertyIndexes.filter(Boolean));
  }
  if (offset !== ipma.end) invalid(source, 'AVIF ipma box has trailing or malformed bytes');
  return associations;
}

function parseAvifIspe(buffer, box, source) {
  const { version, payloadStart } = fullBoxVersionAndFlags(buffer, box, source);
  if (version !== 0 || payloadStart + 8 !== box.end) invalid(source, 'AVIF ispe box has an invalid version or length');
  return requireDimensions(buffer.readUInt32BE(payloadStart), buffer.readUInt32BE(payloadStart + 4), source, 'AVIF ispe property');
}

function inspectAvif(buffer, source) {
  const topLevel = readIsoBoxes(buffer, 0, buffer.length, source, 'AVIF top-level');
  const ftyp = topLevel.find((box) => box.type === 'ftyp');
  if (!ftyp) invalid(source, 'AVIF ftyp box is missing');
  requireBytes(buffer, ftyp.dataStart, 8, source, 'AVIF ftyp payload');
  if ((ftyp.end - ftyp.dataStart - 8) % 4 !== 0) invalid(source, 'AVIF ftyp compatible-brand list is malformed');
  const brands = [buffer.toString('ascii', ftyp.dataStart, ftyp.dataStart + 4)];
  for (let offset = ftyp.dataStart + 8; offset < ftyp.end; offset += 4) {
    brands.push(buffer.toString('ascii', offset, offset + 4));
  }
  if (!brands.includes('avif') && !brands.includes('avis')) invalid(source, 'ISO-BMFF payload does not declare an AVIF brand');

  const meta = topLevel.find((box) => box.type === 'meta');
  if (!meta) invalid(source, 'AVIF meta box is missing');
  const metaHeader = fullBoxVersionAndFlags(buffer, meta, source);
  if (metaHeader.version !== 0) invalid(source, `unsupported AVIF meta version ${metaHeader.version}`);
  const metaChildren = readIsoBoxes(buffer, metaHeader.payloadStart, meta.end, source, 'AVIF meta');
  const pitm = metaChildren.find((box) => box.type === 'pitm');
  const iprp = metaChildren.find((box) => box.type === 'iprp');
  if (!iprp) invalid(source, 'AVIF iprp property container is missing');

  const iprpChildren = readIsoBoxes(buffer, iprp.dataStart, iprp.end, source, 'AVIF iprp');
  const ipco = iprpChildren.find((box) => box.type === 'ipco');
  const ipma = iprpChildren.find((box) => box.type === 'ipma');
  if (!ipco) invalid(source, 'AVIF ipco property container is missing');
  const properties = readIsoBoxes(buffer, ipco.dataStart, ipco.end, source, 'AVIF ipco');
  const dimensionProperties = properties
    .map((box, index) => box.type === 'ispe' ? { index: index + 1, dimensions: parseAvifIspe(buffer, box, source) } : null)
    .filter(Boolean);
  if (!dimensionProperties.length) invalid(source, 'AVIF ispe intrinsic-dimension property is missing');

  let dimensions = null;
  if (pitm && ipma) {
    const primaryItem = parseAvifPrimaryItem(buffer, pitm, source);
    const associations = parseAvifAssociations(buffer, ipma, source).get(primaryItem) || [];
    const associatedDimensions = dimensionProperties.filter((property) => associations.includes(property.index));
    if (associatedDimensions.length) {
      dimensions = associatedDimensions[0].dimensions;
      if (associatedDimensions.some((property) => property.dimensions.width !== dimensions.width || property.dimensions.height !== dimensions.height)) {
        invalid(source, 'AVIF primary item has conflicting intrinsic dimensions');
      }
    } else {
      invalid(source, 'AVIF primary item is not associated with an ispe property');
    }
  }

  if (!dimensions) {
    const unique = new Map(dimensionProperties.map(({ dimensions: item }) => [`${item.width}x${item.height}`, item]));
    if (unique.size !== 1) invalid(source, 'AVIF primary intrinsic dimensions cannot be determined unambiguously');
    dimensions = [...unique.values()][0];
  }

  const hasPayload = topLevel.some((box) => box.type === 'mdat' && box.end > box.dataStart)
    || metaChildren.some((box) => box.type === 'idat' && box.end > box.dataStart);
  if (!hasPayload) invalid(source, 'AVIF image data box is missing or empty');
  return { format: 'avif', ...dimensions };
}

const INSPECTORS = {
  avif: inspectAvif,
  gif: inspectGif,
  jpeg: inspectJpeg,
  png: inspectPng,
  webp: inspectWebp
};

export function inspectImageBytes(bytes, { extension, source = 'image' } = {}) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || []);
  const normalizedExtension = String(extension || '').toLowerCase();
  const expectedFormat = FORMAT_BY_EXTENSION.get(normalizedExtension);
  if (!expectedFormat) invalid(source, `unsupported extension ${normalizedExtension || '(none)'}`);
  if (!buffer.length) invalid(source, 'payload is empty');
  if (looksLikeHtml(buffer)) invalid(source, 'received HTML instead of image bytes');
  return INSPECTORS[expectedFormat](buffer, source);
}

export function validateImageBytes(bytes, { extension, width, height, source = 'image' } = {}) {
  const metadata = inspectImageBytes(bytes, { extension, source });
  if (metadata.width !== width || metadata.height !== height) {
    invalid(source, `declared dimensions ${width}x${height} do not match intrinsic dimensions ${metadata.width}x${metadata.height}`);
  }
  return metadata;
}
