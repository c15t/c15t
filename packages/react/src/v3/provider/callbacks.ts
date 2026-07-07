import type { AllConsentNames, Callbacks } from 'c15t';
import type { ConsentKernel, ConsentSnapshot, KernelEvent } from 'c15t/v3';
import { useEffect, useRef } from 'react';
import { DEFAULT_TRANSLATIONS } from './constants';

function snapshotConsentsChanged(
	previous: ConsentSnapshot,
	next: ConsentSnapshot
): boolean {
	return Object.keys(next.consents).some(
		(key) =>
			next.consents[key as AllConsentNames] !==
			previous.consents[key as AllConsentNames]
	);
}

function categoriesWithValue(snapshot: ConsentSnapshot, value: boolean) {
	return Object.entries(snapshot.consents)
		.filter(([, enabled]) => enabled === value)
		.map(([category]) => category as AllConsentNames);
}

function stringifyError(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
}

function hasRevokedConsent(previous: ConsentSnapshot, next: ConsentSnapshot) {
	if (!previous.hasConsented) return false;
	return Object.keys(previous.consents).some((key) => {
		const category = key as AllConsentNames;
		if (category === 'necessary') return false;
		return previous.consents[category] && !next.consents[category];
	});
}

export function useProviderCallbacks(
	kernel: ConsentKernel,
	callbacks: Callbacks | undefined,
	reloadOnConsentRevoked: boolean
) {
	const callbacksRef = useRef(callbacks);
	const saveStartedSnapshotRef = useRef<ConsentSnapshot | null>(null);
	const saveNotifiedRef = useRef(false);
	callbacksRef.current = callbacks;

	useEffect(() => {
		const notifyConsentSaved = (
			previous: ConsentSnapshot | null,
			next: ConsentSnapshot
		) => {
			callbacksRef.current?.onConsentSet?.({
				preferences: next.consents as never,
			});
			if (previous && snapshotConsentsChanged(previous, next)) {
				callbacksRef.current?.onConsentChanged?.({
					preferences: next.consents as never,
					previousPreferences: previous.consents as never,
					allowedCategories: categoriesWithValue(next, true),
					deniedCategories: categoriesWithValue(next, false),
					previousAllowedCategories: categoriesWithValue(previous, true),
					previousDeniedCategories: categoriesWithValue(previous, false),
				});
				if (reloadOnConsentRevoked && hasRevokedConsent(previous, next)) {
					callbacksRef.current?.onBeforeConsentRevocationReload?.({
						preferences: next.consents as never,
					});
					if (typeof window !== 'undefined') {
						window.location.reload();
					}
				}
			}
		};

		const subscriptions = [
			kernel.subscribe((next) => {
				const previous = saveStartedSnapshotRef.current;
				if (!previous || saveNotifiedRef.current || previous === next) {
					return;
				}
				saveNotifiedRef.current = true;
				notifyConsentSaved(previous, next);
			}),
			kernel.events.on('init:applied', ({ snapshot }) => {
				const decision = snapshot.policyDecision as {
					jurisdiction?: unknown;
				} | null;
				callbacksRef.current?.onBannerFetched?.({
					jurisdiction:
						typeof decision?.jurisdiction === 'string'
							? (decision.jurisdiction as never)
							: ('NONE' as never),
					location: {
						countryCode: snapshot.location?.countryCode ?? null,
						regionCode: snapshot.location?.regionCode ?? null,
					},
					translations: snapshot.translations ?? {
						...DEFAULT_TRANSLATIONS,
					},
				});
			}),
			kernel.events.on('command:save:started', () => {
				saveStartedSnapshotRef.current = kernel.getSnapshot();
				saveNotifiedRef.current = false;
			}),
			kernel.events.on('command:save:completed', ({ result }) => {
				if (!result.ok) return;
				if (saveNotifiedRef.current) {
					saveStartedSnapshotRef.current = null;
					return;
				}
				const previous = saveStartedSnapshotRef.current;
				const next = kernel.getSnapshot();
				notifyConsentSaved(previous, next);
				saveStartedSnapshotRef.current = null;
			}),
			kernel.events.on(
				'command:error',
				(event: Extract<KernelEvent, { type: 'command:error' }>) => {
					callbacksRef.current?.onError?.({
						error: stringifyError(event.error),
					});
				}
			),
		];

		return () => {
			for (const unsubscribe of subscriptions) {
				unsubscribe();
			}
		};
	}, [kernel, reloadOnConsentRevoked]);
}
