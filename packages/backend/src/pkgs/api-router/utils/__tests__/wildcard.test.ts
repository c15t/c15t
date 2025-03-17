import { describe, test, expect } from 'vitest';
import { wildcardMatch } from '../wildcard';

describe('wildcardMatch', () => {
  // Basic pattern matching
  describe('Basic patterns', () => {
    test('should match exact strings', () => {
      const matcher = wildcardMatch('test');
      expect(matcher('test')).toBe(true);
      expect(matcher('test-not')).toBe(false);
    });

    test('should match with * wildcard', () => {
      const matcher = wildcardMatch('*.example.com');
      expect(matcher('test.example.com')).toBe(true);
      expect(matcher('sub.test.example.com')).toBe(true);
      expect(matcher('example.com')).toBe(false);
    });

    test('should match with ? wildcard', () => {
      const matcher = wildcardMatch('test?');
      expect(matcher('testa')).toBe(true);
      expect(matcher('testb')).toBe(true);
      expect(matcher('test')).toBe(false);
      expect(matcher('testab')).toBe(false);
    });

    test('should match with combined wildcards', () => {
      const matcher = wildcardMatch('test-*-?');
      expect(matcher('test-abc-d')).toBe(true);
      expect(matcher('test--x')).toBe(true);
      expect(matcher('test-')).toBe(false);
      expect(matcher('test-abc')).toBe(false);
    });
  });

  // Path-based matching
  describe('Path patterns', () => {
    test('should match path patterns with default separator', () => {
      const matcher = wildcardMatch('api/*/users');
      expect(matcher('api/v1/users')).toBe(true);
      expect(matcher('api/admin/users')).toBe(true);
      expect(matcher('api//users')).toBe(true);
      expect(matcher('api/v1/v2/users')).toBe(false);
      expect(matcher('api/users')).toBe(false);
    });

    test('should handle trailing separators', () => {
      const matcher = wildcardMatch('api/v1/');
      expect(matcher('api/v1/')).toBe(true);
      expect(matcher('api/v1///')).toBe(true);
      expect(matcher('api/v1')).toBe(false);
    });

    test('should handle forward and backslash as separators with true option', () => {
      const matcher = wildcardMatch('api/*/users', { separator: true });
      expect(matcher('api/v1/users')).toBe(true);
      
      const backslashInput = 'api\\v1\\users';
      expect(matcher(backslashInput)).toBe(true);
    });
  });

  // Multiple patterns
  describe('Multiple patterns', () => {
    test('should match from an array of patterns', () => {
      const matcher = wildcardMatch(['*.js', '*.ts']);
      expect(matcher('file.js')).toBe(true);
      expect(matcher('file.ts')).toBe(true);
      expect(matcher('file.css')).toBe(false);
    });

    test('should handle patterns with different separators', () => {
      const matcher = wildcardMatch(['api/v1/*', 'api/v2/*']);
      expect(matcher('api/v1/users')).toBe(true);
      expect(matcher('api/v2/settings')).toBe(true);
      expect(matcher('api/v3/users')).toBe(false);
    });
  });

  // Custom separators
  describe('Custom separators', () => {
    test('should work with dot as separator', () => {
      const matcher = wildcardMatch('*' + '.' + 'example' + '.' + 'com', { separator: '.' });
      
      expect(matcher('test.example.com')).toBe(true);
      
      expect(matcher('sub.test.example.com')).toBe(false);
      
      expect(matcher('testexample.com')).toBe(false);
    });

    test('should work with multi-character separator', () => {
      const matcher = wildcardMatch('prefix::*::suffix', { separator: '::' });
      expect(matcher('prefix::middle::suffix')).toBe(true);
      expect(matcher('prefix::::suffix')).toBe(true);
      expect(matcher('prefix:middle:suffix')).toBe(false);
    });

    test('should handle patterns without separators', () => {
      const matcher = wildcardMatch('a*c', { separator: false });
      expect(matcher('abc')).toBe(true);
      expect(matcher('ac')).toBe(false);
      expect(matcher('a/b/c')).toBe(false);
    });
  });

  // Case sensitivity
  describe('Case sensitivity', () => {
    test('should be case sensitive by default', () => {
      const matcher = wildcardMatch('test');
      expect(matcher('test')).toBe(true);
      expect(matcher('TEST')).toBe(false);
    });

    test('should support case insensitive matching', () => {
      const matcher = wildcardMatch('test', { flags: 'i' });
      expect(matcher('test')).toBe(true);
      expect(matcher('TEST')).toBe(true);
      expect(matcher('Test')).toBe(true);
    });
  });

  // Matcher function properties
  describe('Matcher function properties', () => {
    test('should expose pattern property', () => {
      const pattern = 'test-*';
      const matcher = wildcardMatch(pattern);
      expect(matcher.pattern).toBe(pattern);
    });

    test('should expose options property', () => {
      const matcher = wildcardMatch('test', { separator: '.' });
      expect(matcher.options.separator).toBe('.');
    });

    test('should expose regexp property', () => {
      const matcher = wildcardMatch('test-*');
      expect(matcher.regexp instanceof RegExp).toBe(true);
      expect(matcher.regexp.test('test-abc')).toBe(true);
    });
  });

  // Error handling
  describe('Error handling', () => {
    test('should throw if pattern is not a string or array', () => {
      // @ts-expect-error Testing invalid input
      expect(() => wildcardMatch(123)).toThrow(TypeError);
      // @ts-expect-error Testing invalid input
      expect(() => wildcardMatch(null)).toThrow(TypeError);
    });

    test('should throw if options is invalid', () => {
      // @ts-expect-error Testing invalid input
      expect(() => wildcardMatch('test', 123)).toThrow(TypeError);
      // @ts-expect-error Testing invalid input
      expect(() => wildcardMatch('test', [])).toThrow(TypeError);
    });

    test('should throw if backslash is used as separator', () => {
      expect(() => wildcardMatch('test', { separator: '\\' })).toThrow(Error);
    });
  });
}); 