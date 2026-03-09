import * as v from 'valibot';

export const runtimePolicyDecisionSchema = v.object({
	id: v.string(),
	tenantId: v.nullish(v.string()),
	policyId: v.string(),
	fingerprint: v.string(),
	matchedBy: v.picklist(['region', 'country', 'jurisdiction', 'default']),
	countryCode: v.nullish(v.string()),
	regionCode: v.nullish(v.string()),
	jurisdiction: v.string(),
	language: v.nullish(v.string()),
	model: v.picklist(['opt-in', 'opt-out', 'none', 'iab']),
	policyI18n: v.nullish(
		v.object({
			language: v.nullish(v.string()),
			messageProfile: v.nullish(v.string()),
		})
	),
	uiMode: v.nullish(v.picklist(['none', 'banner', 'dialog'])),
	bannerUi: v.nullish(
		v.object({
			allowedActions: v.nullish(
				v.array(v.picklist(['accept', 'reject', 'customize']))
			),
			primaryAction: v.nullish(v.picklist(['accept', 'reject', 'customize'])),
			actionOrder: v.nullish(
				v.array(v.picklist(['accept', 'reject', 'customize']))
			),
			actionLayout: v.nullish(v.picklist(['split', 'inline'])),
			uiProfile: v.nullish(v.picklist(['balanced', 'compact', 'strict'])),
			scrollLock: v.nullish(v.boolean()),
		})
	),
	dialogUi: v.nullish(
		v.object({
			allowedActions: v.nullish(
				v.array(v.picklist(['accept', 'reject', 'customize']))
			),
			primaryAction: v.nullish(v.picklist(['accept', 'reject', 'customize'])),
			actionOrder: v.nullish(
				v.array(v.picklist(['accept', 'reject', 'customize']))
			),
			actionLayout: v.nullish(v.picklist(['split', 'inline'])),
			uiProfile: v.nullish(v.picklist(['balanced', 'compact', 'strict'])),
			scrollLock: v.nullish(v.boolean()),
		})
	),
	categories: v.nullish(v.array(v.string())),
	preselectedCategories: v.nullish(v.array(v.string())),
	proofConfig: v.nullish(v.record(v.string(), v.boolean())),
	dedupeKey: v.string(),
	createdAt: v.optional(v.date(), () => new Date()),
});

export type RuntimePolicyDecision = v.InferOutput<
	typeof runtimePolicyDecisionSchema
>;
