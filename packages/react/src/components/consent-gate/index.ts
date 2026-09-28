'use client';

import * as atoms from './atoms';
import { ConsentGate as ConsentGateComponent } from './consent-gate';
import type { ConsentGateCompoundComponent, ConsentGateProps } from './types';

/**
 * Renders its children only while a consent category is allowed
 *
 * @remarks
 * Acts as a consent boundary for embedded content (iframes, videos, third-party widgets).
 * Conditionally renders children based on user consent, displaying a placeholder when
 * permission is not granted.
 * Supports custom styling via `theme` or complete style override with `noStyle` as well as a custom placeholder.
 *
 * @example
 * ```tsx
 * <ConsentGate category="marketing">
 *   <iframe src="https://www.youtube.com/embed/MtN1YnoL46Q?si=JYIFKdENwls43H-r" />
 * </ConsentGate>
 * ```
 *
 * @see {@link AllConsentNames} for consent categories
 */
const ConsentGate = Object.assign(ConsentGateComponent, {
	Button: atoms.ConsentGateButton,
	Root: atoms.ConsentGateRoot,
	Title: atoms.ConsentGateTitle,
}) as ConsentGateCompoundComponent;

/**
 * @deprecated Renamed to {@link ConsentGate}. `Frame` will be removed in a
 * future major release.
 */
const Frame: ConsentGateCompoundComponent = ConsentGate;

/** @deprecated Renamed to {@link ConsentGateProps}. */
type FrameProps = ConsentGateProps;

/** @deprecated Renamed to {@link ConsentGateCompoundComponent}. */
type FrameCompoundComponent = ConsentGateCompoundComponent;

/** @deprecated Renamed to `ConsentGateRoot`. */
const FrameRoot: typeof atoms.ConsentGateRoot = atoms.ConsentGateRoot;

/** @deprecated Renamed to `ConsentGateTitle`. */
const FrameTitle: typeof atoms.ConsentGateTitle = atoms.ConsentGateTitle;

/** @deprecated Renamed to `ConsentGateButton`. */
const FrameButton: typeof atoms.ConsentGateButton = atoms.ConsentGateButton;

export { ConsentGateButton, ConsentGateRoot, ConsentGateTitle } from './atoms';
export type { ConsentGateCompoundComponent, ConsentGateProps } from './types';
export { ConsentGate };
export type { FrameCompoundComponent, FrameProps };
export { Frame, FrameButton, FrameRoot, FrameTitle };
