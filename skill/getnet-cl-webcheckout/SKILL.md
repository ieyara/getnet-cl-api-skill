---
name: getnet-cl-webcheckout
description: Use when integrating with GetNet **Chile** Web Checkout REST API (checkout.getnet.cl) — creating payment sessions, building the tranKey authentication block, handling redirect/lightbox flows, validating async notifications, reversing payments, or troubleshooting auth errors 100–104. Triggers on mentions of "GetNet Chile", "Web Checkout", "checkout.getnet.cl", "checkout.test.getnet.cl", "tranKey", "createRequest", "processUrl", or "PlacetoPay" in a Chilean context. Does NOT cover GetNet APIs from other countries (Argentina, Brazil, Mexico) which use different endpoints and contracts.
---

# GetNet Chile — Web Checkout integration

GetNet Chile's Web Checkout is a redirect/lightbox payment gateway. The merchant's backend creates a payment session, redirects the cardholder to a Getnet-hosted URL, and receives the result through (a) a return URL and (b) an asynchronous server-to-server notification. This skill helps you write that integration correctly in Node.js / JavaScript / TypeScript.

## Flow at a glance

```
1. Cardholder confirms purchase on merchant site
2. Backend POSTs CreateRequest to /api/session/  →  { requestId, processUrl }
3. Browser is redirected to processUrl (or opens it via the lightbox)
4. Cardholder pays on Getnet's hosted page
5a. Browser returns to merchant's returnUrl (the user's path home)
5b. Getnet POSTs a signed notification to the merchant's notificationUrl (truth)
6. Backend calls GetRequestInformation to confirm final state if needed
```

## When to load which reference

| You need to…                                          | Open                                      |
|-------------------------------------------------------|-------------------------------------------|
| Pick environment, get credentials, understand TLS/PCI | `references/overview.md`                  |
| Build the `auth` object (`tranKey`, `nonce`, `seed`)  | `references/authentication.md`            |
| Build a `CreateRequest` body (payer, payment, amount) | `references/create-request.md`            |
| Query session/transaction status                      | `references/get-request-information.md`   |
| Reverse a same-day approved payment                   | `references/reverse-payment.md`           |
| Embed checkout in a popup instead of redirecting      | `references/lightbox.md`                  |
| Validate the asynchronous notification signature      | `references/notification.md`              |
| Build the daily reconciliation cron                   | `references/cron-job.md`                  |
| Decode a status `reason` code (00, 51, BN, …)         | `references/error-codes.md`               |
| Get test card numbers for the TEST environment        | `references/test-cards.md`                |
| Check a field's max length or type                    | `references/field-reference.md`           |

## Critical rules (from the manual, do not violate)

1. **Never call these endpoints from the browser.** JavaScript/AJAX from the client exposes `secretKey` and is vulnerable to XSS/credential theft. All calls go from the merchant's backend.
2. **Clock drift kills auth.** The `seed` (ISO 8601 timestamp) must be within ±5 minutes of real time, otherwise the server returns error `103`. Sync the server clock via NTP.
3. **Every transaction needs a unique `reference`.** Reusing a `reference` is the merchant's bug, not Getnet's — the manual makes this explicit.
4. **Never expose `secretKey` anywhere reachable by clients** (no env var injected into a frontend bundle, no admin pages echoing it back).
5. **`tranKey` formula is exact:** `Base64( SHA-256( nonce + seed + secretKey ) )` where `nonce` in the hash is the *raw* random bytes (not the Base64 form sent on the wire). In PHP, this means `base64_encode(sha256(..., true))` — the `true` matters. In Node use `crypto.createHash('sha256').update(buf).digest()` (Buffer, not hex).
6. **JSON only.** Always send `Content-Type: application/json`. Missing this header is the #1 cause of "auth mal formada".
7. **Reserved characters in payloads.** The API rejects `[]{}|,";\\*=~!` inside string fields. Sanitize free-text fields (description, reference).
8. **HTTPS + TLS 1.2+** on both sides. Older Java runtimes (≤ Java 7) lack full TLS 1.2 support — flag this if the user mentions an old stack.

## Helper scripts

- `scripts/generate-auth.js` — given `GETNET_LOGIN` and `GETNET_SECRET_KEY` env vars, prints a ready-to-paste `auth` object. Use this to verify a user's credentials work before integrating.
- `scripts/validate-signature.js` — given a captured notification payload and the `secretKey`, checks whether the `signature` field matches `sha256(requestId + status.status + status.date + secretKey)`. Use this to debug "I'm getting notifications but they fail validation".

Both scripts are dependency-free Node (only the built-in `crypto` module).

## Recommended starting point for code generation

When the user asks "integrate GetNet payments", default to:

1. Read `references/authentication.md` and produce a `buildAuth()` helper using `crypto`.
2. Read `references/create-request.md` and `examples/create-request.json` to shape the `CreateRequest` body. Use `examples/node-express-integration.js` as the skeleton.
3. Wire a notification handler using `references/notification.md` + `examples/notification-payload.json`.
4. Remind the user to register the `notificationUrl` with Getnet through the Validation Form before going to production — Getnet won't send notifications until they have it.
