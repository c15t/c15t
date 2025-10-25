import { Frame as FrameComponent, type FrameProps } from '@c15t/react';
import type { AllConsentNames } from 'c15t';
import type {
	ComponentPropsWithRef,
	CSSProperties,
	FC,
	ReactNode,
} from 'react';
import { forwardRef } from 'react';

// Cast FrameComponent to FC type for compatibility with @c15t/react export
const Frame = FrameComponent as FC<FrameProps>;

export interface YouTubeEmbedProps
	extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
	/**
	 * The YouTube video ID
	 * @example 'dQw4w9WgXcQ'
	 */
	videoId: string;

	/**
	 * Consent category required to render the embed.
	 * @default 'measurement'
	 */
	category?: AllConsentNames;

	/**
	 * The title/label for the video (used for accessibility and placeholder)
	 * @default 'YouTube video'
	 */
	title?: string;

	/**
	 * YouTube player parameters (e.g., 'autoplay=1&mute=1')
	 * @see {@link https://developers.google.com/youtube/player_parameters}
	 */
	params?: string;

	/**
	 * Width of the embed container
	 * @default '100%'
	 */
	width?: string | number;

	/**
	 * Height of the embed container
	 * @default '315'
	 */
	height?: string | number;

	/**
	 * Custom CSS class for the iframe
	 */
	iframeClassName?: string;

	/**
	 * Custom CSS styles for the iframe
	 */
	iframeStyle?: CSSProperties;

	/**
	 * Custom placeholder component to display when consent is not granted.
	 * If not provided, the default Frame placeholder will be displayed.
	 */
	placeholder?: ReactNode;

	/**
	 * When true, removes all default styling from the Frame component
	 * @default false
	 */
	noStyle?: boolean;

	/**
	 * Custom theme to override default Frame styles
	 * @see Frame component documentation for theme options
	 */
	theme?: Record<string, string>;
}

/**
 * YouTubeEmbed component that wraps the Frame component to provide
 * consent-aware YouTube video embedding.
 *
 * @remarks
 * This component uses the Frame component from @c15t/react internally to ensure
 * YouTube embeds only load when appropriate consent is granted. The video is
 * embedded using a standard YouTube iframe.
 *
 * @example
 * Basic usage:
 * ```tsx
 * import { YouTubeEmbed } from '@c15t/scripts/react/youtube-embed';
 *
 * <YouTubeEmbed videoId="dQw4w9WgXcQ" />
 * ```
 *
 * @example
 * With custom parameters:
 * ```tsx
 * import { YouTubeEmbed } from '@c15t/scripts/react/youtube-embed';
 *
 * <YouTubeEmbed
 *   videoId="dQw4w9WgXcQ"
 *   title="Rick Astley - Never Gonna Give You Up"
 *   category="marketing"
 *   params="autoplay=1&mute=1"
 *   width="100%"
 *   height={500}
 * />
 * ```
 */
export const YouTubeEmbed = forwardRef<HTMLDivElement, YouTubeEmbedProps>(
	(
		{
			videoId,
			category = 'measurement',
			title = 'YouTube video',
			params,
			width = '100%',
			height = 315,
			iframeClassName,
			iframeStyle,
			placeholder,
			noStyle,
			theme,
			className,
			style,
			...props
		},
		ref
	) => {
		// Construct the YouTube embed URL
		const paramsPart = params ? `?${params}` : '';
		const embedUrl = `https://www.youtube.com/embed/${videoId}${paramsPart}`;

		// Merge styles for the Frame container
		const containerStyle: CSSProperties = {
			width,
			height,
			...style,
		};

		return (
			<Frame
				ref={ref}
				category={category}
				style={containerStyle}
				placeholder={placeholder}
				noStyle={noStyle}
				theme={theme}
				className={className}
				{...props}
			>
				<iframe
					src={embedUrl}
					title={title}
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
					referrerPolicy="strict-origin-when-cross-origin"
					allowFullScreen
					className={iframeClassName}
					style={{
						width: '100%',
						height: '100%',
						border: 0,
						...iframeStyle,
					}}
				/>
			</Frame>
		);
	}
);

YouTubeEmbed.displayName = 'YouTubeEmbed';
