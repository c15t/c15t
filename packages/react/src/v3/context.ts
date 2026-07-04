import type { ConsentKernel } from 'c15t/v3';
import { createContext } from 'react';

/**
 * React context carrying the kernel instance.
 *
 * v3 Provider puts a kernel here; hooks pull it out and subscribe via
 * useSyncExternalStore. No state snapshot lives in context — only the
 * kernel reference. Consumers subscribe to the kernel directly at their
 * render site, so each hook isolates re-renders to exactly its slice.
 */
export const KernelContext = createContext<ConsentKernel | null>(null);
KernelContext.displayName = 'C15tKernelContext';
