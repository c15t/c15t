/** biome-ignore-all lint/a11y/noSvgWithoutTitle: this is okay */
import iconsSheet from '../../public/icons-sheet.svg';
import type { IconProps } from './types';

/**
 * Icon component for rendering icons from optin-icon-sheet.svg
 *
 * @param name - The name of the icon to render (from optin-icon-sheet.svg)
 * @param size - Optional size for the icon (applies to both width and height)
 * @param width - Optional width override
 * @param height - Optional height override
 * @param title - Optional accessible title (falls back to name)
 */
export function Icon({ name, size, width, height, title, ...rest }: IconProps) {
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
			<use href={`${iconsSheet}#${name}`} />
		</svg>
	);
}

export type { IconName, IconProps } from './types';
