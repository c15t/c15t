import * as v from 'valibot';

export const policyModelSchema = v.picklist([
	'opt-in',
	'opt-out',
	'none',
	'iab',
]);

export const policyScopeModeSchema = v.picklist(['strict', 'permissive']);

export const policyUiModeSchema = v.picklist(['none', 'banner', 'dialog']);

export const policyUiActionSchema = v.picklist([
	'accept',
	'reject',
	'customize',
]);

export const policyUiActionDirectionSchema = v.picklist(['row', 'column']);
export const policyUiActionGroupSchema = v.union([
	policyUiActionSchema,
	v.array(policyUiActionSchema),
]);

export const policyUiProfileSchema = v.picklist([
	'balanced',
	'compact',
	'strict',
]);

export const policyUiSurfaceConfigSchema = v.object({
	allowedActions: v.optional(v.array(policyUiActionSchema)),
	direction: v.optional(policyUiActionDirectionSchema),
	layout: v.optional(v.array(policyUiActionGroupSchema)),
	primaryActions: v.optional(v.array(policyUiActionSchema)),
	scrollLock: v.optional(v.boolean()),
	uiProfile: v.optional(policyUiProfileSchema),
});

export const policyConfigSchema = v.object({
	consent: v.optional(
		v.object({
			categories: v.optional(v.array(v.string())),
			expiryDays: v.optional(v.number()),
			gpc: v.optional(v.boolean()),

			model: v.optional(policyModelSchema),
			preselectedCategories: v.optional(v.array(v.string())),
			scopeMode: v.optional(policyScopeModeSchema),
		})
	),
	i18n: v.optional(
		v.object({
			language: v.optional(v.string()),
			messageProfile: v.optional(v.string()),
		})
	),
	id: v.string(),
	match: v.object({
		countries: v.optional(v.array(v.string())),
		fallback: v.optional(v.boolean()),

		isDefault: v.optional(v.boolean()),
		regions: v.optional(
			v.array(
				v.object({
					country: v.string(),
					region: v.string(),
				})
			)
		),
	}),
	proof: v.optional(
		v.object({
			storeIp: v.optional(v.boolean()),
			storeLanguage: v.optional(v.boolean()),

			storeUserAgent: v.optional(v.boolean()),
		})
	),
	ui: v.optional(
		v.object({
			banner: v.optional(policyUiSurfaceConfigSchema),
			dialog: v.optional(policyUiSurfaceConfigSchema),

			mode: v.optional(policyUiModeSchema),
		})
	),
});

export const policyConfigArraySchema = v.array(policyConfigSchema);
