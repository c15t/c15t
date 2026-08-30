'use client';

import type { AllConsentNames } from '@c15t/core';
import {
	type ComponentPropsWithRef,
	type CSSProperties,
	forwardRef,
	type ReactNode,
	useState,
} from 'react';
import { Frame, type FrameProps } from '../frame';
import { IntegrationStatus } from './shared';

export type YouTubeEmbedParams = Record<
	string,
	string | number | boolean | null | undefined
>;

interface YouTubeEmbedBaseProps extends Omit<
	ComponentPropsWithRef<'iframe'>,
	'children' | 'src' | 'title'
> {
	/**
	 * Accessible title for the embedded player.
	 */
	title: string;

	/**
	 * Consent category required before the iframe mounts.
	 *
	 * @default 'marketing'
	 */
	consentCategory?: AllConsentNames;

	/**
	 * Class name for the iframe element targeted by the forwarded ref.
	 */
	className?: string;

	/**
	 * Class name for the consent-gated frame wrapper.
	 */
	wrapperClassName?: string;

	/**
	 * Placeholder rendered while consent is missing.
	 */
	placeholder?: ReactNode;

	/**
	 * Fallback rendered when the iframe cannot be configured or when the
	 * browser reports a native iframe loading error.
	 *
	 * YouTube player-level errors require the IFrame Player API and are not
	 * reported reliably by a standard cross-origin iframe.
	 */
	errorFallback?: ReactNode;

	/**
	 * Fallback rendered after consent while the iframe is loading.
	 */
	loadingFallback?: ReactNode;

	/**
	 * Additional props passed to the underlying Frame component.
	 */
	frameProps?: Omit<
		FrameProps,
		'children' | 'category' | 'className' | 'placeholder'
	>;
}

export interface YouTubeVideoIdSource {
	/**
	 * YouTube video id. Use this for first-party construction of the embed URL.
	 */
	videoId: string;

	src?: never;

	/**
	 * Whether to use youtube-nocookie.com.
	 *
	 * @default true
	 */
	privacyEnhanced?: boolean;

	/**
	 * Optional start time in seconds. This takes precedence over `params.start`.
	 */
	start?: number;

	/**
	 * Additional query params for the generated embed URL.
	 */
	params?: YouTubeEmbedParams;
}

export interface YouTubeSrcSource {
	/**
	 * Fully formed YouTube embed URL. Use this when migrating existing embeds.
	 */
	src: string;

	videoId?: never;
	privacyEnhanced?: never;
	start?: never;
	params?: never;
}

export type YouTubeEmbedProps = YouTubeEmbedBaseProps &
	(YouTubeVideoIdSource | YouTubeSrcSource);

function buildYouTubeEmbedUrl({
	videoId,
	privacyEnhanced,
	start,
	params,
}: {
	videoId: string;
	privacyEnhanced: boolean;
	start?: number;
	params?: YouTubeEmbedParams;
}) {
	const query = new URLSearchParams();

	if (params) {
		for (const [key, value] of Object.entries(params)) {
			if (value != null) {
				query.set(
					key,
					typeof value === 'boolean' ? String(Number(value)) : String(value)
				);
			}
		}
	}

	if (start != null) {
		query.set('start', String(start));
	}

	const host = privacyEnhanced
		? 'https://www.youtube-nocookie.com'
		: 'https://www.youtube.com';
	const serializedQuery = query.toString();
	const suffix = serializedQuery ? `?${serializedQuery}` : '';

	return `${host}/embed/${encodeURIComponent(videoId)}${suffix}`;
}

const defaultWrapperStyle: CSSProperties = {
	aspectRatio: '16 / 9',
	borderRadius: 'var(--frame-placeholder-border-radius)',
	minHeight: 200,
	overflow: 'hidden',
	width: '100%',
};

const defaultIframeStyle: CSSProperties = {
	border: 0,
	borderRadius: 'inherit',
	display: 'block',
	height: '100%',
	inset: 0,
	position: 'absolute',
	width: '100%',
};

/**
 * Renders a YouTube iframe behind c15t consent gating.
 *
 * Use `videoId` for a privacy-enhanced URL built by c15t, or `src` to migrate
 * an existing complete embed URL. The two source modes are mutually exclusive.
 * The iframe is mounted only after consent and includes responsive 16:9 layout,
 * native lazy loading, and a visible loading state by default.
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
			wrapperClassName,
			placeholder,
			errorFallback,
			loadingFallback,
			frameProps,
			title = 'YouTube video',
			allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
			allowFullScreen = true,
			loading = 'lazy',
			onError,
			onLoad,
			style,
			...iframeProps
		},
		forwardedRef
	) => {
		const embedSrc =
			src ??
			(videoId
				? buildYouTubeEmbedUrl({
						videoId,
						privacyEnhanced,
						start,
						params,
					})
				: undefined);
		const [loadState, setLoadState] = useState<{
			source: string | undefined;
			status: 'error' | 'loading' | 'ready';
		}>({ source: embedSrc, status: 'loading' });
		const currentLoadState =
			loadState.source === embedSrc ? loadState.status : 'loading';
		const { style: frameStyle, ...restFrameProps } = frameProps ?? {};
		const wrapperStyle = {
			...defaultWrapperStyle,
			...frameStyle,
		};

		if (!embedSrc) {
			return (
				<div
					className={wrapperClassName}
					data-c15t-integration="youtube-embed"
					data-c15t-status="error"
					style={wrapperStyle}
				>
					{errorFallback ?? (
						<IntegrationStatus
							category={consentCategory}
							status="error"
						/>
					)}
				</div>
			);
		}

		return (
			<Frame
				{...restFrameProps}
				category={consentCategory}
				className={wrapperClassName}
				placeholder={placeholder}
				style={wrapperStyle}
			>
				<div
					aria-busy={currentLoadState === 'loading' || undefined}
					data-c15t-integration="youtube-embed"
					data-c15t-status={currentLoadState}
					style={{ height: '100%', position: 'relative', width: '100%' }}
				>
					{currentLoadState === 'loading' &&
						(loadingFallback ?? (
							<IntegrationStatus
								category={consentCategory}
								status="loading"
							/>
						))}
					{currentLoadState === 'error' &&
						(errorFallback ?? (
							<IntegrationStatus
								category={consentCategory}
								status="error"
							/>
						))}
					<iframe
						{...iframeProps}
						allow={allow}
						allowFullScreen={allowFullScreen}
						aria-hidden={currentLoadState === 'ready' ? undefined : true}
						className={className}
						key={embedSrc}
						loading={loading}
						onError={(event) => {
							setLoadState({ source: embedSrc, status: 'error' });
							onError?.(event);
						}}
						onLoad={(event) => {
							setLoadState({ source: embedSrc, status: 'ready' });
							onLoad?.(event);
						}}
						ref={forwardedRef}
						src={embedSrc}
						style={{
							...defaultIframeStyle,
							visibility: currentLoadState === 'ready' ? 'visible' : 'hidden',
							...style,
						}}
						title={title}
					/>
				</div>
			</Frame>
		);
	}
);

YouTubeEmbed.displayName = 'YouTubeEmbed';
