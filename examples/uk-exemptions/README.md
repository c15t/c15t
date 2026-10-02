# UK exemptions demo

An interactive demonstration backed by the workspace consent kernel. UK statistics use an explicit category exemption; advertising still requires consent. Integration activity is simulated, so the demo sends no analytics or advertising requests.

From the repository root:

```sh
bun turbo run build --filter=@c15t/core
bun examples/uk-exemptions/server.ts
```

Open http://localhost:5173. No dependency installation is needed to serve the demo.

1. Start with the UK visitor. Statistics run under the assumed exemption, while advertising stays blocked. The live panel shows that there is no statistics consent grant.
2. Allow advertising, then use Privacy settings to turn statistics off. Visit another article to see the simulated integrations evaluated independently.
3. Reload. The choices persist in this browser.
4. Select the EU or unknown-location visitor. Both purposes require consent. Each location has its own saved visitor choices.
5. Open About this demo and turn off the statistics exemption. Earlier exemption permission does not authorize consent-required statistics.

Only aggregate service-improvement statistics are assumed to qualify. The operator must review the actual processing, provide information and a free means of objection. The demo sends no analytics or advertising requests.

Run the model tests with the repository's Vitest installation:

```sh
bunx vitest run --config examples/uk-exemptions/vitest.config.ts
```
