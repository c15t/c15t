/**
 * @packageDocumentation
 * Type definitions for the consent manager components.
 */

import type {
  ConsentManagerOptions as CoreOptions,
  TranslationConfig,
} from 'c15t';
import type { ReactNode } from 'react';

/**
 * React-specific configuration options
 */
export interface ReactUIOptions {
  /**
   * Visual theme to apply.
   */
  theme?: 'light' | 'dark';

  /**
   * Whether to disable animations.
   * @default false
   */
  disableAnimation?: boolean;

  /**
   * Whether to lock scroll when dialogs are open.
   * @default false
   */
  scrollLock?: boolean;

  /**
   * Whether to trap focus within dialogs.
   * @default true
   */
  trapFocus?: boolean;

  /**
   * Color scheme preference.
   * @default 'system'
   */
  colorScheme?: 'light' | 'dark' | 'system';

  /**
   * Whether to disable default styles.
   * @default false
   */
  noStyle?: boolean;
}

/**
 * Extended configuration options for the React consent manager
 */
export type ConsentManagerOptions = CoreOptions & {
  /**
   * React-specific UI configuration options
   */
  react?: ReactUIOptions;

  /**
   * Translation configuration
   */
  translations?: Partial<TranslationConfig>;
};

/**
 * Configuration options for the ConsentManagerProvider.
 *
 * @public
 */
export interface ConsentManagerProviderProps {
  /**
   * React children to render within the provider.
   */
  children: ReactNode;

  /**
   * Configuration options for the consent manager.
   * This includes core, React, store, and translation settings.
   */
  options: ConsentManagerOptions;
}
