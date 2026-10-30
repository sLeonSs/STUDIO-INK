# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static showcase site for **STUDIO INK** (renamed from "SK - Decor" on 2026-10-29), a mousepad shop (owner Sơn Lê, 0886 115 561). The logo files still show the old "SK" mark until the owner supplies a new one. Plain HTML/CSS/JS: no build step, no dependencies, no package manager, no tests. All user-facing copy is Vietnamese; keep it that way.

The design is deliberately minimal: white background, black text, no accent colors, no text effects. Typography is the only decoration: Inter Tight for text, and Newsreader italic for emphasis and product names. Keep new UI in that register: hairlines, tracked small caps and pill outline buttons, with no gradients, glows or colored accents. The header is modeled on an "Off the Rail" clothing-shop reference: a centered logo mark (its `img` alt is the page's `h1` name), a tiny caps line, and a clothes rail with the products hanging on it. The owner asked for no headline and no shop-name wordmark there.

## Running

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

`tools/xem-thu-thiet-bi.html` is the owner's device preview, not a shop page. It shows the site in iPhone/Samsung/iPad-sized iframes, each scaled to fit a laptop with a rotate button, at http://localhost:8080/tools/xem-thu-thiet-bi.html. Iframes report the real device width, so media queries and the 8-per-page phone catalog behave as on the device. Touch and `hover: none` are not emulated.

In VS Code, F5 runs `.vscode/tasks.json` (the same server on port 8080) before launching Chrome. Opening `index.html` directly via `file://` also works, and the owner does this. Scripts are classic `defer` scripts, not ES modules, and nothing fetches files at runtime.

## Architecture

Script order: `data.js`, `rail.js`, then `main.js`. `rail.js` only defines `window.Rail`. `main.js` renders every section from data and wires all interactions.

- **`js/data.js`** defines `window.SK_DATA`, the single source of truth:
  - `categories`: "Size vừa" (35×30, 45×40) and "Size lớn" (80×30, 90×40). The catalog tabs are exactly these two. A customer picks the concrete size inside the product detail.
  - `sizes`: `cm: [w, h]` plus `prices: { lineId: đồng }`. A line is sold at a size only if it has a price there. 35×30, 80×30 and 90×40 are glass only; 45×40 has all 6 lines. `thickness` exists only on 45×40, for the cloth lines.
  - `lines`: glass plus the 5 cloth lines PORON, 99G, ZERO, RUSH and TACTILE. Each has stats, playstyle values, copy (`headline`, `desc`, `pros`), `surface`, `texture` and `base` (base type: `'PORON'` or `'Cao su'`; `null` = "Đang cập nhật"). The comparison table's "Đế PORON" row derives from `base === 'PORON'`.
  - Rubber (`'Cao su'`) for 99G, RUSH and TACTILE is an assumption the owner was asked to confirm; the chart only said they have no PORON.
  - Glass has `stats: null` (specs pending), which drives "Đang cập nhật" for its thickness and its absence from the comparison table. It has no texture image, so the detail draws a CSS glass swatch.
  - The comparison table shows only `stats.control`, as the first row under "Phong cách chơi", followed by the `play` values. The other `stats` fields and `firmnessScale` come from the shop's chart and are kept in the data but not displayed; the owner removed the "Hiệu năng" group.
  - `designs`: one flat list. Each design has a `category` and a `format` (the size its image was made for), which drives its aspect ratio on the rail and in the catalog. In the detail, the image frame switches to the size the customer selects.
  - `shop.orderEmail` is where orders are delivered (see the order form below).
- **`js/rail.js`** is the `Rail` class, the header clothes rail. It is generic: it takes the item elements plus their cm sizes and knows nothing else about products.
  - The rail is an infinite loop. `pos` is a float in item units, and each item's offset `t` is the shortest wrapped distance to `pos`.
  - Layout is analytic, not DOM-based. Side items are spaced `step` apart and turned `TURN`° on their hook (`rotateY`, origin at the hook). The centered item faces front, is lifted `LIFT` px toward the viewer, and gets a gap of its own width. The width is interpolated between neighbors so mixed sizes slide smoothly.
  - Input: click a side item to select it, click the centered item to open it; drag or swipe with fling and snap; horizontal wheel only, so vertical wheel scrolls the page; arrow keys and Enter on the focused rail. A drag past 6px swallows the next click.
  - A spring moves `pos` toward an integer `target`. A tiny pendulum per item, driven by rail acceleration and scaled by `SWING`, is the only sway; the owner asked for it to be subtle.
  - Start position: `new Rail(..., { start })` places a design in the center with no animation. main.js passes `randomStart()`, a random design per visit that is never the same as the previous visit's (`localStorage['sk-rail-start']`).
  - Autoplay: main.js calls `startAuto({ delay: 1100, interval: 1650, pauseOn: [caption] })`. It steps +1 with `SPRING_AUTO` 120 (about 0.4s per flip; `SPRING_USER` is 110). The owner asked for this pace, which is twice the first version.
    - Stop: any user control of the rail calls `takeOver()` and stops autoplay for the rest of the page view. That covers `select`, `move`, a horizontal drag, an item click and the horizontal wheel; `openDetail` also stops it.
    - Pause, then resume after a full interval: mouse hover on the rail or the caption (so it can't slide away right before a click), pointer down (released by `pointercancel` when it turns into a vertical page scroll), keyboard focus, rail less than 35% visible, hidden tab.
    - There is no autoplay under reduced motion. While it runs, `#railName` has `aria-live="off"`.
  - Only items within `reach` of the center are visible. Images use `data-src` (a thumbnail) and load lazily as items come near.
  - `sharpen()` swaps in the full image (`data-full`, preloaded first so there is no flash) for the center item and its two neighbours, but not while autoplay is actively running: loading a full image at every 1.65s step was the main bandwidth cost. Any hold or `stopAuto()` calls `wake()`, so the center sharpens as soon as the visitor stops to look.
- **`js/main.js`** has four parts:
  - Rail: builds the items, the caption (name and meta under the rail) and the size links in the kicker, which jump the rail.
  - Product grid: paginated by category, 9 per page in 3 columns, or 8 per page on phones, where medium uses 2 columns and large uses 1. Only the current page's cards are rendered.
  - Every card in a category shares one tile shape: 2:1 if the category has wide pads, otherwise 4:3. The pad is centered at its real aspect ratio; `tileFit()` sets the image width so wide pads fill the width and near-square pads fill the height. Cards show the category's "từ …" price.
  - Comparison: two renderings of the same `lines` data, with values drawn as 5-cell meters (half cells for .5).
    - From 900px: the full table (`#compareTable`, sticky first column).
    - Below 900px (`.compare-m`): no horizontal scrolling. A compact matrix (`#compareMatrix`) has the 5 lines as columns and the playstyle rows plus "Đế PORON", using `table-layout: fixed` and short meters so that adjacent columns stay visually separate down to 320px. It is followed by a native `<details>` accordion (`#compareDetails`) with each line's surface, base and full summary; the first item is open.
  - Detail sheet (`#detail` > `.sheet__panel`):
    - Below 1024px it covers the whole screen; drag horizontally to close (pointer events, touch/pen only).
    - From 1024px the panel is a centered column over a dimmed veil (`.sheet::before`); clicking the veil (`e.target === sheet`) closes it.
    - Under the image is the selected line's surface block: texture swatch, surface name and base type.
    - The info column has size and line pickers as radio tiles (`.tile`, `.is-checked` toggled in JS), with only the lines priced at that size shown. Then quantity (1–20), the line's full "Tóm tắt", specs, a help line with contact links and "Sao chép mã đặt hàng".
    - A sticky `.buybar` at the bottom always shows the total and the "Đặt hàng" button.
    - `wantedLine` remembers the customer's last explicit line choice, so switching to a glass-only size and back restores it. Lines are re-rendered only when the size changes, so focus survives line changes.
    - Prev/next are round buttons over the image; when the sheet was opened from the rail, they also move the rail (`fromRail`).
  - Layers and history: the detail sheet and the order dialog each push a history entry (`openLayer`) and are closed only through `closeLayer(id)`, which calls `history.back()`, or by `popstate`. So Android Back, iOS swipe-back, Mac two-finger swipe and the back button of the Zalo/Facebook in-app browser close the top layer instead of leaving the site. Never hide a layer directly from UI code, or history drifts.
  - Order form: a native `<dialog>` (`showModal`) over the detail sheet. Name, phone and address are required; only Gmail may be empty. On submit it POSTs JSON to `https://formsubmit.co/ajax/<shop.orderEmail>`. FormSubmit is a free relay with no account; it emails the order to the shop as a table.
    - The first submission ever triggers an "Activate Form" email to that address. Until the owner clicks it, the API answers `success: "false"` (submissions are kept for 30 days), and the form shows the "chưa gửi được" message with the shop phone number.
    - `_honey` is a hidden honeypot field. `_replyto` is set when the customer gives an email.
    - Esc on the native dialog arrives as a `cancel` event, which is prevented and routed to `closeLayer('order')`. The sheet's key handler ignores keys while the dialog is open.
- **`index.html`** is the static shell. Contact links (`tel:`, `zalo.me/0886115561`, the Facebook URL) are hard-coded in the header, the contact section, the detail sheet and the footer. If contact info changes, update all of them.

### Coupling to keep in mind

- **Hook geometry.** The hook SVG (16×36, arc centered at (8, 6)) sits at the top of each `.rail__item`, and `transform-origin: 50% 6px` is that arc center. `.rail__bar`'s `top: 27.5px` puts the rail through it: items sit at `top: 24px`, so the center is at 30px. The pad starts at `top: 40px`, which is `PAD_TOP` in `rail.js`, used to size the rail's height. Change these together.
- **Catalog tiles.** `.card__media`'s `aspect-ratio: 4 / 3` and `padding: 8%` must match `TILE` / `TILE_PAD` in `main.js`. The phone breakpoint `(max-width: 639px)` that switches 9 to 8 per page must match the 2-column grid media query.
- **Compare table stickiness.** The first column is `position: sticky`, with a box-shadow that covers the scroll container's left padding. That only works with `border-collapse: separate`, because Chrome ignores box-shadow on collapsed cells. Group header rows span every column, so only their inner `<span>` is sticky.
- **Swipe to close.** It relies on `.sheet { touch-action: pan-y pinch-zoom }`: the browser keeps vertical scrolling and pinch-zoom, and horizontal drags reach JS. A drag that started (more than 10px, mostly horizontal) swallows the following click. Drags are ignored only when they start on the input that currently has focus, because there the drag moves the text cursor. Don't exclude unfocused inputs: touch hit-testing snaps nearby touches onto inputs, so excluding them makes swipes near the quantity box silently fail.
- **Touch devices.** All `:hover` styles live in the single `@media (hover: hover)` block at the end of `style.css`. That stops taps from leaving buttons stuck inverted on phones, so put new hover styles there.
- **Tap targets.** The "Vùng bấm" section enlarges small text buttons to about 40px with padding plus equal negative margins, so layout doesn't move. Stacked header links on phones use smaller padding and a larger gap so their hit areas don't overlap.
- **Dialog fallback.** `<dialog>` needs Safari 15.4+. On older browsers `main.js` adds `.order--fallback` and opens or closes the dialog with the `open` attribute. Always go through `showOrderDialog()` / `orderIsOpen()` and close with `closeLayer('order')`, never `showModal()` / `close()` / `.open` directly.
- **Landscape phones.** `@media (orientation: landscape) and (max-height: 560px)` caps the detail image at 60vh. It uses `calc(60vh * var(--ar))`, which works because `--ar` is a raw `w / h` token pair.
- **Never submit real orders while testing.** Every test submission would email the owner. In headless tests, stub `window.fetch` via `Page.addScriptToEvaluateOnNewDocument` and also `Network.setBlockedURLs(['*formsubmit.co*'])` as a safety net.
- **Reduced motion.** `prefers-reduced-motion` makes the rail jump straight to its target with no sway, and turns off CSS transitions.

## Deploying (Netlify)

The owner deploys by dragging a folder or zip into Netlify (manual deploy, no Git). The free plan is a 300-credit monthly pool: 15 credits per deploy and 20 per GB of bandwidth. Bytes per visit therefore matter.

- **Package:** only `index.html`, `404.html`, `_headers`, `css/`, `js/` and `assets/`; never `tools/`, `CLAUDE.md` or `.vscode/`. It was last built as `~/Desktop/studio-ink-web/` plus `~/Desktop/studio-ink-web.zip`, zipped with the site files at the zip root.
- **`_headers`:** caches `/assets/*` for one day and adds `nosniff`/referrer headers. HTML, CSS and JS keep Netlify's default revalidation, so updates show immediately.
- **`404.html`:** uses root-absolute paths (`/assets/...`), because Netlify serves it at any missing path.
- **Link previews (Zalo/Facebook):** the `og:*` tags in `index.html` point `og:image` at the absolute URL `https://studio-ink.netlify.app/assets/share.jpg`, which assumes the Netlify site name `studio-ink`. Update it if the site gets another name or a custom domain. `assets/share.jpg` (1200×630) is text only ("STUDIO INK", sizes, phone), without the old SK logo, rendered from HTML with headless Chrome, so it does not depend on the placeholder product photos.

- **Git:** the code lives at https://github.com/sLeonSs/STUDIO-INK (public, branch `main`, remote `origin`); the older empty repo `SK_Decor` is unused. The Mac has no permanent GitHub login: pushes were made with a GitHub CLI downloaded into a session scratchpad and a device-code login, so a new session must log in again before pushing. GitHub Pages is not a host option, because its terms forbid shop/e-commerce sites; GitHub only stores the code, and Netlify hosts the site.

## Assets

- `assets/pads/pad-01…20.jpg` (45×40, Honkai: Star Rail), `assets/pads-80x30/miku-01…20.jpg` and `assets/pads-90x40/yuki-11…16.jpg` are placeholder prints cropped from lacdau.com collages. They are meant to be replaced with the shop's own designs.
- `assets/thumbs/` mirrors the three pad folders at 480px (45×40) / 640px (wide) wide, JPEG quality 70. They are used by the rail and the catalog (with an `error` fallback to the full image); the detail sheet always uses the full image. Regenerate with `sh tools/make_thumbs.sh` after adding or replacing designs.
- `assets/textures/*.jpg` are surface textures cropped from the shop's comparison chart. They are shown in grayscale.
- `assets/logo.png` / `favicon.png` are the shop's original gold logo.
- `assets/logo-mono.png` is the black version used on the page, generated by `python3 tools/logo_mono.py` (stdlib only, with its own PNG decoder and encoder). Rerun it after replacing the logo.
- The machine has `sips` but no ImageMagick or PIL. Use `sips -c <h> <w> --cropOffset <y> <x>` for crops. An offset of `0 0` is ignored (sips center-crops instead), so use `1 1`.

## Verifying in headless Chrome

- `--virtual-time-budget` never fires `requestAnimationFrame` or advances CSS transitions, so it is useless for the rail.
- Drive a real-time headless Chrome instead (`--headless=new --remote-debugging-port=9222`) over the DevTools protocol:
  - `Input.dispatchMouseEvent` (including `mouseWheel`) and `Input.dispatchTouchEvent` for real input.
  - `Emulation.setDeviceMetricsOverride` for mobile. This also avoids the ~500px minimum window width.
  - `Emulation.setEmulatedMedia` for reduced motion.
  - `Runtime.exceptionThrown` events for errors.
- Before navigating in autoplay tests, move the mouse away from the rail and caption. Chrome replays hover for the last cursor position, and hovering pauses autoplay.
- A long-running `python3 -m http.server` that has served many killed test browsers can start resetting connections. Restart it before blaming the site for broken images.
