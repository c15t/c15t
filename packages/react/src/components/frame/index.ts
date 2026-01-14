'use client';

import type { AllConsentNames } from 'c15t';
import * as atoms from './atoms';
import { Frame as FrameComponent } from './frame';
import type { FrameCompoundComponent } from './types';

/**
 * The Frame component that provides consent-gated content rendering
 *
 * @remarks
 * Acts as a consent boundary for embedded content (iframes, videos, third-party widgets).
 * Conditionally renders children based on user consent, displaying a placeholder when
 * permission is not granted.
 * Supports custom styling via `theme` or complete style override with `noStyle` as well as a custom placeholder.
 *
 * @example
 * ```tsx
 * <Frame category="marketing">
 *   <iframe src="https://www.youtube.com/embed/MtN1YnoL46Q?si=JYIFKdENwls43H-r" />
 * </Frame>
 * ```
 *
 * @see {@link FrameTheme} for theme options
 * @see {@link AllConsentNames} for consent categories
 */
const Frame = Object.assign(FrameComponent, {
	Root: atoms.FrameRoot,
	Title: atoms.FrameTitle,
	Button: atoms.FrameButton,
}) as FrameCompoundComponent;

export { Frame };
export { FrameButton, FrameRoot, FrameTitle } from './atoms';
export type { FrameCompoundComponent, FrameProps } from './types';
