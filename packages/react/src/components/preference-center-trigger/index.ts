'use client';

/**
 * PreferenceCenterTrigger component exports.
 *
 * @packageDocumentation
 */

// Main compound component
// Atom components for direct usage
export {
	PreferenceCenterTrigger,
	type PreferenceCenterTriggerCompound,
	TriggerButton,
	type TriggerButtonProps,
	TriggerIcon,
	type TriggerIconProps,
	TriggerRoot,
	type TriggerRootProps,
	TriggerText,
	type TriggerTextProps,
	useTriggerContext,
} from './preference-center-trigger';
// Types
export type {
	CornerPosition,
	PreferenceCenterTriggerProps,
	TriggerIcon as TriggerIconType,
	TriggerSize,
	TriggerVisibility,
} from './types';
// Hook
export {
	type UseDraggableOptions,
	type UseDraggableReturn,
	useDraggable,
} from './use-draggable';
