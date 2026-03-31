import type { ResolvedPolicy } from '~/api/init';

/** @deprecated Strategy selection removed — uses crypto.subtle (async) or pure-JS (sync) */
export type FingerprintHashStrategy = 'auto' | 'node' | 'webcrypto' | 'pure-js';

export function stableStringify(value: unknown): string {
	if (value === null || typeof value !== 'object') {
		return JSON.stringify(value);
	}

	if (Array.isArray(value)) {
		return `[${value.map((item) => stableStringify(item)).join(',')}]`;
	}

	const entries = Object.entries(value as Record<string, unknown>)
		.filter(([, entryValue]) => entryValue !== undefined)
		.sort(([a], [b]) => a.localeCompare(b));

	return `{${entries
		.map(
			([key, entryValue]) =>
				`${JSON.stringify(key)}:${stableStringify(entryValue)}`
		)
		.join(',')}}`;
}

async function sha256HexSubtle(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const hash = await globalThis.crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hash))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

export async function hashSha256Hex(input: string): Promise<string> {
	return sha256HexSubtle(input);
}

export function createDeterministicFingerprintSync(value: unknown): string {
	const input = stableStringify(value);
	const data = new TextEncoder().encode(input);

	// SHA-256 constants
	const K = new Uint32Array([
		0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
		0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
		0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
		0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
		0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
		0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
		0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
		0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
		0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
		0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
		0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
	]);

	const bitLen = data.length * 8;
	const padLen = (((data.length + 9 + 63) >> 6) << 6) >>> 0;
	const padded = new Uint8Array(padLen);
	padded.set(data);
	padded[data.length] = 0x80;
	const view = new DataView(padded.buffer);
	view.setUint32(padLen - 8, Math.floor(bitLen / 2 ** 32), false);
	view.setUint32(padLen - 4, bitLen >>> 0, false);

	const H = new Uint32Array([
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
		0x1f83d9ab, 0x5be0cd19,
	]);
	const W = new Uint32Array(64);
	const r = (v: number, s: number) => (v >>> s) | (v << (32 - s));

	for (let off = 0; off < padLen; off += 64) {
		for (let i = 0; i < 16; i++) W[i] = view.getUint32(off + i * 4, false);
		for (let i = 16; i < 64; i++) {
			const s0 = r(W[i - 15]!, 7) ^ r(W[i - 15]!, 18) ^ (W[i - 15]! >>> 3);
			const s1 = r(W[i - 2]!, 17) ^ r(W[i - 2]!, 19) ^ (W[i - 2]! >>> 10);
			W[i] = (W[i - 16]! + s0 + W[i - 7]! + s1) >>> 0;
		}
		let [a, b, c, d, e, f, g, h] = H;
		for (let i = 0; i < 64; i++) {
			const t1 =
				(h! +
					(r(e!, 6) ^ r(e!, 11) ^ r(e!, 25)) +
					((e! & f!) ^ (~e! & g!)) +
					K[i]! +
					W[i]!) >>>
				0;
			const t2 =
				((r(a!, 2) ^ r(a!, 13) ^ r(a!, 22)) +
					((a! & b!) ^ (a! & c!) ^ (b! & c!))) >>>
				0;
			h = g;
			g = f;
			f = e;
			e = (d! + t1) >>> 0;
			d = c;
			c = b;
			b = a;
			a = (t1 + t2) >>> 0;
		}
		H[0] = (H[0]! + a!) >>> 0;
		H[1] = (H[1]! + b!) >>> 0;
		H[2] = (H[2]! + c!) >>> 0;
		H[3] = (H[3]! + d!) >>> 0;
		H[4] = (H[4]! + e!) >>> 0;
		H[5] = (H[5]! + f!) >>> 0;
		H[6] = (H[6]! + g!) >>> 0;
		H[7] = (H[7]! + h!) >>> 0;
	}

	return Array.from(H)
		.map((w) => w.toString(16).padStart(8, '0'))
		.join('');
}

export async function createDeterministicFingerprint(
	value: unknown
): Promise<string> {
	return hashSha256Hex(stableStringify(value));
}

export async function createPolicyFingerprint(
	policy: ResolvedPolicy
): Promise<string> {
	return createDeterministicFingerprint(policy);
}

function createMaterialPolicyFingerprintInput(policy: ResolvedPolicy) {
	return {
		model: policy.model,
		consent: policy.consent
			? {
					expiryDays: policy.consent.expiryDays,
					scopeMode: policy.consent.scopeMode,
					categories: policy.consent.categories,
					preselectedCategories: policy.consent.preselectedCategories,
					gpc: policy.consent.gpc,
				}
			: undefined,
		ui: policy.ui
			? {
					mode: policy.ui.mode,
					banner: policy.ui.banner
						? {
								allowedActions: policy.ui.banner.allowedActions,
								primaryAction: policy.ui.banner.primaryAction,
								layout: policy.ui.banner.layout,
								direction: policy.ui.banner.direction,
							}
						: undefined,
					dialog: policy.ui.dialog
						? {
								allowedActions: policy.ui.dialog.allowedActions,
								primaryAction: policy.ui.dialog.primaryAction,
								layout: policy.ui.dialog.layout,
								direction: policy.ui.dialog.direction,
							}
						: undefined,
				}
			: undefined,
		proof: policy.proof
			? {
					storeIp: policy.proof.storeIp,
					storeUserAgent: policy.proof.storeUserAgent,
					storeLanguage: policy.proof.storeLanguage,
				}
			: undefined,
	};
}

export async function createMaterialPolicyFingerprint(
	policy: ResolvedPolicy
): Promise<string> {
	return createDeterministicFingerprint(
		createMaterialPolicyFingerprintInput(policy)
	);
}
