/**
 * Browser-project test setup.
 *
 * Node's experimental webstorage global shadows the one jsdom puts on
 * `window`, and it is inert without `--localstorage-file`, so `localStorage`
 * ends up undefined. The runtime guards persistence behind
 * `typeof localStorage !== 'undefined'`, so the tests would pass while
 * silently exercising no persistence at all.
 *
 * Installing an in-memory implementation here — the approach
 * `packages/core/vitest.setup.ts` already takes for its node suite — keeps
 * the suite correct whatever flags vitest was launched with. Running with
 * `NODE_OPTIONS=--no-experimental-webstorage` also works, but only for
 * whoever remembers to set it.
 */

class MemoryStorage implements Storage {
	private readonly entries = new Map<string, string>();

	get length(): number {
		return this.entries.size;
	}

	clear(): void {
		this.entries.clear();
	}

	getItem(key: string): string | null {
		return this.entries.get(key) ?? null;
	}

	key(index: number): string | null {
		return [...this.entries.keys()][index] ?? null;
	}

	removeItem(key: string): void {
		this.entries.delete(key);
	}

	setItem(key: string, value: string): void {
		this.entries.set(key, String(value));
	}
}

const install = function install(name: 'localStorage' | 'sessionStorage') {
	const storage = new MemoryStorage();
	for (const target of [globalThis, window] as object[]) {
		Object.defineProperty(target, name, {
			configurable: true,
			value: storage,
			writable: true,
		});
	}
};

install('localStorage');
install('sessionStorage');
