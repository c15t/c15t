/**
 * The encoders load with the write code and the decoders with the first
 * load, so each keeps its own copy of the compact codes. They must agree,
 * or a record this release writes would not read back.
 */
import { describe, expect, test } from 'vitest';

import { OPTIONAL_CONSENT_CATEGORIES } from '../../../consent-record/types';
import {
	CATEGORY_CODES as DECODED_CATEGORY_CODES,
	IAB_CODES as DECODED_IAB_CODES,
	SUBJECT_CODES as DECODED_SUBJECT_CODES,
} from '../record-codec';
import { CATEGORY_CODES, IAB_CODES, SUBJECT_CODES } from '../writer/encode';

describe('compact codes', () => {
	test('the encoder and the decoder use the same codes', () => {
		expect(Object.fromEntries(CATEGORY_CODES)).toEqual(DECODED_CATEGORY_CODES);
		expect(Object.fromEntries(SUBJECT_CODES)).toEqual(DECODED_SUBJECT_CODES);
		expect(Object.fromEntries(IAB_CODES)).toEqual(DECODED_IAB_CODES);
	});

	test('categories are encoded in the canonical order', () => {
		expect(CATEGORY_CODES.map(([category]) => category)).toEqual(
			OPTIONAL_CONSENT_CATEGORIES
		);
	});
});
