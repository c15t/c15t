'use client';

import type { AllConsentNames, Script } from 'c15t';
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
import {
	type ConsentScriptReadyControls,
	useConsentScript,
} from '~/hooks/use-consent-script';
import { IntegrationPlaceholder } from './shared';

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

	/** Initial and controlled zoom level. */
	zoom?: number;

	/**
	 * Cloud map id. Changing this value recreates the map because Google treats
	 * it as construction-time configuration.
	 */
	mapId?: string;

	/** Additional options passed to the Google Maps constructor. */
	options?: Omit<GoogleMapOptions, 'center' | 'zoom' | 'mapId'>;

	consentCategory?: AllConsentNames;
	libraries?: GoogleMapsLibrary[];
	language?: string;
	region?: string;
	version?: string;
	authReferrerPolicy?: 'origin';
	channel?: string;
	mapIds?: string[];
	solutionChannel?: string;
	nonce?: string;
	scriptId?: string;
	timeoutMs?: number;
	placeholder?: ReactNode;
	loadingFallback?: ReactNode;
	errorFallback?: ReactNode;
	onReady?: (map: GoogleMapInstance, api: GoogleMapsApi) => void;
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
		const mapCanvasRef = useRef<HTMLDivElement | null>(null);
		const mapRef = useRef<GoogleMapInstance | null>(null);
		const latestCallbacksRef = useRef({ onError, onReady });
		const latestOptionsRef = useRef({ center, mapId, options, zoom });
		const [initializationError, setInitializationError] =
			useState<Error | null>(null);
		const [authenticationError, setAuthenticationError] =
			useState<Error | null>(null);
		const callbackName = useMemo(
			() => createCallbackName(scriptId),
			[scriptId]
		);

		latestCallbacksRef.current = { onError, onReady };
		latestOptionsRef.current = { center, mapId, options, zoom };

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
			timeoutMs,
			unmountBehavior: 'keep',
		});

		useEffect(() => {
			setAuthenticationError(null);
			if (!hasApiKey || !mapsScript.hasConsent) {
				return;
			}

			return subscribeToGoogleMapsAuthFailure((nextError) => {
				setAuthenticationError(nextError);
				latestCallbacksRef.current.onError?.(nextError);
			});
		}, [hasApiKey, mapsScript.hasConsent]);

		useEffect(() => {
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
			latestCallbacksRef.current.onReady?.(map, mapsScript.readyValue);

			return () => {
				mapsScript.readyValue?.maps.event?.clearInstanceListeners?.(map);
				container.innerHTML = '';
				if (mapRef.current === map) {
					mapRef.current = null;
				}
			};
		}, [authenticationError, mapId, mapsScript.readyValue, mapsScript.status]);

		useEffect(() => {
			if (mapsScript.status !== 'ready') {
				return;
			}

			const map = mapRef.current;
			if (!map) {
				return;
			}

			map.setOptions(createMapUpdateOptions(options));
			map.setCenter(center);
			map.setZoom(zoom);
		}, [center, mapsScript.status, options, zoom]);

		useEffect(() => {
			if (mapsScript.error) {
				latestCallbacksRef.current.onError?.(mapsScript.error);
			}
		}, [mapsScript.error]);

		const displayError =
			mapsScript.error ?? authenticationError ?? initializationError;
		const fallback = (() => {
			if (!hasApiKey) {
				return (
					errorFallback ?? (
						<IntegrationPlaceholder
							category={consentCategory}
							showButton={false}
						>
							Google Maps requires an API key.
						</IntegrationPlaceholder>
					)
				);
			}

			if (mapsScript.status === 'blocked') {
				return (
					placeholder ?? (
						<IntegrationPlaceholder category={consentCategory}>
							Allow {consentCategory} consent to view this map.
						</IntegrationPlaceholder>
					)
				);
			}

			if (displayError) {
				return (
					errorFallback ?? (
						<IntegrationPlaceholder
							category={consentCategory}
							showButton={false}
						>
							The map could not be loaded.
						</IntegrationPlaceholder>
					)
				);
			}

			if (mapsScript.status === 'loading') {
				return loadingFallback ?? null;
			}

			return null;
		})();

		const isMapReady =
			mapsScript.status === 'ready' &&
			authenticationError === null &&
			initializationError === null;

		return (
			<div
				ref={setWrapperRef}
				aria-busy={mapsScript.status === 'loading' || undefined}
				data-c15t-integration="google-map"
				data-c15t-status={displayError ? 'error' : mapsScript.status}
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
