# PGraphix Studio — Portfolio Site

Static one-page portfolio site for PGraphix Studio (FiveM design work: logos,
liveries, vehicle packs, multi-siren configs, and media). Single self-contained
`index.html` — no build step, no dependencies, nothing to install.

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

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages →
   Connect to Git**.
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

## Editing later

Everything — copy, colors, portfolio items, pricing, the commission form —
lives in `index.html` as plain HTML/CSS/JS. No framework, so any text editor
works, and there's nothing to rebuild.
