import {
	C15TDevTools as ReactC15TDevTools,
	ConsentDevTools as ReactConsentDevTools,
	DevTools as ReactDevTools,
	c15tDevtools as reactC15tDevtools,
} from '@c15t/react/devtools';
import { describe, expect, test } from 'vitest';

import {
	C15TDevTools,
	ConsentDevTools,
	c15tDevtools,
	DevTools,
} from '../devtools';

describe('@c15t/nextjs/v3/devtools', () => {
	test('re-exports the React v3 adapter without wrapping it', () => {
		expect(ConsentDevTools).toBe(ReactConsentDevTools);
		expect(DevTools).toBe(ReactDevTools);
		expect(C15TDevTools).toBe(ReactC15TDevTools);
		expect(c15tDevtools).toBe(reactC15tDevtools);
	});
});
