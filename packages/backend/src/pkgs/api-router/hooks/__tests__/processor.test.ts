import { describe, test, expect, vi, beforeEach } from 'vitest';
import { runBeforeHooks, runAfterHooks } from '../processor';
import defu from 'defu';

// Mock defu
vi.mock('defu', () => ({
  default: vi.fn().mockImplementation((source, defaults) => {
    return { ...defaults, ...source };
  })
}));

describe('Hook Processor Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runBeforeHooks', () => {
    test('should run matching hooks and merge context', async () => {
      const mockContext = {
        path: '/test',
        method: 'GET',
        headers: new Headers()
      };
      
      const hooks = [
        {
          matcher: (ctx) => ctx.path === '/test',
          handler: vi.fn().mockResolvedValue({
            context: { testKey1: 'value1' }
          })
        },
        {
          matcher: (ctx) => ctx.method === 'GET',
          handler: vi.fn().mockResolvedValue({
            context: { testKey2: 'value2' }
          })
        },
        {
          matcher: (ctx) => ctx.path === '/other',
          handler: vi.fn().mockResolvedValue({
            context: { shouldNotInclude: true }
          })
        }
      ];
      
      const result = await runBeforeHooks(mockContext, hooks);
      
      // First two hooks should run, third should not
      expect(hooks[0].handler).toHaveBeenCalledWith(expect.objectContaining({
        path: '/test',
        method: 'GET',
        returnHeaders: false
      }));
      expect(hooks[1].handler).toHaveBeenCalledWith(expect.objectContaining({
        path: '/test',
        method: 'GET',
        returnHeaders: false
      }));
      expect(hooks[2].handler).not.toHaveBeenCalled();
      
      // Context should be merged with both hooks' results
      expect(result).toEqual({
        context: expect.objectContaining({
          testKey1: 'value1',
          testKey2: 'value2'
        })
      });
      expect(result.context).not.toHaveProperty('shouldNotInclude');
    });
    
    test('should handle headers correctly', async () => {
      const mockContext = {
        path: '/test',
        headers: new Headers()
      };
      
      const headers1 = new Headers();
      headers1.set('X-Header-1', 'value1');
      
      const headers2 = new Headers();
      headers2.set('X-Header-2', 'value2');
      
      const hooks = [
        {
          matcher: () => true,
          handler: vi.fn().mockResolvedValue({
            context: { headers: headers1 }
          })
        },
        {
          matcher: () => true,
          handler: vi.fn().mockResolvedValue({
            context: { headers: headers2 }
          })
        }
      ];
      
      const result = await runBeforeHooks(mockContext, hooks);
      
      expect(result.context.headers).toBeInstanceOf(Headers);
      expect(result.context.headers.get('X-Header-1')).toBe('value1');
      expect(result.context.headers.get('X-Header-2')).toBe('value2');
    });
    
    test('should short-circuit when hook returns non-context result', async () => {
      const mockContext = {
        path: '/test'
      };
      
      const shortCircuitResponse = { data: 'short-circuit' };
      
      const hooks = [
        {
          matcher: () => true,
          handler: vi.fn().mockResolvedValue(shortCircuitResponse)
        },
        {
          matcher: () => true,
          handler: vi.fn().mockResolvedValue({
            context: { shouldNotRun: true }
          })
        }
      ];
      
      const result = await runBeforeHooks(mockContext, hooks);
      
      expect(hooks[0].handler).toHaveBeenCalled();
      expect(hooks[1].handler).not.toHaveBeenCalled();
      
      expect(result).toBe(shortCircuitResponse);
    });
  });

  describe('runAfterHooks', () => {
    test('should run matching hooks and collect response modifications', async () => {
      const mockContext = {
        path: '/test',
        method: 'GET',
        context: {
          returned: { original: true }
        }
      };
      
      const modifiedResponse = { modified: true };
      
      const hooks = [
        {
          matcher: (ctx) => ctx.path === '/test',
          handler: vi.fn().mockResolvedValue({
            response: modifiedResponse
          })
        },
        {
          matcher: (ctx) => ctx.method === 'GET',
          handler: vi.fn().mockResolvedValue({})
        },
        {
          matcher: (ctx) => ctx.path === '/other',
          handler: vi.fn().mockResolvedValue({
            response: { shouldNotUse: true }
          })
        }
      ];
      
      const result = await runAfterHooks(mockContext, hooks);
      
      // First two hooks should run, third should not
      expect(hooks[0].handler).toHaveBeenCalledWith(expect.objectContaining({
        path: '/test',
        method: 'GET',
        returnHeaders: true
      }));
      expect(hooks[1].handler).toHaveBeenCalledWith(expect.objectContaining({
        path: '/test',
        method: 'GET',
        returnHeaders: true
      }));
      expect(hooks[2].handler).not.toHaveBeenCalled();
      
      // Should use the response from the first hook
      expect(result.response).toBe(modifiedResponse);
    });
    
    test('should handle headers correctly', async () => {
      const mockContext = {
        path: '/test'
      };
      
      const headers1 = new Headers();
      headers1.set('X-Header-1', 'value1');
      
      const headers2 = new Headers();
      headers2.set('X-Header-2', 'value2');
      
      const hooks = [
        {
          matcher: () => true,
          handler: vi.fn().mockResolvedValue({
            headers: headers1
          })
        },
        {
          matcher: () => true,
          handler: vi.fn().mockResolvedValue({
            headers: headers2
          })
        }
      ];
      
      const result = await runAfterHooks(mockContext, hooks);
      
      expect(result.headers).toBeInstanceOf(Headers);
      expect(result.headers.get('X-Header-1')).toBe('value1');
      expect(result.headers.get('X-Header-2')).toBe('value2');
    });
    
    test('should return null response and headers when no hooks match', async () => {
      const mockContext = {
        path: '/test'
      };
      
      const hooks = [
        {
          matcher: () => false,
          handler: vi.fn()
        }
      ];
      
      const result = await runAfterHooks(mockContext, hooks);
      
      expect(hooks[0].handler).not.toHaveBeenCalled();
      expect(result.response).toBeNull();
      expect(result.headers).toBeNull();
    });
  });
}); 