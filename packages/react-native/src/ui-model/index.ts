/**
 * Portable consent screen models.
 *
 * Pure functions from consent state and copy to {@link Screen}. The RN
 * renderers draw them today; the SwiftUI and Compose renderers will port them
 * and check themselves against `native/ui/fixtures`.
 *
 * @packageDocumentation
 */

export * from './iab';
export * from './iab-selection';
export * from './standard';
export type * from './types';
export { SCREEN_ACTION_EMPHASES, SCREEN_ACTION_IDS } from './types';
