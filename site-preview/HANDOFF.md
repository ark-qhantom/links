# Handoff: put the redesigned Qhantom site live

For: Grok. From: Claude, on behalf of Ark (Qhantom). Written 19 Nov 2026.

## Goal

Get this version of the redesigned site live on qhantom.com. Done means: every
page below is served at a real address on qhantom.com, old addresses still
resolve, the draft scaffolding is gone, and Ark has approved the result on a
staging address before production changes.

Ark has decided to launch this version as it is. Do not redesign, rewrite copy
or "improve" assets. Cleanups come afterwards, from your report.

## Where the code is

- Repo: `ark-qhantom/links`, branch `claude/tender-einstein-640iob`
- Folder: `site-preview/` — `index.html`, `styles.css`, `app.js`, `assets/`
- It is a static, self-contained build with no dependencies and no build step.
  Serve it with any static server to see it: `python3 -m http.server`.
- Do not merge this branch into `main` of that repo. `main` auto-publishes
  links.qhantom.com through GitHub Pages, which must stay as it is.

The live qhantom.com is a Next.js site behind Cloudflare. Claude could not see
its repository (believed to be `Qhantom-Labs/qhantom.com3.0`). You have access;
confirm which repo and branch actually deploys before changing anything.

## What the preview contains

One HTML file. Views are switched by `#name`; each must become a real page.

| Preview view | Target address | Notes |
|---|---|---|
| `#home` | `/` | Hero image, "Our story", three preview cards |
| `#qonvergence` | `/qonvergence` | Titled "Qonvergence•Worlds"; has `#papers` section |
| `#realm-runners` | `/realm-runners` | Two globe links; sub-navigation Realms / Archive / Sonics |
| `#qigana` | `/realm-runners/qigana` | Own sky (CSS), `data-realm="qigana"` |
| `#celestara` | `/realm-runners/celestara` | Own sky (CSS), `data-realm="celestara"` |
| `#archive` | `/realm-runners/archive` | Own plaster look, `data-realm="archive"` |
| `#sonics` | `/sonics` | Keep this address; it exists on the live site today |
| `#shop` | `/fashion` (live address) | "Coming soon". Consider also serving `/shop` |
| `#about` | `/company` (live address) | Consider also serving `/about` |
| `#careers` | `/careers` | Links to six role pages, see below |

How the looks work: `app.js` sets `data-realm` on `<body>` from the view, and
`styles.css` re-tones the whole page (top bar and footer included) through CSS
variables under `body[data-realm="…"]`. Keep that behaviour per page.

Globe links on Realm Runners play a short zoom before navigating
(`[data-realm-link]` in `app.js`). With `prefers-reduced-motion` they act as
plain links. Keep both paths working.

## Must do before production

1. **Real pages.** Convert each view to its own route. Navigation, the
   current-page highlight, focus and scroll-to-top must still work.
2. **Remove draft scaffolding:**
   - every element with `data-note` (yellow "review note" boxes);
   - the `.draft` bar in the footer and the "Hide review notes" button;
   - `<meta name="robots" content="noindex, nofollow">`.
3. **Keep old addresses working.** These exist on the live site and have no
   page in the new one. Do not delete or redirect them without Ark's answer:
   `/research`, `/research/reports`, `/research/experiments`, `/tech`,
   `/tech/qhone`, `/tech/qore`, `/tech/qosmos`, `/tech/qome`, `/simulations`,
   `/community`, `/quo-vadis`, `/realm-runners/story`, `/realm-runners/recruits`.
   Report what you propose for each.
4. **Careers role pages.** Careers links to six live pages under
   `/company/careers/` (full-stack-engineer, agentic-engineer,
   creative-technologist, animation-developer, story-script-writer,
   marketing-community). Keep them reachable. `cinematic-editor` was removed
   from the list on purpose; ask Ark whether its page should also come down.
5. **Page titles and descriptions.** Each page needs its own `<title>` and meta
   description. Use the page heading and first sentence; do not write new
   marketing copy. Keep the live site's social preview image unless Ark
   supplies a new one.
6. **Stage first.** Put it on a staging or preview address and send Ark the
   link. Go to production only after Ark approves.

## Do not do without Ark's explicit approval

- Deploy to production, change DNS, or change Cloudflare settings on qhantom.com.
- Change any copy, image, layout or font. Launch what is in the folder.
- Add a waitlist, email capture, Discord link or any signup. All were removed
  on purpose. The Qonvergence page must have no "Join" call to action.
- Touch the waitlist service at `qhantom-waitlist.qhantomcorporation.workers.dev`,
  its D1 database, or the older qonvergence.ai waitlist. Nothing links to them;
  leave the data alone.
- Link anything to `qonvergence.ai`.
- Add analytics, trackers or third-party scripts that are not there now.

## Known issues you are not being asked to fix

Report on them; do not change them.

- Home hero (`assets/home-stage.webp`) is a 1206px reference image upscaled 2×.
- Fonts are Google Fonts stand-ins: Archivo (display), Nunito Sans (text),
  Cormorant Garamond and EB Garamond (Archive only).
- The logo files are cut from a JPEG reference (`logo.webp`, `logo-96.webp`,
  `favicon.png`).
- Qigana's "Watch here" goes to the Realm Runners TV channel, not a video.
- The Archive text mentions short films; none are listed.
- The "AI Omniscience" paper row has a placeholder one-line description.
- Qigana and Celestara skies, and the Archive plaster, are drawn in CSS.
- `styles.css` still contains unused rules from removed features (waitlist
  form, community page).

## Open questions for Ark

1. Port into the existing Next.js site, or replace it with this static build?
2. What happens to each old address in item 3?
3. Should `/shop` and `/about` exist alongside `/fashion` and `/company`?
4. Is the menu item "Qonvergence" staying, given the page title is
   "Qonvergence•Worlds"?
5. Are the statements on the Qonvergence page ("Current Deployment…",
   "mathematically eliminated", "unbreakable transaction") approved as fact?

## Report back

Claude will use your report to list asset and code cleanups, so be specific.

- Repo, branch and hosting you deployed from, and the staging URL.
- Port or replace, and why.
- A table of every route: address, status code, and whether it is new, kept
  or redirected (and to where).
- Every file under `assets/` as served: final path, format, pixel size, byte
  size, and whether you changed it in any way.
- How fonts are loaded on the live build (Google Fonts link or self-hosted).
- Anything you changed from the preview, however small, with the reason.
- Anything that failed, was skipped or needs Ark, with the exact error text.
- State which items you verified by loading the page and which you inferred.
