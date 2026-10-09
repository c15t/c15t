import * as dialog from '@c15t/ui/styles/sheets/dialog';
import * as iabDialog from '@c15t/ui/styles/sheets/iab-dialog';

import { IAB_FIRST_PAINT_SHEETS } from './iab-first-paint-sheets';
import type { SurfaceStyleSheet } from './surface-styles';

/** Styles for a standalone IAB dialog, loaded with its code. @internal */
export const IAB_DIALOG_SHEETS: readonly SurfaceStyleSheet[] = [
	...IAB_FIRST_PAINT_SHEETS,
	dialog,
	iabDialog,
];
