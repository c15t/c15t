import { describe, expect, it } from 'vitest';
import { determineModel } from './determine-model';

describe('determineModel', () => {
	it('should return null for null jurisdiction', () => {
		const result = determineModel(null);
		expect(result).toBe(null);
	});

	it('should return null for undefined jurisdiction', () => {
		const result = determineModel(undefined);
		expect(result).toBe(null);
	});

	it('should return opt-in for GDPR jurisdiction', () => {
		const result = determineModel('GDPR');
		expect(result).toBe('opt-in');
	});

	it('should return opt-out for CCPA jurisdiction', () => {
		const result = determineModel('CCPA');
		expect(result).toBe('opt-out');
	});

	it('should return null for NONE jurisdiction', () => {
		const result = determineModel('NONE');
		expect(result).toBe(null);
	});

	it('should return opt-in for UK_GDPR jurisdiction', () => {
		const result = determineModel('UK_GDPR');
		expect(result).toBe('opt-in');
	});

	it('should return opt-in for APPI jurisdiction', () => {
		const result = determineModel('APPI');
		expect(result).toBe('opt-in');
	});

	it('should return opt-in for PIPA jurisdiction', () => {
		const result = determineModel('PIPA');
		expect(result).toBe('opt-in');
	});

	it('should return opt-in for PIPEDA jurisdiction', () => {
		const result = determineModel('PIPEDA');
		expect(result).toBe('opt-in');
	});
});
