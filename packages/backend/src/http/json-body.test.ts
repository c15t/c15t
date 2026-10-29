import { assert, describe, it } from 'vitest';

import { isJsonContentType } from './json-body';

describe('isJsonContentType', () => {
	it.each([
		'application/json',
		'application/json; charset=utf-8',
		'application/json;charset=UTF-8',
		'Application/JSON',
		'application/merge-patch+json',
		'application/vnd.api+json; charset=utf-8',
	])('accepts %s', (contentType) => {
		assert.isTrue(isJsonContentType(contentType));
	});

	// The first three are the bodies a browser sends across origins without a
	// preflight; the rest only look like JSON.
	it.each([
		['no header', undefined],
		['an empty header', ''],
		['text/plain', 'text/plain;charset=UTF-8'],
		['a form', 'application/x-www-form-urlencoded'],
		['multipart', 'multipart/form-data; boundary=x'],
		['text/json', 'text/json'],
		['application/jsonp', 'application/jsonp'],
		['application/json-seq', 'application/json-seq'],
	])('refuses %s', (_label, contentType) => {
		assert.isFalse(isJsonContentType(contentType));
	});
});
