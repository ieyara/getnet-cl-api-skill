# Test cards and payment-method codes

Only valid in the **TEST** environment (`https://checkout.test.getnet.cl`). They will fail in production.

For all of them: CVV `123`, expiration date any month/year strictly after today.

## Cards from the manual

| Brand      | Number                  | Behaviour |
|------------|-------------------------|-----------|
| Visa       | `4111 1111 1111 1111`   | Approved  |
| Mastercard | `5367 6800 0000 0013`   | Declined  |
| Visa       | `4110 7600 0000 0008`   | Approved  |
| Visa       | `4110 7600 0000 0065`   | Declined  |

A card that triggers approval today should keep approving — these aren't dynamic. If you need declined-by-reason testing (e.g. fund insufficiency, fraud), contact Getnet support; the public manual only exposes the four numbers above.

## Payment-method codes (used in `paymentMethod`)

You can force the franchise on the hosted checkout by passing one or more of these codes in `paymentMethod` (comma-separated):

| Country | Code   | Method            | Description              |
|---------|--------|-------------------|--------------------------|
| Chile   | PS_VS  | Visa              | Paystudio Visa           |
| Chile   | PS_MC  | Mastercard        | Paystudio Mastercard     |
| Chile   | PS_MS  | Maestro           | Paystudio Maestro        |
| Chile   | PS_AM  | American Express  | Paystudio American Express |

Examples:

- `"paymentMethod": "PS_VS"` — Visa only.
- `"paymentMethod": "PS_VS,PS_MC"` — Visa or Mastercard, no other brands.

Omit the field entirely to let the cardholder pick any supported brand.

## Card-type field on response

The transaction's `processorFields[]` includes a `cardType` entry whose `value` is:

| Value | Meaning |
|-------|---------|
| C     | Credit  |
| R     | Debit   |
| P     | Prepaid |
