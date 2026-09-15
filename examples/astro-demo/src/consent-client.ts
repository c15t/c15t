import type { C15tClientOptionsExtension } from '@c15t/astro';

import { createExampleScripts } from './example-scripts';

export default {
	scripts: createExampleScripts(
		import.meta.env.PUBLIC_POSTHOG_KEY,
		import.meta.env.PUBLIC_X_PIXEL_ID
	),
} satisfies C15tClientOptionsExtension;
