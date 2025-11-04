/** biome-ignore-all lint/a11y/noSvgWithoutTitle: this is okay */

import flagsSheet from '../../public/flags-sheet.svg';
import type { IconProps } from './types';

/**
 * FlagsIcon component for rendering country flag icons from flags-sheet.svg
 */
export function FlagsIcon({
	name,
	size,
	width,
	height,
	title,
	...rest
}: IconProps) {
	const titleText = title ?? name;
	const isHidden =
		rest['aria-hidden'] === 'true' || rest['aria-hidden'] === true;

	// Helper function to render title only when not hidden
	const renderTitle = () => {
		if (isHidden) {
			return null;
		}
		// titleText is never empty since name is a required prop from a strict union type
		return <title>{titleText as string}</title>;
	};

	// Use the imported SVG URL - it will be output as a static asset by rslib
	// Fragment identifiers work with actual URLs, not data URIs
	return (
		<svg
			role="img"
			{...rest}
			{...(size != null ? { width: size, height: size } : {})}
			{...(width != null ? { width } : {})}
			{...(height != null ? { height } : {})}
			{...(isHidden ? { focusable: false } : {})}
		>
			{renderTitle()}
			<use href={`${flagsSheet}#${name}`} />
		</svg>
	);
}

export type { IconName, IconProps } from './types';
