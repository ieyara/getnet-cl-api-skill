# Field reference — lengths, types, required/optional matrix

## Field max lengths (from the manual)

| Field           | Type   | Length     |
|-----------------|--------|------------|
| reference       | string | 32         |
| description     | string | 255        |
| expirationDate  | date   | YYYY-MM-DD |
| notificationUrl | string | 255        |
| keyword         | string | 60         |
| total           | string | 30         |
| name            | string | 60         |
| surname         | string | 60         |
| document        | string | 12         |
| typeDocument    | string | 2-3        |
| mobile          | string | 30         |
| type            | string | 20         |
| amount          | number | 9          |
| base            | number | 9          |
| sku             | string | 12         |
| category        | string | 30         |
| cantity         | string | 12         |
| taxes           | number | 9          |
| street          | string | 50         |
| city            | string | 50         |
| country         | string | 2          |
| postalCode      | string | 20         |
| phone           | string | 30         |
| state           | string | 30         |
| divisa          | string | 3          |
| paymentMethod   | string | 5          |
| returnUrl       | string | 255        |
| cancelUrl       | string | 255        |
| ipAddress       | string | 16         |
| userAgent       | string | 255        |
| skipResult      | bool   | true/false |
| noBuyerFill     | bool   | true/false |
| currency        | string | 4          |

## Required/optional per operation (CreateRequest = Payment, ReversePayment)

`R` = required, `O` = optional, `A` = recommended, `-` = not applicable, `R*` = one of a group is required.

### CreateRequest (Payment)

| Field          | Required? |
|----------------|-----------|
| locale         | O         |
| payer.*        | O         |
| buyer          | A         |
| buyer.name     | A         |
| buyer.email    | A         |
| payment        | R         |
| reference      | R         |
| description    | R         |
| amount         | R         |
| currency       | R         |
| total          | R         |
| taxes          | O         |
| details        | O         |
| shipping       | O         |
| items          | O         |
| fields         | O         |
| paymentMethod  | O         |
| expiration     | R         |
| returnUrl      | R         |
| cancelUrl      | O         |
| ipAddress      | R         |
| userAgent      | R         |

### ReversePayment

Only `auth` + `internalReference` are required. Everything else is rejected.

## Amount object — full shape

```jsonc
{
  "currency": "CLP",          // ISO 4217 alphabetic
  "total":    19990,
  "taxes": [                  // optional
    { "kind": "ice",            "amount": 2, "base": 13 },
    { "kind": "valueAddedTax",  "amount": 2, "base": 13 }
  ],
  "details": [                // optional
    { "kind": "shipping", "amount": 1 },
    { "kind": "tip",      "amount": 1 },
    { "kind": "subtotal", "amount": 13 }
  ]
}
```

Valid `details.kind` values: `discount`, `additional`, `vatDevolutionBase`, `shipping`, `handlingFee`, `insurance`, `giftWrap`, `subtotal`, `fee`, `tip`.

## AmountConversion (used in transaction responses)

```jsonc
{
  "from":   { "currency": "CLP", "total": 19990 },   // amount requested by the merchant
  "to":     { "currency": "CLP", "total": 19990 },   // amount actually processed
  "factor": 1                                          // conversion factor
}
```

For Chilean transactions in CLP, `from` and `to` are usually identical and `factor` is `1`.

## Reserved characters (do NOT include in any string field)

The API rejects these as reserved: `[ ] { } | , " ' ; \ * = ~ !`

Strip or replace them in free-text fields (`description`, `reference`, names, addresses, etc.) before serialising.

## DocumentType catalog

For Chile, use:

| Code  | Description           |
|-------|-----------------------|
| CLRUT | Chilean RUT/RUN.      |

The manual also lists codes for other countries (Argentina, Colombia, Mexico, etc.) — those are not relevant for GetNet Chile integrations but exist in the same enum.
