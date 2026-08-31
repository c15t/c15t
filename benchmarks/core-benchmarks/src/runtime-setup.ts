const createMockElement = function createMockElement() {
	return {
		addEventListener: () => {
			/* empty */
		},
		appendChild: () => {
			/* empty */
		},
		async: true,
		cloneNode: () => createMockElement(),
		dispatchEvent: () => true,
		getAttribute: () => null,
		parentNode: null,
		querySelector: () => null,
		querySelectorAll: () => [],
		remove: () => {
			/* empty */
		},
		removeChild: () => {
			/* empty */
		},
		removeEventListener: () => {
			/* empty */
		},
		setAttribute: () => {
			/* empty */
		},
		src: '',
		style: {},
		textContent: '',
	} as unknown as HTMLElement;
};

export const ensureBenchmarkDom = function ensureBenchmarkDom(): void {
	if (typeof globalThis.window === 'undefined') {
		globalThis.window = globalThis as unknown as Window & typeof globalThis;
	}

	if (typeof globalThis.document === 'undefined') {
		const element = createMockElement();
		globalThis.document = {
			body: element,
			cookie: '',
			createElement: () => createMockElement(),
			getElementById: () => null,
			head: element,
			querySelector: () => null,
			querySelectorAll: () => [],
		} as unknown as Document;
	}

	if (typeof globalThis.localStorage === 'undefined') {
		const store: Record<string, string> = {};
		globalThis.localStorage = {
			clear: () => {
				for (const key of Object.keys(store)) {
					Reflect.deleteProperty(store, key);
				}
			},
			getItem: (key: string) => store[key] ?? null,
			key: (index: number) => Object.keys(store)[index] ?? null,
			get length() {
				return Object.keys(store).length;
			},
			removeItem: (key: string) => {
				Reflect.deleteProperty(store, key);
			},
			setItem: (key: string, value: string) => {
				store[key] = value;
			},
		} as Storage;
	}

	if (typeof globalThis.MutationObserver === 'undefined') {
		globalThis.MutationObserver = class MutationObserver {
			// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
			disconnect() {
				/* empty */
			}
			// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
			observe(_target: Node, _options?: MutationObserverInit) {
				/* empty */
			}
			// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
			takeRecords(): MutationRecord[] {
				return [];
			}
		} as unknown as typeof MutationObserver;
	}

	if (!globalThis.window.location) {
		globalThis.window.location = {
			hostname: 'bench.local',
			reload: () => {
				/* empty */
			},
		} as Location;
	}

	if (typeof globalThis.fetch === 'undefined') {
		globalThis.fetch = (() =>
			Promise.resolve(
				new Response(JSON.stringify({ ok: true }), {
					headers: {
						'Content-Type': 'application/json',
					},
					status: 200,
				})
			)) as typeof fetch;
	}
};
