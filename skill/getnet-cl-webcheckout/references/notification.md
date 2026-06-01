# Notification — async server-to-server callback

After a session reaches a final state (`APPROVED`, `REJECTED`, `REFUNDED`), Getnet POSTs a signed JSON body to the merchant's `notificationUrl`. **This is the source of truth.** The cardholder's browser may never come back — the notification will still fire.

The `notificationUrl` is **not** sent on `CreateRequest`. It is configured once per environment by Getnet, using the URL the merchant declared on the *Formulario de Validación*. If you change it later, you must email integracionweb@getnet.cl.

## Server requirements

- Reachable from the public internet over **port 80 or 443**. Other ports are not retried.
- Must respond `200 OK` quickly. Acknowledge first, persist asynchronously.

## Payload shape

```jsonc
{
  "status": {
    "status":  "APPROVED",
    "message": "Testing notification",
    "reason":  "TT",
    "date":    "2026-03-29T16:43:54-05:00"
  },
  "requestId": 1234,
  "reference": "TEST_123424",
  "signature": "ce75b96fee29881acf630dbf51f7d61744ebbd25"
}
```

> **⚠️ Signature algorithm — SHA-1, plain hex, NO prefix (the manual is wrong here).**
> The written manual (v2.3) documents the `signature` as **SHA-256** carrying a `sha256:` prefix. **Live notifications do not match the manual.** Getnet integration support has verified (Postman tests against a real `notificationUrl`) that the signature is:
> - **SHA-1**, not SHA-256 — a 40-character hex string (e.g. `ce75b96fee29881acf630dbf51f7d61744ebbd25`). SHA-256 would be 64 hex chars.
> - **plain**, with **no `sha1:` / `sha256:` prefix** on the wire.
>
> If your handler validates SHA-256 (or requires a prefix), legitimate Getnet notifications are rejected with `401 invalid_signature`. Treat **SHA-1 as the required algorithm**; the validator below still strips any prefix and also accepts SHA-256 purely defensively. Confirm for your specific merchant with Getnet (integracionweb@getnet.cl) if in doubt.

## Validating the signature (mandatory)

The notification crosses the public internet, so verify it before trusting it. Two layers:

### Layer 1 — signature check

The signature is a hash over the same concatenated fields, differing only in algorithm:

```
hash = sha1(   requestId + status.status + status.date + secretKey )   // what Getnet actually sends (40 hex chars)
hash = sha256( requestId + status.status + status.date + secretKey )   // what the manual documents (64 hex chars)
```

- Concatenation is plain string concatenation, no separators.
- `signature` arrives as **plain hex with no prefix**. The code still strips a `sha1:` / `sha256:` prefix defensively, in case Getnet ever adds one.
- Validate against **SHA-1 first** (the algorithm Getnet uses), and accept SHA-256 as a fallback so the handler keeps working if a merchant/environment ever follows the manual.

```js
import crypto from 'node:crypto';

export function verifyNotification(body, secretKey) {
  // Strip any algorithm prefix (e.g. "sha1:" or "sha256:").
  const provided = (body.signature || '').replace(/^sha\d+:/, '');
  const data = `${body.requestId}${body.status.status}${body.status.date}${secretKey}`;

  // SHA-1 is what Getnet sends in practice; SHA-256 is the manual's documented
  // algorithm. Accept either, using a constant-time compare to avoid timing attacks.
  return ['sha1', 'sha256'].some((algo) => {
    const expected = crypto.createHash(algo).update(data).digest('hex');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(provided, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}
```

### Layer 2 — Re-query (defense in depth)

After signature verification, optionally re-fetch the session with `GetRequestInformation` and confirm the status matches what the notification claims. Cheap, and catches bugs where someone replays an old (valid) notification.

## Handler skeleton

```js
app.post('/webhooks/getnet', async (req, res) => {
  const body = req.body;

  if (!verifyNotification(body, process.env.GETNET_SECRET_KEY)) {
    return res.status(401).send('Invalid signature');
  }

  // Acknowledge fast; persist async.
  res.status(200).send('ok');

  // Optional: re-query for defense in depth
  // const fresh = await getRequestInformation(body.requestId);

  await updateOrderStatus({
    reference: body.reference,
    status: body.status.status,
  });
});
```

## Operational rules

- **Never** leak `secretKey` in logs, error pages, or front-end bundles. Pseudonymise it before logging.
- The notification fires only on **final** states. Sessions stuck in `PENDING` won't trigger one — the cron job (`references/cron-job.md`) is your safety net.
- Treat notifications as **at-least-once**: build idempotency around `reference` + `requestId`. The manual implies a single delivery but networks lie; budget for retries.
