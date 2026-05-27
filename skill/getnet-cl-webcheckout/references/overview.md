# Overview — environments, credentials, transport

Source: *Manual de Integración API Web Checkout v2.4 (Mayo 2026)* — GetNet Chile.

## Environments

| Environment | Base URL                              | Cards                | Notes                                                   |
|-------------|---------------------------------------|----------------------|---------------------------------------------------------|
| TEST        | `https://checkout.test.getnet.cl`     | Test cards only      | No real bank auth; safe for development.                |
| PRODUCTION  | `https://checkout.getnet.cl`          | Real cards           | Only after Getnet validates your integration.           |

## Credentials

- Two opaque strings per environment: `login` (sometimes called *site identifier*) and `secretKey`.
- TEST credentials published in the manual (sample, do not use in real products):
  - `login`: `7ffbb7bf1f7361b1200b2e8d74e1d76f`
  - `secretKey`: `SnZP3D63n3I9dH9O`
- PRODUCTION credentials are unique per merchant and are issued **after** Getnet receives and approves the merchant's *Formulario de Validación* (Validation Form) from `getnet.cl/developers` and the merchant emails it to `integracionweb@getnet.cl`. SLA: 2 business days.
- Store both as environment variables; **never** commit them.

## Onboarding steps (from the manual)

1. Order the Web Checkout product through `getnet.cl`.
2. Integrate against the TEST environment using this skill.
3. Send the completed *Formulario de Validación* to `integracionweb@getnet.cl`.
4. Wait ≤ 2 business days for Getnet to validate. They reply with either production credentials + Pagos Web admin panel access, or a corrections list.
5. Swap to production credentials and base URL.

## Transport requirements

- **TLS 1.2 or higher.** Older Java runtimes (Java 7 and below) cannot speak TLS 1.2 reliably — upgrade before you start.
- **JSON only** (`Content-Type: application/json` on every request and response).
- All requests are **POST** (yes, even reads — `GetRequestInformation` is a POST).
- 3D Secure 2.3 is handled entirely by Getnet during the hosted checkout step. The merchant is not involved in 3DS challenges.

## Endpoints summary

| Method                  | Path                            | Purpose                                     |
|-------------------------|---------------------------------|---------------------------------------------|
| `POST`                  | `/api/session/`                 | `CreateRequest` — start a payment session.  |
| `POST`                  | `/api/session/{requestId}`      | `GetRequestInformation` — poll session.     |
| `POST`                  | `/api/reverse`                  | `ReversePayment` — same-day reversal.       |

Lightbox bundle (front-end, only loads the iframe, does not call the REST API directly):
`https://checkout.getnet.cl/lightbox.min.js`

## Logos and copy on the merchant's payment selector

When you offer "GetNet" as a payment option on your checkout page, the manual asks you to use:

- Logo SVG: `https://banco.santander.cl/uploads/000/029/870/0620f532-9fc9-4248-b99e-78bae9f13e1d/original/Logo_webCheckout_Getnet.svg`
- Button label (Spanish): `Tarjeta de crédito, débito o prepago.`
- Description (Spanish): `Paga seguro todo lo que necesitas con Getnet utilizando tus tarjetas de crédito, débito y prepago, de todos los emisores nacionales e internacionales.`

## Supported card brands and products

Visa, Mastercard, Maestro, American Express, Magna — credit, debit and prepaid — any issuer (national or international). For internationally-issued credit cards, only *no-installment* purchases are supported. Chilean credit cards support both *Cuotas Emisor* (issuer-financed installments) and *Cuotas Comercio* (merchant-financed installments).

## Mobile app integrations

The manual explicitly **discourages WebView** for this checkout. Use the system browser instead:

| Option            | Android            | iOS                        |
|-------------------|--------------------|----------------------------|
| External browser  | Chrome             | Safari                     |
| In-app browser    | Chrome Custom Tabs | SFSafariViewController     |

Why not WebView: action restrictions (autoplay, popups, wallets), cross-domain redirect quirks, OS-version inconsistencies, and higher maintenance burden.
