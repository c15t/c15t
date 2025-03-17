import { describe, test, expect, vi, beforeEach } from 'vitest';
import { getEndpoints, createApiRouter } from '../router';
import { createRouter } from 'better-call';
import { getIp } from '../../utils/ip';
import { logger } from '~/pkgs/logger';
import { toEndpoints } from '../../endpoints/converter';

// Mock dependencies
vi.mock('better-call', () => ({
  createRouter: vi.fn().mockReturnValue({
    handler: vi.fn(),
    use: vi.fn()
  }),
  APIError: class APIError extends Error {
    status: string;
    constructor(status: string, message: string) {
      super(message);
      this.status = status;
    }
  }
}));

vi.mock('../../utils/ip', () => ({
  getIp: vi.fn().mockReturnValue('192.168.1.1')
}));

vi.mock('~/pkgs/logger', () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../endpoints/converter', () => ({
  toEndpoints: vi.fn().mockImplementation((endpoints) => endpoints)
}));

describe('Router Module', () => {
  let mockContext: any;
  let mockOptions: any;
  let mockEndpoints: any;
  let mockHealthEndpoint: any;
  let mockOnRequest: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockOnRequest = vi.fn().mockResolvedValue({
      response: { modified: true }
    });
    
    // Create a basic mock context with required fields
    mockContext = {
      appName: 'test-app',
      trustedOrigins: ['https://example.com'],
      secret: 'test-secret',
      logger: { info: vi.fn(), error: vi.fn() },
      generateId: () => 'mock-id',
      adapter: { name: 'mock-adapter' },
      registry: { endpoints: {} },
      tables: { users: {} },
      baseURL: 'https://api.doubletie.com',
      hooks: [],
      session: null,
      options: {
        plugins: []
      }
    };
    
    // Create mock options
    mockOptions = {
      plugins: [
        {
          id: 'test-plugin',
          name: 'Test Plugin',
          type: 'api',
          endpoints: {
            pluginEndpoint: { path: '/plugin' }
          },
          middlewares: [
            {
              path: '/plugin-path',
              middleware: {
                options: { method: 'GET' }
              }
            }
          ],
          onRequest: mockOnRequest,
          onResponse: vi.fn()
        }
      ],
      onAPIError: {
        throw: false,
        onError: vi.fn()
      }
    };
    
    mockEndpoints = {
      testEndpoint: { path: '/test' }
    };
    
    mockHealthEndpoint = { path: '/health' };
  });

  describe('getEndpoints', () => {
    test('should merge base endpoints with plugin endpoints', () => {
      // Use type assertion to bypass type checking
      const result = getEndpoints(
        mockContext as any,
        mockOptions as any,
        mockEndpoints as any,
        mockHealthEndpoint as any
      );
      
      expect(toEndpoints).toHaveBeenCalled();
      expect(result).toHaveProperty('api');
      expect(result).toHaveProperty('middlewares');
    });
    
    test('should work with a context promise', async () => {
      const contextPromise = Promise.resolve(mockContext);
      
      // Use type assertion to bypass type checking
      const result = getEndpoints(
        contextPromise as any,
        mockOptions as any,
        mockEndpoints as any,
        mockHealthEndpoint as any
      );
      
      expect(toEndpoints).toHaveBeenCalled();
      expect(result).toHaveProperty('api');
      expect(result).toHaveProperty('middlewares');
    });
  });

  describe('createApiRouter', () => {
    test('should create a router with the correct configuration', () => {
      const coreMiddlewares = [
        { path: '/core', middleware: {} }
      ];
      
      // Use type assertion to bypass type checking
      createApiRouter(
        mockContext as any,
        mockOptions as any,
        mockEndpoints as any,
        mockHealthEndpoint as any,
        coreMiddlewares
      );
      
      expect(createRouter).toHaveBeenCalled();
    });
    
    test('should handle onRequest and add IP to context', () => {
      // Use type assertion to bypass type checking
      createApiRouter(
        mockContext as any,
        mockOptions as any,
        mockEndpoints as any,
        mockHealthEndpoint as any,
        []
      );
      
      const routerConfig = (createRouter as any).mock.calls[0][1];
      const mockRequest = new Request('https://api.example.com');
      
      // Call the onRequest handler directly
      routerConfig.onRequest(mockRequest);
      
      // Check that getIp was called
      expect(getIp).toHaveBeenCalled();
    });
    
    test('should handle errors in request processing', async () => {
      // Use type assertion to bypass type checking
      createApiRouter(
        mockContext as any,
        mockOptions as any,
        mockEndpoints as any,
        mockHealthEndpoint as any,
        []
      );
      
      const routerConfig = (createRouter as any).mock.calls[0][1];
      const error = new Error('Processing error');
      
      // Call the onError handler directly
      routerConfig.onError(error);
      
      expect(logger.error).toHaveBeenCalledWith('API error', { error });
    });
  });
}); 