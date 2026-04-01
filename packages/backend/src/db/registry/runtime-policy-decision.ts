import type { PolicyModel } from '~/types';
import type { Registry } from './types';

interface RuntimePolicyDecisionUiSurface {
	allowedActions?: Array<'accept' | 'reject' | 'customize'>;
	primaryActions?: Array<'accept' | 'reject' | 'customize'>;
	layout?: Array<
		'accept' | 'reject' | 'customize' | Array<'accept' | 'reject' | 'customize'>
	>;
	direction?: 'row' | 'column';
	uiProfile?: 'balanced' | 'compact' | 'strict';
	scrollLock?: boolean;
}

export interface RuntimePolicyDecisionInput {
	tenantId?: string;
	policyId: string;
	fingerprint: string;
	matchedBy: 'region' | 'country' | 'default';
	countryCode: string | null;
	regionCode: string | null;
	jurisdiction: string;
	language?: string;
	model: PolicyModel;
	policyI18n?: {
		language?: string;
		messageProfile?: string;
	};
	uiMode?: 'none' | 'banner' | 'dialog';
	bannerUi?: RuntimePolicyDecisionUiSurface;
	dialogUi?: RuntimePolicyDecisionUiSurface;
	categories?: string[];
	preselectedCategories?: string[];
	proofConfig?: {
		storeIp?: boolean;
		storeUserAgent?: boolean;
		storeLanguage?: boolean;
	};
	dedupeKey: string;
}

export function runtimePolicyDecisionRegistry({ db, ctx }: Registry) {
	const { logger } = ctx;

	return {
		findOrCreateRuntimePolicyDecision: async (
			input: RuntimePolicyDecisionInput
		) => {
			const existing = await db.findFirst('runtimePolicyDecision', {
				where: (b) => b('dedupeKey', '=', input.dedupeKey),
			});

			if (existing) {
				return existing;
			}

			logger.debug('Creating runtime policy decision', {
				policyId: input.policyId,
				fingerprint: input.fingerprint,
				matchedBy: input.matchedBy,
			});

			return db.create('runtimePolicyDecision', {
				id: `rpd_${crypto.randomUUID().replaceAll('-', '')}`,
				tenantId: input.tenantId,
				policyId: input.policyId,
				fingerprint: input.fingerprint,
				matchedBy: input.matchedBy,
				countryCode: input.countryCode,
				regionCode: input.regionCode,
				jurisdiction: input.jurisdiction,
				language: input.language,
				model: input.model,
				policyI18n: input.policyI18n ? { json: input.policyI18n } : undefined,
				uiMode: input.uiMode,
				bannerUi: input.bannerUi ? { json: input.bannerUi } : undefined,
				dialogUi: input.dialogUi ? { json: input.dialogUi } : undefined,
				categories: input.categories ? { json: input.categories } : undefined,
				preselectedCategories: input.preselectedCategories
					? { json: input.preselectedCategories }
					: undefined,
				proofConfig: input.proofConfig
					? { json: input.proofConfig }
					: undefined,
				dedupeKey: input.dedupeKey,
			});
		},
	};
}
