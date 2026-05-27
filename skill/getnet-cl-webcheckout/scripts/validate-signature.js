#!/usr/bin/env node
// validate-signature.js — verifies the signature on a Getnet notification payload.
//
// Usage:
//   GETNET_SECRET_KEY=...  node validate-signature.js --file payload.json
//   cat payload.json | GETNET_SECRET_KEY=...  node validate-signature.js
//
// Exit code 0 → signature OK. Exit code 1 → mismatch or error.
//
// Formula (from the manual):
//   signature = sha256( requestId + status.status + status.date + secretKey )
// A `sha256:` prefix on the wire is optional and stripped before comparison.

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

const expected = crypto
  .createHash('sha256')
  .update(`${requestId}${status.status}${status.date}${secretKey}`)
  .digest('hex');

const provided = String(signature).replace(/^sha256:/, '');

const a = Buffer.from(expected, 'hex');
const b = Buffer.from(provided, 'hex').length === a.length
  ? Buffer.from(provided, 'hex')
  : Buffer.alloc(a.length); // force mismatch if lengths differ
const matches = a.length === Buffer.from(provided, 'hex').length
  && crypto.timingSafeEqual(a, b);

if (matches) {
  console.log('Signature OK');
  process.exit(0);
} else {
  console.error('Signature MISMATCH');
  console.error(`  expected: ${expected}`);
  console.error(`  provided: ${provided}`);
  process.exit(1);
}
