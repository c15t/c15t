'use client';

import type { AllConsentNames } from 'c15t';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Frame, type FrameProps } from '../frame';

export interface C15TYouTubeEmbedProps
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
	params?: C15TYouTubeEmbedProps['params'];
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
 * @example
 * ```tsx
 * <C15TYouTubeEmbed
 *   consentCategory="marketing"
 *   title="Product demo"
 *   videoId="dQw4w9WgXcQ"
 * />
 * ```
 *
 * @throws When neither `videoId` nor `src` is provided.
 */
export function C15TYouTubeEmbed({
	videoId,
	src,
	consentCategory = 'marketing',
	privacyEnhanced = true,
	start,
	params,
	className,
	iframeClassName,
	placeholder,
	frameProps,
	title = 'YouTube video',
	allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
	allowFullScreen = true,
	...iframeProps
}: C15TYouTubeEmbedProps) {
	if (!src && !videoId) {
		throw new Error('C15TYouTubeEmbed requires either videoId or src');
	}

	let embedSrc = src;
	if (!embedSrc) {
		embedSrc = buildYouTubeEmbedUrl({
			videoId: videoId as string,
			privacyEnhanced,
			start,
			params,
		});
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
				src={embedSrc}
				title={title}
				{...iframeProps}
			/>
		</Frame>
	);
}
