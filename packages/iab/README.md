<p align="center">
  <a href="https://c15t.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fiab" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../../docs/assets/c15t-banner-readme-dark.svg" type="image/svg+xml">
      <img src="../../docs/assets/c15t-banner-readme-light.svg" alt="c15t Banner" type="image/svg+xml">
    </picture>
  </a>
</p>

# @c15t/iab: IAB TCF 2.4 and GPP Addon

<p>
<a href="https://www.npmjs.com/package/@c15t/iab"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/npm/%40c15t%2Fiab.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/npm/%40c15t%2Fiab.svg?variant=outline&mode=light" alt="Latest NPM Version"></picture></a>
<a href="https://github.com/c15t/c15t"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/github/c15t/c15t/stars.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/github/c15t/c15t/stars.svg?variant=outline&mode=light" alt="Stars"></picture></a>
<a href="https://github.com/c15t/c15t/blob/main/LICENSE.md"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/github/c15t/c15t/license.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/github/c15t/c15t/license.svg?variant=outline&mode=light" alt="License"></picture></a>
<a href="https://c15t.link/discord"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/discord/1312171102268690493.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/discord/1312171102268690493.svg?variant=outline&mode=light" alt="Discord"></picture></a>
<a href="https://skills.sh/c15t/skills/c15t"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/skills/c15t/skills/c15t.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/skills/c15t/skills/c15t.svg?variant=outline&mode=light" alt="Skills"></picture></a>
<a href="https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fiab"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/Made%20By-Inth-ffc803.svg?color=ffc803&labelTextColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAzOTMgNDAwIj48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTgyLjY2MiAwdjM2Ljg5NWgtNTkuMDMxdjgyLjczM2g1OS4wMzF2MzYuODkzSDI3LjQ4MnYtMzYuODkzaDU5LjAzVjM2Ljg5NWgtNTkuMDNWMHpNMzIxLjk0MSA4OS44NVYwaDM1LjM1NXYxNTYuNTIxaC0yNS43MTNsLTg2LjEzNy05MC4zNjR2OTAuMzY0aC0zNS4zNTVWMGgyNi4zNTV6Ii8%2BPHBhdGggZmlsbD0iIzAwMCIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMzE4LjU3MSAxODUuNzE0aDc0LjI4NlY0MDBIMFYxODUuNzE0aDI3Mi44NTd2LTQ3LjE0M3ptLTI5MS4wOSAyOC45Njl2MzcuMTE4aDU4LjEzN3YxMTkuNjI4aDM2Ljg5NVYyNTEuODAxaDU4LjU4NHYtMzcuMTE4em0xODIuNjEuMjI0djE1Ni41MjJoMzYuODk0VjMxMy41OWg3My4zNDF2NTcuODM5aDM3LjExOFYyMTQuOTA3aC0zNy4xMTh2NjEuNzg4aC03My4zNDF2LTYxLjc4OHoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg%3D%3D&valueColor=000000&mode=dark"><img src="https://shieldcn.dev/badge/Made%20By-Inth-ffc803.svg?color=ffc803&labelTextColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAzOTMgNDAwIj48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTgyLjY2MiAwdjM2Ljg5NWgtNTkuMDMxdjgyLjczM2g1OS4wMzF2MzYuODkzSDI3LjQ4MnYtMzYuODkzaDU5LjAzVjM2Ljg5NWgtNTkuMDNWMHpNMzIxLjk0MSA4OS44NVYwaDM1LjM1NXYxNTYuNTIxaC0yNS43MTNsLTg2LjEzNy05MC4zNjR2OTAuMzY0aC0zNS4zNTVWMGgyNi4zNTV6Ii8%2BPHBhdGggZmlsbD0iIzAwMCIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMzE4LjU3MSAxODUuNzE0aDc0LjI4NlY0MDBIMFYxODUuNzE0aDI3Mi44NTd2LTQ3LjE0M3ptLTI5MS4wOSAyOC45Njl2MzcuMTE4aDU4LjEzN3YxMTkuNjI4aDM2Ljg5NVYyNTEuODAxaDU4LjU4NHYtMzcuMTE4em0xODIuNjEuMjI0djE1Ni41MjJoMzYuODk0VjMxMy41OWg3My4zNDF2NTcuODM5aDM3LjExOFYyMTQuOTA3aC0zNy4xMTh2NjEuNzg4aC03My4zNDF2LTYxLjc4OHoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg%3D%3D&valueColor=000000&mode=light" alt="Made by Inth"></picture></a>
</p>

IAB TCF 2.4 and Global Privacy Platform (GPP) addon for c15t with TC String and GPP string generation, GVL support, TCF and GPP APIs, and programmatic advertising consent workflows.

c15t is used by [2,100+ sites](https://www.wappalyzer.com/technologies/cookie-compliance/c15t/), including expo.dev, zed.dev, unkey.dev, mintlify.com, and sazabi.com.

## Key Features

- IAB TCF 2.4 support for programmatic advertising consent
- TC String generation and storage
- IAB GPP 1.1 API (`__gpp`) with US state, MSPA US National and TCF EU sections through `@c15t/iab/gpp`
- Global Vendor List (GVL) support
- Purpose, special purpose, feature, special feature, and vendor controls
- Headless APIs for custom IAB consent experiences
- React UI integration through @c15t/react/iab

## Prerequisites

- Node.js 20.19 or later
- c15t 3.x
- Use [Inth](https://inth.com) for a hosted IAB TCF-certified CMP setup with a managed CMP ID, or register your own CMP with IAB Europe and configure your own CMP ID

## Installation

```bash
pnpm add @c15t/iab
```

For React UI components, use the @c15t/react IAB subpath and stylesheet:

```tsx
import { IABConsentBanner, IABConsentDialog } from '@c15t/react/iab'
```

```css
@import "@c15t/react/iab/styles.css";
```

## Usage

1. Configure c15t with the IAB consent model for jurisdictions that require TCF workflows
2. Use the React IAB components for a prebuilt TCF banner and preference center
3. Use headless APIs when you need a custom IAB consent experience
4. Use `createGPP` from `@c15t/iab/gpp` to signal US state opt-outs and GPC to ad tech; see the [IAB GPP docs](https://c15t.com/docs/frameworks/javascript/gpp)
5. For full implementation details, see the [IAB TCF 2.4 docs](https://c15t.com/docs/frameworks/react/iab)

## Documentation

See the [documentation](https://c15t.com/docs/frameworks/react/iab) for guides, API reference, and examples.

## Related Packages

- [@c15t/react](https://www.npmjs.com/package/@c15t/react): React IAB consent banner, dialog, and hooks through @c15t/react/iab
- [@c15t/backend](https://www.npmjs.com/package/@c15t/backend): Backend configuration for IAB TCF, GVL, CMP registration, and custom vendors
- [c15t](https://www.npmjs.com/package/c15t): the consent engine and every framework adapter in one install

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

**Built by [Inth](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fiab)**
