<p align="center">
  <a href="https://c15t.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fbrowser" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../../docs/assets/c15t-banner-readme-dark.png">
      <img src="../../docs/assets/c15t-banner-readme-light.png" alt="c15t: the open standard for cookie banners">
    </picture>
  </a>
</p>

# @c15t/browser: Cookie banner and cookie consent for any website, with one script tag

<p>
<a href="https://www.npmjs.com/package/@c15t/browser"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/npm/%40c15t%2Fbrowser.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/npm/%40c15t%2Fbrowser.svg?variant=outline&mode=light" alt="Latest NPM Version"></picture></a>
<a href="https://github.com/c15t/c15t"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/github/c15t/c15t/stars.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/github/c15t/c15t/stars.svg?variant=outline&mode=light" alt="Stars"></picture></a>
<a href="https://github.com/c15t/c15t/blob/main/LICENSE.md"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/github/c15t/c15t/license.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/github/c15t/c15t/license.svg?variant=outline&mode=light" alt="License"></picture></a>
<a href="https://c15t.link/discord"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/discord/1312171102268690493.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/discord/1312171102268690493.svg?variant=outline&mode=light" alt="Discord"></picture></a>
<a href="https://skills.sh/c15t/skills/c15t"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/skills/c15t/skills/c15t.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/skills/c15t/skills/c15t.svg?variant=outline&mode=light" alt="Skills"></picture></a>
<a href="https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fbrowser"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/Made%20By-Inth-ffc803.svg?color=ffc803&labelTextColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAzOTMgNDAwIj48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTgyLjY2MiAwdjM2Ljg5NWgtNTkuMDMxdjgyLjczM2g1OS4wMzF2MzYuODkzSDI3LjQ4MnYtMzYuODkzaDU5LjAzVjM2Ljg5NWgtNTkuMDNWMHpNMzIxLjk0MSA4OS44NVYwaDM1LjM1NXYxNTYuNTIxaC0yNS43MTNsLTg2LjEzNy05MC4zNjR2OTAuMzY0aC0zNS4zNTVWMGgyNi4zNTV6Ii8%2BPHBhdGggZmlsbD0iIzAwMCIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMzE4LjU3MSAxODUuNzE0aDc0LjI4NlY0MDBIMFYxODUuNzE0aDI3Mi44NTd2LTQ3LjE0M3ptLTI5MS4wOSAyOC45Njl2MzcuMTE4aDU4LjEzN3YxMTkuNjI4aDM2Ljg5NVYyNTEuODAxaDU4LjU4NHYtMzcuMTE4em0xODIuNjEuMjI0djE1Ni41MjJoMzYuODk0VjMxMy41OWg3My4zNDF2NTcuODM5aDM3LjExOFYyMTQuOTA3aC0zNy4xMTh2NjEuNzg4aC03My4zNDF2LTYxLjc4OHoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg%3D%3D&valueColor=000000&mode=dark"><img src="https://shieldcn.dev/badge/Made%20By-Inth-ffc803.svg?color=ffc803&labelTextColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAzOTMgNDAwIj48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTgyLjY2MiAwdjM2Ljg5NWgtNTkuMDMxdjgyLjczM2g1OS4wMzF2MzYuODkzSDI3LjQ4MnYtMzYuODkzaDU5LjAzVjM2Ljg5NWgtNTkuMDNWMHpNMzIxLjk0MSA4OS44NVYwaDM1LjM1NXYxNTYuNTIxaC0yNS43MTNsLTg2LjEzNy05MC4zNjR2OTAuMzY0aC0zNS4zNTVWMGgyNi4zNTV6Ii8%2BPHBhdGggZmlsbD0iIzAwMCIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMzE4LjU3MSAxODUuNzE0aDc0LjI4NlY0MDBIMFYxODUuNzE0aDI3Mi44NTd2LTQ3LjE0M3ptLTI5MS4wOSAyOC45Njl2MzcuMTE4aDU4LjEzN3YxMTkuNjI4aDM2Ljg5NVYyNTEuODAxaDU4LjU4NHYtMzcuMTE4em0xODIuNjEuMjI0djE1Ni41MjJoMzYuODk0VjMxMy41OWg3My4zNDF2NTcuODM5aDM3LjExOFYyMTQuOTA3aC0zNy4xMTh2NjEuNzg4aC03My4zNDF2LTYxLjc4OHoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg%3D%3D&valueColor=000000&mode=light" alt="Made by Inth"></picture></a>
</p>

Cookie banner, preference center, and consent-gated scripts for sites without a build step: Webflow, WordPress, Framer, Squarespace, and plain HTML. Configure consent policies for GDPR and other privacy laws, then paste one script tag. Bundled apps can import the same runtime as an ES module.

c15t is used by [2,100+ sites](https://www.wappalyzer.com/technologies/cookie-compliance/c15t/), including expo.dev, zed.dev, unkey.dev, mintlify.com, and sazabi.com.

## Key Features

- One script tag from a CDN, configured with data attributes or calls queued on `window.c15t`
- Prebuilt banner and preference dialog in a shadow root, so your site's CSS does not change them
- Vendor scripts use `<script type="text/plain" data-c15t-category>` and iframes use `data-src` and `data-category`. They load when the resolved policy allows their categories
- Buttons with `data-c15t-action` and links to `#c15t-preferences` work without code
- A headless build with the same runtime and `window.c15t` API, for your own banner
- DevTools (`c15t.devtools.js`) and IAB GPP (`c15t.gpp.js`) load as a second tag. For IAB TCF 2.4, load `c15t.iab.js` instead of `c15t.js`
- ES module entry points for bundled apps, which can use the @c15t/integrations vendor loaders

## Prerequisites

- A page where you can add a `<script>` tag
- An [Inth project](https://inth.com) (free sign-up). For development and tests, local mode needs no backend

## Installation

Paste before `</head>`, with the backend URL from your Inth project:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@c15t/browser/dist/c15t.js"
  data-backend-url="YOUR_INTH_BACKEND_URL"
  defer
></script>
```

A URL without a version loads the newest release, so pin an exact version, such as `@c15t/browser@3.2.0`, in production. The default `c15t.js` requires a backend URL. Load `dist/c15t.local.js` for local mode or `dist/c15t.headless.js` for the runtime without any UI.

For bundled apps:

```bash
npm install @c15t/browser
```

## Usage

1. Add the tag and reload. The banner appears when the visitor's policy asks for one
2. Change vendor tags to `type="text/plain"` with `data-c15t-category="measurement"` so they load when the resolved policy allows that category
3. Link to `#c15t-preferences` so visitors can reopen the preference dialog
4. For every attribute and method, see the [HTML docs](https://c15t.com/docs/frameworks/html/attributes-and-api)

```js
window.c15t = window.c15t || [];
c15t.push(['on', 'consent', () => {
  if (c15t.has('measurement')) {
    startAnalytics();
  }
}]);
```

## Hosting

c15t needs a backend to serve policies and keep consent records. [Inth](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fbrowser) runs it for you, with policy storage, consent records, audit history, and a dashboard. Sign-up is free. Run `npx @inth/cli c15t` to sign in, create a project, and set up c15t in your app, or create a project by hand and copy its backend URL.

For development and tests, local mode keeps choices in the browser and keeps no consent records. Don't ship it to production. Its factory is `local()`. The old name, `offline()`, still works and goes away in v4.

## Documentation

See the [documentation](https://c15t.com/docs/frameworks/html/quickstart) for guides, API reference, and examples.

## Which Script to Load

| File | Use it for |
| --- | --- |
| `c15t.js` | Production, with Inth. Set `data-backend-url` to your project's backend URL |
| `c15t.local.js` | Local mode, for development and tests: choices stay in the browser, with local policy rules, and c15t keeps no server-side record of consent. Before 3.2.0 this file was `c15t.offline.js` |
| `c15t.headless.js` | The runtime without UI, for your own banner. Can inline or fetch the backend's cacheable `/manifest` |
| `c15t.iab.js` | IAB TCF 2.4. Configure `iab` with your registered CMP ID and vendor list. See the [IAB example](https://c15t.com/docs/frameworks/html/iab) |
| `c15t.devtools.js` | A DevTools panel, with a Location tab to try policies by region |
| `c15t.gpp.js` | IAB GPP (`__gpp`) for US state opt-outs. Also available as `mountGPP` from `@c15t/browser/gpp` |

## Docs for AI Agents

This package ships its documentation as Markdown, matched to the installed version. After you install it, point your coding agent at `node_modules/@c15t/browser/AGENTS.md`. It indexes every guide in `node_modules/@c15t/browser/docs/`.

On the web, every page of the [c15t docs](https://c15t.com/docs) has a Markdown version, and [llms.txt](https://c15t.com/docs/llms.txt) lists them all. Install the c15t agent skills with `npx skills add c15t/skills`.

## Support

- Join our [Discord community](https://c15t.link/discord)
- Open an issue on our [GitHub repository](https://github.com/c15t/c15t/issues)
- Visit [inth.com](https://inth.com) and use the chat widget
- Contact our support team via email [support@inth.com](mailto:support@inth.com)

## Contributing

- Read the [contribution guidelines](https://c15t.com/docs/oss/contributing) before you open a pull request
- Follow the [code of conduct](https://c15t.com/docs/oss/code-of-conduct)

## Security

Do not open a public issue for a security vulnerability. Report it privately through [GitHub's vulnerability reporting](https://github.com/c15t/c15t/security/advisories/new). We examine every valid report.

- Do not share the vulnerability in public forums, issues, or pull requests
- Give the steps to reproduce it and the versions it affects
- Give us time to release a fix before you disclose it

## License

[Apache License 2.0](https://github.com/c15t/c15t/blob/main/LICENSE.md)

---

**Built by [Inth](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fbrowser)**
