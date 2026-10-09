import * as firstPaint from '@c15t/ui/styles/sheets/first-paint';

import type { SurfaceStyleSheet } from './surface-styles';

/**
 * What the banner, trigger and ConsentGate render: tokens, every c15t
 * variable and the first-paint rules of `styles.css`.
 *
 * @internal
 */
export const FIRST_PAINT_SHEETS: readonly SurfaceStyleSheet[] = [firstPaint];
