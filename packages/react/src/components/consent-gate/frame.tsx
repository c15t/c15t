'use client';

/**
 * The v2 names for `ConsentGate` and its parts. Each renders the
 * `ConsentGate` part and, outside production, warns once that the name is
 * deprecated.
 */
import { forwardRef as createForwardRef } from 'react';
import type { ElementType } from 'react';

import * as atoms from './atoms';
import { ConsentGate as ConsentGateComponent } from './consent-gate';
import type { ConsentGateCompoundComponent, ConsentGateProps } from './types';

declare const process: { env: { NODE_ENV?: string } };

const warned = new Set<string>();

/**
 * Warn once per name, outside production, that a `Frame` name is
 * deprecated.
 *
 * @param name - The deprecated name.
 * @param replacement - The `ConsentGate` name to use instead.
 */
const warnDeprecated = function warnDeprecated(
	name: string,
	replacement: string
): void {
	// Bundlers replace `process.env.NODE_ENV`, so production builds drop this.
	if (process.env.NODE_ENV === 'production' || warned.has(name)) {
		return;
	}
	warned.add(name);
	// oxlint-disable-next-line no-console -- Development-only deprecation notice.
	console.warn(
		`c15t: \`${name}\` is deprecated and will be removed in a future major release. Use \`${replacement}\` instead.`
	);
};

/**
 * Wrap a `ConsentGate` part so rendering it under its old name warns once.
 * The wrapper forwards props and the ref unchanged.
 */
const deprecatedPart = function deprecatedPart<PartType>(
	part: PartType,
	name: string,
	replacement: string
): PartType {
	const Part = part as ElementType;
	const Deprecated = createForwardRef<unknown, object>((props, ref) => {
		warnDeprecated(name, replacement);
		return (
			<Part
				{...props}
				ref={ref}
			/>
		);
	});
	Deprecated.displayName = name;
	return Deprecated as unknown as PartType;
};

/** @deprecated Renamed to `ConsentGateRoot`. */
const FrameRoot: typeof atoms.ConsentGateRoot = deprecatedPart(
	atoms.ConsentGateRoot,
	'FrameRoot',
	'ConsentGate.Root'
);

/** @deprecated Renamed to `ConsentGateTitle`. */
const FrameTitle: typeof atoms.ConsentGateTitle = deprecatedPart(
	atoms.ConsentGateTitle,
	'FrameTitle',
	'ConsentGate.Title'
);

/** @deprecated Renamed to `ConsentGateButton`. */
const FrameButton: typeof atoms.ConsentGateButton = deprecatedPart(
	atoms.ConsentGateButton,
	'FrameButton',
	'ConsentGate.Button'
);

/**
 * @deprecated Renamed to `ConsentGate`. `Frame` will be removed in a
 * future major release.
 */
const Frame: ConsentGateCompoundComponent = Object.assign(
	deprecatedPart(ConsentGateComponent, 'Frame', 'ConsentGate'),
	{ Button: FrameButton, Root: FrameRoot, Title: FrameTitle }
);

/** @deprecated Renamed to `ConsentGateProps`. */
type FrameProps = ConsentGateProps;

/** @deprecated Renamed to `ConsentGateCompoundComponent`. */
type FrameCompoundComponent = ConsentGateCompoundComponent;

export type { FrameCompoundComponent, FrameProps };
export { Frame, FrameButton, FrameRoot, FrameTitle };
