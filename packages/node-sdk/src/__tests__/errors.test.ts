import { describe, expect, it } from 'vitest';

import { C15tError, isC15tError, unwrap } from '../index';
import { err, ok } from '../testing';

describe('isC15tError', () => {
	const notFound = new C15tError({ code: 'NOT_FOUND', message: 'gone' });

	it('matches any C15tError without codes', () => {
		expect(isC15tError(notFound)).toBe(true);
	});

	it('matches only the given codes', () => {
		expect(isC15tError(notFound, 'NOT_FOUND')).toBe(true);
		expect(isC15tError(notFound, 'TIMEOUT', 'NOT_FOUND')).toBe(true);
		expect(isC15tError(notFound, 'TIMEOUT')).toBe(false);
	});

	it.each([
		new Error('plain'),
		{ code: 'NOT_FOUND', message: 'look-alike', name: 'C15tError' },
		'NOT_FOUND',
		undefined,
	])('rejects %o', (value) => {
		expect(isC15tError(value)).toBe(false);
		expect(isC15tError(value, 'NOT_FOUND')).toBe(false);
	});
});

describe('unwrap', () => {
	it('returns the data of a success', () => {
		expect(unwrap(ok({ id: 'sub_abc' }))).toEqual({ id: 'sub_abc' });
	});

	it('throws the error of a failure', () => {
		const failure = err('NOT_FOUND');

		expect(() => unwrap(failure)).toThrow(failure.error);
	});
});

describe('C15tError', () => {
	it('is an Error with its fields', () => {
		const cause = new Error('socket hang up');
		const error = new C15tError({
			cause,
			code: 'NETWORK_ERROR',
			message: 'failed',
			requestId: 'req_1',
			retryable: true,
		});

		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe('C15tError');
		expect(error.cause).toBe(cause);
		expect(error.retryable).toBe(true);
		expect(error.status).toBeUndefined();
	});

	it('defaults retryable to false and leaves cause unset', () => {
		const error = new C15tError({ code: 'NOT_FOUND', message: 'gone' });

		expect(error.retryable).toBe(false);
		expect('cause' in error).toBe(false);
	});

	it('serialises to a plain object without the cause', () => {
		const error = new C15tError({
			cause: new Error('secret detail'),
			code: 'INVALID_INPUT',
			issues: [{ message: 'Expected a string.', path: ['externalId'] }],
			message: 'Invalid input',
			requestId: 'req_1',
			serverCode: 'X',
			status: 400,
		});

		expect(error.toJSON()).toEqual({
			code: 'INVALID_INPUT',
			issues: [{ message: 'Expected a string.', path: ['externalId'] }],
			message: 'Invalid input',
			name: 'C15tError',
			reason: undefined,
			requestId: 'req_1',
			retryable: false,
			serverCode: 'X',
			status: 400,
		});
		expect(JSON.stringify(error)).not.toContain('secret detail');
	});

	it('keeps reason for STALE_POLICY only', () => {
		const stale = new C15tError({
			code: 'STALE_POLICY',
			message: 'stale',
			reason: 'decision-mismatch',
		});
		const conflict = new C15tError({
			code: 'CONFLICT',
			message: 'conflict',
			reason: 'decision-mismatch',
		});

		expect(stale.reason).toBe('decision-mismatch');
		expect(conflict.reason).toBeUndefined();
		expect(conflict.toJSON().reason).toBeUndefined();
	});
});
