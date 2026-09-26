'use client';

// Stand-in for `<SpeedInsights />` from @vercel/speed-insights/next 2.0.0,
// which the site renders after its ThemeProvider. That component wraps a
// child reading useSearchParams/useParams/usePathname in
// <Suspense fallback={null}>. Under cacheComponents the child is a
// request-time hole, so its empty boundary streams and reveals at once.
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const Tracker = () => {
	useSearchParams();
	useParams();
	usePathname();
	return null;
};

export const SpeedInsightsStandIn = () => (
	<Suspense fallback={null}>
		<Tracker />
	</Suspense>
);
