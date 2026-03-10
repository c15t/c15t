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

export const policyUiActionLayoutSchema = v.picklist(['split', 'inline']);

export const policyUiProfileSchema = v.picklist([
	'balanced',
	'compact',
	'strict',
]);

export const policyUiSurfaceConfigSchema = v.object({
	allowedActions: v.optional(v.array(policyUiActionSchema)),
	primaryAction: v.optional(policyUiActionSchema),
	actionOrder: v.optional(v.array(policyUiActionSchema)),
	actionLayout: v.optional(policyUiActionLayoutSchema),
	uiProfile: v.optional(policyUiProfileSchema),
	scrollLock: v.optional(v.boolean()),
});

export const policyConfigSchema = v.object({
	id: v.string(),
	match: v.object({
		regions: v.optional(
			v.array(
				v.object({
					country: v.string(),
					region: v.string(),
				})
			)
		),
		countries: v.optional(v.array(v.string())),
		isDefault: v.optional(v.boolean()),
	}),
	i18n: v.optional(
		v.object({
			language: v.optional(v.string()),
			messageProfile: v.optional(v.string()),
		})
	),
	consent: v.optional(
		v.object({
			model: v.optional(policyModelSchema),
			expiryDays: v.optional(v.number()),
			scopeMode: v.optional(policyScopeModeSchema),
			categories: v.optional(v.array(v.string())),
			preselectedCategories: v.optional(v.array(v.string())),
			gpc: v.optional(v.boolean()),
		})
	),
	ui: v.optional(
		v.object({
			mode: v.optional(policyUiModeSchema),
			banner: v.optional(policyUiSurfaceConfigSchema),
			dialog: v.optional(policyUiSurfaceConfigSchema),
		})
	),
	proof: v.optional(
		v.object({
			storeIp: v.optional(v.boolean()),
			storeUserAgent: v.optional(v.boolean()),
			storeLanguage: v.optional(v.boolean()),
		})
	),
});

export const policyConfigArraySchema = v.array(policyConfigSchema);
