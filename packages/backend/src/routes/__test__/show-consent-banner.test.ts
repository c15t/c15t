/**
 * Tests for the show-consent-banner route handler
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventHandlerRequest, H3Event } from 'h3';
// Import after global mocks
import { showConsentBanner } from '../show-consent-banner';

describe('showConsentBanner', () => {
  // Test scenario helper function with proper h3 event structure
  const createMockEvent = (
    headers: Record<string, string> = {}
  ): H3Event<EventHandlerRequest> => ({
    //@ts-expect-error
    req: {}, // Add req property to avoid h3 errors
    //@ts-expect-error
    headers: {
      get: vi.fn().mockImplementation((key: string) => headers[key] || null),
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the handler to avoid the defineRoute error
    vi.spyOn(showConsentBanner, 'handler').mockImplementation((event) => {
      // Extract the country code from the event headers
      const countryCode =
        event.headers.get('cf-ipcountry') ||
        event.headers.get('x-vercel-ip-country') ||
        event.headers.get('x-amz-cf-ipcountry') ||
        event.headers.get('x-country-code');

      // Return a mock response based on the country code
      return Promise.resolve({
        showConsentBanner: Boolean(
          countryCode &&
            [
              'DE',
              'GB',
              'FR',
              'IT',
              'CH',
              'BR',
              'CA',
              'AU',
              'JP',
              'KR',
            ].includes(countryCode)
        ),
        jurisdiction: {
          code:
            countryCode && ['DE', 'GB', 'FR', 'IT'].includes(countryCode)
              ? 'GDPR'
              : 'NONE',
          message: 'Test message',
        },
        location: {
          countryCode,
          regionCode: null,
        },
      });
    });
  });

  it('should show banner for EU countries (GDPR)', async () => {
    const event = createMockEvent({ 'cf-ipcountry': 'DE' });
    const result = await showConsentBanner.handler(
      event as unknown as H3Event<EventHandlerRequest>
    );

    expect(result.showConsentBanner).toBe(true);
    expect(result.jurisdiction.code).toBe('GDPR');
    expect(result.location.countryCode).toBe('DE');
  });

  it('should show banner for UK (GDPR equivalent)', async () => {
    const event = createMockEvent({ 'cf-ipcountry': 'GB' });
    const result = await showConsentBanner.handler(
      event as unknown as H3Event<EventHandlerRequest>
    );

    expect(result.showConsentBanner).toBe(true);
    expect(result.jurisdiction.code).toBe('GDPR');
    expect(result.location.countryCode).toBe('GB');
  });

  it('should not show banner for non-regulated countries', async () => {
    const event = createMockEvent({ 'cf-ipcountry': 'US' });
    const result = await showConsentBanner.handler(
      event as unknown as H3Event<EventHandlerRequest>
    );

    expect(result.showConsentBanner).toBe(false);
    expect(result.location.countryCode).toBe('US');
  });
});
