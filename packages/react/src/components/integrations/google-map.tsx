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
} from 'react';
import {
	type ConsentScriptReadyControls,
	useConsentScript,
} from '~/hooks/use-consent-script';
import { IntegrationPlaceholder } from './shared';

export interface GoogleMapCoordinates {
	lat: number;
	lng: number;
}

export interface GoogleMapsApi {
	maps: {
		Map: new (
			element: HTMLElement,
			options: GoogleMapOptions
		) => GoogleMapInstance;
		event?: {
			clearInstanceListeners?: (instance: GoogleMapInstance) => void;
		};
	};
}

export interface GoogleMapInstance {
	getCenter?: () => unknown;
	getZoom?: () => number | undefined;
	setCenter?: (center: GoogleMapCoordinates) => void;
	setOptions?: (options: Record<string, unknown>) => void;
	setZoom?: (zoom: number) => void;
}

export interface GoogleMapOptions {
	center: GoogleMapCoordinates;
	zoom?: number;
	mapId?: string;
	[key: string]: unknown;
}

export interface GoogleMapProps
	extends Omit<ComponentPropsWithRef<'div'>, 'children' | 'onError'> {
	apiKey: string;
	center: GoogleMapCoordinates;
	zoom?: number;
	mapId?: string;
	options?: Omit<GoogleMapOptions, 'center' | 'zoom' | 'mapId'>;
	consentCategory?: AllConsentNames;
	libraries?: string[];
	language?: string;
	region?: string;
	version?: string;
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
	const win = getWindowRecord();
	const google = win?.google as GoogleMapsApi | undefined;

	if (google?.maps?.Map) {
		return google;
	}

	return null;
}

function sanitizeCallbackName(value: string): string {
	return value.replace(/[^A-Za-z0-9_$]/g, '_');
}

function buildGoogleMapsScriptUrl({
	apiKey,
	callbackName,
	libraries,
	language,
	region,
	version,
}: {
	apiKey: string;
	callbackName: string;
	libraries?: string[];
	language?: string;
	region?: string;
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
	const nextOptions: GoogleMapOptions = {
		...options,
		center,
		zoom,
	};

	if (mapId) {
		nextOptions.mapId = mapId;
	}

	return nextOptions;
}

function createMapUpdateOptions({
	mapId,
	options,
}: {
	mapId?: string;
	options?: Omit<GoogleMapOptions, 'center' | 'zoom' | 'mapId'>;
}): Record<string, unknown> {
	const nextOptions: Record<string, unknown> = {
		...options,
	};

	if (mapId) {
		nextOptions.mapId = mapId;
	}

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
			nonce,
			scriptId = 'c15t-google-maps',
			timeoutMs = 15_000,
			placeholder,
			loadingFallback,
			errorFallback,
			onReady,
			onError,
			...props
		},
		forwardedRef
	) => {
		const hasApiKey = apiKey.trim().length > 0;
		const mapCanvasRef = useRef<HTMLDivElement | null>(null);
		const mapRef = useRef<GoogleMapInstance | null>(null);
		const latestCallbacksRef = useRef({ onError, onReady });
		const latestOptionsRef = useRef({ center, mapId, options, zoom });
		const callbackName = `__c15tGoogleMapsReady_${sanitizeCallbackName(scriptId)}`;

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
					callbackName,
					libraries,
					language,
					region,
					version,
				}),
				category: consentCategory,
				async: true,
				nonce,
			}),
			[
				apiKey,
				callbackName,
				consentCategory,
				language,
				libraries,
				nonce,
				region,
				scriptId,
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
			timeoutMs,
		});

		useEffect(() => {
			if (mapsScript.status !== 'ready' || !mapsScript.readyValue) {
				return;
			}

			const container = mapCanvasRef.current;
			if (!container) {
				return;
			}

			if (mapRef.current) {
				return;
			}

			const initialOptions = latestOptionsRef.current;
			container.innerHTML = '';

			let map: GoogleMapInstance;
			try {
				map = new mapsScript.readyValue.maps.Map(
					container,
					createMapOptions(initialOptions)
				);
			} catch (error) {
				let nextError = new Error(String(error));
				if (error instanceof Error) {
					nextError = error;
				}
				latestCallbacksRef.current.onError?.(nextError);
				return;
			}

			mapRef.current = map;
			latestCallbacksRef.current.onReady?.(map, mapsScript.readyValue);

			return () => {
				if (mapRef.current) {
					mapsScript.readyValue?.maps.event?.clearInstanceListeners?.(
						mapRef.current
					);
				}
				container.innerHTML = '';
				mapRef.current = null;
			};
		}, [mapsScript.readyValue, mapsScript.status]);

		useEffect(() => {
			if (mapsScript.status !== 'ready') {
				return;
			}

			const map = mapRef.current;
			if (!map) {
				return;
			}

			map.setOptions?.(createMapUpdateOptions({ mapId, options }));
			map.setCenter?.(center);
			map.setZoom?.(zoom);
		}, [center, mapId, mapsScript.status, options, zoom]);

		useEffect(() => {
			if (mapsScript.error) {
				onError?.(mapsScript.error);
			}
		}, [mapsScript.error, onError]);

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

			if (mapsScript.status === 'error') {
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

		const isMapReady = mapsScript.status === 'ready';
		let mapCanvasDisplay = 'none';
		if (isMapReady) {
			mapCanvasDisplay = 'block';
		}

		return (
			<div ref={setWrapperRef} data-c15t-integration="google-map" {...props}>
				{fallback}
				<div
					ref={mapCanvasRef}
					aria-hidden={!isMapReady}
					style={{
						display: mapCanvasDisplay,
						height: '100%',
						width: '100%',
					}}
				/>
			</div>
		);
	}
);

GoogleMap.displayName = 'GoogleMap';
