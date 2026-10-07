---
title: Replace Google Tag Manager
description: Read a Google Tag Manager container and print the c15t integration
  scripts that replace it. The command does not edit the project.
group: cli
---

## Read a container

```bash
npx @c15t/cli@alpha gtm GTM-XXXXXXX
npx @c15t/cli@alpha gtm ./container.json
```

A bare `GTM-` id downloads the published container from
`https://www.googletagmanager.com/gtm.js?id=`. The command does not fetch any
other URL. Anything else is a file path, resolved from the current directory.
A file whose name is only the container id is still downloaded. Pass
`./GTM-XXXXXXX` to read that file.

Tags that were never published are not in `gtm.js`, and the published script
has no tag names. In GTM, use Admin, then Export Container, and pass the JSON
file when you want each warning tied to a tag name.

## Register the scripts

The command prints a module and does not write it. Copy the calls into the
scripts array your framework quickstart already passes to c15t. The
[framework quickstarts](https://c15t.com/docs/frameworks) show where that array is registered.
Then remove the Google Tag Manager snippet, its `<noscript>` iframe, and any
plugin that loads the same container.

```ts
import { gtag } from '@c15t/integrations/google-tag';
import { hotjar } from '@c15t/integrations/hotjar';

export const scripts = [
	hotjar({ siteId: 1234567 }),
	gtag({ id: 'G-XXXXXXX', category: 'measurement' }),
];
```

`gtag()` loads immediately and sends Consent Mode defaults. It does not send
the GA4 events the container used to fire. Those event names are listed so
you can send them from the app. Hotjar and the other helpers wait until
their category is allowed.

An id that is not a `G-`, `AW-`, `DC-` or `GT-` id is still printed. The
command warns, and you replace the id before shipping the call.

To keep loading the container instead, see
[Google Tag Manager](https://c15t.com/docs/integrations/google-tag-manager).

## Tags it does not convert

Paused tags, click and scroll listeners, and Conversion Linker are left out.
Conversion Linker is part of the Google tag.

Custom HTML is converted when it contains a vendor snippet c15t already
ships, such as Meta Pixel or PostHog. Anything else is listed under
`Not converted`, including another GTM container. Run `c15t gtm` on that
container id too.

Universal Analytics is shut down. Floodlight has no separate helper. Load it
with `gtag()` and a `DC-` id.

## Read the JSON result

```bash
npx @c15t/cli@alpha gtm GTM-XXXXXXX --json --no-telemetry
```

`data.snippet` is the module above. `data.warnings` includes ids that do not
match the usual shape. `data.unmapped` lists tags left alone. `data.events`
lists GA4 event names `gtag()` will not send. See
[agents and automation](../automation.md).
