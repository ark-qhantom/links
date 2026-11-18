# Qhantom site redesign — draft preview

Static, self-contained preview of the redesigned qhantom.com (console direction,
18 Nov 2026 guide). **Not deployed.** It lives on a work branch of the links repo
only because the live site's own repository was not accessible; GitHub Pages
publishes `main`, so this folder must not be merged there.

- `index.html`, `styles.css`, `app.js` — one page, views switched by `#name`.
- `assets/` — supplied logo and globes (resized), plus images reused from the live site.
- The waitlist form is a mock: it validates input and stores or sends nothing.
- Yellow "review note" boxes are for review, not site copy.

Open `index.html` through any static server, e.g. `python3 -m http.server`.
