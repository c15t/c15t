/**
 * Policy fixtures for the policies conformance suite.
 *
 * "Policies" here refers to the set of purposes/vendor policies that the
 * consent store exposes to UI components. The fixtures are intentionally
 * small — we want stable, readable snapshots, not realistic production
 * payloads.
 */

export interface PolicyFixture {
	id: string;
	label: Record<string, string>;
	description: Record<string, string>;
	required?: boolean;
}

export const MINIMAL_POLICIES: readonly PolicyFixture[] = [
	{
		description: {
			ar: 'مطلوب لكي يعمل الموقع.',
			de: 'Erforderlich für das Funktionieren der Website.',
			en: 'Required for the site to function.',
		},
		id: 'necessary',
		label: { ar: 'ضروري', de: 'Erforderlich', en: 'Necessary' },
		required: true,
	},
	{
		description: {
			ar: 'التحليلات وقياس الأداء.',
			de: 'Analyse und Leistungsmessung.',
			en: 'Analytics and performance measurement.',
		},
		id: 'measurement',
		label: { ar: 'قياس', de: 'Messung', en: 'Measurement' },
	},
	{
		description: {
			ar: 'الإعلانات المستهدفة.',
			de: 'Zielgerichtete Werbung.',
			en: 'Targeted advertising.',
		},
		id: 'marketing',
		label: { ar: 'تسويق', de: 'Marketing', en: 'Marketing' },
	},
];

export const EMPTY_POLICIES: readonly PolicyFixture[] = [];
