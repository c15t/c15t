/**
 * Policy fixtures for the policies conformance suite.
 *
 * "Policies" here refers to the set of purposes/vendor policies that the
 * consent store exposes to UI components. The fixtures are intentionally
 * small — we want stable, readable snapshots, not realistic production
 * payloads.
 */

export type PolicyFixture = {
	id: string;
	label: Record<string, string>;
	description: Record<string, string>;
	required?: boolean;
};

export const MINIMAL_POLICIES: readonly PolicyFixture[] = [
	{
		id: 'necessary',
		label: { en: 'Necessary', de: 'Erforderlich', ar: 'ضروري' },
		description: {
			en: 'Required for the site to function.',
			de: 'Erforderlich für das Funktionieren der Website.',
			ar: 'مطلوب لكي يعمل الموقع.',
		},
		required: true,
	},
	{
		id: 'measurement',
		label: { en: 'Measurement', de: 'Messung', ar: 'قياس' },
		description: {
			en: 'Analytics and performance measurement.',
			de: 'Analyse und Leistungsmessung.',
			ar: 'التحليلات وقياس الأداء.',
		},
	},
	{
		id: 'marketing',
		label: { en: 'Marketing', de: 'Marketing', ar: 'تسويق' },
		description: {
			en: 'Targeted advertising.',
			de: 'Zielgerichtete Werbung.',
			ar: 'الإعلانات المستهدفة.',
		},
	},
];

export const EMPTY_POLICIES: readonly PolicyFixture[] = [];
