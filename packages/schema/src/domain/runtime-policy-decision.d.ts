import * as v from 'valibot';
export declare const runtimePolicyDecisionSchema: v.ObjectSchema<
	{
		readonly id: v.StringSchema<undefined>;
		readonly tenantId: v.NullishSchema<v.StringSchema<undefined>, undefined>;
		readonly policyId: v.StringSchema<undefined>;
		readonly fingerprint: v.StringSchema<undefined>;
		readonly matchedBy: v.PicklistSchema<
			['region', 'country', 'default', 'fallback'],
			undefined
		>;
		readonly countryCode: v.NullishSchema<v.StringSchema<undefined>, undefined>;
		readonly regionCode: v.NullishSchema<v.StringSchema<undefined>, undefined>;
		readonly jurisdiction: v.StringSchema<undefined>;
		readonly language: v.NullishSchema<v.StringSchema<undefined>, undefined>;
		readonly model: v.PicklistSchema<
			['opt-in', 'opt-out', 'none', 'iab'],
			undefined
		>;
		readonly policyI18n: v.NullishSchema<
			v.ObjectSchema<
				{
					readonly language: v.NullishSchema<
						v.StringSchema<undefined>,
						undefined
					>;
					readonly messageProfile: v.NullishSchema<
						v.StringSchema<undefined>,
						undefined
					>;
				},
				undefined
			>,
			undefined
		>;
		readonly uiMode: v.NullishSchema<
			v.PicklistSchema<['none', 'banner', 'dialog'], undefined>,
			undefined
		>;
		readonly bannerUi: v.NullishSchema<
			v.ObjectSchema<
				{
					readonly allowedActions: v.NullishSchema<
						v.ArraySchema<
							v.PicklistSchema<['accept', 'reject', 'customize'], undefined>,
							undefined
						>,
						undefined
					>;
					readonly primaryActions: v.NullishSchema<
						v.ArraySchema<
							v.PicklistSchema<['accept', 'reject', 'customize'], undefined>,
							undefined
						>,
						undefined
					>;
					readonly layout: v.NullishSchema<
						v.ArraySchema<
							v.UnionSchema<
								[
									v.PicklistSchema<
										['accept', 'reject', 'customize'],
										undefined
									>,
									v.ArraySchema<
										v.PicklistSchema<
											['accept', 'reject', 'customize'],
											undefined
										>,
										undefined
									>,
								],
								undefined
							>,
							undefined
						>,
						undefined
					>;
					readonly direction: v.NullishSchema<
						v.PicklistSchema<['row', 'column'], undefined>,
						undefined
					>;
					readonly uiProfile: v.NullishSchema<
						v.PicklistSchema<['balanced', 'compact', 'strict'], undefined>,
						undefined
					>;
					readonly scrollLock: v.NullishSchema<
						v.BooleanSchema<undefined>,
						undefined
					>;
				},
				undefined
			>,
			undefined
		>;
		readonly dialogUi: v.NullishSchema<
			v.ObjectSchema<
				{
					readonly allowedActions: v.NullishSchema<
						v.ArraySchema<
							v.PicklistSchema<['accept', 'reject', 'customize'], undefined>,
							undefined
						>,
						undefined
					>;
					readonly primaryActions: v.NullishSchema<
						v.ArraySchema<
							v.PicklistSchema<['accept', 'reject', 'customize'], undefined>,
							undefined
						>,
						undefined
					>;
					readonly layout: v.NullishSchema<
						v.ArraySchema<
							v.UnionSchema<
								[
									v.PicklistSchema<
										['accept', 'reject', 'customize'],
										undefined
									>,
									v.ArraySchema<
										v.PicklistSchema<
											['accept', 'reject', 'customize'],
											undefined
										>,
										undefined
									>,
								],
								undefined
							>,
							undefined
						>,
						undefined
					>;
					readonly direction: v.NullishSchema<
						v.PicklistSchema<['row', 'column'], undefined>,
						undefined
					>;
					readonly uiProfile: v.NullishSchema<
						v.PicklistSchema<['balanced', 'compact', 'strict'], undefined>,
						undefined
					>;
					readonly scrollLock: v.NullishSchema<
						v.BooleanSchema<undefined>,
						undefined
					>;
				},
				undefined
			>,
			undefined
		>;
		readonly categories: v.NullishSchema<
			v.ArraySchema<v.StringSchema<undefined>, undefined>,
			undefined
		>;
		readonly preselectedCategories: v.NullishSchema<
			v.ArraySchema<v.StringSchema<undefined>, undefined>,
			undefined
		>;
		readonly proofConfig: v.NullishSchema<
			v.RecordSchema<
				v.StringSchema<undefined>,
				v.BooleanSchema<undefined>,
				undefined
			>,
			undefined
		>;
		readonly dedupeKey: v.StringSchema<undefined>;
		readonly createdAt: v.OptionalSchema<v.DateSchema<undefined>, () => Date>;
	},
	undefined
>;
export type RuntimePolicyDecision = v.InferOutput<
	typeof runtimePolicyDecisionSchema
>;
