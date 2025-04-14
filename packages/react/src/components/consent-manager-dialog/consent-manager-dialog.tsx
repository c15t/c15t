'use client';

/**
 * @packageDocumentation
 * Provides the dialog component for detailed privacy consent management.
 * Implements an accessible, animated modal interface for consent customization.
 */

import { AnimatePresence, motion } from 'motion/react';
import { type FC, type RefObject, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LocalThemeContext,
  type ThemeContextValue,
} from '~/context/theme-context';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { ConsentCustomizationCard } from './atoms/dialog-card';
import { Overlay } from './atoms/overlay';
import type { ConsentManagerDialogTheme } from './theme';

import { useFocusTrap } from '~/hooks/use-focus-trap';
import styles from './consent-manager-dialog.module.css';

/**
 * Animation variants for the dialog container
 * @internal
 */
const dialogVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Animation variants for the dialog content
 * @internal
 */
const contentVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

/**
 * Props for the ConsentManagerDialog component
 *
 * @remarks
 * Extends ThemeContextValue to provide comprehensive theming support
 * while maintaining type safety for consent management specific features.
 */
export interface ConsentManagerDialogProps
  extends ThemeContextValue<ConsentManagerDialogTheme> {
  /** Disables animation when true */
  disableAnimation?: boolean;

  /** Whether the dialog is open */
  open?: boolean;
}

/**
 * A modal dialog component for detailed privacy consent management.
 *
 * @remarks
 * Key features:
 * - Provides an accessible modal interface for consent customization
 * - Implements smooth enter/exit animations
 * - Manages proper focus handling
 * - Supports theme customization
 * - Handles client-side portal rendering
 *
 * @example
 * ```tsx
 * <ConsentManagerDialog
 *   theme={customTheme}
 *   disableAnimation={false}
 *   noStyle={false}
 * />
 * ```
 *
 * @public
 */
export const ConsentManagerDialog: FC<ConsentManagerDialogProps> = ({
  theme,
  disableAnimation,
  noStyle,
  open = false,
  scrollLock = true,
  trapFocus = true, // Default to true for accessibility
}) => {
  const consentManager = useConsentManager();
  const [isMounted, setIsMounted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Add the useFocusTrap hook
  const isRefObject =
    dialogRef && typeof dialogRef === 'object' && 'current' in dialogRef;
  useFocusTrap(
    (open || consentManager.isPrivacyDialogOpen) && trapFocus,
    isRefObject ? (dialogRef as RefObject<HTMLElement>) : null
  );

  const contextValue: ThemeContextValue = {
    theme,
    noStyle,
    disableAnimation,
    scrollLock,
    trapFocus,
  };

  /**
   * Dialog content with theme context and animation support
   * @internal
   */
  const dialogContentRoot = (
    <LocalThemeContext.Provider value={contextValue}>
      <AnimatePresence mode="wait">
        {(open || consentManager.isPrivacyDialogOpen) && (
          <>
            <Overlay open={open} />
            <motion.dialog
              ref={dialogRef as unknown as RefObject<HTMLDialogElement>}
              className={styles.root}
              variants={dialogVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              aria-modal="true"
              aria-labelledby="privacy-settings-title"
              tabIndex={-1} // Make the dialog focusable as a fallback
            >
              <motion.div
                ref={contentRef}
                className={styles.container}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <ConsentCustomizationCard noStyle={noStyle} />
              </motion.div>
            </motion.dialog>
          </>
        )}
      </AnimatePresence>
    </LocalThemeContext.Provider>
  );

  // Only render on client-side to prevent hydration issues
  return isMounted && createPortal(dialogContentRoot, document.body);
};
