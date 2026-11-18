# Handoff: deploy the Qonvergence Waitlist backend

For: Grok. From: Claude, on behalf of Ark (Qhantom). Written 18 Nov 2026.

## Goal

Deploy a small waitlist service to Qhantom's Cloudflare account, prove with one
real signup that it stores data, and report back. Done means: the service
answers on a live URL, a test signup is visible in the database, and Ark has
the URL and the open decisions below.

## Where the code is

- Repo: `ark-qhantom/links`, branch `claude/tender-einstein-640iob`
- Folder: `waitlist-backend/` (read its `README.md` first)
- Do not merge this branch into `main`. `main` auto-publishes links.qhantom.com
  through GitHub Pages.

## What it is

A Cloudflare Worker with a D1 database.

- `POST /api/waitlist` with JSON `{ "email": "...", "consent": true }` stores one row per address.
- `GET /api/waitlist/health` returns `{ "ok": true }`.
- A repeat signup returns the same success and adds no row.
- Only origins in `ALLOWED_ORIGINS` may post from a browser.
- 5 attempts per caller per hour. It stores a salted hash for that, never an IP.
- It sends no email.

## What is already verified, and what is not

- Verified locally only: 42 end-to-end checks pass (`npm test`) against
  `wrangler dev --local`, including signups through the real form in a browser.
- Not verified: anything on real Cloudflare. It has never been deployed.

## Steps

Run from `waitlist-backend/`.

1. `npm install`
2. `npx wrangler d1 create qhantom-waitlist`, then put the returned id in
   `wrangler.toml` in place of `REPLACE_WITH_D1_DATABASE_ID`.
3. `npm run migrate:remote`
4. `npx wrangler secret put RATE_SALT` with a long random string. Do not commit it.
5. Deploy to the default `workers.dev` address first: `npx wrangler deploy`.
   This needs no DNS or route change.
6. Verify on the live address (replace `URL`):

       curl -s URL/api/waitlist/health
       curl -s -X POST URL/api/waitlist -H 'Content-Type: application/json' \
         -H 'Origin: https://qhantom.com' \
         -d '{"email":"deploy-check@qhantom.com","consent":true}'
       npx wrangler d1 execute qhantom-waitlist --remote \
         --command "SELECT email, created_at FROM waitlist"

   Expect `{"ok":true}` twice and exactly one row. Send the same signup again
   and confirm there is still one row. Then delete the test row:

       npx wrangler d1 execute qhantom-waitlist --remote \
         --command "DELETE FROM waitlist WHERE email='deploy-check@qhantom.com'"

7. Stop and report (see "Report back").

## Do not do without Ark's explicit approval

- Add a route on `qhantom.com` or create `qonvergence.qhantom.com`. Both change
  what the live domain serves. `qonvergence.qhantom.com` has no DNS record today.
- Change any DNS record or any setting on the live qhantom.com site.
- Touch, move or delete the existing qonvergence.ai waitlist or its data.
- Use `qonvergence.ai` as the address for this service.
- Add an email sender or any other third-party service.
- Announce the waitlist as working, or remove the "Preview" label from the form.

## Things to know before the route step

- qhantom.com is a Next.js site behind Cloudflare. On 18 Nov 2026
  `https://qhantom.com/api/waitlist` returned 404, so the path looked free.
  Re-check before proposing a route there.
- The proposed route is `qhantom.com/api/waitlist*`. It needs no DNS change but
  does need Ark's approval.
- The live site does not have this form yet. The new form exists only in the
  redesign preview (`site-preview/` on the same branch). It turns live when the
  form's `data-endpoint` attribute is set to the service URL; left empty, it is
  a mock that stores nothing.
- If the final site will be served from an origin other than `qhantom.com` or
  `www.qhantom.com`, add that origin to `ALLOWED_ORIGINS` in `wrangler.toml`.

## Open decisions for Ark

1. Final address: `qhantom.com/api/waitlist` or `qonvergence.qhantom.com`.
2. Whether to import signups from the existing qonvergence.ai waitlist (a
   Cloudflare D1 database by its own docs). Its schema has not been inspected.
   If you can see it, report its table layout and row count; do not copy data yet.
3. Whether signups get a confirmation email. If yes, the Qonvergence app is
   already set up for Resend.
4. Approved privacy wording for the form.

## Report back

- The live `workers.dev` URL and the D1 database name and id.
- The exact output of the three verification commands, and confirmation the
  test row was deleted.
- Anything that failed or was skipped, with the error text.
- For decision 2: whether you could see the existing waitlist database, and if
  so its table layout and row count.
- State plainly which items you verified by running them and which you inferred.
