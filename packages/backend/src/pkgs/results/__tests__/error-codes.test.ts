import { describe, expect, it } from 'vitest';
import {
  ERROR_CATEGORIES,
  ERROR_CODES,
  createErrorCategories,
  createErrorCodes,
} from '../core/error-codes';

describe('error-codes', () => {
  describe('ERROR_CODES', () => {
    it('should contain basic error codes', () => {
      expect(ERROR_CODES.NOT_FOUND).toBe('Resource not found');
      expect(ERROR_CODES.BAD_REQUEST).toBe('Bad request');
      expect(ERROR_CODES.INTERNAL_SERVER_ERROR).toBe('Internal server error');
    });

    it('should be frozen (readonly)', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        ERROR_CODES.CUSTOM_ERROR = 'Custom error';
      }).toThrow();
    });
  });

  describe('ERROR_CATEGORIES', () => {
    it('should contain predefined error categories', () => {
      expect(ERROR_CATEGORIES.VALIDATION).toBe('validation');
      expect(ERROR_CATEGORIES.AUTHORIZATION).toBe('authorization');
      expect(ERROR_CATEGORIES.STORAGE).toBe('storage');
      expect(ERROR_CATEGORIES.NETWORK).toBe('network');
      expect(ERROR_CATEGORIES.PLUGIN).toBe('plugin');
      expect(ERROR_CATEGORIES.CONFIGURATION).toBe('configuration');
      expect(ERROR_CATEGORIES.UNEXPECTED).toBe('unexpected');
    });

    it('should be frozen (readonly)', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        ERROR_CATEGORIES.CUSTOM_CATEGORY = 'custom';
      }).toThrow();
    });
  });

  describe('createErrorCodes', () => {
    it('should create a readonly object with the provided error codes', () => {
      const BILLING_ERROR_CODES = createErrorCodes({
        PAYMENT_FAILED: 'Payment processing failed',
        INVOICE_NOT_FOUND: 'Invoice not found',
      });

      expect(BILLING_ERROR_CODES.PAYMENT_FAILED).toBe(
        'Payment processing failed'
      );
      expect(BILLING_ERROR_CODES.INVOICE_NOT_FOUND).toBe('Invoice not found');

      // Should be readonly
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        BILLING_ERROR_CODES.NEW_CODE = 'New code';
      }).toThrow();
    });
  });

  describe('createErrorCategories', () => {
    it('should create a readonly object with the provided error categories', () => {
      const CUSTOM_CATEGORIES = createErrorCategories({
        BILLING: 'billing',
        ANALYTICS: 'analytics',
      });

      expect(CUSTOM_CATEGORIES.BILLING).toBe('billing');
      expect(CUSTOM_CATEGORIES.ANALYTICS).toBe('analytics');

      // Should be readonly
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        CUSTOM_CATEGORIES.NEW_CATEGORY = 'new';
      }).toThrow();
    });
  });
});
