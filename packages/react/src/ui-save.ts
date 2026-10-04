/**
 * The draft's save path closes the surface through core's surface actions.
 *
 * Kept under React's old name so the draft module imports it unchanged; the
 * rules (close on the local record, which surface follows, which older save
 * loses) live in `@c15t/core`'s `saveConsentSurface`.
 */
export { saveConsentSurface as saveConsentUI } from '@c15t/core';
