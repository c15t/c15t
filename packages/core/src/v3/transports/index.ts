/**
 * Transport factories. Each export is optional — consumers pick the one
 * that matches their backend shape.
 *
 * Public subpath: `c15t/v3/transports`.
 */

export type { HostedTransportOptions } from './hosted';
export { createHostedTransport } from './hosted';
