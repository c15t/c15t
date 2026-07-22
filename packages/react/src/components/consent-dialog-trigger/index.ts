'use client';

/**
 * ConsentDialogTrigger component exports.
 *
 * @packageDocumentation
 */

// Main compound component
// Atom components for direct usage
export {
	ConsentDialogTrigger,
	type ConsentDialogTriggerCompound,
	TriggerButton,
	type TriggerButtonProps,
	TriggerIcon,
	type TriggerIconProps,
	TriggerRoot,
	type TriggerRootProps,
	TriggerText,
	type TriggerTextProps,
	useTriggerContext,
} from './consent-dialog-trigger';
// Types
export type {
	ConsentDialogTriggerCustomItem,
	ConsentDialogTriggerItem,
	ConsentDialogTriggerPreferencesItem,
	ConsentDialogTriggerProps,
	CornerPosition,
	TriggerIcon as TriggerIconType,
	TriggerIconPair,
	TriggerIconSource,
	TriggerOrientation,
	TriggerSize,
	TriggerVisibility,
} from './types';
// Hook
export {
	type UseDraggableOptions,
	type UseDraggableReturn,
	useDraggable,
} from './use-draggable';
