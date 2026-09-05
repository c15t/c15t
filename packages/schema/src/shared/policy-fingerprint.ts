import type { LegacyMaterialPolicyInput } from './legacy-material-policy';

export const stableStringify = function stableStringify(
	value: unknown
): string {
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
};

const sha256HexPureJs = function sha256HexPureJs(input: string): string {
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
	const padLen = Math.ceil((data.length + 9) / 64) * 64;
	const padded = new Uint8Array(padLen);
	padded.set(data);
	padded[data.length] = 0x80;
	const view = new DataView(padded.buffer);
	view.setUint32(padLen - 8, Math.floor(bitLen / 2 ** 32), false);
	view.setUint32(padLen - 4, bitLen % 2 ** 32, false);

	const H = new Uint32Array([
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
		0x1f83d9ab, 0x5be0cd19,
	]);
	const W = new Uint32Array(64);
	// SHA-256 operates on fixed-width words; native bitwise operations avoid
	// allocating and scanning 32 individual bits for every compression step.
	/* oxlint-disable no-bitwise -- SHA-256 requires unsigned 32-bit word operations. */
	const toUint32 = (value: number) => value >>> 0;
	const rightShift = (value: number, places: number) => value >>> places;
	const rotateRight = (value: number, places: number) =>
		(value >>> places) | (value << (32 - places));
	const andWords = (left: number, right: number) => left & right;
	const xorWords = (first: number, second: number, third = 0) =>
		(first ^ second ^ third) >>> 0;
	/* oxlint-enable no-bitwise */
	const word = (array: Uint32Array, index: number) => {
		const value = array[index];
		if (value === undefined) {
			throw new RangeError(`SHA-256 word ${index} is out of bounds`);
		}
		return value;
	};

	for (let off = 0; off < padLen; off += 64) {
		for (let i = 0; i < 16; i += 1) {
			W[i] = view.getUint32(off + i * 4, false);
		}
		for (let i = 16; i < 64; i += 1) {
			const w15 = word(W, i - 15);
			const w2 = word(W, i - 2);
			const s0 = xorWords(
				rotateRight(w15, 7),
				rotateRight(w15, 18),
				rightShift(w15, 3)
			);
			const s1 = xorWords(
				rotateRight(w2, 17),
				rotateRight(w2, 19),
				rightShift(w2, 10)
			);
			W[i] = toUint32(word(W, i - 16) + s0 + word(W, i - 7) + s1);
		}
		let a = word(H, 0);
		let b = word(H, 1);
		let c = word(H, 2);
		let d = word(H, 3);
		let e = word(H, 4);
		let f = word(H, 5);
		let g = word(H, 6);
		let h = word(H, 7);
		for (let i = 0; i < 64; i += 1) {
			const t1 = toUint32(
				h +
					xorWords(rotateRight(e, 6), rotateRight(e, 11), rotateRight(e, 25)) +
					xorWords(andWords(e, f), andWords(0xffff_ffff - e, g)) +
					word(K, i) +
					word(W, i)
			);
			const t2 = toUint32(
				xorWords(rotateRight(a, 2), rotateRight(a, 13), rotateRight(a, 22)) +
					xorWords(andWords(a, b), andWords(a, c), andWords(b, c))
			);
			h = g;
			g = f;
			f = e;
			e = toUint32(d + t1);
			d = c;
			c = b;
			b = a;
			a = toUint32(t1 + t2);
		}
		H[0] = toUint32(word(H, 0) + a);
		H[1] = toUint32(word(H, 1) + b);
		H[2] = toUint32(word(H, 2) + c);
		H[3] = toUint32(word(H, 3) + d);
		H[4] = toUint32(word(H, 4) + e);
		H[5] = toUint32(word(H, 5) + f);
		H[6] = toUint32(word(H, 6) + g);
		H[7] = toUint32(word(H, 7) + h);
	}

	return Array.from(H)
		.map((w) => w.toString(16).padStart(8, '0'))
		.join('');
};

export const hashSha256Hex = async function hashSha256Hex(
	input: string
): Promise<string> {
	const subtle = globalThis.crypto?.subtle;
	if (subtle) {
		const data = new TextEncoder().encode(input);
		const hash = await subtle.digest('SHA-256', data);
		return Array.from(new Uint8Array(hash))
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('');
	}
	return sha256HexPureJs(input);
};

export const createDeterministicFingerprintSync =
	function createDeterministicFingerprintSync(value: unknown): string {
		return sha256HexPureJs(stableStringify(value));
	};

export const createDeterministicFingerprint =
	function createDeterministicFingerprint(value: unknown): Promise<string> {
		return hashSha256Hex(stableStringify(value));
	};

const createMaterialPolicyFingerprintInput =
	function createMaterialPolicyFingerprintInput(
		policy: LegacyMaterialPolicyInput
	) {
		return {
			consent: policy.consent
				? {
						categories: policy.consent.categories,
						expiryDays: policy.consent.expiryDays,
						gpc: policy.consent.gpc,
						preselectedCategories: policy.consent.preselectedCategories,
						scopeMode: policy.consent.scopeMode,
					}
				: undefined,
			model: policy.model,
			proof: policy.proof
				? {
						storeIp: policy.proof.storeIp,
						storeLanguage: policy.proof.storeLanguage,
						storeUserAgent: policy.proof.storeUserAgent,
					}
				: undefined,
			ui: policy.ui
				? {
						banner: policy.ui.banner
							? {
									allowedActions: policy.ui.banner.allowedActions,
									direction: policy.ui.banner.direction,
									layout: policy.ui.banner.layout,
									primaryActions: policy.ui.banner.primaryActions,
								}
							: undefined,
						dialog: policy.ui.dialog
							? {
									allowedActions: policy.ui.dialog.allowedActions,
									direction: policy.ui.dialog.direction,
									layout: policy.ui.dialog.layout,
									primaryActions: policy.ui.dialog.primaryActions,
								}
							: undefined,
						mode: policy.ui.mode,
					}
				: undefined,
		};
	};

export const createMaterialPolicyFingerprint =
	function createMaterialPolicyFingerprint(
		policy: LegacyMaterialPolicyInput
	): Promise<string> {
		return createDeterministicFingerprint(
			createMaterialPolicyFingerprintInput(policy)
		);
	};

/**
 * Synchronous variant of {@link createMaterialPolicyFingerprint}. Same
 * input, same bytes; used where resolution must stay synchronous.
 */
export const createMaterialPolicyFingerprintSync =
	function createMaterialPolicyFingerprintSync(
		policy: LegacyMaterialPolicyInput
	): string {
		return createDeterministicFingerprintSync(
			createMaterialPolicyFingerprintInput(policy)
		);
	};
