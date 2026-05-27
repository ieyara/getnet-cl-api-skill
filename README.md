# getnet-cl-webcheckout — Claude Code skill

A [Claude Code](https://claude.com/claude-code) skill that turns Claude into a domain expert on **GetNet Chile's Web Checkout API** (`checkout.getnet.cl`, manual v2.4). Drop it into your skills folder and Claude will know how to design payment integrations, build the WSSE `tranKey` authentication, wire async notifications, and answer questions about Getnet's response codes — without you having to paste the manual into every conversation.

> **Scope:** GetNet **Chile** only. GetNet Argentina, Brazil and Mexico run different APIs with different contracts. This skill does not cover them.

---

## What this skill does

When loaded, the skill gives Claude:

- **Up-to-date knowledge** of the GetNet Chile Web Checkout API surface — endpoints, request/response shapes, authentication formula, status codes, field length limits.
- **Code-generation patterns** for Node.js / JavaScript / TypeScript backends (Express handler, lightbox HTML, reconciliation cron). Other languages can still be derived from the explained protocol, but the worked examples are JS.
- **Two helper CLI scripts** Claude can invoke (or you can run yourself) when debugging:
  - `scripts/generate-auth.js` — print a ready-to-paste `auth` block from your credentials.
  - `scripts/validate-signature.js` — verify the `signature` on a captured notification payload.
- **Reference docs** loaded on demand so the main `SKILL.md` stays small. Topics: overview, authentication, create-request, get-request-information, reverse-payment, lightbox, notification, cron-job, error-codes, test-cards, field-reference.
- **Hard-coded safety rules** taken from the manual: never call from the browser, sync the clock, unique reference per transaction, JSON-only, no reserved characters in payloads.

### Sample prompts that will activate the skill

- *"Help me integrate Getnet Chile payments in my Express app."*
- *"How do I build the tranKey for checkout.getnet.cl?"*
- *"I'm getting error 102 from Getnet — what's wrong?"*
- *"Add a daily reconciliation job for Web Checkout sessions."*
- *"Verify this notification signature."*

---

## Required configuration

The skill itself needs no setup, but the application you build with it will. Make sure your project has the following ready:

### 1. Credentials and environment

- A **TEST** site identifier (`login`) and `secretKey` from Getnet. The manual ships a sample pair for development; production credentials are issued only after Getnet validates your integration.
- Pick a base URL per environment:

  | Environment | Base URL                              |
  |-------------|---------------------------------------|
  | TEST        | `https://checkout.test.getnet.cl`     |
  | PRODUCTION  | `https://checkout.getnet.cl`          |

- Expose them as environment variables in your backend. The example code in this skill expects:

  ```bash
  GETNET_BASE_URL=https://checkout.test.getnet.cl
  GETNET_LOGIN=<your-login>
  GETNET_SECRET_KEY=<your-secret-key>
  GETNET_RETURN_URL=https://your-site.example/payments/return
  ```

  You can rename them, but keep the values out of source control and out of any frontend bundle.

### 2. Notification endpoint registration

- Stand up a publicly reachable URL on **port 80 or 443** that accepts a `POST` of JSON.
- Hand that URL to Getnet through the *Formulario de Validación* (`getnet.cl/developers`) before going live. Getnet will not deliver notifications until they have it.
- The endpoint must verify the `signature` on every payload — see `skill/getnet-cl-webcheckout/references/notification.md`.

### 3. Server prerequisites

- **TLS 1.2 or higher** outbound (older Java runtimes won't do it reliably).
- **NTP-synced clock.** The `seed` field is rejected if more than 5 minutes off real time.
- A way to schedule a job once every 24 hours (cron, systemd timer, cloud scheduler) for the reconciliation routine.

### 4. Production validation step

Before swapping to production credentials:

1. Email the completed *Formulario de Validación* (downloaded from `getnet.cl/developers`) to `integracionweb@getnet.cl`.
2. Wait up to 2 business days for Getnet to validate. They reply with the production `login`, `secretKey` and access to the *Panel Pagos Web*.
3. Switch `GETNET_BASE_URL` and the credentials env vars.

### 5. Security rules — do not skip

- **Never** call `checkout.getnet.cl` endpoints from the browser. Anything that exposes `secretKey` to the client is a leak. All calls go from the merchant backend.
- **Never** reuse a payment `reference`. Generate a fresh one per attempt (UUID, monotonic counter, …).
- Strip reserved characters from free-text fields before serialising: `[ ] { } | , " ' ; \ * = ~ !`.
- Treat the asynchronous notification as the source of truth, not the browser return.

---

## Installing the skill in Claude Code

The skill lives at `skill/getnet-cl-webcheckout/`. Pick **one** of the two installation modes (or both):

### A. Global install — always available to your user

```bash
mkdir -p ~/.claude/skills
cp -r skill/getnet-cl-webcheckout ~/.claude/skills/
```

After that, every new Claude Code session — in any project directory — can load the skill on demand.

### B. Per-project install — versioned with the integration

From inside the project that will integrate with Getnet:

```bash
mkdir -p .claude/skills
cp -r /path/to/getnet-api-skill/skill/getnet-cl-webcheckout .claude/skills/
```

(Or add it as a git submodule if you want updates to flow back.)

This makes the skill available **only** when Claude Code runs in that project — useful when several engineers share the same repo and need the same gateway context.

### Verifying the install

1. Start a new Claude Code session inside the relevant directory.
2. Run `/skills` and confirm `getnet-cl-webcheckout` appears in the list.
3. Ask Claude something like *"Show me how to call createRequest in Node"* — it should reference `references/create-request.md` and produce code that uses `crypto`, computes `tranKey` correctly, and POSTs to `/api/session/`.

### Updating

The skill is read at session start. To pick up changes after editing files under `skill/getnet-cl-webcheckout/`, start a new Claude Code session (or re-copy the directory if you installed it elsewhere).

### Uninstall

```bash
rm -rf ~/.claude/skills/getnet-cl-webcheckout
# or, for per-project:
rm -rf .claude/skills/getnet-cl-webcheckout
```

---

## Repository layout

```
.
├── README.md                                 (this file)
├── src/
│   └── Manual_Integraci_n_API.pdf            (original manual; source material)
└── skill/
    └── getnet-cl-webcheckout/
        ├── SKILL.md                          (entry point Claude loads)
        ├── references/                       (topic-specific docs, loaded on demand)
        ├── examples/                         (JSON payloads + Express handler + lightbox.html)
        └── scripts/
            ├── generate-auth.js              (CLI: prints an auth block)
            └── validate-signature.js         (CLI: verifies a notification signature)
```
