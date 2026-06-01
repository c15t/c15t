'use client';

import type { AllConsentNames } from 'c15t';
import { type ComponentPropsWithRef, forwardRef, type ReactNode } from 'react';
import { Frame, type FrameProps } from '../frame';
import { IntegrationPlaceholder } from './shared';

export interface YouTubeEmbedProps
	extends Omit<ComponentPropsWithRef<'iframe'>, 'src' | 'children'> {
	/**
	 * YouTube video id. Use this for first-party construction of the embed URL.
	 */
	videoId?: string;

	/**
	 * Fully formed YouTube embed URL. Use this when migrating existing embeds.
	 */
	src?: string;

	/**
	 * Consent category required before the iframe mounts.
	 *
	 * @default 'marketing'
	 */
	consentCategory?: AllConsentNames;

	/**
	 * Whether to use youtube-nocookie.com when `videoId` is provided.
	 *
	 * @default true
	 */
	privacyEnhanced?: boolean;

	/**
	 * Optional start time in seconds.
	 */
	start?: number;

	/**
	 * Additional query params for the generated embed URL.
	 */
	params?: Record<string, string | number | boolean | null | undefined>;

	/**
	 * Class name for the consent-gated frame wrapper.
	 */
	className?: string;

	/**
	 * Class name for the iframe element.
	 */
	iframeClassName?: string;

	/**
	 * Placeholder rendered while consent is missing.
	 */
	placeholder?: ReactNode;

	/**
	 * Fallback rendered when neither `videoId` nor `src` is provided.
	 */
	errorFallback?: ReactNode;

	/**
	 * Additional props passed to the underlying Frame component.
	 */
	frameProps?: Omit<
		FrameProps,
		'children' | 'category' | 'className' | 'placeholder'
	>;
}

function buildYouTubeEmbedUrl({
	videoId,
	privacyEnhanced,
	start,
	params,
}: {
	videoId: string;
	privacyEnhanced: boolean;
	start?: number;
	params?: YouTubeEmbedProps['params'];
}) {
	const query = new URLSearchParams();

	if (start != null) {
		query.set('start', String(start));
	}

	if (params) {
		for (const [key, value] of Object.entries(params)) {
			if (value != null) {
				query.set(key, String(value));
			}
		}
	}

	let host = 'https://www.youtube.com';
	if (privacyEnhanced) {
		host = 'https://www.youtube-nocookie.com';
	}

	let suffix = '';
	if (query.size > 0) {
		suffix = `?${query.toString()}`;
	}

	return `${host}/embed/${encodeURIComponent(videoId)}${suffix}`;
}

/**
 * Renders a YouTube iframe behind c15t consent gating.
 *
 * Use this helper for iframe-only YouTube embeds. The iframe is mounted only
 * after the configured consent category is allowed, so YouTube network requests
 * are avoided while consent is missing.
 *
 * When neither `videoId` nor `src` is provided, an error fallback is rendered
 * instead of throwing, mirroring the fallback behavior of `GoogleMap`.
 *
 * @example
 * ```tsx
 * <YouTubeEmbed
 *   consentCategory="marketing"
 *   title="Product demo"
 *   videoId="dQw4w9WgXcQ"
 * />
 * ```
 */
export const YouTubeEmbed = forwardRef<HTMLIFrameElement, YouTubeEmbedProps>(
	(
		{
			videoId,
			src,
			consentCategory = 'marketing',
			privacyEnhanced = true,
			start,
			params,
			className,
			iframeClassName,
			placeholder,
			errorFallback,
			frameProps,
			title = 'YouTube video',
			allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
			allowFullScreen = true,
			...iframeProps
		},
		forwardedRef
	) => {
		let embedSrc = src;
		if (!embedSrc && videoId) {
			embedSrc = buildYouTubeEmbedUrl({
				videoId,
				privacyEnhanced,
				start,
				params,
			});
		}

		if (!embedSrc) {
			return (
				errorFallback ?? (
					<IntegrationPlaceholder category={consentCategory} showButton={false}>
						This embed requires a YouTube videoId or src.
					</IntegrationPlaceholder>
				)
			);
		}

		return (
			<Frame
				category={consentCategory}
				className={className}
				placeholder={placeholder}
				{...frameProps}
			>
				<iframe
					allow={allow}
					allowFullScreen={allowFullScreen}
					className={iframeClassName}
					ref={forwardedRef}
					src={embedSrc}
					title={title}
					{...iframeProps}
				/>
			</Frame>
		);
	}
);

YouTubeEmbed.displayName = 'YouTubeEmbed';
