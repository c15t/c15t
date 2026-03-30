import type { ResolvedPolicy } from '~/api/init';

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

type SubtleCryptoLike = {
	digest(
		algorithm: AlgorithmIdentifier,
		data: BufferSource
	): Promise<ArrayBuffer>;
};

type CreateHashLike = (algorithm: string) => {
	update(
		data: string,
		inputEncoding?: string
	): {
		digest(encoding: 'hex'): string;
	};
};

let subtleCryptoPromise: Promise<SubtleCryptoLike | null> | undefined;
let nodeCreateHashPromise: Promise<CreateHashLike | null> | undefined;

function isBunRuntime(): boolean {
	return (
		typeof Bun !== 'undefined' ||
		(typeof process !== 'undefined' &&
			typeof process.versions === 'object' &&
			Boolean(process.versions?.bun))
	);
}

function isNodeHashRuntime(): boolean {
	return (
		typeof process !== 'undefined' &&
		typeof process.versions === 'object' &&
		Boolean(process.versions?.node) &&
		!isBunRuntime()
	);
}

async function getNodeCreateHash(): Promise<CreateHashLike | null> {
	if (!isNodeHashRuntime()) {
		return null;
	}

	nodeCreateHashPromise ??= (async () => {
		try {
			const { createHash } = await import('node:crypto');
			return createHash;
		} catch {
			return null;
		}
	})();

	return nodeCreateHashPromise;
}

async function getSubtleCrypto(): Promise<SubtleCryptoLike | null> {
	const availableSubtle = globalThis.crypto?.subtle;
	if (availableSubtle) {
		return availableSubtle;
	}

	subtleCryptoPromise ??= (async () => {
		try {
			const { webcrypto } = await import('node:crypto');
			return webcrypto.subtle;
		} catch {
			return null;
		}
	})();

	return subtleCryptoPromise;
}

function rightRotate(value: number, shift: number): number {
	return (value >>> shift) | (value << (32 - shift));
}

function sha256HexPureJs(input: string): string {
	const bytes = new TextEncoder().encode(input);
	const bitLength = bytes.length * 8;
	const paddedLength = (((bytes.length + 9 + 63) >> 6) << 6) >>> 0;
	const padded = new Uint8Array(paddedLength);
	padded.set(bytes);
	padded[bytes.length] = 0x80;

	const view = new DataView(padded.buffer);
	const highBits = Math.floor(bitLength / 2 ** 32);
	const lowBits = bitLength >>> 0;
	view.setUint32(paddedLength - 8, highBits, false);
	view.setUint32(paddedLength - 4, lowBits, false);

	const initialHash = new Uint32Array([
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
		0x1f83d9ab, 0x5be0cd19,
	]);

	const roundConstants = new Uint32Array([
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

	const words = new Uint32Array(64);

	for (let offset = 0; offset < paddedLength; offset += 64) {
		for (let index = 0; index < 16; index += 1) {
			words[index] = view.getUint32(offset + index * 4, false);
		}

		for (let index = 16; index < 64; index += 1) {
			const word15 = words[index - 15]!;
			const word2 = words[index - 2]!;
			const word16 = words[index - 16]!;
			const word7 = words[index - 7]!;
			const s0 =
				rightRotate(word15, 7) ^ rightRotate(word15, 18) ^ (word15 >>> 3);
			const s1 =
				rightRotate(word2, 17) ^ rightRotate(word2, 19) ^ (word2 >>> 10);
			words[index] = (word16 + s0 + word7 + s1) >>> 0;
		}

		let a = initialHash[0]!;
		let b = initialHash[1]!;
		let c = initialHash[2]!;
		let d = initialHash[3]!;
		let e = initialHash[4]!;
		let f = initialHash[5]!;
		let g = initialHash[6]!;
		let h = initialHash[7]!;

		for (let index = 0; index < 64; index += 1) {
			const sigma1 =
				rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
			const choice = (e & f) ^ (~e & g);
			const temp1 =
				(h + sigma1 + choice + roundConstants[index]! + words[index]!) >>> 0;
			const sigma0 =
				rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
			const majority = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = (sigma0 + majority) >>> 0;

			h = g;
			g = f;
			f = e;
			e = (d + temp1) >>> 0;
			d = c;
			c = b;
			b = a;
			a = (temp1 + temp2) >>> 0;
		}

		initialHash[0] = (initialHash[0]! + a) >>> 0;
		initialHash[1] = (initialHash[1]! + b) >>> 0;
		initialHash[2] = (initialHash[2]! + c) >>> 0;
		initialHash[3] = (initialHash[3]! + d) >>> 0;
		initialHash[4] = (initialHash[4]! + e) >>> 0;
		initialHash[5] = (initialHash[5]! + f) >>> 0;
		initialHash[6] = (initialHash[6]! + g) >>> 0;
		initialHash[7] = (initialHash[7]! + h) >>> 0;
	}

	return Array.from(initialHash)
		.map((word) => word.toString(16).padStart(8, '0'))
		.join('');
}

async function sha256HexNode(input: string): Promise<string | null> {
	const createHash = await getNodeCreateHash();
	if (!createHash) {
		return null;
	}

	return createHash('sha256').update(input, 'utf8').digest('hex');
}

async function sha256HexWebCrypto(input: string): Promise<string | null> {
	const data = new TextEncoder().encode(input);
	const subtle = await getSubtleCrypto();
	if (!subtle) {
		return null;
	}

	const hash = await subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hash))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

export async function hashSha256Hex(
	input: string,
	strategy: FingerprintHashStrategy = 'auto'
): Promise<string> {
	switch (strategy) {
		case 'node':
			return (await sha256HexNode(input)) ?? sha256HexPureJs(input);
		case 'webcrypto':
			return (await sha256HexWebCrypto(input)) ?? sha256HexPureJs(input);
		case 'pure-js':
			return sha256HexPureJs(input);
		case 'auto':
		default:
			return (
				(await sha256HexNode(input)) ??
				(await sha256HexWebCrypto(input)) ??
				sha256HexPureJs(input)
			);
	}
}

export function createDeterministicFingerprintSync(value: unknown): string {
	return sha256HexPureJs(stableStringify(value));
}

export async function createDeterministicFingerprint(
	value: unknown,
	strategy: FingerprintHashStrategy = 'auto'
): Promise<string> {
	return hashSha256Hex(stableStringify(value), strategy);
}

export async function createPolicyFingerprint(
	policy: ResolvedPolicy,
	strategy: FingerprintHashStrategy = 'auto'
): Promise<string> {
	return createDeterministicFingerprint(policy, strategy);
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
	policy: ResolvedPolicy,
	strategy: FingerprintHashStrategy = 'auto'
): Promise<string> {
	return createDeterministicFingerprint(
		createMaterialPolicyFingerprintInput(policy),
		strategy
	);
}
