/**
 * Re-exported from `@c15t/schema` so there is exactly one implementation.
 *
 * Origin allowlisting is a security decision, and during RFC 0004's parallel
 * phase both backends answer for the same tenants with the same trusted
 * domains — an origin accepted by one and rejected by the other is either a
 * hole or an outage depending on direction.
 */
export { isOriginTrusted } from '@c15t/schema/geo';
