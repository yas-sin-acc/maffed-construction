# Maffed Construction: website, owner panel and API

```
maffed-construction/
├── frontend/   the website customers see + the owner panel (plain HTML, CSS, JavaScript)
├── backend/    the API that saves requests, approvals, bids and uploaded files (Node.js, no dependencies)
├── render.yaml                       one-click backend hosting settings (Render)
└── .github/workflows/                automatic website publishing (GitHub Pages) and tests
```

## How it works
1. A customer posts a property, rental or Real Estate Hub item (with photos or video). It waits as a **request**.
2. The owner logs in at `admin.html` and chooses **Approve and publish**, **Ask for more info**, or **Reject** (with a reason).
3. Approved requests appear on the website **automatically**. Customers follow their request with a tracking code.
4. When the **company itself** wants to post (portfolio, marketplace, rent, Real Estate Hub, bids with documents, law PDFs, map links) it posts directly in the owner panel and it is published immediately.
5. Bids, Laws and Map open from the three-dots menu next to the Alarm button. They do not appear when scrolling the page.

## Run on your computer
Install Node.js 18 or newer (https://nodejs.org), then in this folder:

    npm run dev

- Website: http://localhost:5173
- Owner panel: http://localhost:5173/admin.html  (test password: `change-me-123`)
- API: http://localhost:3000

## Put the project on GitHub
1. Create a free account at https://github.com and click **New repository**. Name it, for example, `maffed-construction`. Leave it empty.
2. In this folder run:

       git init
       git add .
       git commit -m "Maffed Construction website"
       git branch -M main
       git remote add origin https://github.com/YOUR-USERNAME/maffed-construction.git
       git push -u origin main

   (No Git? On the repository page choose **Add file > Upload files** and drag in everything.)
3. Never upload passwords. The owner password is entered in the hosting dashboard, not in the code. The `.gitignore` already keeps saved data out.

## Publish it online (this gives you the link for customers)

### Step 1: backend on Render (free plan available)
1. Sign in at https://render.com with your GitHub account.
2. **New > Blueprint**, choose your repository. Render reads `render.yaml`.
3. When asked, set `ADMIN_KEY` to a long private password (this is your owner password) and `ALLOWED_ORIGINS` to your website address, for example `https://YOUR-USERNAME.github.io`.
4. When it finishes you get an address like `https://maffed-api.onrender.com`. Open `/api/ping` on it: you should see `{"ok":true}`.

### Step 2: tell the website where the backend is
Open `frontend/js/config.js` and replace `PRODUCTION_API` with your Render address. Save and push to GitHub.

### Step 3: website on GitHub Pages
1. In your repository: **Settings > Pages > Source: GitHub Actions**.
2. Push to `main` (the step above does it). The workflow *Deploy website to GitHub Pages* publishes the `frontend` folder.
3. Your customer link is: **`https://YOUR-USERNAME.github.io/maffed-construction/`**
   Owner panel (keep this link private): `https://YOUR-USERNAME.github.io/maffed-construction/admin.html`

Prefer Netlify or Vercel? Drag the `frontend` folder into Netlify Drop, or import the repository and set the publish folder to `frontend`. The backend steps are the same.

### Own domain (optional)
Buy a domain, then add it in GitHub Pages settings (website) and in Render (API). Update `ALLOWED_ORIGINS` and `PRODUCTION_API` to the new addresses.

## Important to know before real customers use it
- **Saved data on free hosting can disappear.** Free Render plans erase files when the service restarts. For real use, add a persistent disk (see the comments in `render.yaml`) and set `DATA_DIR`, or move the backend to a small VPS. Back up `db.json` and `uploads/`.
- A free Render service goes to sleep when unused; the first visit after a pause can take about a minute.
- Customer phone numbers are stored in `db.json`. Keep that folder private and tell customers how you use their data.
- Use a long `ADMIN_KEY`. Wrong passwords are limited to 10 tries per 15 minutes.
- Translations (Amharic, Afaan Oromoo, Arabic) should be reviewed by native speakers.
- Law and ministry links in `frontend/js/content.js` are empty on purpose: paste the official addresses or upload PDFs in the owner panel.

## Change the look
`frontend/css/theme.css` controls colors, fonts, roundness, spacing and banner height. Every setting is explained and there are two ready-made color sets. Words, logo, social links, map links and laws are in `frontend/js/content.js`.
