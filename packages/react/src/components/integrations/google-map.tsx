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

export type GoogleMapInstance = object;

export interface GoogleMapOptions {
	center: GoogleMapCoordinates;
	zoom?: number;
	mapId?: string;
	[key: string]: unknown;
}

export interface C15TGoogleMapProps
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
	return typeof window === 'undefined'
		? null
		: (window as unknown as Record<string, unknown>);
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

export const C15TGoogleMap = forwardRef<HTMLDivElement, C15TGoogleMapProps>(
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
		const containerRef = useRef<HTMLDivElement | null>(null);
		const mapRef = useRef<GoogleMapInstance | null>(null);
		const callbackName = `__c15tGoogleMapsReady_${sanitizeCallbackName(scriptId)}`;

		const setContainerRef = useCallback(
			(node: HTMLDivElement | null) => {
				containerRef.current = node;

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
				defer: true,
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
			script,
			resolveReady: getGoogleMapsApi,
			registerReadyCallback: registerGoogleMapsCallback,
			timeoutMs,
		});

		useEffect(() => {
			if (mapsScript.status !== 'ready' || !mapsScript.readyValue) {
				return;
			}

			const container = containerRef.current;
			if (!container) {
				return;
			}

			container.innerHTML = '';

			let map: GoogleMapInstance;
			try {
				map = new mapsScript.readyValue.maps.Map(container, {
					...options,
					center,
					zoom,
					mapId,
				});
			} catch (error) {
				onError?.(error instanceof Error ? error : new Error(String(error)));
				return;
			}

			mapRef.current = map;
			onReady?.(map, mapsScript.readyValue);

			return () => {
				if (mapRef.current) {
					mapsScript.readyValue?.maps.event?.clearInstanceListeners?.(
						mapRef.current
					);
				}
				container.innerHTML = '';
				mapRef.current = null;
			};
		}, [
			center,
			mapId,
			mapsScript.readyValue,
			mapsScript.status,
			onError,
			onReady,
			options,
			zoom,
		]);

		useEffect(() => {
			if (mapsScript.error) {
				onError?.(mapsScript.error);
			}
		}, [mapsScript.error, onError]);

		const fallback = (() => {
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

		return (
			<div data-c15t-integration="google-map" {...props}>
				{fallback}
				<div
					ref={setContainerRef}
					aria-hidden={mapsScript.status !== 'ready'}
					style={{
						display: mapsScript.status === 'ready' ? 'block' : 'none',
						height: '100%',
						width: '100%',
					}}
				/>
			</div>
		);
	}
);

C15TGoogleMap.displayName = 'C15TGoogleMap';
