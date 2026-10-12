import * as iabFirstPaint from '@c15t/ui/styles/sheets/iab-first-paint';

import { FIRST_PAINT_SHEETS } from './first-paint-sheets';
import type { SurfaceStyleSheet } from './surface-styles';

/** The shared tokens and IAB banner rules. @internal */
export const IAB_FIRST_PAINT_SHEETS: readonly SurfaceStyleSheet[] = [
	...FIRST_PAINT_SHEETS,
	iabFirstPaint,
];
