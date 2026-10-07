---
packages:
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Warn that Create React App cannot run the Tailwind 3 plugin

Create React App never reads `postcss.config.js`, so `c15t/postcss-tailwind3`
cannot run and a Tailwind 3 build fails on c15t's dialog stylesheet. For
Tailwind 3 apps on `react-scripts`, `c15t setup` leaves PostCSS config alone and
warns instead of reporting success. To fix the build, add the plugin before
`tailwindcss` through CRACO, eject, or move the app to Vite.

Interactive setup shows this warning, and `--non-interactive` setup returns it
in a new `warnings` array in `--json` output.
