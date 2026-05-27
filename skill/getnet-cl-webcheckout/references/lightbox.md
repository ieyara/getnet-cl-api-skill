# Lightbox — checkout in a popup instead of a redirect

Alternative to the full-page redirect: present the hosted checkout in a popup that floats on top of the merchant page. The cardholder stays on the merchant's URL the entire time. On mobile devices the SDK automatically falls back to a new page (popups are unreliable in mobile browsers).

## Backend stays the same

The lightbox is a frontend concern. The backend still calls `CreateRequest` and gets `{ requestId, processUrl }` exactly as in the redirect flow. The only difference is that the frontend passes `processUrl` to the Lightbox SDK instead of doing `window.location = processUrl`.

## Frontend wiring

1. Include the SDK from Getnet's CDN. **Do not** self-host it — Getnet ships fixes there.

   ```html
   <script src="https://checkout.getnet.cl/lightbox.min.js"></script>
   ```

2. After your backend returns `processUrl`, call `P.init(processUrl)`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lightbox SDK</title>
  <script src="https://checkout.getnet.cl/lightbox.min.js"></script>
</head>
<body>
  <button id="pay">Pay</button>

  <script>
    document.getElementById('pay').addEventListener('click', async () => {
      // Step 1: ask the merchant backend to create the session
      const res = await fetch('/api/checkout/start', { method: 'POST' });
      const { processUrl } = await res.json();

      // Step 2: hand processUrl to the Lightbox SDK
      P.init(processUrl);
    });
  </script>
</body>
</html>
```

The `/api/checkout/start` endpoint must:

- Run on the merchant's backend (never expose `secretKey` to the browser).
- Build the `auth` block (see `references/authentication.md`).
- POST `CreateRequest` to `https://checkout[.test].getnet.cl/api/session/`.
- Return at least `{ processUrl }` to the browser.

## What about the result?

The lightbox closes when the cardholder finishes (approved, rejected or cancelled). Two things still happen the same way as in redirect mode:

- The browser is sent to `returnUrl` (with `processUrl` query string preserved).
- The merchant's `notificationUrl` is POSTed by Getnet — this is the source of truth.

So the merchant's notification handler and reconciliation cron are identical in both modes.

## When to prefer redirect over lightbox

- If you support old Android WebViews, in-app browsers, or any embedded browser where popups are blocked.
- If you need 3DS challenges that open external authentication banks (some banks dislike living inside iframes).
- If you want the simplest possible integration to debug.

## See also

- Self-contained sample: `examples/lightbox.html`.
- Backend handler that produces `processUrl`: `examples/node-express-integration.js`.
