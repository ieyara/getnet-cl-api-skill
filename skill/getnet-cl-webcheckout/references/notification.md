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
  "signature": "sha256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0…"
}
```

## Validating the signature (mandatory)

The notification crosses the public internet, so verify it before trusting it. Two layers:

### Layer 1 — HMAC check

```
hash = sha256( requestId + status.status + status.date + secretKey )
```

- Concatenation is plain string concatenation, no separators.
- Compare against `signature`, **stripping the optional `sha256:` prefix** if present.

```js
import crypto from 'node:crypto';

export function verifyNotification(body, secretKey) {
  const expected = crypto
    .createHash('sha256')
    .update(`${body.requestId}${body.status.status}${body.status.date}${secretKey}`)
    .digest('hex');

  const provided = (body.signature || '').replace(/^sha256:/, '');

  // Constant-time compare to avoid timing attacks.
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(provided, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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
