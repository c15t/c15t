import { describe, expect, it, vi } from 'vitest';
import { generateSecret } from '../src/commands/secret';
import logger from '../src/utils/logger';

// Define regex patterns at the top level
const SECRET_PATTERN = /C15T_SECRET=([a-f0-9]+)/i;
const HEX_PATTERN = /^[a-f0-9]+$/i;

describe('secret command', () => {
  it('should generate a valid 32-byte hex secret', async () => {
    // Mock the logger.info function to capture output
    const infoSpy = vi
      .spyOn(logger, 'info')
      .mockImplementation(() => undefined);

    // Create a spy to capture the output that would be sent to the console
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    // Execute the command's action directly
    await generateSecret.parseAsync([]);

    // Get the captured arguments from the logger call
    expect(infoSpy).toHaveBeenCalled();
    const loggerCall = infoSpy.mock.calls[0]?.[0];
    expect(loggerCall).toBeDefined();

    if (typeof loggerCall === 'string') {
      // Extract the secret from the logger output
      const match = loggerCall.match(SECRET_PATTERN);
      expect(match).not.toBeNull();

      if (match?.[1]) {
        const secret = match[1];

        // Verify the secret is a valid hex string
        expect(secret).toMatch(HEX_PATTERN);

        // Verify the secret is 64 characters long (32 bytes as hex)
        expect(secret.length).toBe(64);
      }
    }

    // Restore the original implementations
    infoSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
