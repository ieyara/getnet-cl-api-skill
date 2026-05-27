#!/usr/bin/env node
// generate-auth.js — prints a GetNet Chile Web Checkout `auth` object to stdout.
//
// Usage:
//   GETNET_LOGIN=...  GETNET_SECRET_KEY=...  node generate-auth.js
//   node generate-auth.js --login <login> --secret-key <secret>
//
// Output (pretty-printed JSON):
//   { "login": "...", "tranKey": "...", "nonce": "...", "seed": "..." }
//
// No third-party dependencies — only Node's built-in `crypto`.

const crypto = require('node:crypto');

function readArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const login = readArg('login') || process.env.GETNET_LOGIN;
const secretKey = readArg('secret-key') || process.env.GETNET_SECRET_KEY;

if (!login || !secretKey) {
  console.error('Missing credentials.');
  console.error('  Provide --login and --secret-key, or set GETNET_LOGIN and GETNET_SECRET_KEY.');
  process.exit(1);
}

const nonceBytes = crypto.randomBytes(16);
const seed = new Date().toISOString(); // ISO 8601 with offset (Z = +00:00)

const tranKey = crypto
  .createHash('sha256')
  .update(Buffer.concat([
    nonceBytes,
    Buffer.from(seed, 'utf8'),
    Buffer.from(secretKey, 'utf8'),
  ]))
  .digest('base64');

const auth = {
  login,
  tranKey,
  nonce: nonceBytes.toString('base64'),
  seed,
};

process.stdout.write(JSON.stringify(auth, null, 2) + '\n');
