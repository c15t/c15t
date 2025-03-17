import { describe, test, expect } from 'vitest';
import { HIDE_METADATA, hideMetadata } from '../hide-metadata';

describe('hideMetadata', () => {
  test('should add isAction: false metadata to objects', () => {
    const obj = { name: 'test' };
    const hidden = hideMetadata(obj);
    
    expect(hidden).toEqual({
      ...obj,
      isAction: false
    });
  });
  
  test('should preserve existing properties', () => {
    const obj = { 
      id: 123,
      name: 'test',
      data: { value: 'something' }
    };
    
    const hidden = hideMetadata(obj);
    
    expect(hidden).toEqual({
      ...obj,
      isAction: false
    });
    
    expect(hidden.id).toBe(123);
    expect(hidden.name).toBe('test');
    expect(hidden.data).toEqual({ value: 'something' });
  });
  
  test('should overwrite existing isAction property', () => {
    const obj = { 
      name: 'test',
      isAction: true
    };
    
    const hidden = hideMetadata(obj);
    
    expect(hidden.isAction).toBe(false);
  });
});

describe('HIDE_METADATA', () => {
  test('should be an object with isAction: false', () => {
    expect(HIDE_METADATA).toEqual({
      isAction: false
    });
  });
  
  test('should be usable to spread into objects', () => {
    const obj = { 
      name: 'test',
      ...HIDE_METADATA
    };
    
    expect(obj.isAction).toBe(false);
    expect(obj.name).toBe('test');
  });
}); 