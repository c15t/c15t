import type { NodeSDK } from '@opentelemetry/sdk-node';

// The SDK reference is now moved to init.ts
// This variable will be set by init.ts through the setTelemetrySdk function
let sdk: NodeSDK | undefined;

/**
 * Updates the SDK reference - called from init.ts after initialization
 *
 * @param sdkInstance - The initialized NodeSDK instance
 */
export const setTelemetrySdk = (sdkInstance: NodeSDK) => {
	sdk = sdkInstance;
};
