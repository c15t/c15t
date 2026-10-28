<p align="center">
  <a href="https://c15t.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fintegrations" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../../docs/assets/c15t-banner-readme-dark.png">
      <img src="../../docs/assets/c15t-banner-readme-light.png" alt="c15t: the open standard for cookie banners">
    </picture>
  </a>
</p>

# @c15t/integrations: Cookie consent integrations for analytics, ads and widgets

<p>
<a href="https://www.npmjs.com/package/@c15t/integrations"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/npm/%40c15t%2Fintegrations.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/npm/%40c15t%2Fintegrations.svg?variant=outline&mode=light" alt="Latest NPM Version"></picture></a>
<a href="https://github.com/c15t/c15t"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/github/c15t/c15t/stars.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/github/c15t/c15t/stars.svg?variant=outline&mode=light" alt="Stars"></picture></a>
<a href="https://github.com/c15t/c15t/blob/main/LICENSE.md"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/github/c15t/c15t/license.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/github/c15t/c15t/license.svg?variant=outline&mode=light" alt="License"></picture></a>
<a href="https://c15t.link/discord"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/discord/1312171102268690493.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/discord/1312171102268690493.svg?variant=outline&mode=light" alt="Discord"></picture></a>
<a href="https://skills.sh/c15t/skills/c15t"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/skills/c15t/skills/c15t.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/skills/c15t/skills/c15t.svg?variant=outline&mode=light" alt="Skills"></picture></a>
<a href="https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fintegrations"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/Made%20By-Inth-ffc803.svg?color=ffc803&labelTextColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAzOTMgNDAwIj48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTgyLjY2MiAwdjM2Ljg5NWgtNTkuMDMxdjgyLjczM2g1OS4wMzF2MzYuODkzSDI3LjQ4MnYtMzYuODkzaDU5LjAzVjM2Ljg5NWgtNTkuMDNWMHpNMzIxLjk0MSA4OS44NVYwaDM1LjM1NXYxNTYuNTIxaC0yNS43MTNsLTg2LjEzNy05MC4zNjR2OTAuMzY0aC0zNS4zNTVWMGgyNi4zNTV6Ii8%2BPHBhdGggZmlsbD0iIzAwMCIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMzE4LjU3MSAxODUuNzE0aDc0LjI4NlY0MDBIMFYxODUuNzE0aDI3Mi44NTd2LTQ3LjE0M3ptLTI5MS4wOSAyOC45Njl2MzcuMTE4aDU4LjEzN3YxMTkuNjI4aDM2Ljg5NVYyNTEuODAxaDU4LjU4NHYtMzcuMTE4em0xODIuNjEuMjI0djE1Ni41MjJoMzYuODk0VjMxMy41OWg3My4zNDF2NTcuODM5aDM3LjExOFYyMTQuOTA3aC0zNy4xMTh2NjEuNzg4aC03My4zNDF2LTYxLjc4OHoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg%3D%3D&valueColor=000000&mode=dark"><img src="https://shieldcn.dev/badge/Made%20By-Inth-ffc803.svg?color=ffc803&labelTextColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAzOTMgNDAwIj48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTgyLjY2MiAwdjM2Ljg5NWgtNTkuMDMxdjgyLjczM2g1OS4wMzF2MzYuODkzSDI3LjQ4MnYtMzYuODkzaDU5LjAzVjM2Ljg5NWgtNTkuMDNWMHpNMzIxLjk0MSA4OS44NVYwaDM1LjM1NXYxNTYuNTIxaC0yNS43MTNsLTg2LjEzNy05MC4zNjR2OTAuMzY0aC0zNS4zNTVWMGgyNi4zNTV6Ii8%2BPHBhdGggZmlsbD0iIzAwMCIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMzE4LjU3MSAxODUuNzE0aDc0LjI4NlY0MDBIMFYxODUuNzE0aDI3Mi44NTd2LTQ3LjE0M3ptLTI5MS4wOSAyOC45Njl2MzcuMTE4aDU4LjEzN3YxMTkuNjI4aDM2Ljg5NVYyNTEuODAxaDU4LjU4NHYtMzcuMTE4em0xODIuNjEuMjI0djE1Ni41MjJoMzYuODk0VjMxMy41OWg3My4zNDF2NTcuODM5aDM3LjExOFYyMTQuOTA3aC0zNy4xMTh2NjEuNzg4aC03My4zNDF2LTYxLjc4OHoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg%3D%3D&valueColor=000000&mode=light" alt="Made by Inth"></picture></a>
</p>

Cookie consent integrations for Google Tag Manager, GA4, Google Ads, Meta Pixel, Wisepops popups, Attentive email and SMS marketing, Customer.io, analytics tools, pixels, tag managers, and widgets. Control when scripts load and send visitors' choices through Google Consent Mode v2 and other vendor consent APIs.

c15t is used by [2,100+ sites](https://www.wappalyzer.com/technologies/cookie-compliance/c15t/), including expo.dev, zed.dev, unkey.dev, mintlify.com, and sazabi.com.

## Key Features

- Most loaders run when the visitor's consent policy allows their category. A few, such as Google Tag Manager, load immediately and pass permission updates to the vendor's consent API
- Prebuilt script loaders for popular analytics, advertising, marketing, and functional tools
- Google Tag Manager support with Google Consent Mode v2 defaults and consent updates
- Google Analytics 4 and Google Ads support through gtag.js
- Consent-gated Meta Pixel and conversion pixel loading
- Supported vendors include Google Tag Manager, Meta Pixel, OpenAI Pixel, Amplitude, FullStory, Heap, PostHog, TikTok Pixel, LinkedIn Insights, Microsoft UET, X Pixel, Reddit Pixel, Snapchat Pixel, Ada, Intercom, Crisp, ActiveCampaign, Gorgias Chat, Zendesk Messaging, Attentive, Customer.io, Insider, Klaviyo, Appcues, Wisepops, and more

## Documentation

See the [documentation](https://c15t.com/docs/integrations) for guides, API reference, and examples.

## Integrations

Find integrations by what each tool does. The [overview](https://c15t.com/docs/integrations/overview) lists each helper, its consent category, and its loading behavior.

### [Web analytics](https://c15t.com/docs/integrations/overview#web-analytics)

- **Google Analytics 4 + Google Ads (gtag.js)**: Consent Mode v2 defaults and consent updates when users make a choice ([guide](https://c15t.com/docs/integrations/google-tag))
- Plausible, Fathom, Umami, Vercel Analytics, Cloudflare Web Analytics, Matomo, Adobe Analytics, Ahrefs Analytics, Databuddy, Pirsch, Rybbit, OneDollarStats, Promptwatch, and Statable

### [Product analytics](https://c15t.com/docs/integrations/overview#product-analytics)

- **PostHog**: Loads before or after measurement consent, with switches that stop PostHog downloading its surveys, heatmaps, dead clicks and web vitals modules or requesting `/flags` ([guide](https://c15t.com/docs/integrations/posthog))
- Amplitude, Heap, Mixpanel, and Gainsight PX
- **Pendo**: Loads after measurement consent; stops and resumes event sending when consent changes ([guide](https://c15t.com/docs/integrations/pendo))

### [Replay and monitoring](https://c15t.com/docs/integrations/overview#replay-and-monitoring)

- FullStory, Microsoft Clarity, Hotjar, LogRocket, Lucky Orange, and Vercel Speed Insights
- **Sentry**: Loads Sentry from its CDN or works with your own SDK; Session Replay and user data wait for measurement, and error monitoring can too ([guide](https://c15t.com/docs/integrations/sentry))

### [Experimentation and personalization](https://c15t.com/docs/integrations/overview#experimentation-and-personalization)

- Adobe Target, Appcues, Dynamic Yield, Optimizely Web Experimentation, and Wisepops. Wisepops waits for marketing consent by default; the others wait for experience consent

### [Ads and growth](https://c15t.com/docs/integrations/overview#ads-and-growth)

- **Conversion pixels**: Meta Pixel, OpenAI Pixel, Pinterest Tag, TikTok Pixel, LinkedIn Insights, Microsoft UET (Microsoft Ads), X Pixel, Reddit Pixel, Snapchat Pixel
- **Email and SMS**: ActiveCampaign site tracking, loaded after marketing consent ([guide](https://c15t.com/docs/integrations/activecampaign)); Attentive loads after marketing consent and requires a page reload on withdrawal; Customer.io loads after marketing consent by default ([guide](https://c15t.com/docs/integrations/customer-io)). Insider, loaded after marketing consent; Klaviyo loads only once marketing and measurement are both allowed; Marketo Munchkin and Salesforce Account Engagement load after marketing consent ([guide](https://c15t.com/docs/integrations/overview#ads-and-growth))
- **Clearbit**: Loads after marketing consent ([guide](https://c15t.com/docs/integrations/clearbit))
- **Oracle Eloqua**: Loads after marketing consent by default ([guide](https://c15t.com/docs/integrations/oracle-eloqua))
- **HubSpot**: Loads after marketing consent ([guide](https://c15t.com/docs/integrations/hubspot))
- **Default**: Pixel after measurement consent or standalone Forms SDK after functionality consent, with configurable categories and an opt-in always mode for the Pixel ([guide](https://c15t.com/docs/integrations/default-com))
- **The Trade Desk**: Loads after marketing consent ([guide](https://c15t.com/docs/integrations/the-trade-desk))
- **LiveIntent**: Loads after marketing consent ([guide](https://c15t.com/docs/integrations/liveintent))
- **AdRoll**: Loads after marketing consent ([guide](https://c15t.com/docs/integrations/adroll))
- **Vector**: Loads after marketing consent ([guide](https://c15t.com/docs/integrations/vector))
- **RB2B**: Loads after marketing consent ([guide](https://c15t.com/docs/integrations/rb2b))
- **Amazon Ads**: Loads after marketing consent ([guide](https://c15t.com/docs/integrations/amazon-ads))
- **Clay**: Loads after marketing consent ([guide](https://c15t.com/docs/integrations/clay))

### [Data and tags](https://c15t.com/docs/integrations/overview#data-and-tags)

- **Google Tag Manager**: Sends current permissions through Google Consent Mode v2; configure consent checks for non-Google tags ([guide](https://c15t.com/docs/integrations/google-tag-manager))
- **Cloudflare Zaraz**: Maps c15t effective permissions to Zaraz purpose IDs for tools managed in Cloudflare ([guide](https://c15t.com/docs/integrations/cloudflare-zaraz))
- Segment, RudderStack, and Hightouch
- **Shopify**: Sends c15t consent to Shopify's Customer Privacy API from a Hydrogen storefront ([guide](https://c15t.com/docs/integrations/shopify))

### [Chat and embeds](https://c15t.com/docs/integrations/overview#chat-and-embeds)

- Ada, Intercom, Crisp, Front Chat, Gorgias Chat, and Zendesk Messaging
- [YouTube](https://c15t.com/docs/integrations/youtube) and [Google Maps](https://c15t.com/docs/integrations/google-maps) use consent-gated iframes and do not require this package

## Example

```ts
import { googleTagManager } from '@c15t/integrations/google-tag-manager'
import { metaPixel } from '@c15t/integrations/meta-pixel'

const scripts = [
  googleTagManager({ id: 'GTM-XXXXXX' }),
  metaPixel({ pixelId: '000000000000000' }),
]
```

## Docs for AI Agents

This package ships its documentation as Markdown, matched to the installed version. After you install it, point your coding agent at `node_modules/@c15t/integrations/AGENTS.md`. It indexes every guide in `node_modules/@c15t/integrations/docs/`.

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

**Built by [Inth](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fintegrations)**
