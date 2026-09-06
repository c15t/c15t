/**
 * The probe's page-global shape, shared by the in-page probe and the
 * Playwright runner so the two cannot drift — and so TypeScript sees one
 * `Window` augmentation instead of two conflicting ones.
 */

/** What the runner reads out of the page. */
export interface AstroBenchState {
	scenario: string;
	startedAtMs: number;
	mountCount: number;
	renderCount: number;
	activeUI: string;
	hasConsented: boolean;
	overrides: Record<string, unknown>;
	location: {
		countryCode?: string | null;
		regionCode?: string | null;
	} | null;
	bannerReadyMs?: number;
	bannerVisibleMs?: number;
	bannerPaintMs?: number | null;
	onBannerFetchedMs?: number;
	onBannerFetchedCount: number;
	onConsentSetCount: number;
	onErrorCount: number;
}

/** What `@c15t/benchmarking`'s init script publishes. */
export interface BenchPerfMetrics {
	cls: number;
	longTaskCount: number;
	longTaskTotalMs: number;
	bannerPaintMs: number | null;
}

declare global {
	interface Window {
		__c15tAstroBench?: AstroBenchState;
		__c15tBenchPerfMetrics?: BenchPerfMetrics;
	}
}
