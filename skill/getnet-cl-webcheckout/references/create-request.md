# CreateRequest — start a payment session

`POST {baseUrl}/api/session/`

Creates a payment session and returns `{ requestId, processUrl }`. Redirect the cardholder to `processUrl` (or hand it to the Lightbox SDK).

## Request body

```jsonc
{
  "auth":   { /* see references/authentication.md */ },
  "locale": "es_CL",
  "buyer":  { /* Person, optional but recommended (A) */ },
  "payer":  { /* Person, optional */ },
  "payment": {
    "reference":    "ORDER-2026-0001",
    "description":  "Order #2026-0001",
    "amount": {
      "currency": "CLP",
      "total":    19990
    },
    "allowPartial": false,
    "shipping":     { /* Person, optional */ },
    "items":        [ /* optional */ ],
    "fields":       [ /* optional */ ]
  },
  "expiration": "2026-05-26T15:00:00-04:00",
  "returnUrl":  "https://mystore.cl/payments/return/{reference}",
  "cancelUrl":  "https://mystore.cl/payments/cancel",
  "ipAddress":  "190.251.4.78",
  "userAgent":  "Mozilla/5.0 …",
  "skipResult":  false,
  "noBuyerFill": false,
  "fields":      [ /* extra metadata to persist with the session */ ]
}
```

## Field semantics

| Field             | Req | Notes |
|-------------------|-----|-------|
| `locale`          | R   | `lang_COUNTRY` per ISO 631-1 + ISO 3166-1. Almost always `es_CL`. |
| `buyer`           | A*  | Recommended. If sent, Getnet pre-fills the buyer form on the hosted page. Use `noBuyerFill: true` to skip the pre-fill. |
| `payer`           | O   | Person paying if different from buyer. |
| `payment`         | R   | See **PaymentRequest** below. |
| `expiration`      | R   | ISO 8601 with offset. Must be ≥ 5 min in the future. Recommended: 15 min. After this the session expires regardless of user activity. |
| `returnUrl`       | R   | Where to send the user when they click "Return to merchant" on the hosted page. See **returnUrl placeholders** below — Getnet substitutes `{reference}` server-side with the actual `payment.reference`, so send it **literally** in the string. |
| `cancelUrl`       | O   | Where to send the user if they abort. |
| `ipAddress`       | R   | Cardholder's IP, captured by your backend. |
| `userAgent`       | R   | Cardholder's user-agent string. |
| `paymentMethod`   | O   | Force a method/franchise. Comma-separated codes (`PS_VS,PS_MC`). See `references/test-cards.md` for codes. |
| `skipResult`      | O   | `true` ⇒ skip the result screen and auto-redirect to merchant on approval. |
| `noBuyerFill`     | O   | `true` ⇒ do not pre-fill the buyer form. |
| `fields`          | O   | Array of `{ keyword, value, displayOn }`. Custom metadata stored alongside the session. |

\* "A" = recommended in the manual's field matrix.

## PaymentRequest

| Field         | Req | Description |
|---------------|-----|-------------|
| `reference`   | R   | **Unique per transaction.** Max 32 chars. Reusing it is a bug on your side. |
| `description` | O   | Free text, max 255 chars. Avoid reserved characters (see below). |
| `amount`      | R   | `{ currency: "CLP", total: <number> }` — see `references/field-reference.md` for the full `Amount` shape (taxes, details). |
| `allowPartial`| R   | Boolean. For Web Checkout: `false`. |
| `shipping`    | O   | `Person` receiving the goods. |
| `items`       | O   | Array of products. |
| `fields`      | O   | Array of `{ keyword, value, displayOn }` rendered on the hosted checkout page. |

## Person

```jsonc
{
  "documentType": "CLRUT",   // CLRUT for Chilean RUT
  "document":     "11111111-9",
  "name":         "Luis",
  "surname":      "Pérez",
  "company":      "ACME",
  "email":        "luis@example.com",
  "address":      {
    "street":     "Av. Apoquindo 1234",
    "city":       "Las Condes",
    "state":      "Región Metropolitana",
    "postalCode": "7550000",
    "country":    "CL",
    "phone":      "+56229999999"
  },
  "mobile":       "+56999999999"
}
```

`documentType` follows Getnet's catalog per country; for Chile use `CLRUT`.

## Response

```jsonc
{
  "status": {
    "status":  "OK",                                           // OK / FAILED
    "reason":  "PC",
    "message": "La petición se ha procesado correctamente",
    "date":    "2026-05-26T14:48:15+00:00"
  },
  "requestId": "1585",
  "processUrl": "https://checkout.getnet.cl/session/1585/f86ee1f48efbecb991ab2c539879ea50"
}
```

Action on `status.status === "OK"`: redirect to `processUrl`, or feed it to `P.init(processUrl)` in the lightbox.

If `status.status === "FAILED"`, inspect `reason` — auth failures land in the 100–104 range (see `references/authentication.md`); business failures use the codes in `references/error-codes.md`.

## returnUrl placeholders

The `returnUrl` is where Getnet sends the cardholder when they click "Return to merchant" after paying (or aborting). To let your landing page identify which order the user is coming back from, include the order's `reference` in the URL.

Getnet supports a **literal placeholder** `{reference}` in `returnUrl`: send the string `{reference}` exactly as written (curly braces and all), and Getnet replaces it with the actual `payment.reference` value at redirect time. **Do not** interpolate the value yourself when using the placeholder form.

```jsonc
{
  "payment": { "reference": "ORDER-2026-0001", /* … */ },
  // Send this string verbatim — Getnet substitutes {reference} → ORDER-2026-0001:
  "returnUrl": "https://mystore.cl/payments/return/{reference}"
  // At redirect time the browser lands on:
  //   https://mystore.cl/payments/return/ORDER-2026-0001
}
```

Use the placeholder anywhere in the URL (path or query string):

- `https://mystore.cl/payments/return/{reference}`
- `https://mystore.cl/payments/return?ref={reference}`

If you prefer, you can also build the URL yourself by interpolating the reference into the string before sending it (e.g. `` `${RETURN_URL}/${reference}` ``) — both forms work, but the literal `{reference}` placeholder is the form recommended by the manual because it keeps the URL stable and decouples the routing from your code.

> **Note:** `{` and `}` are listed as reserved characters for *free-text* fields (`description`, `reference`, names, addresses). They are **allowed** inside `returnUrl` precisely because Getnet parses the placeholder syntax there.

## Reserved characters

These break the request — strip or replace them in any free-text field (`description`, `reference`, names, addresses): `[ ] { } | , " ' ; \ * = ~ !`

## See also

- Full example: `examples/create-request.json`
- Full response example: `examples/create-request-response.json`
- End-to-end Express handler: `examples/node-express-integration.js`
