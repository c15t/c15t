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

	describe('IAB mode', () => {
		it('should return iab for GDPR jurisdiction when iabEnabled is true', () => {
			const result = determineModel('GDPR', true);
			expect(result).toBe('iab');
		});

		it('should return iab for UK_GDPR jurisdiction when iabEnabled is true', () => {
			const result = determineModel('UK_GDPR', true);
			expect(result).toBe('iab');
		});

		it('should return opt-in for GDPR jurisdiction when iabEnabled is false', () => {
			const result = determineModel('GDPR', false);
			expect(result).toBe('opt-in');
		});

		it('should return opt-in for GDPR jurisdiction when iabEnabled is undefined', () => {
			const result = determineModel('GDPR', undefined);
			expect(result).toBe('opt-in');
		});

		it('should NOT return iab for non-GDPR jurisdictions even when iabEnabled is true', () => {
			// CCPA should still be opt-out even with IAB enabled
			expect(determineModel('CCPA', true)).toBe('opt-out');

			// Other opt-in jurisdictions should stay opt-in (IAB only applies to GDPR)
			expect(determineModel('PIPEDA', true)).toBe('opt-in');
			expect(determineModel('APPI', true)).toBe('opt-in');
			expect(determineModel('CH', true)).toBe('opt-in');
			expect(determineModel('BR', true)).toBe('opt-in');
		});

		it('should return null for NONE jurisdiction regardless of iabEnabled', () => {
			expect(determineModel('NONE', true)).toBe(null);
			expect(determineModel(null, true)).toBe(null);
		});
	});
});
