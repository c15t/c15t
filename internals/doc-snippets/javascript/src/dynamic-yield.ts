// #region docs:dynamic-yield-scripts title="src/consent-scripts.ts"
import { dynamicYield } from '@c15t/integrations/dynamic-yield';

export const scripts = [
	dynamicYield({
		recommendationContext: { lng: 'en_GB', type: 'HOMEPAGE' },
		region: 'eu',
		sectionId: 'YOUR_SECTION_ID',
	}),
];
// #endregion docs:dynamic-yield-scripts
