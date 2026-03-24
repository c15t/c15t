'use client';

import {
	type AllConsentNames,
	ConsentBanner,
	ConsentManagerProvider,
	getPrefetchedInitialData,
	type InitialDataPromise,
} from '@c15t/nextjs';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
	BenchmarkProbe,
	type BenchmarkVariant,
	createBenchmarkCallbacks,
} from './bench-client';
import { BENCHMARK_BACKEND_URL } from './constants';

interface BenchmarkConsentProviderProps {
	children: ReactNode;
	variant: BenchmarkVariant;
	ssrData?: InitialDataPromise;
}

type BenchmarkAnimationMode = 'default' | 'fast' | 'off';

const BENCHMARK_CONSENT_CATEGORIES: AllConsentNames[] = [
	'necessary',
	'measurement',
	'marketing',
];

function getBenchmarkTheme(mode: BenchmarkAnimationMode) {
	if (mode === 'fast') {
		return {
			motion: {
				duration: {
					fast: '16ms',
					normal: '32ms',
					slow: '64ms',
				},
			},
		};
	}

	if (mode === 'off') {
		return {
			motion: {
				duration: {
					fast: '1ms',
					normal: '1ms',
					slow: '1ms',
				},
			},
		};
	}

	return undefined;
}

export function BenchmarkConsentProvider({
	children,
	variant,
	ssrData,
}: BenchmarkConsentProviderProps) {
	const [animationMode, setAnimationMode] = useState<BenchmarkAnimationMode>(
		() => {
			const fromEnv = process.env.NEXT_PUBLIC_BENCH_ANIMATION_MODE;
			if (fromEnv === 'fast' || fromEnv === 'off') {
				return fromEnv;
			}

			return 'default';
		}
	);

	useEffect(() => {
		const fromQuery = new URLSearchParams(window.location.search).get('anim');
		if (fromQuery === 'fast' || fromQuery === 'off') {
			setAnimationMode(fromQuery);
		}
	}, []);

	const resolvedSSRData = useMemo(() => {
		if (variant === 'prefetch') {
			return (
				getPrefetchedInitialData({
					backendURL: BENCHMARK_BACKEND_URL,
				}) ?? ssrData
			);
		}

		return ssrData;
	}, [ssrData, variant]);

	const options = useMemo(
		() => ({
			mode: 'c15t' as const,
			backendURL: BENCHMARK_BACKEND_URL,
			ssrData: resolvedSSRData,
			theme: getBenchmarkTheme(animationMode),
			consentCategories: BENCHMARK_CONSENT_CATEGORIES,
			iab: {
				enabled: false,
			},
			callbacks: createBenchmarkCallbacks(variant),
			legalLinks: {
				privacyPolicy: { href: '/benchmark' },
				termsOfService: { href: '/benchmark' },
			},
		}),
		[animationMode, resolvedSSRData, variant]
	);

	return (
		<ConsentManagerProvider options={options}>
			<BenchmarkProbe variant={variant} />
			<ConsentBanner disableAnimation={animationMode === 'off'} />
			{children}
		</ConsentManagerProvider>
	);
}
