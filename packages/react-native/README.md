<p align="center">
  <a href="https://c15t.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Freact-native" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../../docs/assets/c15t-banner-readme-dark.svg" type="image/svg+xml">
      <img src="../../docs/assets/c15t-banner-readme-light.svg" alt="c15t Banner" type="image/svg+xml">
    </picture>
  </a>
</p>

# @c15t/react-native: React Native Consent Management

<p>
<a href="https://www.npmjs.com/package/@c15t/react-native"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/npm/%40c15t%2Freact-native.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/npm/%40c15t%2Freact-native.svg?variant=outline&mode=light" alt="Latest NPM Version"></picture></a>
<a href="https://github.com/c15t/c15t"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/github/c15t/c15t/stars.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/github/c15t/c15t/stars.svg?variant=outline&mode=light" alt="Stars"></picture></a>
<a href="https://github.com/c15t/c15t/blob/main/LICENSE.md"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/github/c15t/c15t/license.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/github/c15t/c15t/license.svg?variant=outline&mode=light" alt="License"></picture></a>
<a href="https://c15t.link/discord"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/discord/1312171102268690493.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/discord/1312171102268690493.svg?variant=outline&mode=light" alt="Discord"></picture></a>
<a href="https://skills.sh/c15t/skills/c15t"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/skills/c15t/skills/c15t.svg?variant=outline&mode=dark"><img src="https://shieldcn.dev/skills/c15t/skills/c15t.svg?variant=outline&mode=light" alt="Skills"></picture></a>
<a href="https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Freact-native"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/Made%20By-Inth-ffc803.svg?color=ffc803&labelTextColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAzOTMgNDAwIj48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTgyLjY2MiAwdjM2Ljg5NWgtNTkuMDMxdjgyLjczM2g1OS4wMzF2MzYuODkzSDI3LjQ4MnYtMzYuODkzaDU5LjAzVjM2Ljg5NWgtNTkuMDNWMHpNMzIxLjk0MSA4OS44NVYwaDM1LjM1NXYxNTYuNTIxaC0yNS43MTNsLTg2LjEzNy05MC4zNjR2OTAuMzY0aC0zNS4zNTVWMGgyNi4zNTV6Ii8%2BPHBhdGggZmlsbD0iIzAwMCIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMzE4LjU3MSAxODUuNzE0aDc0LjI4NlY0MDBIMFYxODUuNzE0aDI3Mi44NTd2LTQ3LjE0M3ptLTI5MS4wOSAyOC45Njl2MzcuMTE4aDU4LjEzN3YxMTkuNjI4aDM2Ljg5NVYyNTEuODAxaDU4LjU4NHYtMzcuMTE4em0xODIuNjEuMjI0djE1Ni41MjJoMzYuODk0VjMxMy41OWg3My4zNDF2NTcuODM5aDM3LjExOFYyMTQuOTA3aC0zNy4xMTh2NjEuNzg4aC03My4zNDF2LTYxLjc4OHoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg%3D%3D&valueColor=000000&mode=dark"><img src="https://shieldcn.dev/badge/Made%20By-Inth-ffc803.svg?color=ffc803&labelTextColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAzOTMgNDAwIj48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTgyLjY2MiAwdjM2Ljg5NWgtNTkuMDMxdjgyLjczM2g1OS4wMzF2MzYuODkzSDI3LjQ4MnYtMzYuODkzaDU5LjAzVjM2Ljg5NWgtNTkuMDNWMHpNMzIxLjk0MSA4OS44NVYwaDM1LjM1NXYxNTYuNTIxaC0yNS43MTNsLTg2LjEzNy05MC4zNjR2OTAuMzY0aC0zNS4zNTVWMGgyNi4zNTV6Ii8%2BPHBhdGggZmlsbD0iIzAwMCIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMzE4LjU3MSAxODUuNzE0aDc0LjI4NlY0MDBIMFYxODUuNzE0aDI3Mi44NTd2LTQ3LjE0M3ptLTI5MS4wOSAyOC45Njl2MzcuMTE4aDU4LjEzN3YxMTkuNjI4aDM2Ljg5NVYyNTEuODAxaDU4LjU4NHYtMzcuMTE4em0xODIuNjEuMjI0djE1Ni41MjJoMzYuODk0VjMxMy41OWg3My4zNDF2NTcuODM5aDM3LjExOFYyMTQuOTA3aC0zNy4xMTh2NjEuNzg4aC03My4zNDF2LTYxLjc4OHoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg%3D%3D&valueColor=000000&mode=light" alt="Made by Inth"></picture></a>
</p>

Consent management for iOS and Android apps. The consent engine runs natively, so consent state survives cold starts, works offline, and is readable from native ad SDKs, while the React Native layer renders banners and preference centers from the same snapshot.

## Key Features

- Native consent kernel on iOS (Swift) and Android (Kotlin), with no second kernel in JavaScript
- Same policy resolution, save payloads, and storage envelope as the c15t web SDK, pinned by shared protocol fixtures
- New Architecture TurboModule with Codegen types, no legacy bridge
- Synchronous consent reads for ad SDK gates, with no network or disk access on the main thread
- Offline consent queue: every action is persisted before the request and replayed on launch, foreground, or reconnect
- Global Privacy Control honored as a denial, never invented as a grant
- Geographic, region, and language overrides for policy preview and QA

## Prerequisites

- React Native 0.81 or newer with the New Architecture enabled
- React 19.1 or newer to render the built-in components
- iOS 16.4 or newer, Android `minSdk` 24 and `compileSdk` 36
- A custom native build: Expo Go cannot load this package's native module, so use a development build
- A c15t project endpoint, or a self-hosted `@c15t/backend` URL

## Manual Installation

```bash
pnpm add @c15t/react-native
```

## Documentation

For further information, guides, and examples visit the [reference documentation](https://c15t.com/docs/frameworks/react-native/quickstart).

## How it works

The native cores own consent state. `bootstrap(config)` runs once from a launch hook, hydrates the stored snapshot from the Keychain or encrypted storage, and answers `snapshot()` synchronously from memory, so a cold start with no connectivity still knows what the user decided.

The React Native layer never recomputes consent. It reads the snapshot, renders the surface the policy asks for, and forwards the user's decision as a commit intent. The native core records the receipts, updates the effective permissions, and queues the backend write.

## Gating a feature

Consent checks are synchronous reads of the effective permission map, which is what makes them safe to call from an ad SDK initializer.

```ts
if (isAllowed('measurement')) {
  enableAnalytics();
}
```

While the policy is still resolving, or before the stored snapshot has hydrated, every optional category reads `false`. Nothing has to opt in to that behavior.

## Gating a tracking feature

Tracking needs two yeses. `useIsTrackingAllowed(category)` is true only when c15t consent is granted for that category and the platform puts no bar in front of it, which on iOS means App Tracking Transparency is authorized. A platform authorization is not consent: nothing an operating system reports turns a `denied` or `pending` category on. Read the platform half on its own with `useTrackingAuthorization()`, and ask for it with `requestTrackingAuthorization()` on the actions object, which is a prompt you own the timing of rather than something the SDK decides to show.

## Running the tests

Three commands, run from this package directory:

```bash
bun run test src/hooks   # one subset, coverage off: nothing but real failures
bun run test:watch       # rerun on change
bun run test:coverage    # whole package, coverage floors enforced
```

`test` runs whatever you name with coverage switched off, from a single file to the whole package. The floors are package-wide, so a subset can never reach them, and a threshold report over four files describes the filter rather than the code.

CI runs `test` with no filter. That collects coverage and fails below the floors in `vitest.config.ts`, so the ratchet holds there. `test:coverage` is the same gate run on purpose: it always collects coverage, and it prints one line per file below the floor instead of a row for every file. Raise the floors as coverage improves; never lower them.

Type checks and lint stay separate: `bun turbo run test check-types lint --filter=@c15t/react-native`.

## Guides

Every guide lives in the [React Native docs](https://c15t.com/docs/frameworks/react-native/quickstart):

- [Quickstart](https://c15t.com/docs/frameworks/react-native/quickstart): install, configure the native bootstrap keys, and render the first banner on bare React Native or Expo
- [Usage](https://c15t.com/docs/frameworks/react-native/usage): the provider, the hooks, the built-in banner, dialog and preference center, and the headless path
- [Configuration](https://c15t.com/docs/frameworks/react-native/configuration): iOS and Android bootstrap keys, transport modes, overrides, and the privacy signal shape
- [Native behaviour](https://c15t.com/docs/frameworks/react-native/native-behaviour): startup order, hydration, fail-closed storage, and gating a native analytics SDK
- [Platform support](https://c15t.com/docs/frameworks/react-native/platform-support): version floors, the protocol handshake, and what is not supported
- [Troubleshooting](https://c15t.com/docs/frameworks/react-native/troubleshooting): not-bootstrapped reads, protocol mismatches, retired keys, and native build problems

## Expo

Add one plugin entry to `app.json` and the native bootstrap keys, the Android launch hook and permission, and the iOS privacy declarations are all written for you:

```json
{
  "plugins": [
    [
      "@c15t/react-native/expo-plugin",
      { "backendURL": "https://consent.example.com" }
    ]
  ]
}
```

Expo Go cannot run this package: it ships a custom native module, and Expo Go contains only the modules the Expo team compiled. Build a development build with `npx expo prebuild` and `npx expo run:ios` or `npx expo run:android`. Set `runtimeVersion` whenever `updates.url` is set, because an over-the-air bundle cannot outrun the embedded native protocol.

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

**Built by [Inth](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Freact-native)**
