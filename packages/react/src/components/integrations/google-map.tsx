'use client';

import type { AllConsentNames, Script } from '@c15t/core';
import {
	type ComponentPropsWithRef,
	forwardRef,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useConsentManager } from '~/hooks/use-consent-manager';
import {
	ConsentScriptConflictError,
	type ConsentScriptReadyControls,
	useConsentScript,
} from '~/hooks/use-consent-script';
import { IntegrationPlaceholder, IntegrationStatus } from './shared';

export type GoogleMapCoordinates = google.maps.LatLngLiteral;
export type GoogleMapsApi = typeof google;
export type GoogleMapInstance = google.maps.Map;
export type GoogleMapOptions = google.maps.MapOptions;
export type GoogleMapsLibrary =
	| 'addressValidation'
	| 'airQuality'
	| 'core'
	| 'drawing'
	| 'elevation'
	| 'geocoding'
	| 'geometry'
	| 'journeySharing'
	| 'maps'
	| 'maps3d'
	| 'marker'
	| 'places'
	| 'routes'
	| 'streetView'
	| 'visualization';

export interface GoogleMapProps
	extends Omit<ComponentPropsWithRef<'div'>, 'children' | 'onError'> {
	/** Browser API key for the Google Maps JavaScript API. */
	apiKey: string;

	/** Initial and controlled center of the map. */
	center: GoogleMapCoordinates;

	/**
	 * Initial and controlled zoom level.
	 *
	 * @default 12
	 */
	zoom?: number;

	/**
	 * Cloud map id. Changing this value recreates the map because Google treats
	 * it as construction-time configuration.
	 */
	mapId?: string;

	/** Additional options passed to the Google Maps constructor. */
	options?: Omit<GoogleMapOptions, 'center' | 'zoom' | 'mapId'>;

	/**
	 * Consent category required before the Maps SDK loads.
	 *
	 * @default 'measurement'
	 */
	consentCategory?: AllConsentNames;

	/** Google Maps libraries to load with the shared page-level SDK. */
	libraries?: GoogleMapsLibrary[];

	/** Language used by Maps controls and service responses. */
	language?: string;

	/** Two-character region code used for Maps localization and biasing. */
	region?: string;

	/** Google Maps JavaScript API version channel. */
	version?: string;

	/** Limits referrer information sent to Google to the current origin. */
	authReferrerPolicy?: 'origin';

	/** Google Maps usage-tracking channel. */
	channel?: string;

	/** Cloud map ids to preload with the Maps SDK. */
	mapIds?: string[];

	/** Google Maps solution-channel identifier. */
	solutionChannel?: string;

	/** CSP nonce applied to the Maps script registration. */
	nonce?: string;

	/**
	 * Shared c15t script registration id.
	 *
	 * Keep this id and all loader options consistent across the page.
	 *
	 * @default 'c15t-google-maps'
	 */
	scriptId?: string;

	/**
	 * Time to wait for the Maps readiness callback before reporting an error.
	 *
	 * @default 15000
	 */
	timeoutMs?: number;

	/**
	 * Change this value to retry a failed loader or map initialization.
	 * Successful page-level loader registrations remain shared.
	 *
	 * @default 0
	 */
	retryKey?: string | number;

	/** Content shown before the configured consent category is allowed. */
	placeholder?: ReactNode;

	/** Content shown while the Maps SDK or map instance is loading. */
	loadingFallback?: ReactNode;

	/** Content shown when configuration, loading, authentication, or setup fails. */
	errorFallback?: ReactNode;

	/** Called when the map instance is ready. */
	onReady?: (map: GoogleMapInstance, api: GoogleMapsApi) => void;

	/** Called when configuration, loading, authentication, or setup fails. */
	onError?: (error: Error) => void;
}

function getWindowRecord(): Record<string, unknown> | null {
	if (typeof window === 'undefined') {
		return null;
	}

	return window as unknown as Record<string, unknown>;
}

function getGoogleMapsApi(): GoogleMapsApi | null {
	const googleApi = getWindowRecord()?.google as GoogleMapsApi | undefined;

	if (googleApi?.maps?.Map) {
		return googleApi;
	}

	return null;
}

const googleMapsAuthFailureListeners = new Set<(error: Error) => void>();
let authFailureWindow: Record<string, unknown> | null = null;
let installedAuthFailureCallback: (() => void) | null = null;
let previousAuthFailureCallback: (() => void) | null = null;

function subscribeToGoogleMapsAuthFailure(
	listener: (error: Error) => void
): () => void {
	const win = getWindowRecord();
	if (!win) {
		return () => undefined;
	}

	if (googleMapsAuthFailureListeners.size === 0) {
		authFailureWindow = win;
		const existingCallback = win.gm_authFailure;
		previousAuthFailureCallback =
			typeof existingCallback === 'function'
				? (existingCallback as () => void)
				: null;

		installedAuthFailureCallback = () => {
			const authenticationError = new Error(
				'Google Maps failed to authenticate. Check the API key, billing, and allowed referrers.'
			);
			let callbackError: unknown;

			try {
				previousAuthFailureCallback?.();
			} catch (error) {
				callbackError = error;
			}

			for (const authFailureListener of googleMapsAuthFailureListeners) {
				try {
					authFailureListener(authenticationError);
				} catch (error) {
					callbackError ??= error;
				}
			}

			if (callbackError !== undefined) {
				throw callbackError;
			}
		};
		win.gm_authFailure = installedAuthFailureCallback;
	}

	googleMapsAuthFailureListeners.add(listener);

	return () => {
		googleMapsAuthFailureListeners.delete(listener);
		if (
			googleMapsAuthFailureListeners.size > 0 ||
			!authFailureWindow ||
			authFailureWindow.gm_authFailure !== installedAuthFailureCallback
		) {
			return;
		}

		if (previousAuthFailureCallback) {
			authFailureWindow.gm_authFailure = previousAuthFailureCallback;
		} else {
			delete authFailureWindow.gm_authFailure;
		}

		authFailureWindow = null;
		installedAuthFailureCallback = null;
		previousAuthFailureCallback = null;
	};
}

function hashString(value: string): string {
	let hash = 2_166_136_261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16_777_619);
	}

	return (hash >>> 0).toString(36);
}

function createCallbackName(scriptId: string): string {
	const readableId = scriptId.replace(/[^A-Za-z0-9_$]/g, '_').slice(0, 32);
	return `__c15tGoogleMapsReady_${readableId}_${hashString(scriptId)}`;
}

function buildGoogleMapsScriptUrl({
	apiKey,
	authReferrerPolicy,
	callbackName,
	channel,
	libraries,
	language,
	mapIds,
	region,
	solutionChannel,
	version,
}: {
	apiKey: string;
	authReferrerPolicy?: 'origin';
	callbackName: string;
	channel?: string;
	libraries?: GoogleMapsLibrary[];
	language?: string;
	mapIds?: string[];
	region?: string;
	solutionChannel?: string;
	version?: string;
}) {
	const params = new URLSearchParams({
		key: apiKey,
		callback: callbackName,
		loading: 'async',
	});

	if (libraries?.length) {
		params.set('libraries', libraries.join(','));
	}
	if (language) {
		params.set('language', language);
	}
	if (region) {
		params.set('region', region);
	}
	if (version) {
		params.set('v', version);
	}
	if (authReferrerPolicy) {
		params.set('auth_referrer_policy', authReferrerPolicy);
	}
	if (mapIds?.length) {
		params.set('map_ids', mapIds.join(','));
	}
	if (channel) {
		params.set('channel', channel);
	}
	if (solutionChannel) {
		params.set('solution_channel', solutionChannel);
	}

	return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
}

function createMapOptions({
	center,
	mapId,
	options,
	zoom,
}: {
	center: GoogleMapCoordinates;
	mapId?: string;
	options?: Omit<GoogleMapOptions, 'center' | 'zoom' | 'mapId'>;
	zoom: number;
}): GoogleMapOptions {
	return {
		...options,
		center,
		mapId,
		zoom,
	};
}

function createMapUpdateOptions(
	options?: Omit<GoogleMapOptions, 'center' | 'zoom' | 'mapId'>
): GoogleMapOptions {
	const nextOptions: GoogleMapOptions = { ...options };

	// Google documents these as construction-time options.
	delete nextOptions.backgroundColor;
	delete nextOptions.colorScheme;
	delete nextOptions.controlSize;
	delete nextOptions.renderingType;

	return nextOptions;
}

function areMapOptionValuesEqual(
	left: unknown,
	right: unknown,
	seen = new WeakMap<object, object>()
): boolean {
	if (Object.is(left, right)) {
		return true;
	}
	if (
		left === null ||
		right === null ||
		typeof left !== 'object' ||
		typeof right !== 'object'
	) {
		return false;
	}

	const seenRight = seen.get(left);
	if (seenRight) {
		return seenRight === right;
	}
	seen.set(left, right);

	if (Array.isArray(left) || Array.isArray(right)) {
		if (
			!Array.isArray(left) ||
			!Array.isArray(right) ||
			left.length !== right.length
		) {
			return false;
		}
		return left.every((value, index) =>
			areMapOptionValuesEqual(value, right[index], seen)
		);
	}

	const leftPrototype = Object.getPrototypeOf(left);
	if (
		leftPrototype !== Object.getPrototypeOf(right) ||
		(leftPrototype !== Object.prototype && leftPrototype !== null)
	) {
		return false;
	}

	const leftRecord = left as Record<string, unknown>;
	const rightRecord = right as Record<string, unknown>;
	const leftKeys = Object.keys(leftRecord);
	const rightKeys = Object.keys(rightRecord);
	if (leftKeys.length !== rightKeys.length) {
		return false;
	}

	return leftKeys.every(
		(key) =>
			rightKeys.includes(key) &&
			areMapOptionValuesEqual(leftRecord[key], rightRecord[key], seen)
	);
}

export const GoogleMap = forwardRef<HTMLDivElement, GoogleMapProps>(
	(
		{
			apiKey,
			center,
			zoom = 12,
			mapId,
			options,
			consentCategory = 'measurement',
			libraries,
			language,
			region,
			version,
			authReferrerPolicy,
			channel,
			mapIds,
			solutionChannel,
			nonce,
			scriptId = 'c15t-google-maps',
			timeoutMs = 15_000,
			retryKey = 0,
			placeholder,
			loadingFallback,
			errorFallback,
			onReady,
			onError,
			style,
			...props
		},
		forwardedRef
	) => {
		const hasApiKey = apiKey.trim().length > 0;
		const { has } = useConsentManager();
		const hasMapConsent = has(consentCategory);
		const mapCanvasRef = useRef<HTMLDivElement | null>(null);
		const mapRef = useRef<GoogleMapInstance | null>(null);
		const latestCallbacksRef = useRef({ onError, onReady });
		const latestOptionsRef = useRef({ center, mapId, options, zoom });
		const appliedMapStateRef = useRef<{
			center: GoogleMapCoordinates;
			options: GoogleMapOptions;
			zoom: number;
		} | null>(null);
		const [initializationError, setInitializationError] =
			useState<Error | null>(null);
		const [authenticationError, setAuthenticationError] =
			useState<Error | null>(null);

		useEffect(() => {
			latestCallbacksRef.current = { onError, onReady };
		}, [onError, onReady]);

		useEffect(() => {
			latestOptionsRef.current = { center, mapId, options, zoom };
		}, [center, mapId, options, zoom]);

		const callbackName = useMemo(
			() => createCallbackName(scriptId),
			[scriptId]
		);

		const setWrapperRef = useCallback(
			(node: HTMLDivElement | null) => {
				if (typeof forwardedRef === 'function') {
					forwardedRef(node);
				} else if (forwardedRef) {
					forwardedRef.current = node;
				}
			},
			[forwardedRef]
		);

		const script = useMemo<Script>(
			() => ({
				id: scriptId,
				src: buildGoogleMapsScriptUrl({
					apiKey,
					authReferrerPolicy,
					callbackName,
					channel,
					libraries,
					language,
					mapIds,
					region,
					solutionChannel,
					version,
				}),
				category: consentCategory,
				async: true,
				nonce,
				persistAfterConsentRevoked: true,
			}),
			[
				apiKey,
				authReferrerPolicy,
				callbackName,
				channel,
				consentCategory,
				language,
				libraries,
				mapIds,
				nonce,
				region,
				scriptId,
				solutionChannel,
				version,
			]
		);

		const registerGoogleMapsCallback = useCallback(
			({ resolve, reject }: ConsentScriptReadyControls<GoogleMapsApi>) => {
				const win = getWindowRecord();
				if (!win) {
					return;
				}

				const callback = () => {
					const api = getGoogleMapsApi();
					if (api) {
						resolve(api);
						return;
					}

					reject(new Error('Google Maps callback fired before API was ready'));
				};

				win[callbackName] = callback;

				return () => {
					if (win[callbackName] === callback) {
						delete win[callbackName];
					}
				};
			},
			[callbackName]
		);

		const mapsScript = useConsentScript<GoogleMapsApi>({
			enabled: hasApiKey,
			script,
			resolveReady: getGoogleMapsApi,
			registerReadyCallback: registerGoogleMapsCallback,
			readinessKey: callbackName,
			retryKey,
			timeoutMs,
			unmountBehavior: 'keep',
		});

		useEffect(() => {
			// Retry clears an authentication failure even when consent is unchanged.
			void retryKey;

			setAuthenticationError(null);
			if (!hasApiKey || !mapsScript.hasConsent) {
				return;
			}

			return subscribeToGoogleMapsAuthFailure((nextError) => {
				setAuthenticationError(nextError);
				latestCallbacksRef.current.onError?.(nextError);
			});
		}, [hasApiKey, mapsScript.hasConsent, retryKey]);

		useEffect(() => {
			// Retry reconstructs a failed map even when the shared SDK is still ready.
			void retryKey;

			if (
				authenticationError ||
				mapsScript.status !== 'ready' ||
				!mapsScript.readyValue
			) {
				return;
			}

			const container = mapCanvasRef.current;
			if (!container) {
				return;
			}

			setInitializationError(null);
			container.innerHTML = '';

			let map: GoogleMapInstance;
			try {
				map = new mapsScript.readyValue.maps.Map(
					container,
					createMapOptions({
						...latestOptionsRef.current,
						mapId,
					})
				);
			} catch (error) {
				const nextError = toError(error);
				setInitializationError(nextError);
				latestCallbacksRef.current.onError?.(nextError);
				return;
			}

			mapRef.current = map;
			appliedMapStateRef.current = null;
			latestCallbacksRef.current.onReady?.(map, mapsScript.readyValue);

			return () => {
				mapsScript.readyValue?.maps.event?.clearInstanceListeners?.(map);
				container.innerHTML = '';
				if (mapRef.current === map) {
					mapRef.current = null;
					appliedMapStateRef.current = null;
				}
			};
		}, [
			authenticationError,
			mapId,
			mapsScript.readyValue,
			mapsScript.status,
			retryKey,
		]);

		useEffect(() => {
			if (mapsScript.status !== 'ready') {
				return;
			}

			const map = mapRef.current;
			if (!map) {
				return;
			}

			const nextOptions = createMapUpdateOptions(options);
			const previousState = appliedMapStateRef.current;

			if (
				!previousState ||
				!areMapOptionValuesEqual(previousState.options, nextOptions)
			) {
				map.setOptions(nextOptions);
			}
			if (
				!previousState ||
				previousState.center.lat !== center.lat ||
				previousState.center.lng !== center.lng
			) {
				map.setCenter(center);
			}
			if (!previousState || previousState.zoom !== zoom) {
				map.setZoom(zoom);
			}

			appliedMapStateRef.current = {
				center: { lat: center.lat, lng: center.lng },
				options: nextOptions,
				zoom,
			};
		}, [center, mapsScript.status, options, zoom]);

		const configurationError = useMemo(
			() =>
				hasApiKey ? null : new Error('Google Maps requires a browser API key.'),
			[hasApiKey]
		);
		const scriptError = useMemo(
			() => toGoogleMapsScriptError(mapsScript.error, scriptId),
			[mapsScript.error, scriptId]
		);

		useEffect(() => {
			const nextError = configurationError ?? scriptError;
			if (nextError) {
				latestCallbacksRef.current.onError?.(nextError);
			}
		}, [configurationError, scriptError]);

		const displayError =
			configurationError ??
			scriptError ??
			authenticationError ??
			initializationError;
		const fallback = (() => {
			if (!hasMapConsent) {
				return (
					placeholder ?? <IntegrationPlaceholder category={consentCategory} />
				);
			}

			if (!hasApiKey) {
				return (
					errorFallback ?? (
						<IntegrationStatus
							category={consentCategory}
							status="error"
						/>
					)
				);
			}

			if (mapsScript.status === 'blocked') {
				return (
					placeholder ?? <IntegrationPlaceholder category={consentCategory} />
				);
			}

			if (displayError) {
				return (
					errorFallback ?? (
						<IntegrationStatus
							category={consentCategory}
							status="error"
						/>
					)
				);
			}

			if (mapsScript.status === 'loading') {
				return (
					loadingFallback ?? (
						<IntegrationStatus
							category={consentCategory}
							status="loading"
						/>
					)
				);
			}

			return null;
		})();

		const isMapReady =
			mapsScript.status === 'ready' &&
			authenticationError === null &&
			initializationError === null;
		const displayStatus = !hasMapConsent
			? 'blocked'
			: displayError
				? 'error'
				: mapsScript.status;

		return (
			<div
				ref={setWrapperRef}
				aria-busy={mapsScript.status === 'loading' || undefined}
				data-c15t-integration="google-map"
				data-c15t-status={displayStatus}
				style={{ height: 320, width: '100%', ...style }}
				{...props}
			>
				{fallback}
				<div
					ref={mapCanvasRef}
					aria-hidden={!isMapReady}
					style={{
						display: isMapReady ? 'block' : 'none',
						height: '100%',
						width: '100%',
					}}
				/>
			</div>
		);
	}
);

GoogleMap.displayName = 'GoogleMap';

function toError(error: unknown): Error {
	if (error instanceof Error) {
		return error;
	}

	return new Error(String(error));
}

function toGoogleMapsScriptError(
	error: Error | null,
	scriptId: string
): Error | null {
	if (!error) {
		return null;
	}

	if (error instanceof ConsentScriptConflictError) {
		return new Error(
			`Conflicting Google Maps loader options were registered for '${scriptId}'. Google Maps supports one page-level loader: use the same apiKey, language, region, libraries, and loader options for every GoogleMap in this ConsentManagerProvider. Do not work around this conflict by changing scriptId.`
		);
	}

	return error;
}
