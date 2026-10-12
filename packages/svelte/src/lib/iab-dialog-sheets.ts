import * as dialog from '@c15t/ui/styles/sheets/dialog';
import * as firstPaint from '@c15t/ui/styles/sheets/first-paint';
import * as iabDialog from '@c15t/ui/styles/sheets/iab-dialog';
import * as iabFirstPaint from '@c15t/ui/styles/sheets/iab-first-paint';
import * as primitives from '@c15t/ui/styles/sheets/primitives';

import type { SurfaceStyleSheet } from './surface-styles';

/** All rules needed by an IAB dialog, including one without a banner. */
export const IAB_DIALOG_SHEETS: readonly SurfaceStyleSheet[] = [
	firstPaint,
	dialog,
	primitives,
	iabFirstPaint,
	iabDialog,
];
