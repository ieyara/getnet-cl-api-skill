#!/usr/bin/env node
// validate-signature.js — verifies the signature on a Getnet notification payload.
//
// Usage:
//   GETNET_SECRET_KEY=...  node validate-signature.js --file payload.json
//   cat payload.json | GETNET_SECRET_KEY=...  node validate-signature.js
//
// Exit code 0 → signature OK. Exit code 1 → mismatch or error.
//
// Formula:
//   signature = HASH( requestId + status.status + status.date + secretKey )
// HASH is SHA-1 in practice — Getnet support verified (Postman against a real
// notificationUrl) that live notifications carry a 40-char SHA-1 hex digest with
// NO prefix. The manual documents SHA-256 with a `sha256:` prefix; that does not
// match production. This script validates SHA-1 first and accepts SHA-256 as a
// defensive fallback, and strips any `sha1:`/`sha256:` prefix before comparing.

const crypto = require('node:crypto');
const fs = require('node:fs');

function readArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const secretKey = process.env.GETNET_SECRET_KEY;
if (!secretKey) {
  console.error('Missing GETNET_SECRET_KEY env var.');
  process.exit(1);
}

function readPayload() {
  const file = readArg('file');
  if (file) return fs.readFileSync(file, 'utf8');
  if (!process.stdin.isTTY) return fs.readFileSync(0, 'utf8');
  console.error('No payload provided. Use --file <path> or pipe JSON on stdin.');
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(readPayload());
} catch (e) {
  console.error('Could not parse payload as JSON:', e.message);
  process.exit(1);
}

const { requestId, status, signature } = payload;
if (requestId == null || !status?.status || !status?.date || !signature) {
  console.error('Payload is missing required fields (requestId, status.status, status.date, signature).');
  process.exit(1);
}

const data = `${requestId}${status.status}${status.date}${secretKey}`;
const provided = String(signature).replace(/^sha\d+:/, '');
const providedBuf = Buffer.from(provided, 'hex');

// SHA-1 is what Getnet sends; SHA-256 is the manual's (incorrect) documentation.
const candidates = ['sha1', 'sha256'].map((algo) => ({
  algo,
  expected: crypto.createHash(algo).update(data).digest('hex'),
}));

const match = candidates.find(({ expected }) => {
  const a = Buffer.from(expected, 'hex');
  return a.length === providedBuf.length && crypto.timingSafeEqual(a, providedBuf);
});

if (match) {
  console.log(`Signature OK (${match.algo})`);
  process.exit(0);
} else {
  console.error('Signature MISMATCH');
  for (const { algo, expected } of candidates) {
    console.error(`  expected (${algo}): ${expected}`);
  }
  console.error(`  provided:        ${provided}`);
  process.exit(1);
}
