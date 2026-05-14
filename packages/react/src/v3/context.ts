import type { ConsentKernel } from 'c15t-v3';
import { createContext } from 'react';

export const KernelContext = createContext<ConsentKernel | null>(null);
KernelContext.displayName = 'C15tKernelContext';
