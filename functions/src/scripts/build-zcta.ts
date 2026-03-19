/**
 * build-zcta.ts — Downloads the Census ZCTA gazetteer and outputs a minimal
 * ZIP → [lat, lng] JSON lookup file at functions/src/data/zcta.json.
 *
 * Usage: npm --prefix functions run prezcta
 */
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { createUnzip } from 'zlib';

const ZCTA_URL =
  'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2020_Gazetteer/2020_Gaz_zcta_national.zip';

function download(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const follow = (u: string) => {
      https.get(u, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          follow(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    follow(url);
  });
}

function unzipFirstFile(buf: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    // The ZIP is a simple single-file archive. Use zlib's createUnzip for
    // raw deflate, but we need to parse the local file header manually.
    // Local file header signature = 0x04034b50
    const sig = buf.readUInt32LE(0);
    if (sig !== 0x04034b50) {
      reject(new Error('Not a valid ZIP file'));
      return;
    }
    const compressionMethod = buf.readUInt16LE(8);
    const compressedSize = buf.readUInt32LE(18);
    const fileNameLen = buf.readUInt16LE(26);
    const extraLen = buf.readUInt16LE(28);
    const dataOffset = 30 + fileNameLen + extraLen;

    if (compressionMethod === 0) {
      // Stored (no compression)
      resolve(buf.slice(dataOffset, dataOffset + compressedSize).toString('utf-8'));
      return;
    }

    // Deflated
    const compressed = buf.slice(dataOffset, dataOffset + compressedSize);
    const unzipper = createUnzip();
    const chunks: Buffer[] = [];
    unzipper.on('data', (c) => chunks.push(c));
    unzipper.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    unzipper.on('error', reject);

    // createUnzip expects raw deflate with a header; wrap in a minimal gzip-like
    // Actually, let's use the simpler approach: inflate raw deflate
    const { createInflateRaw } = require('zlib');
    const inflater = createInflateRaw();
    const parts: Buffer[] = [];
    inflater.on('data', (c: Buffer) => parts.push(c));
    inflater.on('end', () => resolve(Buffer.concat(parts).toString('utf-8')));
    inflater.on('error', reject);
    inflater.end(compressed);
  });
}

async function main() {
  console.log('Downloading ZCTA gazetteer...');
  const zipBuf = await download(ZCTA_URL);
  console.log(`Downloaded ${(zipBuf.length / 1024 / 1024).toFixed(1)} MB`);

  console.log('Extracting TSV...');
  const tsv = await unzipFirstFile(zipBuf);

  const lines = tsv.split('\n');
  const result: Record<string, [number, number]> = {};

  // First line is header — find column indices
  const header = lines[0].split('\t').map((h) => h.trim());
  const zipIdx = header.indexOf('GEOID');
  const latIdx = header.indexOf('INTPTLAT');
  const lngIdx = header.indexOf('INTPTLONG');

  if (zipIdx === -1 || latIdx === -1 || lngIdx === -1) {
    console.error('Header columns not found:', header);
    process.exit(1);
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length <= Math.max(zipIdx, latIdx, lngIdx)) continue;

    const zip = cols[zipIdx].trim().padStart(5, '0');
    const lat = parseFloat(cols[latIdx].trim());
    const lng = parseFloat(cols[lngIdx].trim());

    if (!zip || zip.length !== 5 || isNaN(lat) || isNaN(lng)) continue;

    // Round to 4 decimal places (~11m precision) to save space
    result[zip] = [Math.round(lat * 10000) / 10000, Math.round(lng * 10000) / 10000];
  }

  const outDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, 'zcta.json');
  fs.writeFileSync(outPath, JSON.stringify(result));

  console.log(`Wrote ${Object.keys(result).length} ZIPs to ${outPath}`);
  console.log(`File size: ${(fs.statSync(outPath).size / 1024).toFixed(0)} KB`);

  // Spot checks
  const checks = ['77040', '00601', '90210', '10001'];
  for (const z of checks) {
    console.log(`  ${z}: ${result[z] ? `[${result[z][0]}, ${result[z][1]}]` : 'NOT FOUND'}`);
  }
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
