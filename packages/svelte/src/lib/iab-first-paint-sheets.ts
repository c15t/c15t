import * as firstPaint from '@c15t/ui/styles/sheets/first-paint';
import * as iabFirstPaint from '@c15t/ui/styles/sheets/iab-first-paint';

import type { SurfaceStyleSheet } from './surface-styles';

/** Base rules and IAB tokens and banner rules, without the dialog CSS. */
export const IAB_FIRST_PAINT_SHEETS: readonly SurfaceStyleSheet[] = [
	firstPaint,
	iabFirstPaint,
];
