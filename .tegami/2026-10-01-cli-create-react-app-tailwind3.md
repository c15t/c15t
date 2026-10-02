---
packages:
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Warn that Create React App cannot run the Tailwind 3 plugin

Create React App (`react-scripts`) builds CSS with its own PostCSS setup and never reads `postcss.config.js`, so c15t's Tailwind 3 PostCSS plugin (`c15t/postcss-tailwind3`) cannot run and a Tailwind 3 build fails on c15t's dialog stylesheet. `c15t setup` still added the plugin to a `postcss.config.js` it found and reported success.

For Tailwind 3 apps that depend on `react-scripts`, setup now leaves PostCSS config alone, with or without a config file, and warns instead. To fix the build, add the plugin before `tailwindcss` through CRACO, eject, or move the app to Vite.

Interactive setup now shows this warning and the existing "add the plugin by hand" step, which it previously logged only at debug level. `--non-interactive` setup logs them and returns them in a new `warnings` array, which `--json` output includes.
