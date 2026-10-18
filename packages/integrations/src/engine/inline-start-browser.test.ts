import { describe, expect, it } from 'vitest';

import * as server from './inline-start';
import * as browser from './inline-start-browser';

describe('inline-start browser build', () => {
	it('exports what the server build exports', () => {
		expect(Object.keys(browser).sort()).toEqual(Object.keys(server).sort());
	});

	it('starts no vendor inline, so the script loader loads it', () => {
		expect(
			browser.inlineStepsStart([
				{ name: 'dataLayer', type: 'setGlobal', value: [] },
			])
		).toBeUndefined();
	});
});
