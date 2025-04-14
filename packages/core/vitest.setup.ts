/**
 * Vitest setup file for Node.js environment
 *
 * Provides mock implementations for browser globals in Node.js environment
 * using specialized testing libraries for better compatibility.
 */
import { vi } from 'vitest';
import 'vitest-localstorage-mock';

// Create simple storage implementation
const mockStorage = {
  store: new Map(),
  getItem: vi.fn((key) => mockStorage.store.get(key) || null),
  setItem: vi.fn((key, value) => mockStorage.store.set(key, value)),
  removeItem: vi.fn((key) => mockStorage.store.delete(key)),
  clear: vi.fn(() => mockStorage.store.clear()),
  length: 0,
  key: vi.fn(() => null),
};

// Create a mock window object with location property
const mockWindow = {
  localStorage: mockStorage,
  location: {
    origin: 'https://test.example.com',
    pathname: '/',
    search: '',
    hash: '',
    href: 'https://test.example.com/',
  },
  fetch: vi.fn(() => Promise.resolve(new Response())),
  XMLHttpRequest: class MockXMLHttpRequest {
    static UNSENT = 0;
    static OPENED = 1;
    static HEADERS_RECEIVED = 2;
    static LOADING = 3;
    static DONE = 4;

    onreadystatechange = null;
    readyState = 0;
    response = null;
    responseText = '';
    responseType = '';
    status = 0;
    statusText = '';

    open = vi.fn();
    send = vi.fn();
    abort = vi.fn();
    setRequestHeader = vi.fn();
    getResponseHeader = vi.fn();
    getAllResponseHeaders = vi.fn();
  },
};

// If globals don't exist (Node.js environment), mock them
if (typeof window === 'undefined') {
  vi.stubGlobal('window', mockWindow);
}

if (typeof document === 'undefined') {
  vi.stubGlobal('document', {
    createElement: vi.fn(),
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelector: vi.fn(),
    cookie: '',
  });
}

// Create fetch mock
const fetchMock = vi
  .fn()
  .mockImplementation(() => Promise.resolve(new Response()));
vi.stubGlobal('fetch', fetchMock);

// Export mock objects for direct use in tests
export const mockLocalStorage = mockStorage;
export const mockDocument = globalThis.document;
export { fetchMock };

// Helper function for tracking blocker tests
export function createRejectingFetch(
  predicateFn: (url: string, options?: RequestInit) => boolean
) {
  return vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    if (predicateFn(url, options)) {
      return Promise.reject(
        new Error(`Request to ${url} blocked due to missing consent`)
      );
    }
    return Promise.resolve(new Response());
  });
}
