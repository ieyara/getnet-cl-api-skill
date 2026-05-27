# Response and reason codes

## Authentication errors (returned on every endpoint when `auth` is wrong)

| Code | Cause                                                                |
|------|----------------------------------------------------------------------|
| 100  | `UsernameToken` not provided / malformed auth header.                |
| 101  | Site identifier doesn't exist (wrong `login`, or wrong environment). |
| 102  | `tranKey` hash mismatch — recompute the SHA-256 with raw nonce bytes. |
| 103  | `seed` clock skew > 5 min. Sync via NTP.                             |
| 104  | Site inactive (deactivated by Getnet).                               |

If you receive `100` with what looks like a perfect JSON body, the usual culprit is a missing `Content-Type: application/json` header — the server then parses the body as text and can't find `auth`.

## Transaction reason codes (carried inside `status.reason`)

| Code | Meaning                                                                                                  |
|------|----------------------------------------------------------------------------------------------------------|
| 00   | Approved.                                                                                                |
| 01   | Declined. Merchant should contact the authorisation centre.                                              |
| 02   | Declined. Contact issuing bank (special conditions).                                                     |
| 03   | Declined. Merchant not enabled.                                                                          |
| 04   | Declined. Hold/capture with retention order.                                                             |
| 05   | Declined. Card possibly blocked or timeout.                                                              |
| 12   | Declined. Wrong account type / card-account mismatch.                                                    |
| 13   | Declined. Invalid advance amount.                                                                        |
| 14   | Declined. Card blocked by issuer.                                                                        |
| 30   | Bad format.                                                                                              |
| 41   | Lost card.                                                                                               |
| 43   | Stolen card.                                                                                             |
| 46   | Closed account.                                                                                          |
| 51   | Insufficient funds.                                                                                      |
| 54   | Expired card.                                                                                            |
| 57   | Declined. Transaction not allowed by issuer.                                                             |
| 58   | Invalid transaction.                                                                                     |
| 61   | Declined. Amount exceeds the issuer's per-card limit.                                                    |
| 62   | Declined. Card disabled by issuer.                                                                       |
| 63   | Security violation.                                                                                      |
| 89   | Declined. Invalid routing for the card type.                                                             |
| 91   | Declined. Authorisation not possible.                                                                    |
| 92   | Declined. Card possibly blocked or timeout.                                                              |
| 94   | Declined. Duplicate transaction. *Almost always means you reused a `reference`.*                         |
| 96   | Declined. Transaction could not be processed.                                                            |
| ?2   | Declined by risk-control policies.                                                                       |
| BN   | Card BIN is not supported by risk-control policies.                                                      |
| XR   | Failure reading the response.                                                                            |
| X3   | Communication error with the provider — retry shortly.                                                   |
| XC   | Invalid or unsupported currency code.                                                                    |

## Session-level `status.status` values (recap)

| Value     | Action                                                                  |
|-----------|-------------------------------------------------------------------------|
| OK        | Auth request OK (used in auth flow only).                               |
| FAILED    | Auth failed — inspect `reason`.                                         |
| APPROVED  | Final. Mark order paid.                                                 |
| REJECTED  | Final. Show the failure page; offer retry with a new `reference`.       |
| PENDING   | Not final. Keep polling / wait for the notification / cron will catch it. |
| REFUNDED  | A previous approval has been refunded.                                  |

## Common gotchas

- `94` (duplicate transaction) almost always means the integration is recycling `reference` values. Generate a fresh one (UUID, snowflake, monotonic counter) per attempt.
- `BN` (BIN blocked) is risk-control rejecting a card before the issuer sees it. Nothing the merchant can fix client-side — surface a generic "try another card" message.
- `103` is timezone fights. Make sure you're emitting ISO 8601 *with* a timezone offset, not a naïve local time string.
