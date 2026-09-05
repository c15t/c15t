import { createConsentKernel } from '@c15t/core';
import type { InitResponse, KernelTransport } from '@c15t/core';
import { policyRulePresets, resolvePolicyRules } from '@c15t/schema/types';

const requireCondition = (condition: unknown, message: string): void => {
	if (!condition) {
		throw new Error(message);
	}
};

/** Genuine choice and receipt work, separate from the frozen empty-kernel arm. */
export const createPolicyOperations = (response: InitResponse) => {
	const transport: KernelTransport = {
		init: () => Promise.resolve(response),
		save: () => Promise.resolve({ ok: true }),
	};
	const ready = async () => {
		const kernel = createConsentKernel({ transport });
		const result = await kernel.commands.init();
		if (!result.ok || kernel.getSnapshot().resolution.status !== 'matched') {
			kernel.dispose();
			throw new Error('Policy fixture did not match or init failed');
		}
		return kernel;
	};
	return {
		async realPolicyAcceptUs() {
			const kernel = await ready();
			try {
				const saved = await kernel.commands.save('all');
				requireCondition(saved.ok, 'Accept failed');
				const snapshot = kernel.getSnapshot();
				const choices = Object.values(
					snapshot.explicitChoice?.categories ?? {}
				);
				requireCondition(
					choices.length === 4 && choices.every((choice) => choice.value),
					'Accept did not create four explicit grants'
				);
				requireCondition(
					snapshot.effectivePermissions.marketing,
					'Accept did not enable marketing'
				);
			} finally {
				kernel.dispose();
			}
		},
		async realPolicyNoticeUs() {
			const rule = {
				...policyRulePresets.californiaOptOut(),
				prompt: 'notice' as const,
			};
			const resolution = resolvePolicyRules({
				countryCode: 'US',
				regionCode: 'CA',
				rules: [rule],
			});
			const kernel = createConsentKernel({
				initialPolicyResolution: resolution,
			});
			try {
				const before = kernel.getSnapshot();
				requireCondition(
					before.promptRequirement.kind === 'notice',
					'Notice fixture lacks a notice'
				);
				const dismissed = await kernel.commands.dismissNotice();
				requireCondition(dismissed.ok, 'Notice dismissal failed');
				const after = kernel.getSnapshot();
				requireCondition(
					after.noticeDismissal &&
						!after.explicitChoice &&
						after.promptRequirement.kind === 'none',
					'Dismissal did not preserve choice independence'
				);
				requireCondition(
					JSON.stringify(before.effectivePermissions) ===
						JSON.stringify(after.effectivePermissions),
					'Dismissal changed permissions'
				);
			} finally {
				kernel.dispose();
			}
		},
		async realPolicyPartialUs() {
			const kernel = await ready();
			try {
				const result = await kernel.commands.save({ measurement: true });
				requireCondition(result.ok, 'Partial save failed');
				const choice = kernel.getSnapshot().explicitChoice;
				requireCondition(
					choice?.categories.measurement?.value === true,
					'Partial save did not create its receipt'
				);
				requireCondition(
					Object.keys(choice?.categories ?? {}).length === 1,
					'Partial save filled undecided categories'
				);
			} finally {
				kernel.dispose();
			}
		},
		async realPolicyRejectUs() {
			const kernel = await ready();
			try {
				const result = await kernel.commands.save('none');
				requireCondition(result.ok, 'Reject failed');
				const snapshot = kernel.getSnapshot();
				requireCondition(
					snapshot.explicitChoice?.categories.marketing?.value === false,
					'Reject did not record denial'
				);
				requireCondition(
					!snapshot.effectivePermissions.marketing,
					'Reject still permits marketing'
				);
			} finally {
				kernel.dispose();
			}
		},
		async realPolicyRepeatHydrationUs() {
			const first = await ready();
			const repeat = await ready();
			try {
				await first.commands.save('none');
				const saved = first.getSnapshot();
				let choiceEvents = 0;
				repeat.events.on('choice:recorded', () => {
					choiceEvents += 1;
				});
				const hydrated = repeat.hydrate({
					choice: saved.explicitChoice,
					subject: saved.subject,
				});
				requireCondition(hydrated.ok, 'Repeat hydration failed');
				requireCondition(
					repeat.getSnapshot().explicitChoice?.categories.marketing?.value ===
						false,
					'Repeat visitor lost saved denial'
				);
				requireCondition(
					choiceEvents === 0,
					'Hydration emitted a choice event'
				);
			} finally {
				first.dispose();
				repeat.dispose();
			}
		},
		async realPolicyStandingGpcUs() {
			const resolution = resolvePolicyRules({
				countryCode: 'US',
				regionCode: 'CA',
				rules: [policyRulePresets.californiaOptOut()],
			});
			const kernel = createConsentKernel({
				initialPolicyResolution: resolution,
			});
			try {
				await kernel.commands.init();
				kernel.set.privacySignals({ gpc: true });
				kernel.set.privacySignals({ gpc: false });
				const snapshot = kernel.getSnapshot();
				requireCondition(
					snapshot.optOutDirectives.length > 0 &&
						!snapshot.effectivePermissions.marketing,
					'GPC removal lost standing opt-out'
				);
				requireCondition(!snapshot.explicitChoice, 'GPC created a choice');
			} finally {
				kernel.dispose();
			}
		},
	};
};
