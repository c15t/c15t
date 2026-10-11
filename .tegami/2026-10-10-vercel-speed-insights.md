---
packages:
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Add a Vercel Speed Insights integration

`vercelSpeedInsights()` from `@c15t/integrations/vercel-speed-insights` loads
Vercel's Web Vitals collector once measurement is allowed. The collector keeps
running after its script is removed, so on revocation the helper also drops
every report through Speed Insights' `beforeSend` hook. Pass your own
`beforeSend` to edit reports while measurement is allowed. Remove
`<SpeedInsights />` or `injectSpeedInsights()` from `@vercel/speed-insights`
when you switch. The CLI offers Vercel Speed Insights in its integration picker.
