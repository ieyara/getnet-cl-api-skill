// End-to-end Express integration with GetNet Chile Web Checkout.
// Dependencies: express, body-parser (or express.json()). Crypto is built-in.
//
// Required env vars:
//   GETNET_BASE_URL          https://checkout.test.getnet.cl   (or .../checkout.getnet.cl)
//   GETNET_LOGIN             site identifier from Getnet
//   GETNET_SECRET_KEY        secret key from Getnet
//   GETNET_RETURN_URL        e.g. https://mystore.cl/payments/return/{reference}
//                            — include the literal placeholder {reference}; Getnet
//                              substitutes it with payment.reference at redirect time.
//
// notificationUrl is configured by Getnet at the account level (not per-request).

import crypto from 'node:crypto';
import express from 'express';

const app = express();
app.use(express.json());

const BASE_URL = process.env.GETNET_BASE_URL;
const LOGIN = process.env.GETNET_LOGIN;
const SECRET = process.env.GETNET_SECRET_KEY;
const RETURN_URL = process.env.GETNET_RETURN_URL;

function buildAuth() {
  const nonceBytes = crypto.randomBytes(16);
  const seed = new Date().toISOString();
  const tranKey = crypto
    .createHash('sha256')
    .update(Buffer.concat([
      nonceBytes,
      Buffer.from(seed, 'utf8'),
      Buffer.from(SECRET, 'utf8'),
    ]))
    .digest('base64');

  return {
    login: LOGIN,
    tranKey,
    nonce: nonceBytes.toString('base64'),
    seed,
  };
}

async function callGetnet(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ----- 1. Start a payment session -----
app.post('/api/checkout/start', async (req, res) => {
  const { reference, total, buyer, ip, userAgent } = req.body;

  const body = {
    auth: buildAuth(),
    locale: 'es_CL',
    buyer,
    payment: {
      reference,
      description: `Order ${reference}`,
      amount: { currency: 'CLP', total },
      allowPartial: false,
    },
    expiration: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    // RETURN_URL must contain the literal `{reference}` placeholder
    // (e.g. https://mystore.cl/payments/return/{reference}). Getnet
    // substitutes it with payment.reference when redirecting the user.
    returnUrl: RETURN_URL,
    ipAddress: ip,
    userAgent,
  };

  const json = await callGetnet('/api/session/', body);

  if (json.status?.status !== 'OK') {
    return res.status(502).json({ error: json.status?.message, code: json.status?.reason });
  }

  // Persist { reference, requestId, status: 'PENDING' } before responding.
  res.json({ requestId: json.requestId, processUrl: json.processUrl });
});

// ----- 2. Confirm status after the cardholder returns -----
// Route must match the shape of GETNET_RETURN_URL. With
// `https://mystore.cl/payments/return/{reference}` Getnet substitutes the
// placeholder and the browser lands on `/payments/return/<the-reference>`.
app.get('/payments/return/:reference', async (req, res) => {
  const { reference } = req.params;
  // Look up requestId by reference in your DB.
  const requestId = await db.findRequestId(reference);

  const info = await callGetnet(`/api/session/${requestId}`, { auth: buildAuth() });

  res.render('return', { status: info.status.status, payment: info.payment?.[0] });
});

// ----- 3. Async notification (source of truth) -----
function verifyNotification(body) {
  const expected = crypto
    .createHash('sha256')
    .update(`${body.requestId}${body.status.status}${body.status.date}${SECRET}`)
    .digest('hex');
  const provided = (body.signature || '').replace(/^sha256:/, '');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(provided, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.post('/webhooks/getnet', async (req, res) => {
  if (!verifyNotification(req.body)) {
    return res.status(401).send('Invalid signature');
  }
  res.status(200).send('ok'); // ack first

  await db.updateOrderStatus({
    reference: req.body.reference,
    status: req.body.status.status,
  });
});

// ----- 4. Optional: reverse a same-day approved payment -----
app.post('/api/checkout/reverse', async (req, res) => {
  const { internalReference } = req.body;
  const json = await callGetnet('/api/reverse', {
    auth: buildAuth(),
    internalReference,
  });
  res.json(json);
});

app.listen(3000, () => console.log('Listening on :3000'));
