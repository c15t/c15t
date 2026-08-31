import * as v from 'valibot';

export const runtimePolicyDecisionSchema = v.object({
	bannerUi: v.nullish(
		v.object({
			allowedActions: v.nullish(
				v.array(v.picklist(['accept', 'reject', 'customize']))
			),
			direction: v.nullish(v.picklist(['row', 'column'])),
			layout: v.nullish(
				v.array(
					v.union([
						v.picklist(['accept', 'reject', 'customize']),
						v.array(v.picklist(['accept', 'reject', 'customize'])),
					])
				)
			),
			primaryActions: v.nullish(
				v.array(v.picklist(['accept', 'reject', 'customize']))
			),
			scrollLock: v.nullish(v.boolean()),

			uiProfile: v.nullish(v.picklist(['balanced', 'compact', 'strict'])),
		})
	),
	categories: v.nullish(v.array(v.string())),
	countryCode: v.nullish(v.string()),
	createdAt: v.optional(v.date(), () => new Date()),
	dedupeKey: v.string(),
	dialogUi: v.nullish(
		v.object({
			allowedActions: v.nullish(
				v.array(v.picklist(['accept', 'reject', 'customize']))
			),
			direction: v.nullish(v.picklist(['row', 'column'])),
			layout: v.nullish(
				v.array(
					v.union([
						v.picklist(['accept', 'reject', 'customize']),
						v.array(v.picklist(['accept', 'reject', 'customize'])),
					])
				)
			),
			primaryActions: v.nullish(
				v.array(v.picklist(['accept', 'reject', 'customize']))
			),
			scrollLock: v.nullish(v.boolean()),

			uiProfile: v.nullish(v.picklist(['balanced', 'compact', 'strict'])),
		})
	),
	fingerprint: v.string(),
	id: v.string(),
	jurisdiction: v.string(),
	language: v.nullish(v.string()),
	matchedBy: v.picklist(['region', 'country', 'default', 'fallback']),
	model: v.picklist(['opt-in', 'opt-out', 'none', 'iab']),
	policyI18n: v.nullish(
		v.object({
			language: v.nullish(v.string()),
			messageProfile: v.nullish(v.string()),
		})
	),
	policyId: v.string(),
	preselectedCategories: v.nullish(v.array(v.string())),
	proofConfig: v.nullish(v.record(v.string(), v.boolean())),
	regionCode: v.nullish(v.string()),
	tenantId: v.nullish(v.string()),
	uiMode: v.nullish(v.picklist(['none', 'banner', 'dialog'])),
});

export type RuntimePolicyDecision = v.InferOutput<
	typeof runtimePolicyDecisionSchema
>;
