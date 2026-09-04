/**
 * Browser-project test setup.
 *
 * Neither Node 26's built-in `localStorage` (inert without
 * `--localstorage-file`) nor this jsdom build exposes web storage, and the
 * runtime guards persistence behind `typeof localStorage !== 'undefined'`.
 * Without a real implementation the tests would pass while silently
 * exercising no persistence at all, so install an in-memory one — the same
 * approach `packages/core/vitest.setup.ts` takes for its node suite.
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
