/**
 * What the dialog and the preference widget need: the first-paint sheet,
 * the dialog and widget rules, then the primitives the Svelte dialog
 * renders, in the order `styles.css` has them.
 *
 * A module of its own, so only the dialog's and widget's code carries the
 * dialog rules.
 */
import * as dialog from '@c15t/ui/styles/sheets/dialog';
import * as firstPaint from '@c15t/ui/styles/sheets/first-paint';
import * as primitives from '@c15t/ui/styles/sheets/primitives';

import type { SurfaceStyleSheet } from './surface-styles';

export const DIALOG_SHEETS: readonly SurfaceStyleSheet[] = [
	firstPaint,
	dialog,
	primitives,
];
