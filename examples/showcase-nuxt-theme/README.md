# Nuxt theme

Northwind Coffee's product page with c15t's stock banner and preference
dialog in the shop's brand. Nothing is rebuilt: the components are the ones
`ConsentRoot` renders, changed through module options in `nuxt.config.ts`.

- `theme` sets Northwind's green, cream and border colors and smaller
  corners, with a second palette in `theme.dark`.
- `colorScheme: 'system'` switches to the dark palette when the visitor's
  system is in dark mode.
- `presentation` turns the floating card into a wall: a card in the middle of
  the page that blocks it until the visitor chooses. A notice can't block, so
  where the policy only shows a notice, c15t keeps the floating card.
- `components` puts a class on the card and title of the banner and the
  dialog. `app/assets/consent.css` gives the card a green top rule and a
  shadow, and the title the shop's serif.
- `legalLinks` with `bannerLegalLinks` and `dialogLegalLinks` adds a link to
  `/privacy` under each description.

## The files that matter

- **`nuxt.config.ts`** holds every c15t option. They are plain data, so they
  belong in module options rather than `app/app.config.ts`.
- **`app/assets/consent.css`** styles the classes from `components`. c15t's
  rules sit in a cascade layer, so these unlayered rules win without extra
  specificity. They read `--c15t-primary`, so the rule follows the dark
  palette.
- **`app/app.vue`** mounts `ConsentRoot`. The footer's Privacy settings link
  is `ConsentPreferencesLink` with a class.

The rest is the shop: the product page, header, footer and
`app/assets/site.css`.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/showcase-nuxt-theme dev
```

The app's `.env` points it at the `https://benchmarks-inth.inth.app` demo
Inth project. The module downloads that project's policy when `nuxt dev` or
`nuxt build` starts. To use your own project, set
`NUXT_PUBLIC_C15T_BACKEND_URL` in `.env.local` to its backend URL and add the
app's origin to its trusted origins.

## Docs

- [Customize](https://c15t.com/docs/frameworks/nuxt/customize)
- [Component parts](https://c15t.com/docs/customization/slots)
- [Theme tokens](https://c15t.com/docs/customization/tokens)
- [Dark mode](https://c15t.com/docs/customization/dark-mode)
