import { expectTypeOf } from 'vitest';

import { builtInScriptIntegrations } from '../registry';
import type {
	BuiltInScriptIntegration,
	IntegrationCategory,
	IntegrationKind,
	IntegrationRegistryEntry,
} from '../registry';

expectTypeOf<IntegrationCategory>().toEqualTypeOf<
	| 'analytics'
	| 'ads-and-pixels'
	| 'email-and-sms'
	| 'functional'
	| 'tag-manager'
>();

const legacyEntry: IntegrationRegistryEntry = {
	consentCategory: 'measurement',
	docsSlug: 'custom-analytics',
	integrationCategory: 'analytics',
	key: 'customAnalytics',
	label: 'Custom analytics',
	packageSubpath: 'custom-analytics',
	vendor: 'custom-analytics',
};

expectTypeOf(legacyEntry.integrationKind).toEqualTypeOf<
	IntegrationKind | undefined
>();
const [firstBuiltIn] = builtInScriptIntegrations;
const { integrationKind, ...legacyBuiltInEntry } = firstBuiltIn;
const legacyBuiltIn: BuiltInScriptIntegration = legacyBuiltInEntry;
expectTypeOf(integrationKind).toMatchTypeOf<IntegrationKind>();
expectTypeOf(legacyBuiltIn.integrationKind).toMatchTypeOf<
	IntegrationKind | undefined
>();

declare const integration: BuiltInScriptIntegration;
if (integration.key === 'metaPixel') {
	expectTypeOf(integration.packageSubpath).toEqualTypeOf<'meta-pixel'>();
	expectTypeOf(
		integration.integrationCategory
	).toEqualTypeOf<'ads-and-pixels'>();
}
