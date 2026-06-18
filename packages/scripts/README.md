<p align="center">
  <a href="https://c15t.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fscripts" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../../docs/assets/c15t-banner-readme-dark.svg" type="image/svg+xml">
      <img src="../../docs/assets/c15t-banner-readme-light.svg" alt="c15t Banner" type="image/svg+xml">
    </picture>
  </a>
</p>

# @c15t/scripts: Prebuilt Consent Scripts

[![GitHub stars](https://img.shields.io/github/stars/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![CI](https://img.shields.io/github/actions/workflow/status/c15t/c15t/ci.yml?style=flat-square)](https://github.com/c15t/c15t/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](https://github.com/c15t/c15t/blob/main/LICENSE.md)
[![Discord](https://img.shields.io/discord/1312171102268690493?style=flat-square)](https://c15t.link/discord)
[![npm version](https://img.shields.io/npm/v/%40c15t%2Fscripts?style=flat-square)](https://www.npmjs.com/package/@c15t/scripts)
[![Top Language](https://img.shields.io/github/languages/top/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![Last Commit](https://img.shields.io/github/last-commit/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/commits/main)
[![Open Issues](https://img.shields.io/github/issues/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/issues)

Consent-aware script integrations for Google Tag Manager, Google Consent Mode v2, GA4, Google Ads, Meta Pixel, analytics tools, pixels, tag managers, and widgets.

## Key Features

- Prebuilt script loaders for popular analytics, advertising, marketing, and functional tools
- Google Tag Manager support with Google Consent Mode v2 defaults and consent updates
- Google Analytics 4 and Google Ads support through gtag.js
- Consent-gated Meta Pixel and conversion pixel loading
- Easy integration with c15t's script loader
- Configuration options for each supported vendor
- Supported vendors include Google Tag Manager, Meta Pixel, PostHog, TikTok Pixel, LinkedIn Insights, Microsoft UET, X Pixel, Reddit Pixel, Snapchat Pixel, Intercom, Crisp, and more

## Documentation

For further information, guides, and examples visit the [reference documentation](https://c15t.com/docs/integrations).

## Integrations

- **Google Tag Manager**: Loads with Google Consent Mode v2 defaults set to denied; GTM-managed tags fire only once matching consent is granted ([guide](https://c15t.com/docs/integrations/google-tag-manager))
- **Google Analytics 4 + Google Ads (gtag.js)**: Consent Mode v2 defaults and consent updates when users make a choice ([guide](https://c15t.com/docs/integrations/google-tag))
- **Conversion pixels**: Meta Pixel, TikTok Pixel, LinkedIn Insights, Microsoft UET (Bing Ads), X Pixel, Reddit Pixel, Snapchat Pixel
- **Analytics**: PostHog, Segment, Mixpanel, Microsoft Clarity, Hotjar, Plausible, Fathom, Matomo, Umami, Vercel Analytics
- **Chat widgets**: Intercom, Crisp

## Example

```ts
import { googleTagManager } from '@c15t/scripts/google-tag-manager'
import { metaPixel } from '@c15t/scripts/meta-pixel'

const scripts = [
  googleTagManager({ id: 'GTM-XXXXXX' }),
  metaPixel({ pixelId: '000000000000000' }),
]
```

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

**Built by [Inth](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fscripts)**
