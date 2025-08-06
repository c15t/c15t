'use client';

/**
 * Enhanced ConsentManagerDialog component with compound components attached.
 *
 * @remarks
 * This is the main export that provides access to all ConsentManagerDialog components.
 * It follows the compound components pattern, allowing for flexible composition
 * of the dialog's parts.
 */

import type { FC } from 'react';
import {
	Card,
	ConsentCustomizationCard,
	Content,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogHeaderDescription,
	DialogHeaderTitle,
	Footer,
	Header,
	HeaderDescription,
	HeaderTitle,
} from './atoms/dialog-card';
import { Overlay } from './atoms/overlay';
import { Root } from './atoms/root';
import {
	ConsentManagerDialog as ConsentManagerDialogComponent,
	type ConsentManagerDialogProps,
} from './consent-manager-dialog';

/**
 * Type definition for the ConsentManagerDialog component with compound components attached.
 *
 * @remarks
 * This interface extends the base ConsentManagerDialog component with additional sub-components
 * that can be used to compose the dialog's structure. Each component is designed to be
 * fully accessible and customizable while maintaining compliance with privacy regulations.
 *
 * @public
 */
interface ConsentManagerDialogCompoundComponent
	extends FC<ConsentManagerDialogProps> {
	Card: typeof Card;
	Header: typeof Header;
	HeaderTitle: typeof HeaderTitle;
	HeaderDescription: typeof HeaderDescription;
	Content: typeof Content;
	Footer: typeof Footer;
	ConsentCustomizationCard: typeof ConsentCustomizationCard;
	DialogFooter: typeof DialogFooter;
	DialogHeader: typeof DialogHeader;
	DialogHeaderTitle: typeof DialogHeaderTitle;
	DialogHeaderDescription: typeof DialogHeaderDescription;
	DialogContent: typeof DialogContent;
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
 * <ConsentManagerDialog
 *   theme={customTheme}
 *   disableAnimation={false}
 *   noStyle={false}
 * />
 * ```
 *
 * @example
 * ```tsx
 * <ConsentManagerDialog.Root>
 *   <ConsentManagerDialog.Card>
 *     <ConsentManagerDialog.Header>
 *       <ConsentManagerDialog.HeaderTitle>Consent Manager</ConsentManagerDialog.HeaderTitle>
 *     </ConsentManagerDialog.Header>
 *   </ConsentManagerDialog.Card>
 * </ConsentManagerDialog.Root>
 * ```
 *
 * Note: Next.js Server Components do not support compound components. Ensure you add 'use client' to the file.
 *
 * @public
 */
const ConsentManagerDialog = Object.assign(ConsentManagerDialogComponent, {
	Card,
	Header,
	HeaderTitle,
	HeaderDescription,
	Content,
	Footer,
	ConsentCustomizationCard,
	DialogFooter,
	DialogHeader,
	DialogHeaderTitle,
	DialogHeaderDescription,
	DialogContent,
	Overlay,
	Root: Root,
}) as ConsentManagerDialogCompoundComponent;

// Export the main component as both default and named export
export default ConsentManagerDialog;
export { ConsentManagerDialog };

// Export individual components for backward compatibility
export {
	Card,
	Header,
	HeaderTitle,
	HeaderDescription,
	Content,
	Footer,
	ConsentCustomizationCard,
	DialogFooter,
	DialogHeader,
	DialogHeaderTitle,
	DialogHeaderDescription,
	DialogContent,
} from './atoms/dialog-card';

export { Overlay, ConsentManagerDialogOverlay } from './atoms/overlay';
export { Root, ConsentManagerDialogRoot } from './atoms/root';

export type { ConsentManagerDialogTheme } from './theme';
