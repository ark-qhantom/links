# Qonvergence Waitlist backend

A small Cloudflare Worker that stores waitlist signups in a D1 database.
Deployed on 18 Nov 2026 at `https://qhantom-waitlist.qhantomcorporation.workers.dev`
(D1 database `qhantom-waitlist`). It is not yet on a qhantom.com address and the
site form is not connected to it.

## What it does

- `POST /api/waitlist` with `{ "email": "...", "consent": true }` stores one row per address.
- A repeat signup gets the same success reply and adds no row.
- Stores: email (trimmed, lower-cased), source, consent wording version, UTC time.
- Refuses browsers posting from any site not listed in `ALLOWED_ORIGINS`.
- Limits each caller to 5 attempts an hour. It keeps a salted hash for that, never the IP.
- A hidden form field catches simple bots; their submissions are dropped.
- Sends no email. There is no confirmation message or double opt-in yet.

## Run and test locally

    npm install
    npm run migrate:local
    npm run dev            # serves http://localhost:8787
    # in another shell, with the preview site served on :8765
    npm test

`.dev.vars` (not committed) needs `RATE_SALT` and, for the browser tests,
`ALLOWED_ORIGINS=http://localhost:8765`.

## To deploy (needs approval and Cloudflare access)

1. `wrangler d1 create qhantom-waitlist`, then paste the id into `wrangler.toml`.
2. `npm run migrate:remote`
3. `wrangler secret put RATE_SALT` (any long random string).
4. Add a route in `wrangler.toml`, for example `qhantom.com/api/waitlist*`.
5. `wrangler deploy`
6. Set `data-endpoint` on the site's waitlist form to the deployed URL.
7. Run one real signup and confirm the row with
   `wrangler d1 execute qhantom-waitlist --remote --command "SELECT * FROM waitlist"`.

## Reading and removing entries

    wrangler d1 execute qhantom-waitlist --remote --command "SELECT email, created_at FROM waitlist ORDER BY created_at"
    wrangler d1 execute qhantom-waitlist --remote --command "DELETE FROM waitlist WHERE email = 'person@example.com'"

## Not covered yet

- Existing signups from the qonvergence.ai waitlist are not imported; its
  database and schema were not available to inspect.
- No confirmation email, unsubscribe link or admin page.
- Privacy wording on the form is a draft.
