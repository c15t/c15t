import * as dialog from '@c15t/ui/styles/sheets/dialog';
import * as firstPaint from '@c15t/ui/styles/sheets/first-paint';

import type { SurfaceStyleSheet } from './surface-styles';

/**
 * What the dialog and the preference widget render: the first-paint sheet,
 * then the dialog and widget rules. Only their lazy chunks import this, so
 * the dialog rules load with the dialog's code.
 *
 * @internal
 */
export const DIALOG_SHEETS: readonly SurfaceStyleSheet[] = [firstPaint, dialog];
