export type BenchThrottleProfileName = 'none' | 'mobile';

export interface BenchThrottleProfile {
	name: BenchThrottleProfileName;
	cpuThrottlingRate: number;
	network: {
		latencyMs: number;
		downloadThroughputBytesPerSecond: number;
		uploadThroughputBytesPerSecond: number;
	};
}

export const benchThrottleProfiles: Record<
	BenchThrottleProfileName,
	BenchThrottleProfile
> = {
	none: {
		name: 'none',
		cpuThrottlingRate: 1,
		network: {
			latencyMs: 0,
			downloadThroughputBytesPerSecond: -1,
			uploadThroughputBytesPerSecond: -1,
		},
	},
	mobile: {
		name: 'mobile',
		cpuThrottlingRate: 4,
		network: {
			latencyMs: 170,
			downloadThroughputBytesPerSecond: 1_125_000,
			uploadThroughputBytesPerSecond: 187_500,
		},
	},
};

export interface BenchCdpSession {
	send(method: string, params?: Record<string, unknown>): Promise<unknown>;
}

export function parseBenchThrottleProfile(
	value: string | undefined
): BenchThrottleProfileName {
	const profile = value ?? 'none';
	if (profile === 'none' || profile === 'mobile') {
		return profile;
	}

	throw new Error(
		`Unsupported benchmark throttle profile "${profile}". Expected "none" or "mobile".`
	);
}

export function parseBenchInitLatencyMs(value: string | undefined): number {
	if (!value) {
		return 0;
	}

	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error(
			`C15T_BENCH_INIT_LATENCY_MS must be a non-negative number. Received "${value}".`
		);
	}

	return Math.round(parsed);
}

export async function applyBenchThrottleProfile(
	session: BenchCdpSession,
	profileName: BenchThrottleProfileName
): Promise<void> {
	const profile = benchThrottleProfiles[profileName];
	await session.send('Network.enable');
	await session.send('Emulation.setCPUThrottlingRate', {
		rate: profile.cpuThrottlingRate,
	});
	await session.send('Network.emulateNetworkConditions', {
		offline: false,
		latency: profile.network.latencyMs,
		downloadThroughput: profile.network.downloadThroughputBytesPerSecond,
		uploadThroughput: profile.network.uploadThroughputBytesPerSecond,
	});
}
