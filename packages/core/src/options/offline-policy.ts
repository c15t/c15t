import type { InitOutput, PolicyConfig } from '@c15t/schema/types';
import type { Translations } from '@c15t/translations';

/**
 * Policy and translation configuration for offline mode, where no backend
 * serves `/init`.
 */
export interface OfflinePolicyConfig {
	i18n?: {
		messages?: Record<
			string,
			{
				fallbackLanguage?: string;
				translations: Record<string, Partial<Translations>>;
			}
		>;
		defaultProfile?: string;
	};
	policyPacks?: PolicyConfig[];
	policy?: InitOutput['policy'];
	policyDecision?: InitOutput['policyDecision'];
	policySnapshotToken?: InitOutput['policySnapshotToken'];
}
