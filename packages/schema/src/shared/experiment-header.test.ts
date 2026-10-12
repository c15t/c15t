import { describe, expect, it } from 'vitest';

import {
	formatExperimentHeader,
	parseExperimentHeader,
} from './session-report';

describe('experiment header', () => {
	it('round-trips an id and arm, encoding separators', () => {
		const value = formatExperimentHeader({ arm: 'a=b', id: 'banner shape' });
		expect(value).toBe('banner%20shape=a%3Db');
		expect(parseExperimentHeader(value)).toEqual({
			arm: 'a=b',
			id: 'banner shape',
		});
	});

	it('reads anything malformed as no experiment', () => {
		for (const value of [
			undefined,
			null,
			'',
			'no-separator',
			'=arm',
			'id=',
			'%E0%A4%A=arm',
			`${'x'.repeat(129)}=arm`,
		]) {
			expect(parseExperimentHeader(value)).toBeNull();
		}
	});
});
