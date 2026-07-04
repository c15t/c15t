<p align="center">
  <a href="https://c15t.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fiab" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../../docs/assets/c15t-banner-readme-dark.svg" type="image/svg+xml">
      <img src="../../docs/assets/c15t-banner-readme-light.svg" alt="c15t Banner" type="image/svg+xml">
    </picture>
  </a>
</p>

# @c15t/iab: IAB TCF 2.3 Addon

[![GitHub stars](https://img.shields.io/github/stars/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![CI](https://img.shields.io/github/actions/workflow/status/c15t/c15t/ci.yml?style=flat-square)](https://github.com/c15t/c15t/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](https://github.com/c15t/c15t/blob/main/LICENSE.md)
[![Discord](https://img.shields.io/discord/1312171102268690493?style=flat-square)](https://c15t.link/discord)
[![npm version](https://img.shields.io/npm/v/%40c15t%2Fiab?style=flat-square)](https://www.npmjs.com/package/@c15t/iab)
[![Top Language](https://img.shields.io/github/languages/top/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![Last Commit](https://img.shields.io/github/last-commit/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/commits/main)
[![Open Issues](https://img.shields.io/github/issues/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/issues)

IAB TCF 2.3 addon for c15t with TC String generation, GVL support, TCF APIs, and programmatic advertising consent workflows.

## Key Features

- IAB TCF 2.3 support for programmatic advertising consent
- TC String generation and storage
- Global Vendor List (GVL) support
- Purpose, special purpose, feature, special feature, and vendor controls
- Headless APIs for custom IAB consent experiences
- React UI integration through @c15t/react/iab

## Prerequisites

- Node.js 18.17.0 or later
- c15t 2.x
- Use [Inth](https://inth.com) for a hosted IAB TCF-certified CMP setup with a managed CMP ID, or register your own CMP with IAB Europe and configure your own CMP ID

## Manual Installation

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
4. For full implementation details, see the [IAB TCF 2.3 docs](https://c15t.com/docs/frameworks/react/iab/overview)

## Documentation

For further information, guides, and examples visit the [reference documentation](https://c15t.com/docs/frameworks/react/iab/overview).

## Related Packages

- [@c15t/react](https://www.npmjs.com/package/@c15t/react): React IAB consent banner, dialog, and hooks through @c15t/react/iab
- [@c15t/backend](https://www.npmjs.com/package/@c15t/backend): Backend configuration for IAB TCF, GVL, CMP registration, and custom vendors
- [c15t](https://www.npmjs.com/package/c15t): Core consent engine

## Support

- Join our [Discord community](https://c15t.link/discord)
- Open an issue on our [GitHub repository](https://github.com/c15t/c15t/issues)
- Visit [inth.com](https://inth.com) and use the chat widget
- Contact our support team via email [support@inth.com](mailto:support@inth.com)

## Contributing

- We're open to all community contributions.
- Read our [Contribution Guidelines](https://c15t.com/docs/oss/contributing)
- Review our [Code of Conduct](https://c15t.com/docs/oss/code-of-conduct)
- Fork the repository
- Create a new branch for your feature
- Submit a pull request
- **All contributions, big or small, are welcome and appreciated.**

## Security

If you believe you have found a security vulnerability in c15t, we encourage you to **_responsibly disclose this and NOT open a public issue_**. We will investigate all legitimate reports.

Our preference is that you make use of GitHub's private vulnerability reporting feature to disclose potential security vulnerabilities in our open-source software. To do this, please visit [https://github.com/c15t/c15t/security](https://github.com/c15t/c15t/security) and click the "Report a vulnerability" button.

### Security Policy

- Please do not share security vulnerabilities in public forums, issues, or pull requests
- Provide detailed information about the potential vulnerability
- Allow reasonable time for us to address the issue before any public disclosure
- We are committed to addressing security concerns promptly and transparently

## License

[Apache License 2.0](https://github.com/c15t/c15t/blob/main/LICENSE.md)

---

**Built by [Inth](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fiab)**
