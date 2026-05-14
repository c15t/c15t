import * as v from 'valibot';
/**
 * Title and description schema for translations
 */
export declare const titleDescriptionSchema: v.ObjectSchema<
	{
		readonly title: v.StringSchema<undefined>;
		readonly description: v.StringSchema<undefined>;
	},
	undefined
>;
/**
 * Partial title and description schema
 */
export declare const partialTitleDescriptionSchema: v.ObjectSchema<
	{
		readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		readonly description: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
	},
	undefined
>;
/**
 * Complete translations schema for newer backend versions
 * All fields are required for full functionality
 */
export declare const completeTranslationsSchema: v.ObjectSchema<
	{
		readonly common: v.ObjectSchema<
			{
				readonly acceptAll: v.StringSchema<undefined>;
				readonly rejectAll: v.StringSchema<undefined>;
				readonly customize: v.StringSchema<undefined>;
				readonly save: v.StringSchema<undefined>;
			},
			undefined
		>;
		readonly cookieBanner: v.ObjectSchema<
			{
				readonly title: v.StringSchema<undefined>;
				readonly description: v.StringSchema<undefined>;
			},
			undefined
		>;
		readonly consentManagerDialog: v.ObjectSchema<
			{
				readonly title: v.StringSchema<undefined>;
				readonly description: v.StringSchema<undefined>;
			},
			undefined
		>;
		readonly consentTypes: v.ObjectSchema<
			{
				readonly experience: v.ObjectSchema<
					{
						readonly title: v.StringSchema<undefined>;
						readonly description: v.StringSchema<undefined>;
					},
					undefined
				>;
				readonly functionality: v.ObjectSchema<
					{
						readonly title: v.StringSchema<undefined>;
						readonly description: v.StringSchema<undefined>;
					},
					undefined
				>;
				readonly marketing: v.ObjectSchema<
					{
						readonly title: v.StringSchema<undefined>;
						readonly description: v.StringSchema<undefined>;
					},
					undefined
				>;
				readonly measurement: v.ObjectSchema<
					{
						readonly title: v.StringSchema<undefined>;
						readonly description: v.StringSchema<undefined>;
					},
					undefined
				>;
				readonly necessary: v.ObjectSchema<
					{
						readonly title: v.StringSchema<undefined>;
						readonly description: v.StringSchema<undefined>;
					},
					undefined
				>;
			},
			undefined
		>;
		readonly frame: v.ObjectSchema<
			{
				readonly title: v.StringSchema<undefined>;
				readonly actionButton: v.StringSchema<undefined>;
			},
			undefined
		>;
		readonly legalLinks: v.ObjectSchema<
			{
				readonly privacyPolicy: v.StringSchema<undefined>;
				readonly termsOfService: v.StringSchema<undefined>;
				readonly cookiePolicy: v.StringSchema<undefined>;
			},
			undefined
		>;
	},
	undefined
>;
/**
 * Partial translations schema for backward compatibility with older backend versions
 * Allows missing fields to gracefully degrade functionality
 */
export declare const partialTranslationsSchema: v.ObjectSchema<
	{
		readonly common: Omit<
			v.ObjectSchema<
				{
					readonly acceptAll: v.OptionalSchema<
						v.StringSchema<undefined>,
						undefined
					>;
					readonly rejectAll: v.OptionalSchema<
						v.StringSchema<undefined>,
						undefined
					>;
					readonly customize: v.OptionalSchema<
						v.StringSchema<undefined>,
						undefined
					>;
					readonly save: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
				},
				undefined
			>,
			'~types' | '~run' | '~standard' | 'entries'
		> & {
			readonly entries: {
				readonly acceptAll: v.OptionalSchema<
					v.OptionalSchema<v.StringSchema<undefined>, undefined>,
					undefined
				>;
				readonly rejectAll: v.OptionalSchema<
					v.OptionalSchema<v.StringSchema<undefined>, undefined>,
					undefined
				>;
				readonly customize: v.OptionalSchema<
					v.OptionalSchema<v.StringSchema<undefined>, undefined>,
					undefined
				>;
				readonly save: v.OptionalSchema<
					v.OptionalSchema<v.StringSchema<undefined>, undefined>,
					undefined
				>;
			};
			readonly '~standard': v.StandardProps<
				{
					acceptAll?: string | undefined;
					rejectAll?: string | undefined;
					customize?: string | undefined;
					save?: string | undefined;
				},
				{
					acceptAll?: string | undefined;
					rejectAll?: string | undefined;
					customize?: string | undefined;
					save?: string | undefined;
				}
			>;
			readonly '~run': (
				dataset: v.UnknownDataset,
				config: v.Config<v.BaseIssue<unknown>>
			) => v.OutputDataset<
				{
					acceptAll?: string | undefined;
					rejectAll?: string | undefined;
					customize?: string | undefined;
					save?: string | undefined;
				},
				v.StringIssue | v.ObjectIssue
			>;
			readonly '~types'?:
				| {
						readonly input: {
							acceptAll?: string | undefined;
							rejectAll?: string | undefined;
							customize?: string | undefined;
							save?: string | undefined;
						};
						readonly output: {
							acceptAll?: string | undefined;
							rejectAll?: string | undefined;
							customize?: string | undefined;
							save?: string | undefined;
						};
						readonly issue: v.StringIssue | v.ObjectIssue;
				  }
				| undefined;
		};
		readonly cookieBanner: v.ObjectSchema<
			{
				readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
				readonly description: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
			},
			undefined
		>;
		readonly consentManagerDialog: v.ObjectSchema<
			{
				readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
				readonly description: v.OptionalSchema<
					v.StringSchema<undefined>,
					undefined
				>;
			},
			undefined
		>;
		readonly consentTypes: Omit<
			v.ObjectSchema<
				{
					readonly experience: v.ObjectSchema<
						{
							readonly title: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
							readonly description: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
						},
						undefined
					>;
					readonly functionality: v.ObjectSchema<
						{
							readonly title: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
							readonly description: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
						},
						undefined
					>;
					readonly marketing: v.ObjectSchema<
						{
							readonly title: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
							readonly description: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
						},
						undefined
					>;
					readonly measurement: v.ObjectSchema<
						{
							readonly title: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
							readonly description: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
						},
						undefined
					>;
					readonly necessary: v.ObjectSchema<
						{
							readonly title: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
							readonly description: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
						},
						undefined
					>;
				},
				undefined
			>,
			'~types' | '~run' | '~standard' | 'entries'
		> & {
			readonly entries: {
				readonly experience: v.OptionalSchema<
					v.ObjectSchema<
						{
							readonly title: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
							readonly description: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
						},
						undefined
					>,
					undefined
				>;
				readonly functionality: v.OptionalSchema<
					v.ObjectSchema<
						{
							readonly title: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
							readonly description: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
						},
						undefined
					>,
					undefined
				>;
				readonly marketing: v.OptionalSchema<
					v.ObjectSchema<
						{
							readonly title: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
							readonly description: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
						},
						undefined
					>,
					undefined
				>;
				readonly measurement: v.OptionalSchema<
					v.ObjectSchema<
						{
							readonly title: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
							readonly description: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
						},
						undefined
					>,
					undefined
				>;
				readonly necessary: v.OptionalSchema<
					v.ObjectSchema<
						{
							readonly title: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
							readonly description: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
						},
						undefined
					>,
					undefined
				>;
			};
			readonly '~standard': v.StandardProps<
				{
					experience?:
						| {
								title?: string | undefined;
								description?: string | undefined;
						  }
						| undefined;
					functionality?:
						| {
								title?: string | undefined;
								description?: string | undefined;
						  }
						| undefined;
					marketing?:
						| {
								title?: string | undefined;
								description?: string | undefined;
						  }
						| undefined;
					measurement?:
						| {
								title?: string | undefined;
								description?: string | undefined;
						  }
						| undefined;
					necessary?:
						| {
								title?: string | undefined;
								description?: string | undefined;
						  }
						| undefined;
				},
				{
					experience?:
						| {
								title?: string | undefined;
								description?: string | undefined;
						  }
						| undefined;
					functionality?:
						| {
								title?: string | undefined;
								description?: string | undefined;
						  }
						| undefined;
					marketing?:
						| {
								title?: string | undefined;
								description?: string | undefined;
						  }
						| undefined;
					measurement?:
						| {
								title?: string | undefined;
								description?: string | undefined;
						  }
						| undefined;
					necessary?:
						| {
								title?: string | undefined;
								description?: string | undefined;
						  }
						| undefined;
				}
			>;
			readonly '~run': (
				dataset: v.UnknownDataset,
				config: v.Config<v.BaseIssue<unknown>>
			) => v.OutputDataset<
				{
					experience?:
						| {
								title?: string | undefined;
								description?: string | undefined;
						  }
						| undefined;
					functionality?:
						| {
								title?: string | undefined;
								description?: string | undefined;
						  }
						| undefined;
					marketing?:
						| {
								title?: string | undefined;
								description?: string | undefined;
						  }
						| undefined;
					measurement?:
						| {
								title?: string | undefined;
								description?: string | undefined;
						  }
						| undefined;
					necessary?:
						| {
								title?: string | undefined;
								description?: string | undefined;
						  }
						| undefined;
				},
				v.StringIssue | v.ObjectIssue
			>;
			readonly '~types'?:
				| {
						readonly input: {
							experience?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							functionality?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							marketing?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							measurement?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							necessary?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
						};
						readonly output: {
							experience?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							functionality?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							marketing?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							measurement?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							necessary?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
						};
						readonly issue: v.StringIssue | v.ObjectIssue;
				  }
				| undefined;
		};
		readonly frame: v.OptionalSchema<
			Omit<
				v.ObjectSchema<
					{
						readonly title: v.OptionalSchema<
							v.StringSchema<undefined>,
							undefined
						>;
						readonly actionButton: v.OptionalSchema<
							v.StringSchema<undefined>,
							undefined
						>;
					},
					undefined
				>,
				'~types' | '~run' | '~standard' | 'entries'
			> & {
				readonly entries: {
					readonly title: v.OptionalSchema<
						v.OptionalSchema<v.StringSchema<undefined>, undefined>,
						undefined
					>;
					readonly actionButton: v.OptionalSchema<
						v.OptionalSchema<v.StringSchema<undefined>, undefined>,
						undefined
					>;
				};
				readonly '~standard': v.StandardProps<
					{
						title?: string | undefined;
						actionButton?: string | undefined;
					},
					{
						title?: string | undefined;
						actionButton?: string | undefined;
					}
				>;
				readonly '~run': (
					dataset: v.UnknownDataset,
					config: v.Config<v.BaseIssue<unknown>>
				) => v.OutputDataset<
					{
						title?: string | undefined;
						actionButton?: string | undefined;
					},
					v.StringIssue | v.ObjectIssue
				>;
				readonly '~types'?:
					| {
							readonly input: {
								title?: string | undefined;
								actionButton?: string | undefined;
							};
							readonly output: {
								title?: string | undefined;
								actionButton?: string | undefined;
							};
							readonly issue: v.StringIssue | v.ObjectIssue;
					  }
					| undefined;
			},
			undefined
		>;
		readonly legalLinks: v.OptionalSchema<
			Omit<
				v.ObjectSchema<
					{
						readonly privacyPolicy: v.OptionalSchema<
							v.StringSchema<undefined>,
							undefined
						>;
						readonly termsOfService: v.OptionalSchema<
							v.StringSchema<undefined>,
							undefined
						>;
						readonly cookiePolicy: v.OptionalSchema<
							v.StringSchema<undefined>,
							undefined
						>;
					},
					undefined
				>,
				'~types' | '~run' | '~standard' | 'entries'
			> & {
				readonly entries: {
					readonly privacyPolicy: v.OptionalSchema<
						v.OptionalSchema<v.StringSchema<undefined>, undefined>,
						undefined
					>;
					readonly termsOfService: v.OptionalSchema<
						v.OptionalSchema<v.StringSchema<undefined>, undefined>,
						undefined
					>;
					readonly cookiePolicy: v.OptionalSchema<
						v.OptionalSchema<v.StringSchema<undefined>, undefined>,
						undefined
					>;
				};
				readonly '~standard': v.StandardProps<
					{
						privacyPolicy?: string | undefined;
						termsOfService?: string | undefined;
						cookiePolicy?: string | undefined;
					},
					{
						privacyPolicy?: string | undefined;
						termsOfService?: string | undefined;
						cookiePolicy?: string | undefined;
					}
				>;
				readonly '~run': (
					dataset: v.UnknownDataset,
					config: v.Config<v.BaseIssue<unknown>>
				) => v.OutputDataset<
					{
						privacyPolicy?: string | undefined;
						termsOfService?: string | undefined;
						cookiePolicy?: string | undefined;
					},
					v.StringIssue | v.ObjectIssue
				>;
				readonly '~types'?:
					| {
							readonly input: {
								privacyPolicy?: string | undefined;
								termsOfService?: string | undefined;
								cookiePolicy?: string | undefined;
							};
							readonly output: {
								privacyPolicy?: string | undefined;
								termsOfService?: string | undefined;
								cookiePolicy?: string | undefined;
							};
							readonly issue: v.StringIssue | v.ObjectIssue;
					  }
					| undefined;
			},
			undefined
		>;
	},
	undefined
>;
/**
 * Union schema that accepts both complete and partial translations
 * Provides backward compatibility while maintaining type safety
 */
export declare const translationsSchema: v.UnionSchema<
	[
		v.ObjectSchema<
			{
				readonly common: v.ObjectSchema<
					{
						readonly acceptAll: v.StringSchema<undefined>;
						readonly rejectAll: v.StringSchema<undefined>;
						readonly customize: v.StringSchema<undefined>;
						readonly save: v.StringSchema<undefined>;
					},
					undefined
				>;
				readonly cookieBanner: v.ObjectSchema<
					{
						readonly title: v.StringSchema<undefined>;
						readonly description: v.StringSchema<undefined>;
					},
					undefined
				>;
				readonly consentManagerDialog: v.ObjectSchema<
					{
						readonly title: v.StringSchema<undefined>;
						readonly description: v.StringSchema<undefined>;
					},
					undefined
				>;
				readonly consentTypes: v.ObjectSchema<
					{
						readonly experience: v.ObjectSchema<
							{
								readonly title: v.StringSchema<undefined>;
								readonly description: v.StringSchema<undefined>;
							},
							undefined
						>;
						readonly functionality: v.ObjectSchema<
							{
								readonly title: v.StringSchema<undefined>;
								readonly description: v.StringSchema<undefined>;
							},
							undefined
						>;
						readonly marketing: v.ObjectSchema<
							{
								readonly title: v.StringSchema<undefined>;
								readonly description: v.StringSchema<undefined>;
							},
							undefined
						>;
						readonly measurement: v.ObjectSchema<
							{
								readonly title: v.StringSchema<undefined>;
								readonly description: v.StringSchema<undefined>;
							},
							undefined
						>;
						readonly necessary: v.ObjectSchema<
							{
								readonly title: v.StringSchema<undefined>;
								readonly description: v.StringSchema<undefined>;
							},
							undefined
						>;
					},
					undefined
				>;
				readonly frame: v.ObjectSchema<
					{
						readonly title: v.StringSchema<undefined>;
						readonly actionButton: v.StringSchema<undefined>;
					},
					undefined
				>;
				readonly legalLinks: v.ObjectSchema<
					{
						readonly privacyPolicy: v.StringSchema<undefined>;
						readonly termsOfService: v.StringSchema<undefined>;
						readonly cookiePolicy: v.StringSchema<undefined>;
					},
					undefined
				>;
			},
			undefined
		>,
		v.ObjectSchema<
			{
				readonly common: Omit<
					v.ObjectSchema<
						{
							readonly acceptAll: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
							readonly rejectAll: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
							readonly customize: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
							readonly save: v.OptionalSchema<
								v.StringSchema<undefined>,
								undefined
							>;
						},
						undefined
					>,
					'~types' | '~run' | '~standard' | 'entries'
				> & {
					readonly entries: {
						readonly acceptAll: v.OptionalSchema<
							v.OptionalSchema<v.StringSchema<undefined>, undefined>,
							undefined
						>;
						readonly rejectAll: v.OptionalSchema<
							v.OptionalSchema<v.StringSchema<undefined>, undefined>,
							undefined
						>;
						readonly customize: v.OptionalSchema<
							v.OptionalSchema<v.StringSchema<undefined>, undefined>,
							undefined
						>;
						readonly save: v.OptionalSchema<
							v.OptionalSchema<v.StringSchema<undefined>, undefined>,
							undefined
						>;
					};
					readonly '~standard': v.StandardProps<
						{
							acceptAll?: string | undefined;
							rejectAll?: string | undefined;
							customize?: string | undefined;
							save?: string | undefined;
						},
						{
							acceptAll?: string | undefined;
							rejectAll?: string | undefined;
							customize?: string | undefined;
							save?: string | undefined;
						}
					>;
					readonly '~run': (
						dataset: v.UnknownDataset,
						config: v.Config<v.BaseIssue<unknown>>
					) => v.OutputDataset<
						{
							acceptAll?: string | undefined;
							rejectAll?: string | undefined;
							customize?: string | undefined;
							save?: string | undefined;
						},
						v.StringIssue | v.ObjectIssue
					>;
					readonly '~types'?:
						| {
								readonly input: {
									acceptAll?: string | undefined;
									rejectAll?: string | undefined;
									customize?: string | undefined;
									save?: string | undefined;
								};
								readonly output: {
									acceptAll?: string | undefined;
									rejectAll?: string | undefined;
									customize?: string | undefined;
									save?: string | undefined;
								};
								readonly issue: v.StringIssue | v.ObjectIssue;
						  }
						| undefined;
				};
				readonly cookieBanner: v.ObjectSchema<
					{
						readonly title: v.OptionalSchema<
							v.StringSchema<undefined>,
							undefined
						>;
						readonly description: v.OptionalSchema<
							v.StringSchema<undefined>,
							undefined
						>;
					},
					undefined
				>;
				readonly consentManagerDialog: v.ObjectSchema<
					{
						readonly title: v.OptionalSchema<
							v.StringSchema<undefined>,
							undefined
						>;
						readonly description: v.OptionalSchema<
							v.StringSchema<undefined>,
							undefined
						>;
					},
					undefined
				>;
				readonly consentTypes: Omit<
					v.ObjectSchema<
						{
							readonly experience: v.ObjectSchema<
								{
									readonly title: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
									readonly description: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
								},
								undefined
							>;
							readonly functionality: v.ObjectSchema<
								{
									readonly title: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
									readonly description: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
								},
								undefined
							>;
							readonly marketing: v.ObjectSchema<
								{
									readonly title: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
									readonly description: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
								},
								undefined
							>;
							readonly measurement: v.ObjectSchema<
								{
									readonly title: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
									readonly description: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
								},
								undefined
							>;
							readonly necessary: v.ObjectSchema<
								{
									readonly title: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
									readonly description: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
								},
								undefined
							>;
						},
						undefined
					>,
					'~types' | '~run' | '~standard' | 'entries'
				> & {
					readonly entries: {
						readonly experience: v.OptionalSchema<
							v.ObjectSchema<
								{
									readonly title: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
									readonly description: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
								},
								undefined
							>,
							undefined
						>;
						readonly functionality: v.OptionalSchema<
							v.ObjectSchema<
								{
									readonly title: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
									readonly description: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
								},
								undefined
							>,
							undefined
						>;
						readonly marketing: v.OptionalSchema<
							v.ObjectSchema<
								{
									readonly title: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
									readonly description: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
								},
								undefined
							>,
							undefined
						>;
						readonly measurement: v.OptionalSchema<
							v.ObjectSchema<
								{
									readonly title: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
									readonly description: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
								},
								undefined
							>,
							undefined
						>;
						readonly necessary: v.OptionalSchema<
							v.ObjectSchema<
								{
									readonly title: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
									readonly description: v.OptionalSchema<
										v.StringSchema<undefined>,
										undefined
									>;
								},
								undefined
							>,
							undefined
						>;
					};
					readonly '~standard': v.StandardProps<
						{
							experience?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							functionality?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							marketing?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							measurement?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							necessary?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
						},
						{
							experience?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							functionality?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							marketing?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							measurement?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							necessary?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
						}
					>;
					readonly '~run': (
						dataset: v.UnknownDataset,
						config: v.Config<v.BaseIssue<unknown>>
					) => v.OutputDataset<
						{
							experience?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							functionality?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							marketing?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							measurement?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
							necessary?:
								| {
										title?: string | undefined;
										description?: string | undefined;
								  }
								| undefined;
						},
						v.StringIssue | v.ObjectIssue
					>;
					readonly '~types'?:
						| {
								readonly input: {
									experience?:
										| {
												title?: string | undefined;
												description?: string | undefined;
										  }
										| undefined;
									functionality?:
										| {
												title?: string | undefined;
												description?: string | undefined;
										  }
										| undefined;
									marketing?:
										| {
												title?: string | undefined;
												description?: string | undefined;
										  }
										| undefined;
									measurement?:
										| {
												title?: string | undefined;
												description?: string | undefined;
										  }
										| undefined;
									necessary?:
										| {
												title?: string | undefined;
												description?: string | undefined;
										  }
										| undefined;
								};
								readonly output: {
									experience?:
										| {
												title?: string | undefined;
												description?: string | undefined;
										  }
										| undefined;
									functionality?:
										| {
												title?: string | undefined;
												description?: string | undefined;
										  }
										| undefined;
									marketing?:
										| {
												title?: string | undefined;
												description?: string | undefined;
										  }
										| undefined;
									measurement?:
										| {
												title?: string | undefined;
												description?: string | undefined;
										  }
										| undefined;
									necessary?:
										| {
												title?: string | undefined;
												description?: string | undefined;
										  }
										| undefined;
								};
								readonly issue: v.StringIssue | v.ObjectIssue;
						  }
						| undefined;
				};
				readonly frame: v.OptionalSchema<
					Omit<
						v.ObjectSchema<
							{
								readonly title: v.OptionalSchema<
									v.StringSchema<undefined>,
									undefined
								>;
								readonly actionButton: v.OptionalSchema<
									v.StringSchema<undefined>,
									undefined
								>;
							},
							undefined
						>,
						'~types' | '~run' | '~standard' | 'entries'
					> & {
						readonly entries: {
							readonly title: v.OptionalSchema<
								v.OptionalSchema<v.StringSchema<undefined>, undefined>,
								undefined
							>;
							readonly actionButton: v.OptionalSchema<
								v.OptionalSchema<v.StringSchema<undefined>, undefined>,
								undefined
							>;
						};
						readonly '~standard': v.StandardProps<
							{
								title?: string | undefined;
								actionButton?: string | undefined;
							},
							{
								title?: string | undefined;
								actionButton?: string | undefined;
							}
						>;
						readonly '~run': (
							dataset: v.UnknownDataset,
							config: v.Config<v.BaseIssue<unknown>>
						) => v.OutputDataset<
							{
								title?: string | undefined;
								actionButton?: string | undefined;
							},
							v.StringIssue | v.ObjectIssue
						>;
						readonly '~types'?:
							| {
									readonly input: {
										title?: string | undefined;
										actionButton?: string | undefined;
									};
									readonly output: {
										title?: string | undefined;
										actionButton?: string | undefined;
									};
									readonly issue: v.StringIssue | v.ObjectIssue;
							  }
							| undefined;
					},
					undefined
				>;
				readonly legalLinks: v.OptionalSchema<
					Omit<
						v.ObjectSchema<
							{
								readonly privacyPolicy: v.OptionalSchema<
									v.StringSchema<undefined>,
									undefined
								>;
								readonly termsOfService: v.OptionalSchema<
									v.StringSchema<undefined>,
									undefined
								>;
								readonly cookiePolicy: v.OptionalSchema<
									v.StringSchema<undefined>,
									undefined
								>;
							},
							undefined
						>,
						'~types' | '~run' | '~standard' | 'entries'
					> & {
						readonly entries: {
							readonly privacyPolicy: v.OptionalSchema<
								v.OptionalSchema<v.StringSchema<undefined>, undefined>,
								undefined
							>;
							readonly termsOfService: v.OptionalSchema<
								v.OptionalSchema<v.StringSchema<undefined>, undefined>,
								undefined
							>;
							readonly cookiePolicy: v.OptionalSchema<
								v.OptionalSchema<v.StringSchema<undefined>, undefined>,
								undefined
							>;
						};
						readonly '~standard': v.StandardProps<
							{
								privacyPolicy?: string | undefined;
								termsOfService?: string | undefined;
								cookiePolicy?: string | undefined;
							},
							{
								privacyPolicy?: string | undefined;
								termsOfService?: string | undefined;
								cookiePolicy?: string | undefined;
							}
						>;
						readonly '~run': (
							dataset: v.UnknownDataset,
							config: v.Config<v.BaseIssue<unknown>>
						) => v.OutputDataset<
							{
								privacyPolicy?: string | undefined;
								termsOfService?: string | undefined;
								cookiePolicy?: string | undefined;
							},
							v.StringIssue | v.ObjectIssue
						>;
						readonly '~types'?:
							| {
									readonly input: {
										privacyPolicy?: string | undefined;
										termsOfService?: string | undefined;
										cookiePolicy?: string | undefined;
									};
									readonly output: {
										privacyPolicy?: string | undefined;
										termsOfService?: string | undefined;
										cookiePolicy?: string | undefined;
									};
									readonly issue: v.StringIssue | v.ObjectIssue;
							  }
							| undefined;
					},
					undefined
				>;
			},
			undefined
		>,
	],
	undefined
>;
/**
 * Location schema for init output
 */
export declare const locationSchema: v.ObjectSchema<
	{
		readonly countryCode: v.NullableSchema<
			v.StringSchema<undefined>,
			undefined
		>;
		readonly regionCode: v.NullableSchema<v.StringSchema<undefined>, undefined>;
	},
	undefined
>;
/**
 * Matching strategy used to resolve the policy for the request.
 */
export declare const policyMatchedBySchema: v.PicklistSchema<
	['region', 'country', 'default', 'fallback'],
	undefined
>;
/**
 * Resolved runtime policy returned by /init.
 */
export declare const resolvedPolicySchema: v.ObjectSchema<
	{
		readonly id: v.StringSchema<undefined>;
		readonly model: any;
		readonly i18n: v.OptionalSchema<
			v.ObjectSchema<
				{
					readonly language: v.OptionalSchema<
						v.StringSchema<undefined>,
						undefined
					>;
					readonly messageProfile: v.OptionalSchema<
						v.StringSchema<undefined>,
						undefined
					>;
				},
				undefined
			>,
			undefined
		>;
		readonly consent: v.OptionalSchema<
			v.ObjectSchema<
				{
					readonly expiryDays: v.OptionalSchema<
						v.NumberSchema<undefined>,
						undefined
					>;
					readonly scopeMode: v.OptionalSchema<any, undefined>;
					readonly categories: v.OptionalSchema<
						v.ArraySchema<v.StringSchema<undefined>, undefined>,
						undefined
					>;
					readonly preselectedCategories: v.OptionalSchema<
						v.ArraySchema<v.StringSchema<undefined>, undefined>,
						undefined
					>;
					readonly gpc: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
				},
				undefined
			>,
			undefined
		>;
		readonly ui: v.OptionalSchema<
			v.ObjectSchema<
				{
					readonly mode: v.OptionalSchema<any, undefined>;
					readonly banner: v.OptionalSchema<any, undefined>;
					readonly dialog: v.OptionalSchema<any, undefined>;
				},
				undefined
			>,
			undefined
		>;
		readonly proof: v.OptionalSchema<
			v.ObjectSchema<
				{
					readonly storeIp: v.OptionalSchema<
						v.BooleanSchema<undefined>,
						undefined
					>;
					readonly storeUserAgent: v.OptionalSchema<
						v.BooleanSchema<undefined>,
						undefined
					>;
					readonly storeLanguage: v.OptionalSchema<
						v.BooleanSchema<undefined>,
						undefined
					>;
				},
				undefined
			>,
			undefined
		>;
	},
	undefined
>;
/**
 * Explainability details for the resolved policy decision.
 */
export declare const policyDecisionSchema: v.ObjectSchema<
	{
		readonly policyId: v.StringSchema<undefined>;
		readonly fingerprint: v.StringSchema<undefined>;
		readonly matchedBy: v.PicklistSchema<
			['region', 'country', 'default', 'fallback'],
			undefined
		>;
		readonly country: v.NullableSchema<v.StringSchema<undefined>, undefined>;
		readonly region: v.NullableSchema<v.StringSchema<undefined>, undefined>;
		readonly jurisdiction: any;
	},
	undefined
>;
/**
 * Output schema for init endpoint
 */
export declare const initOutputSchema: v.ObjectSchema<
	{
		readonly jurisdiction: any;
		readonly location: v.ObjectSchema<
			{
				readonly countryCode: v.NullableSchema<
					v.StringSchema<undefined>,
					undefined
				>;
				readonly regionCode: v.NullableSchema<
					v.StringSchema<undefined>,
					undefined
				>;
			},
			undefined
		>;
		readonly translations: v.ObjectSchema<
			{
				readonly language: v.StringSchema<undefined>;
				readonly translations: v.UnionSchema<
					[
						v.ObjectSchema<
							{
								readonly common: v.ObjectSchema<
									{
										readonly acceptAll: v.StringSchema<undefined>;
										readonly rejectAll: v.StringSchema<undefined>;
										readonly customize: v.StringSchema<undefined>;
										readonly save: v.StringSchema<undefined>;
									},
									undefined
								>;
								readonly cookieBanner: v.ObjectSchema<
									{
										readonly title: v.StringSchema<undefined>;
										readonly description: v.StringSchema<undefined>;
									},
									undefined
								>;
								readonly consentManagerDialog: v.ObjectSchema<
									{
										readonly title: v.StringSchema<undefined>;
										readonly description: v.StringSchema<undefined>;
									},
									undefined
								>;
								readonly consentTypes: v.ObjectSchema<
									{
										readonly experience: v.ObjectSchema<
											{
												readonly title: v.StringSchema<undefined>;
												readonly description: v.StringSchema<undefined>;
											},
											undefined
										>;
										readonly functionality: v.ObjectSchema<
											{
												readonly title: v.StringSchema<undefined>;
												readonly description: v.StringSchema<undefined>;
											},
											undefined
										>;
										readonly marketing: v.ObjectSchema<
											{
												readonly title: v.StringSchema<undefined>;
												readonly description: v.StringSchema<undefined>;
											},
											undefined
										>;
										readonly measurement: v.ObjectSchema<
											{
												readonly title: v.StringSchema<undefined>;
												readonly description: v.StringSchema<undefined>;
											},
											undefined
										>;
										readonly necessary: v.ObjectSchema<
											{
												readonly title: v.StringSchema<undefined>;
												readonly description: v.StringSchema<undefined>;
											},
											undefined
										>;
									},
									undefined
								>;
								readonly frame: v.ObjectSchema<
									{
										readonly title: v.StringSchema<undefined>;
										readonly actionButton: v.StringSchema<undefined>;
									},
									undefined
								>;
								readonly legalLinks: v.ObjectSchema<
									{
										readonly privacyPolicy: v.StringSchema<undefined>;
										readonly termsOfService: v.StringSchema<undefined>;
										readonly cookiePolicy: v.StringSchema<undefined>;
									},
									undefined
								>;
							},
							undefined
						>,
						v.ObjectSchema<
							{
								readonly common: Omit<
									v.ObjectSchema<
										{
											readonly acceptAll: v.OptionalSchema<
												v.StringSchema<undefined>,
												undefined
											>;
											readonly rejectAll: v.OptionalSchema<
												v.StringSchema<undefined>,
												undefined
											>;
											readonly customize: v.OptionalSchema<
												v.StringSchema<undefined>,
												undefined
											>;
											readonly save: v.OptionalSchema<
												v.StringSchema<undefined>,
												undefined
											>;
										},
										undefined
									>,
									'~types' | '~run' | '~standard' | 'entries'
								> & {
									readonly entries: {
										readonly acceptAll: v.OptionalSchema<
											v.OptionalSchema<v.StringSchema<undefined>, undefined>,
											undefined
										>;
										readonly rejectAll: v.OptionalSchema<
											v.OptionalSchema<v.StringSchema<undefined>, undefined>,
											undefined
										>;
										readonly customize: v.OptionalSchema<
											v.OptionalSchema<v.StringSchema<undefined>, undefined>,
											undefined
										>;
										readonly save: v.OptionalSchema<
											v.OptionalSchema<v.StringSchema<undefined>, undefined>,
											undefined
										>;
									};
									readonly '~standard': v.StandardProps<
										{
											acceptAll?: string | undefined;
											rejectAll?: string | undefined;
											customize?: string | undefined;
											save?: string | undefined;
										},
										{
											acceptAll?: string | undefined;
											rejectAll?: string | undefined;
											customize?: string | undefined;
											save?: string | undefined;
										}
									>;
									readonly '~run': (
										dataset: v.UnknownDataset,
										config: v.Config<v.BaseIssue<unknown>>
									) => v.OutputDataset<
										{
											acceptAll?: string | undefined;
											rejectAll?: string | undefined;
											customize?: string | undefined;
											save?: string | undefined;
										},
										v.StringIssue | v.ObjectIssue
									>;
									readonly '~types'?:
										| {
												readonly input: {
													acceptAll?: string | undefined;
													rejectAll?: string | undefined;
													customize?: string | undefined;
													save?: string | undefined;
												};
												readonly output: {
													acceptAll?: string | undefined;
													rejectAll?: string | undefined;
													customize?: string | undefined;
													save?: string | undefined;
												};
												readonly issue: v.StringIssue | v.ObjectIssue;
										  }
										| undefined;
								};
								readonly cookieBanner: v.ObjectSchema<
									{
										readonly title: v.OptionalSchema<
											v.StringSchema<undefined>,
											undefined
										>;
										readonly description: v.OptionalSchema<
											v.StringSchema<undefined>,
											undefined
										>;
									},
									undefined
								>;
								readonly consentManagerDialog: v.ObjectSchema<
									{
										readonly title: v.OptionalSchema<
											v.StringSchema<undefined>,
											undefined
										>;
										readonly description: v.OptionalSchema<
											v.StringSchema<undefined>,
											undefined
										>;
									},
									undefined
								>;
								readonly consentTypes: Omit<
									v.ObjectSchema<
										{
											readonly experience: v.ObjectSchema<
												{
													readonly title: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
													readonly description: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
												},
												undefined
											>;
											readonly functionality: v.ObjectSchema<
												{
													readonly title: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
													readonly description: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
												},
												undefined
											>;
											readonly marketing: v.ObjectSchema<
												{
													readonly title: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
													readonly description: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
												},
												undefined
											>;
											readonly measurement: v.ObjectSchema<
												{
													readonly title: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
													readonly description: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
												},
												undefined
											>;
											readonly necessary: v.ObjectSchema<
												{
													readonly title: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
													readonly description: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
												},
												undefined
											>;
										},
										undefined
									>,
									'~types' | '~run' | '~standard' | 'entries'
								> & {
									readonly entries: {
										readonly experience: v.OptionalSchema<
											v.ObjectSchema<
												{
													readonly title: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
													readonly description: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
												},
												undefined
											>,
											undefined
										>;
										readonly functionality: v.OptionalSchema<
											v.ObjectSchema<
												{
													readonly title: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
													readonly description: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
												},
												undefined
											>,
											undefined
										>;
										readonly marketing: v.OptionalSchema<
											v.ObjectSchema<
												{
													readonly title: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
													readonly description: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
												},
												undefined
											>,
											undefined
										>;
										readonly measurement: v.OptionalSchema<
											v.ObjectSchema<
												{
													readonly title: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
													readonly description: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
												},
												undefined
											>,
											undefined
										>;
										readonly necessary: v.OptionalSchema<
											v.ObjectSchema<
												{
													readonly title: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
													readonly description: v.OptionalSchema<
														v.StringSchema<undefined>,
														undefined
													>;
												},
												undefined
											>,
											undefined
										>;
									};
									readonly '~standard': v.StandardProps<
										{
											experience?:
												| {
														title?: string | undefined;
														description?: string | undefined;
												  }
												| undefined;
											functionality?:
												| {
														title?: string | undefined;
														description?: string | undefined;
												  }
												| undefined;
											marketing?:
												| {
														title?: string | undefined;
														description?: string | undefined;
												  }
												| undefined;
											measurement?:
												| {
														title?: string | undefined;
														description?: string | undefined;
												  }
												| undefined;
											necessary?:
												| {
														title?: string | undefined;
														description?: string | undefined;
												  }
												| undefined;
										},
										{
											experience?:
												| {
														title?: string | undefined;
														description?: string | undefined;
												  }
												| undefined;
											functionality?:
												| {
														title?: string | undefined;
														description?: string | undefined;
												  }
												| undefined;
											marketing?:
												| {
														title?: string | undefined;
														description?: string | undefined;
												  }
												| undefined;
											measurement?:
												| {
														title?: string | undefined;
														description?: string | undefined;
												  }
												| undefined;
											necessary?:
												| {
														title?: string | undefined;
														description?: string | undefined;
												  }
												| undefined;
										}
									>;
									readonly '~run': (
										dataset: v.UnknownDataset,
										config: v.Config<v.BaseIssue<unknown>>
									) => v.OutputDataset<
										{
											experience?:
												| {
														title?: string | undefined;
														description?: string | undefined;
												  }
												| undefined;
											functionality?:
												| {
														title?: string | undefined;
														description?: string | undefined;
												  }
												| undefined;
											marketing?:
												| {
														title?: string | undefined;
														description?: string | undefined;
												  }
												| undefined;
											measurement?:
												| {
														title?: string | undefined;
														description?: string | undefined;
												  }
												| undefined;
											necessary?:
												| {
														title?: string | undefined;
														description?: string | undefined;
												  }
												| undefined;
										},
										v.StringIssue | v.ObjectIssue
									>;
									readonly '~types'?:
										| {
												readonly input: {
													experience?:
														| {
																title?: string | undefined;
																description?: string | undefined;
														  }
														| undefined;
													functionality?:
														| {
																title?: string | undefined;
																description?: string | undefined;
														  }
														| undefined;
													marketing?:
														| {
																title?: string | undefined;
																description?: string | undefined;
														  }
														| undefined;
													measurement?:
														| {
																title?: string | undefined;
																description?: string | undefined;
														  }
														| undefined;
													necessary?:
														| {
																title?: string | undefined;
																description?: string | undefined;
														  }
														| undefined;
												};
												readonly output: {
													experience?:
														| {
																title?: string | undefined;
																description?: string | undefined;
														  }
														| undefined;
													functionality?:
														| {
																title?: string | undefined;
																description?: string | undefined;
														  }
														| undefined;
													marketing?:
														| {
																title?: string | undefined;
																description?: string | undefined;
														  }
														| undefined;
													measurement?:
														| {
																title?: string | undefined;
																description?: string | undefined;
														  }
														| undefined;
													necessary?:
														| {
																title?: string | undefined;
																description?: string | undefined;
														  }
														| undefined;
												};
												readonly issue: v.StringIssue | v.ObjectIssue;
										  }
										| undefined;
								};
								readonly frame: v.OptionalSchema<
									Omit<
										v.ObjectSchema<
											{
												readonly title: v.OptionalSchema<
													v.StringSchema<undefined>,
													undefined
												>;
												readonly actionButton: v.OptionalSchema<
													v.StringSchema<undefined>,
													undefined
												>;
											},
											undefined
										>,
										'~types' | '~run' | '~standard' | 'entries'
									> & {
										readonly entries: {
											readonly title: v.OptionalSchema<
												v.OptionalSchema<v.StringSchema<undefined>, undefined>,
												undefined
											>;
											readonly actionButton: v.OptionalSchema<
												v.OptionalSchema<v.StringSchema<undefined>, undefined>,
												undefined
											>;
										};
										readonly '~standard': v.StandardProps<
											{
												title?: string | undefined;
												actionButton?: string | undefined;
											},
											{
												title?: string | undefined;
												actionButton?: string | undefined;
											}
										>;
										readonly '~run': (
											dataset: v.UnknownDataset,
											config: v.Config<v.BaseIssue<unknown>>
										) => v.OutputDataset<
											{
												title?: string | undefined;
												actionButton?: string | undefined;
											},
											v.StringIssue | v.ObjectIssue
										>;
										readonly '~types'?:
											| {
													readonly input: {
														title?: string | undefined;
														actionButton?: string | undefined;
													};
													readonly output: {
														title?: string | undefined;
														actionButton?: string | undefined;
													};
													readonly issue: v.StringIssue | v.ObjectIssue;
											  }
											| undefined;
									},
									undefined
								>;
								readonly legalLinks: v.OptionalSchema<
									Omit<
										v.ObjectSchema<
											{
												readonly privacyPolicy: v.OptionalSchema<
													v.StringSchema<undefined>,
													undefined
												>;
												readonly termsOfService: v.OptionalSchema<
													v.StringSchema<undefined>,
													undefined
												>;
												readonly cookiePolicy: v.OptionalSchema<
													v.StringSchema<undefined>,
													undefined
												>;
											},
											undefined
										>,
										'~types' | '~run' | '~standard' | 'entries'
									> & {
										readonly entries: {
											readonly privacyPolicy: v.OptionalSchema<
												v.OptionalSchema<v.StringSchema<undefined>, undefined>,
												undefined
											>;
											readonly termsOfService: v.OptionalSchema<
												v.OptionalSchema<v.StringSchema<undefined>, undefined>,
												undefined
											>;
											readonly cookiePolicy: v.OptionalSchema<
												v.OptionalSchema<v.StringSchema<undefined>, undefined>,
												undefined
											>;
										};
										readonly '~standard': v.StandardProps<
											{
												privacyPolicy?: string | undefined;
												termsOfService?: string | undefined;
												cookiePolicy?: string | undefined;
											},
											{
												privacyPolicy?: string | undefined;
												termsOfService?: string | undefined;
												cookiePolicy?: string | undefined;
											}
										>;
										readonly '~run': (
											dataset: v.UnknownDataset,
											config: v.Config<v.BaseIssue<unknown>>
										) => v.OutputDataset<
											{
												privacyPolicy?: string | undefined;
												termsOfService?: string | undefined;
												cookiePolicy?: string | undefined;
											},
											v.StringIssue | v.ObjectIssue
										>;
										readonly '~types'?:
											| {
													readonly input: {
														privacyPolicy?: string | undefined;
														termsOfService?: string | undefined;
														cookiePolicy?: string | undefined;
													};
													readonly output: {
														privacyPolicy?: string | undefined;
														termsOfService?: string | undefined;
														cookiePolicy?: string | undefined;
													};
													readonly issue: v.StringIssue | v.ObjectIssue;
											  }
											| undefined;
									},
									undefined
								>;
							},
							undefined
						>,
					],
					undefined
				>;
			},
			undefined
		>;
		readonly branding: any;
		/**
		 * Global Vendor List for IAB TCF compliance.
		 * Present when IAB is active for the resolved request policy.
		 * For policy-based setups, non-IAB policies omit this field.
		 * If absent (and response is 200), IAB mode should be disabled on client.
		 */
		readonly gvl: v.OptionalSchema<v.NullableSchema<any, undefined>, undefined>;
		/**
		 * Custom vendors not registered with IAB.
		 * These are configured on the backend and synced to the frontend.
		 */
		readonly customVendors: v.OptionalSchema<
			v.ArraySchema<any, undefined>,
			undefined
		>;
		/**
		 * CMP ID registered with IAB Europe.
		 * Provided by the backend when IAB is enabled and a CMP ID is configured.
		 */
		readonly cmpId: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
		/**
		 * Runtime policy resolved for the request's geo/jurisdiction context.
		 * Present only when backend policies are configured and a match is found.
		 */
		readonly policy: v.OptionalSchema<
			v.ObjectSchema<
				{
					readonly id: v.StringSchema<undefined>;
					readonly model: any;
					readonly i18n: v.OptionalSchema<
						v.ObjectSchema<
							{
								readonly language: v.OptionalSchema<
									v.StringSchema<undefined>,
									undefined
								>;
								readonly messageProfile: v.OptionalSchema<
									v.StringSchema<undefined>,
									undefined
								>;
							},
							undefined
						>,
						undefined
					>;
					readonly consent: v.OptionalSchema<
						v.ObjectSchema<
							{
								readonly expiryDays: v.OptionalSchema<
									v.NumberSchema<undefined>,
									undefined
								>;
								readonly scopeMode: v.OptionalSchema<any, undefined>;
								readonly categories: v.OptionalSchema<
									v.ArraySchema<v.StringSchema<undefined>, undefined>,
									undefined
								>;
								readonly preselectedCategories: v.OptionalSchema<
									v.ArraySchema<v.StringSchema<undefined>, undefined>,
									undefined
								>;
								readonly gpc: v.OptionalSchema<
									v.BooleanSchema<undefined>,
									undefined
								>;
							},
							undefined
						>,
						undefined
					>;
					readonly ui: v.OptionalSchema<
						v.ObjectSchema<
							{
								readonly mode: v.OptionalSchema<any, undefined>;
								readonly banner: v.OptionalSchema<any, undefined>;
								readonly dialog: v.OptionalSchema<any, undefined>;
							},
							undefined
						>,
						undefined
					>;
					readonly proof: v.OptionalSchema<
						v.ObjectSchema<
							{
								readonly storeIp: v.OptionalSchema<
									v.BooleanSchema<undefined>,
									undefined
								>;
								readonly storeUserAgent: v.OptionalSchema<
									v.BooleanSchema<undefined>,
									undefined
								>;
								readonly storeLanguage: v.OptionalSchema<
									v.BooleanSchema<undefined>,
									undefined
								>;
							},
							undefined
						>,
						undefined
					>;
				},
				undefined
			>,
			undefined
		>;
		/**
		 * Explainability details for how the runtime policy was matched.
		 */
		readonly policyDecision: v.OptionalSchema<
			v.ObjectSchema<
				{
					readonly policyId: v.StringSchema<undefined>;
					readonly fingerprint: v.StringSchema<undefined>;
					readonly matchedBy: v.PicklistSchema<
						['region', 'country', 'default', 'fallback'],
						undefined
					>;
					readonly country: v.NullableSchema<
						v.StringSchema<undefined>,
						undefined
					>;
					readonly region: v.NullableSchema<
						v.StringSchema<undefined>,
						undefined
					>;
					readonly jurisdiction: any;
				},
				undefined
			>,
			undefined
		>;
		/**
		 * Signed policy snapshot token to ensure write-time consistency.
		 * Present when backend policy snapshots are configured.
		 */
		readonly policySnapshotToken: v.OptionalSchema<
			v.StringSchema<undefined>,
			undefined
		>;
	},
	undefined
>;
export type InitOutput = v.InferOutput<typeof initOutputSchema>;
export type TranslationsResponse = v.InferOutput<typeof translationsSchema>;
export type LocationResponse = v.InferOutput<typeof locationSchema>;
/**
 * Runtime policy payload returned by `/init`.
 *
 * This is the fully resolved policy after backend geo/jurisdiction matching.
 * Frontend clients can persist this object and reuse it as an outage fallback.
 */
export type ResolvedPolicy = v.InferOutput<typeof resolvedPolicySchema>;
/**
 * Explainability metadata describing how the runtime policy was matched.
 *
 * Includes the match strategy (`matchedBy`), normalized location context,
 * and a deterministic policy fingerprint for snapshot consistency checks.
 */
export type PolicyDecision = v.InferOutput<typeof policyDecisionSchema>;
