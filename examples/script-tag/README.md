# Script-tag example

The `@c15t/browser` banner on a plain HTML page with deliberately hostile page CSS, the way a Framer, Webflow or WordPress site would load it. No framework, no bundler.

```sh
bun turbo run build --filter=@c15t/browser
bun run --cwd examples/script-tag dev
```

Open http://localhost:4173. The page runs in offline mode, so no backend is needed. `index.html` shows the three ways to talk to the banner: `data-*` attributes on the tag, `window.c15tConfig`, and calls queued on `window.c15t` before the script loads.
