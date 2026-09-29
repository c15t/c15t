# Script-tag example

The `@c15t/browser` banner on plain HTML pages, the way a CMS theme, page builder or static site generator loads it. No framework, no bundler.

```sh
bun turbo run build --filter=@c15t/browser
bun run --cwd examples/script-tag dev
```

## The page the HTML docs publish

http://localhost:4173/consent-example is the setup from the [HTML quickstart](https://c15t.com/docs/frameworks/html/quickstart): one tag connected to Inth, PostHog and X Pixel as inert scripts, a YouTube iframe gated on measurement, and a Privacy settings link. `/consent-example/branded` adds the theme block from `branded-theme.html`.

The page's tag points at jsDelivr and a `YOUR_INTH_BACKEND_URL` placeholder, exactly as readers copy it. `serve.ts` swaps both for the local build and `C15T_BACKEND_URL`, so start it with your Inth URL and add `http://localhost:4173` to the project's trusted origins:

```sh
C15T_BACKEND_URL=<your Inth backend URL> bun run --cwd examples/script-tag dev
```

The shared acceptance suite runs this page against a fixture backend with vendor requests intercepted:

```sh
EXAMPLE_TARGET=html bun run --cwd examples/shared test
```

## The playground

Open http://localhost:4173 for a playground that needs no backend: the page runs in offline mode with three built-in policy rules covering European opt-in, US privacy-state opt-out, and no prompt elsewhere and starts as a German visitor. The DevTools panel opens on its Location tab: change the country, run init, and watch the banner follow the policy.

The page exercises everything a real site gates on consent, all served locally so it works offline and every request shows in the page's log:

- two vendor scripts listed under `scripts` (an analytics SDK on `measurement`, a chat widget on `functionality`) and an inline `<script type="text/plain" data-c15t-category="marketing">` pixel
- two iframes with `data-src` and `data-category` that only get a `src` once granted
- a `networkBlocker` rule that stops `fetch('/api/track')` until `measurement` is granted
- `data-c15t-action` buttons and a `#c15t-preferences` link, with no page JavaScript
- a deliberately hostile theme (`button { background: hotpink !important }`) that the banner, preference centre and DevTools panel all ignore because each renders in a shadow root

A second page, http://localhost:4173/custom, loads `c15t.headless.js` instead and renders its own consent card with the site's HTML and CSS, the way zed.dev/docs ships its banner on c15t: `data-c15t-action` buttons for accept and reject, one `ui` listener to show, hide and switch the card into configure mode, and `c15t.save()` behind the Save button.

`index.html` shows the three ways to configure the tag: `data-*` attributes, and `config` and `on` calls queued on `window.c15t` before the script loads.

Open http://localhost:4173/styled for theme tokens and CSS inside a shadow root, or http://localhost:4173/styled?shadow=false for the same border applied by the page stylesheet. Both run offline. Banner styling and geometry need no backend.

Open http://localhost:4173/iab for the separate `c15t.iab.js` entry. It uses a sample vendor list from `iab-gvl.json`, displays purposes and vendors, and saves a TC string. It runs offline; replace the example CMP ID and vendor data with your CMP configuration for a real site.
