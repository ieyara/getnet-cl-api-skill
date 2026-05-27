# Authentication — building the `auth` object

Every request to the Web Checkout API carries an `auth` object based on WS-Security UsernameToken Profile 1.1.

## Shape

```json
{
  "auth": {
    "login":   "<your-login>",
    "tranKey": "<computed>",
    "nonce":   "<random-base64>",
    "seed":    "<ISO-8601 timestamp>"
  }
}
```

| Field      | Description                                                                                              |
|------------|----------------------------------------------------------------------------------------------------------|
| `login`    | Site identifier given by Getnet.                                                                          |
| `tranKey`  | `Base64( SHA-256( nonce + seed + secretKey ) )` — where `nonce` here is the **raw bytes**, not its Base64 form. |
| `nonce`    | A fresh random value per request, sent on the wire as Base64.                                            |
| `seed`     | Current time in ISO 8601 with timezone offset, e.g. `2026-05-26T14:42:22-05:00`. Must be within ±5 min of real time. |

## The two `nonce` representations — a frequent bug

- The `nonce` that goes inside the hash is the **original random bytes** (Buffer in Node).
- The `nonce` that goes inside the JSON over the wire is **`base64(thoseBytes)`**.

If you Base64-encode `nonce` and *then* hash it, you get a different `tranKey` than the server expects → error `102` (TranKey mismatch). Read this twice.

## Node.js reference implementation (no dependencies)

```js
import crypto from 'node:crypto';

export function buildAuth({ login, secretKey }) {
  const nonceBytes = crypto.randomBytes(16);          // raw bytes
  const seed = new Date().toISOString();              // 2026-05-26T14:42:22.123Z is valid ISO 8601
  const tranKey = crypto
    .createHash('sha256')
    .update(Buffer.concat([
      nonceBytes,
      Buffer.from(seed, 'utf8'),
      Buffer.from(secretKey, 'utf8'),
    ]))
    .digest('base64');

  return {
    login,
    tranKey,
    nonce: nonceBytes.toString('base64'),
    seed,
  };
}
```

## Equivalents in other languages (for cross-referencing)

- **PHP:** `base64_encode(sha256($nonceRaw . $seed . $secretKey, true))` — the `true` flag forces raw binary output. Without it you'd hash the hex string by accident.
- **Python:** `base64.b64encode(hashlib.sha256(nonce_raw + seed.encode() + secret.encode()).digest())`.

## Authentication error codes

| Code | Cause                                                                                              |
|------|----------------------------------------------------------------------------------------------------|
| 100  | `UsernameToken` not provided (malformed auth header). Usually missing `Content-Type: application/json`. |
| 101  | Site identifier does not exist (wrong `login`, or login from one environment used in the other).   |
| 102  | `tranKey` hash mismatch — recomputed hash differs. Either wrong `secretKey`, wrong nonce-encoding, or `tranKey` malformed. |
| 103  | Seed clock skew > 5 minutes. Sync the server clock with NTP.                                       |
| 104  | Site is inactive (deactivated by Getnet).                                                          |

## Quick local check

The helper script can validate your credentials before you wire anything else:

```bash
GETNET_LOGIN=...  GETNET_SECRET_KEY=...  node scripts/generate-auth.js
```

It prints the four fields. If a `curl` round-trip with that block returns anything but `100/101/102/103/104`, the auth is well-formed.
