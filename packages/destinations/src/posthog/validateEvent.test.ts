import { describe, expect, it } from 'vitest';

import { validateEvent } from './validateEvent';

describe('validateEvent', () => {
	it('should throw an error if event is missing', () => {
		expect(() => validateEvent({ distinct_id: 'test-id' })).toThrowError(
			'Event does not have a name'
		);
	});

	it('should throw an error if distinct_id is missing', () => {
		expect(() => validateEvent({ event: 'test-event' })).toThrowError(
			'Event does not have the distinct_id field set'
		);
	});

	it('should throw an error if distinct_id is an empty string', () => {
		expect(() =>
			validateEvent({ distinct_id: '', event: 'test-event' })
		).toThrowError('The distinct_id field of an event has an empty value');
	});

	it('should not throw an error if event and distinct_id are present', () => {
		expect(() =>
			validateEvent({ distinct_id: 'test-id', event: 'test-event' })
		).not.toThrow();
	});
});
