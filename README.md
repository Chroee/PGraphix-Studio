# PGraphix Studio — Portfolio Site

Portfolio site for PGraphix Studio (FiveM design work: logos, liveries,
vehicle packs, multi-siren configs, and media). `index.html` is the public
site — contact happens via the Discord invite and email link in its "Get in
touch" section, both plain links with no server-side logic behind them.

The one bit of server-side logic that does exist runs as Cloudflare Pages
Functions, powering the portfolio's data: `functions/api/projects.js` (public
read) and `functions/admin/api/projects.js` (protected read/write). The
public site reads from the first; `/admin` (see `admin/index.html`) reads and
writes through the second to add, edit, or remove projects without touching
code.

## Deploying: GitHub repo → Cloudflare Pages

### 1. Push this to a GitHub repo

```
git init
git remote add origin https://github.com/<you>/<repo>.git
git add .
git commit -m "Initial site"
git branch -M main
git push -u origin main
```

(Or skip git entirely: create the repo on github.com, then **Add file → Upload
files** and drag in `index.html`.)

### 2. Connect the repo to Cloudflare Pages

1. In the Cloudflare dashboard, go to **Compute (Workers) → Pages** (or
   search "Pages" in the dashboard search bar) → **Create → Connect to Git**.
   Cloudflare's left sidebar groups Pages under the same "Compute" area as
   Workers, but it's its own project type once created — everything below
   happens inside that Pages project, not in "Workers."
2. Authorize the Cloudflare Pages GitHub App on your account (or on just this
   repo) if you haven't already, then pick this repository.
3. Build settings — this site needs none:
   - **Framework preset:** None
   - **Build command:** *(leave blank)*
   - **Build output directory:** `/` (the repo root, since `index.html` lives there)
4. Click **Save and Deploy**. Cloudflare builds it and gives you a
   `<project-name>.pages.dev` URL within a minute.

### 3. Point pgraphix.studio at it

In the Pages project, go to **Custom domains → Set up a custom domain** and
enter `pgraphix.studio`.

- If `pgraphix.studio`'s DNS is already managed in this Cloudflare account,
  Cloudflare adds the required DNS record automatically — no manual step.
- If the domain lives elsewhere, you'll need to either move its nameservers to
  Cloudflare first, or add a CNAME record at your current DNS provider pointing
  `pgraphix.studio` to the `.pages.dev` address Cloudflare gives you.

### After that

Every future `git push` to the connected branch triggers a new Cloudflare
Pages deploy automatically — no redeploy step needed on your end.

## 4. Set up the portfolio admin area

The site's portfolio grid (`/`) and the admin dashboard (`/admin`) both read
and write a single list of projects stored in Cloudflare KV. Two things to do:
create the KV store, and lock `/admin` down so only the studio can reach it.

### Create the KV namespace and bind it

KV lives in its own part of the dashboard now, separate from the Pages
project itself — creating it and binding it are two different screens:

1. **Create the namespace:** in the Cloudflare dashboard's left sidebar, go to
   **Storage & Databases → KV** (this is its own top-level section, not nested
   under Workers or under your Pages project — if you don't see "Storage &
   Databases," search "KV" in the dashboard's search bar and it'll take you
   there). Click **Create instance** / **Create a namespace**, name it
   anything, e.g. `pgraphix-projects`.
2. **Bind it to the Pages project:** open your Pages project → **Settings →
   Bindings → Add → KV namespace**. (Older Cloudflare docs call this tab
   "Functions" — if your dashboard still shows that name instead of
   "Bindings," it's the same screen.)
3. **Variable name:** `PROJECTS_KV` — exactly that; both `functions/api/projects.js`
   and `functions/admin/api/projects.js` read `env.PROJECTS_KV`.
   **KV namespace:** the one you just created.
4. Add the same binding for both **Production** and **Preview** (the binding
   screen lets you set this per environment).
5. Redeploy (same as with the Discord webhook — new bindings need a fresh
   deployment to take effect).

That's the only variable this feature needs. The first time anyone loads the
site after this, `/api/projects` auto-seeds the store with the studio's
original 11 sample projects — after that, everything comes from `/admin`.

### Set the admin passcode

`/admin` is gated by a shared passcode: visiting the page shows a login
screen first, and the dashboard only loads after the right passcode is
entered. The same passcode also has to be sent by anything that calls
`/admin/api/projects` directly — the API checks it independently of the
page, so there's no way to skip the gate by hitting the API URL directly.

1. In the Cloudflare dashboard, open this Pages project → **Settings →
   Variables and Secrets → Add**.
2. **Variable name:** `ADMIN_PASSCODE` — exactly that; `functions/admin/api/projects.js`
   reads `env.ADMIN_PASSCODE` and compares it to the `X-Admin-Passcode`
   header the admin page sends.
3. **Value:** pick a passcode (not the studio's real password for anything
   else — treat it like a shared door code, and anyone with it can add,
   edit, or delete portfolio projects).
4. Set **Type** to **Secret** so it's encrypted at rest, and add it for both
   **Production** and **Preview**.
5. Redeploy (same as with any new binding or variable — it needs a fresh
   deployment to take effect).

Until `ADMIN_PASSCODE` is set, `/admin` rejects every request — it fails
closed, not open — so this step isn't optional.

To change the passcode later, edit the variable's value the same way and
redeploy; anyone still signed in on the old passcode gets logged out the
next time they load or use the dashboard (the API starts rejecting the old
value immediately).

**Optional extra layer:** if you also want Cloudflare Access in front of
`/admin` (a login with the studio's real email instead of a shared
passcode), that's additive — set it up under **Zero Trust → Access →
Applications → Add an application → Self-hosted**, application domain
`pgraphix.studio`, path `/admin`. It's not required though; the passcode
above is what actually protects the page and its API today.

### Using it

Once both are set up, `/admin` lists every current project with edit and
delete buttons, and a form to add a new one — title, client/server name,
category, an optional image URL (paste a direct link from wherever you've
hosted the render or photo — Discord's CDN, Imgur, etc.), and up to three
label/value details (like "Format: SVG / PNG"). Changes appear on the live
site within seconds; no redeploy, no code.

## Editing later

Everything else — copy, colors, pricing, the Discord/email links — lives in
`index.html` as plain HTML/CSS/JS. No framework, so any text editor works,
and there's nothing to rebuild except the portfolio content itself, which now
lives in `/admin` instead of the file.
