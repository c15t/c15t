/**
 * @packageDocumentation
 * Provides a reusable hook for managing document scroll locking.
 */

import { useEffect } from 'react';

/**
 * Hook to manage document scroll locking.
 *
 * @remarks
 * This hook provides a way to lock/unlock document scrolling.
 * It automatically handles cleanup when the component unmounts
 * and preserves the original scroll state.
 *
 * @param shouldLock - Boolean indicating whether scrolling should be locked
 *
 * @example
 * ```tsx
 * function Modal({ isOpen }) {
 *   useScrollLock(isOpen);
 *   return <div>Modal Content</div>;
 * }
 * ```
 *
 * @public
 */
export function useScrollLock(shouldLock: boolean): void {
  useEffect(() => {
    if (shouldLock) {
      // Store the original overflow and padding to prevent layout shift
      const originalStyles = {
        overflow: document.body.style.overflow,
        paddingRight: document.body.style.paddingRight,
      };

      // Get width of scrollbar to prevent layout shift
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      // Lock scrolling and add padding to prevent layout shift
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      // Cleanup function to restore original styles
      return () => {
        document.body.style.overflow = originalStyles.overflow;
        document.body.style.paddingRight = originalStyles.paddingRight;
      };
    }
  }, [shouldLock]);
}
