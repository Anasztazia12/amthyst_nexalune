# Amethyst Nexalune

A static, bilingual (EN/HU) portfolio and services showcase website. No build step, no backend — plain HTML, CSS, and vanilla JavaScript, served as a static site on [Vercel](https://vercel.com).

## Pages

- `index.html` — Home
- `about.html` — About
- `portfolio.html` — Portfolio
- `services.html` — Services & packages
- `contact.html` — Contact

## Structure

- `assets/css/style.css` — styling for the whole site
- `assets/js/app.js` — language switching (EN/HU translations in one place), mobile hamburger menu, portfolio image carousels, consultation/package modal, Web3Forms-based form submission
- `assets/images/` — logo and portfolio screenshots, all served as optimized WebP

## Features

- **Bilingual EN/HU** via `data-i18n*` attributes, with the chosen language saved to `localStorage`
- **Responsive layout** with a mobile hamburger menu (anchored to the header, opens below it at every breakpoint)
- **Portfolio carousels** — each project card can cycle through multiple screenshots: autoplay (pauses on hover), swipe on touch devices, and prev/next arrows + dots
- **Consultation / package request modal** — used both on the Home page ("Free consultation" buttons) and the Services page (per-package "Start with this package" buttons). Submits to Web3Forms with an hCaptcha widget; client-side validation blocks submission (with a clear message) if the captcha hasn't been completed, instead of silently failing
- **Google Analytics** (gtag.js) on every page
- Images are converted to WebP and resized for their display size — the original PNG exports (some 5–15 MB each) are not used on the live site

## Deploy

The site runs on Vercel as a static site — no build command needed, it serves the HTML files straight from the repo root.

## Testing / QA

The project has no automated test suite (static site, no build), so changes are verified manually and with a headless browser (Playwright):

- Mobile and desktop viewports on every page
- Hamburger menu: open/close, navigation, closing after clicking a link
- Language switching (EN/HU), localStorage persistence, and a full key-parity audit (every `data-i18n*` key must exist in both the EN and HU dictionaries in `app.js`)
- Portfolio carousels: slide count matches dot count on every card, autoplay advances and pauses on hover, swipe and tap navigation both work, no broken image references
- Contact form and the consultation/package modal: correct package name shown, hCaptcha renders, submission is blocked client-side until the captcha is completed, form resets when reopened for a different package
- Internal links and image paths checked against what actually exists on disk
