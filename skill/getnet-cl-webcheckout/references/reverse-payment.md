# ReversePayment — same-day reversal

`POST {baseUrl}/api/reverse`

Reverses an approved payment **on the same calendar day**, before the issuer's daily cut-off at 23:59 (Chilean banking network closes for the day after that). After cut-off use Getnet's admin panel "Reembolsar Transacción" (refund) instead — this endpoint will fail.

Works on credit, debit and prepaid cards. From e-commerce channels the manual notes there's no strict time window, but in practice the same-day rule keeps you out of trouble.

In the admin panel, this operation is labelled **"Reverso transacción"** and is found by the `reference` field.

## Request body

```jsonc
{
  "auth":              { /* see references/authentication.md */ },
  "internalReference": "1468647381"
}
```

`internalReference` comes from the transaction object returned by `GetRequestInformation` (`payment[i].internalReference`) — it is **not** the merchant `reference` you sent originally.

## Response

```jsonc
{
  "status": {
    "status":  "APPROVED",
    "reason":  "00",
    "message": "Se ha reversado el pago correctamente",
    "date":    "2026-05-26T18:54:49-05:00"
  },
  "payment": {
    "status":            { "status": "APPROVED", "reason": "00", "message": "Aprobada", "date": "…" },
    "internalReference": "1502099576",
    "paymentMethod":     "visa",
    "paymentMethodName": "Visa",
    "issuerName":        "BANCO DE PRUEBAS",
    "amount": {
      "from":    { "currency": "CLP", "total": -2000 },
      "to":      { "currency": "CLP", "total": -2000 },
      "factor":  1
    },
    "authorization": "000000",
    "reference":     "123456",
    "receipt":       "1611446089",
    "franchise":     "CR_VS",
    "refunded":      false
  }
}
```

Note `amount.total` is negative — it's the value sent back to the cardholder.

## See also

- Full request example: `examples/reverse-payment-request.json`
- Full response example: `examples/reverse-payment-response.json`
