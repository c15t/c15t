/**
 * The hosted transport, as the chunk `clientMode()` loads on a re-init.
 *
 * The build bundles this entry with everything it imports, so the chunk
 * shares no module with a page's first-load JavaScript. Rolldown (Vite 8)
 * cannot merge a lazy chunk's shared modules back into the page's chunk
 * reliably: in a TanStack Start app they split into a dozen small chunks,
 * which cost more first-load bytes than the lazy init path saves.
 *
 * @internal
 */
export { createHostedTransport } from '../transports/hosted';
