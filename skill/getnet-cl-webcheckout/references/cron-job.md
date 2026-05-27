# Cron job — daily reconciliation

The manual recommends running a scheduled job **once every 24 hours in production**. Its purpose: catch any session where the notification was lost or the return-flow misfired, so no payment slips through unaccounted.

## What the job does

1. List sessions created in the last ~24 hours that your DB still has in a non-final state (`PENDING`, or never resolved).
2. For each one, call `GetRequestInformation` with its `requestId`.
3. Update local state based on the response (`APPROVED`, `REJECTED`, `REFUNDED`).

That's it — no new endpoints, just repeated calls to the existing `GetRequestInformation`.

## Skeleton

```js
import crypto from 'node:crypto';

async function reconcile() {
  const baseUrl = process.env.GETNET_BASE_URL;          // https://checkout.getnet.cl
  const login   = process.env.GETNET_LOGIN;
  const secret  = process.env.GETNET_SECRET_KEY;

  const pending = await db.sessions.findPending({ olderThanHours: 0, newerThanHours: 48 });

  for (const session of pending) {
    const auth = buildAuth({ login, secretKey: secret });        // see references/authentication.md

    const response = await fetch(`${baseUrl}/api/session/${session.requestId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth }),
    });
    const info = await response.json();

    if (['APPROVED', 'REJECTED', 'REFUNDED'].includes(info.status.status)) {
      await db.sessions.markFinal({
        requestId: session.requestId,
        status: info.status.status,
        transactions: info.payment,
      });
    }
  }
}
```

## Scheduling

- Use the OS cron, a queue worker, or a cloud scheduler. The manual just specifies "every 24 hours".
- Run it slightly off-hour (e.g. 03:15 local) so it doesn't compete with bank cut-off and other batch jobs.
- Keep the job **idempotent** — running it twice should never double-apply an update. Key your local writes on `requestId`.

## Look-back window

Sessions can stay open until `expiration` (commonly 15 min). Anything still `PENDING` after a few hours almost certainly means a lost notification. A 48-hour look-back is generous and covers weekend gaps.

## Failure handling

- Don't fail the whole job on a single 5xx — log and continue. Re-run picks them up.
- Log `reason` codes that you don't recognize so they get noticed (see `references/error-codes.md`).
- Alert when `pending.length` consistently grows over time — it usually means the notification endpoint is broken.
