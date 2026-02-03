'use client';

/**
 * Enhanced ConsentDialog component with compound components attached.
 *
 * @remarks
 * This is the main export that provides access to all ConsentDialog components.
 * It follows the compound components pattern, allowing for flexible composition
 * of the dialog's parts.
 */

import type { FC } from 'react';
import {
	Card,
	ConsentCustomizationCard,
	ConsentDialogContent,
	ConsentDialogFooter,
	ConsentDialogHeader,
	ConsentDialogHeaderDescription,
	ConsentDialogHeaderTitle,
	Content,
	Footer,
	Header,
	HeaderDescription,
	HeaderTitle,
} from './atoms/card';
import { Overlay } from './atoms/overlay';
import { Root } from './atoms/root';
import {
	ConsentDialog as ConsentDialogComponent,
	type ConsentDialogProps,
} from './consent-dialog';

export type { ConsentDialogProps };

/**
 * This interface extends the base ConsentDialog component with additional sub-components
 * that can be used to compose the dialog's structure. Each component is designed to be
 * fully accessible and customizable while maintaining compliance with privacy regulations.
 *
 */
export interface ConsentDialogCompoundComponent extends FC<ConsentDialogProps> {
	Card: typeof Card;
	Header: typeof Header;
	HeaderTitle: typeof HeaderTitle;
	HeaderDescription: typeof HeaderDescription;
	Content: typeof Content;
	Footer: typeof Footer;
	ConsentCustomizationCard: typeof ConsentCustomizationCard;
	ConsentDialogFooter: typeof ConsentDialogFooter;
	ConsentDialogHeader: typeof ConsentDialogHeader;
	ConsentDialogHeaderTitle: typeof ConsentDialogHeaderTitle;
	ConsentDialogHeaderDescription: typeof ConsentDialogHeaderDescription;
	ConsentDialogContent: typeof ConsentDialogContent;
	Overlay: typeof Overlay;
	Root: typeof Root;
}

/**
 * A modal dialog component for detailed privacy consent management.
 *
 * @remarks
 * Key features:
 * - Provides an accessible modal interface for consent customization
 * - Implements smooth enter/exit animations
 * - Manages proper focus handling
 * - Supports theme customization
 * - Handles client-side portal rendering
 *
 * @example
 * ```tsx
 * <ConsentDialog
 *   theme={customTheme}
 *   disableAnimation={false}
 *   noStyle={false}
 * />
 * ```
 *
 * @example
 * ```tsx
 * <ConsentDialog.Root>
 *   <ConsentDialog.Card>
 *     <ConsentDialog.Header>
 *       <ConsentDialog.HeaderTitle>Consent Manager</ConsentDialog.HeaderTitle>
 *     </ConsentDialog.Header>
 *   </ConsentDialog.Card>
 * </ConsentDialog.Root>
 * ```
 *
 * Note: Next.js Server Components do not support compound components. Ensure you add 'use client' to the file.
 *
 * @public
 */
const ConsentDialog = Object.assign(ConsentDialogComponent, {
	Card,
	Header,
	HeaderTitle,
	HeaderDescription,
	Content,
	Footer,
	ConsentCustomizationCard,
	ConsentDialogFooter,
	ConsentDialogHeader,
	ConsentDialogHeaderTitle,
	ConsentDialogHeaderDescription,
	ConsentDialogContent,
	Overlay,
	Root: Root,
}) as ConsentDialogCompoundComponent;

// Export the main component as both default and named export
export default ConsentDialog;
export { ConsentDialog };

// Export individual components for backward compatibility
export {
	Card,
	ConsentCustomizationCard,
	ConsentDialogContent,
	ConsentDialogFooter,
	ConsentDialogHeader,
	ConsentDialogHeaderDescription,
	ConsentDialogHeaderTitle,
	Content,
	Footer,
	Header,
	HeaderDescription,
	HeaderTitle,
} from './atoms/card';

export { ConsentDialogOverlay, Overlay } from './atoms/overlay';
export { ConsentDialogRoot, Root } from './atoms/root';
