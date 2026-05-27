# GetRequestInformation — query a session's status

`POST {baseUrl}/api/session/{requestId}`

Returns the session plus every transaction attempted against it. Use this:

1. After the cardholder returns to `returnUrl`, to determine whether the payment was approved before showing a "thank-you" page.
2. As a fallback when the asynchronous notification has not arrived yet.
3. From the reconciliation cron job — see `references/cron-job.md`.
4. To double-check a notification you received (defense in depth — confirms the signed payload reflects current state).

## Request body — auth only

```jsonc
{
  "auth": { /* see references/authentication.md */ }
}
```

The `requestId` goes in the URL path, **not** in the body.

## Response — `RedirectInformation`

```jsonc
{
  "requestId": 251623,
  "status": {
    "status":  "APPROVED",
    "reason":  "00",
    "message": "La petición ha sido aprobada exitosamente",
    "date":    "2026-05-26T14:51:44+00:00"
  },
  "request":  { /* the original CreateRequest, echoed back */ },
  "payment":  [ /* Transaction[] — see below */ ],
  "subscription": null
}
```

### Session-level `status.status` values

| Value     | Meaning                                                                 |
|-----------|-------------------------------------------------------------------------|
| OK        | Auth request processed successfully (used in auth responses, not session). |
| FAILED    | Auth request failed.                                                    |
| APPROVED  | Session finalised with an approved payment.                             |
| REJECTED  | Session finalised, payment declined.                                    |
| PENDING   | Session is still open; do not finalise the order yet.                   |
| REFUNDED  | A previously approved transaction was refunded.                         |

Treat the session as final only when status is one of `APPROVED`, `REJECTED`, `REFUNDED`. Anything else means *keep polling* (or wait for the notification, which only fires in final states).

### Transaction object

Each entry in `payment[]`:

| Field              | Description                                          |
|--------------------|------------------------------------------------------|
| `status`           | Same shape as session status (APPROVED/REJECTED/…).  |
| `internalReference`| Getnet's internal id — needed for `ReversePayment`.  |
| `reference`        | The `reference` you sent on `CreateRequest`.         |
| `paymentMethod`    | `visa`, `master`, `amex`, `maestro`, `magna`, …      |
| `paymentMethodName`| Human label.                                         |
| `issuerName`       | Issuing bank.                                        |
| `amount`           | `AmountConversion` — `{ from, to, factor }`.         |
| `receipt`          | Receipt number.                                      |
| `franchise`        | `PS_VS`, `PS_MC`, `PS_MS`, `PS_AM`, …                |
| `refunded`         | Boolean.                                             |
| `authorization`    | Authorization code from the issuer.                  |
| `processorFields`  | Array of `{ keyword, value, displayOn }`. Useful keys: `cardType` (`C`=credit, `R`=debit, `P`=prepaid), `bin`, `lastDigits`, `installments`, `terminalNumber`, `merchantCode`. |

## Reading the card type

The manual highlights one tiny but useful trick:

```js
const cardType = transaction.processorFields.find(f => f.keyword === 'cardType')?.value;
// 'C' = credit, 'R' = debit, 'P' = prepaid
```

## Sample response

See `examples/get-request-information-response.json` for a full sample including `processorFields`.
