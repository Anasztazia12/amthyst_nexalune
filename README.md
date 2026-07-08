# Amethyst Nexalune

![Prestige Legal Consulting preview](assets/images/projects/responsive-legal.png)

A static, bilingual (EN/HU) portfolio and services showcase website. No build step, no backend — plain HTML, CSS, and vanilla JavaScript, served as a static site on [Vercel](https://vercel.com).

## Pages

- `index.html` — Home
- `about.html` — About
- `portfolio.html` — Portfolio
- `services.html` — Services & packages
- `contact.html` — Contact

## Structure

- `assets/css/style.css` — styling for the whole site
- `assets/js/app.js` — language switching (EN/HU translations in one place), mobile hamburger menu, portfolio image carousels, consultation/package modal, Web3Forms-based form submission, scroll-reveal animation system, AI chat widget, interactive hero canvas
- `assets/images/` — logo and portfolio screenshots, all served as optimized WebP/JPG

## Features

- **Bilingual EN/HU** via `data-i18n*` attributes, with the chosen language saved to `localStorage`. `data-i18n-html` lets specific strings (e.g. a bolded phrase mid-sentence) carry inline markup that survives translation and language switching.
- **Responsive layout** with a mobile hamburger menu (anchored to the header, opens below it at every breakpoint)
- **Portfolio carousels** — each project card can cycle through multiple screenshots: autoplay (pauses on hover), swipe on touch devices, and prev/next arrows + dots
- **Consultation / package request modal** — used both on the Home page ("Free consultation" buttons) and the Services page (per-package "Start with this package" buttons). Submits to Web3Forms with an hCaptcha widget; client-side validation blocks submission (with a clear message) if the captcha hasn't been completed, instead of silently failing
- **AI chat widget** (every page, floating bottom-right bubble) — a guided conversational form, not a real LLM: asks for name and email (both validated), lets the visitor pick a project category (Website / Web app / Digital business card / Other) via inline choice buttons, then asks for details and submits straight to Web3Forms (no hCaptcha — doesn't fit the format). Includes a basic EN/HU profanity filter and auto-closes the panel a couple seconds after a successful send.
- **Scroll-reveal animation system** — a shared `.reveal`/`is-visible` mechanism driven by `IntersectionObserver`, with several specialised variants layered on top:
  - `.word-cascade` — splits an element's text into individual words that fly in from varied directions (used on hero headlines); supports a "final words land bigger and later" emphasis mode
  - `.chaos-card` — portfolio cards fly in from random offsets/rotations almost simultaneously, then settle into the grid
  - `.cascade-directions` — feature-list items cycle in from right/left/top/bottom
  - `.slide-item` — alternating left/right entrance for shorter lists
  - `.price-card` gets its own slower, more dramatic stagger than the generic `.reveal` default
- **Interactive hero canvas** — a lightweight constellation/particle effect (`<canvas>` + `requestAnimationFrame`) behind the hero content on every page: drifting points connect with faint lines, and moving the cursor draws live links to nearby particles. Respects `prefers-reduced-motion`, pauses via `IntersectionObserver` when scrolled out of view, and is capped at a small particle count for performance.
- **Back-to-top button** (Home, About) — appears after scrolling ~400px, smooth-scrolls to top on click
- **Google Analytics** (gtag.js) on every page
- Images are converted to WebP/JPG and resized for their display size — the original PNG exports (some 5–15 MB each) are not used on the live site

  Example (CarnovoX Motor portfolio card, resized to 1600px wide and re-encoded):

  | File | Before | After |
  | --- | --- | --- |
  | responsive-car | 8.6 MB PNG | 213 KB JPG |
  | car-webpage | 14.8 MB PNG | 310 KB JPG |
  | car-webpage2 | 4.1 MB PNG | 165 KB JPG |
  | car-webpage3 | 3.3 MB PNG | 192 KB JPG |

## Deploy

The site runs on Vercel as a static site — no build command needed, it serves the HTML files straight from the repo root.

## Testing / QA

The project has no automated test suite (static site, no build), so every change is verified manually and with a headless browser (Playwright) before being considered done:

- Mobile and desktop viewports on every page, including an explicit check that `document.documentElement.scrollWidth` never exceeds the viewport (a real bug — see below)
- Hamburger menu: open/close, navigation, closing after clicking a link
- Language switching (EN/HU), localStorage persistence, and a full key-parity audit (every `data-i18n*` key must exist in both the EN and HU dictionaries in `app.js`)
- Portfolio carousels: slide count matches dot count on every card, autoplay advances and pauses on hover, swipe and tap navigation both work, no broken image references
- Contact form, the consultation/package modal, and the AI chat widget: correct package name shown, hCaptcha renders where expected, submission is blocked client-side until required fields/captcha are valid, form resets when reopened. Chat-widget submissions are tested by intercepting the Web3Forms network request (`page.route`) so test runs never send real emails.
- Reveal/animation timing sanity-checked by sampling `getComputedStyle(...).opacity` across frames, not just eyeballing it
- Internal links and image paths checked against what actually exists on disk

### Notable bugs caught and fixed along the way

- **Page draggable sideways on mobile.** The portfolio page's chaos-card entrance intentionally starts cards translated far outside their box (up to ~380px). CSS transforms still count toward an ancestor's scrollable overflow even though they don't affect layout, so the whole page gained horizontal scroll room on mobile. `body { overflow-x: hidden }` alone didn't fix it — mobile browsers scroll the `<html>` element, not `body`. Fixed by adding `overflow-x: hidden` to `html` as well.
- **Inconsistent gap between image and text on portfolio cards.** `.project-card` is a 2-row grid (image, body) with no `align-content` set, so when the outer grid stretched all cards in a row to equal height, the leftover space got redistributed unevenly between rows depending on how much body text each card had — shorter cards got a bigger, wrong-looking gap. Fixed with `align-content: start` on the card and its body.
- **Chat panel closing itself the instant you picked a choice button.** The button removed itself from the DOM (`wrap.remove()`) before its click event finished bubbling to the document-level "click outside to close" listener; by the time that listener ran `chatPanel.contains(event.target)`, the target had already been detached, so it looked like the click landed outside the panel. Fixed by checking `event.composedPath()` instead, which captures the original path before any DOM mutation.
- **iOS Safari auto-zoom on the chat input.** Its `font-size` was `0.92rem` (~14.7px); anything under 16px makes iOS zoom the whole page in on focus, which reads as the page "sliding". Bumped to `16px`.
- **A CSS cascade collision silently killed the pricing-card fade-in.** `.price-card`'s own `transition` shorthand and the generic `.reveal` rule's `transition` shorthand both targeted the same element; whichever was later in the stylesheet won *entirely* (transition shorthand replaces, it doesn't merge), so opacity dropped out of the transitioned-properties list and the fade snapped instead of animating. Fixed with a higher-specificity compound selector, plus a `reveal-done` class swapped in after the entrance finishes so later hover transitions stay fast.

---

Thanks for checking it out! 💌
