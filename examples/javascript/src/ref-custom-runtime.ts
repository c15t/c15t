// Reference code for the transports page. No page in this example imports
// it; `bun run check-types` compiles it with the rest of the app.
// #region docs:transport-custom title="src/consent-runtime.ts"
import { createOfflineTransport, custom, policyRulePresets } from 'c15t';
import { createConsentRuntime } from 'c15t/runtime';

// Resolve the policy in the browser and record choices with your own API.
const local = createOfflineTransport({
	policyRules: [policyRulePresets.europeOptIn()],
});

export const runtime = createConsentRuntime({
	mode: custom({
		init: local.init,
		async save(payload) {
			const response = await fetch('/api/consent', {
				body: JSON.stringify({
					choice: payload.choice,
					consents: payload.consents,
					subjectId: payload.subjectId,
				}),
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			});
			return { ok: response.ok, subjectId: payload.subjectId };
		},
	}),
});
// #endregion docs:transport-custom
