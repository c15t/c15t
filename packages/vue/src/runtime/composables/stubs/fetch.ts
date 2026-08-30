import { joinURL, withQuery } from 'ufo';
import { computed, ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';

type QueryPrimitive = string | number | boolean | null | undefined;
type QueryValue = QueryPrimitive | MaybeRefOrGetter<QueryPrimitive>;
export type SearchParams = Record<string, QueryValue>;

export interface C15tUseFetchOptions {
	baseURL?: MaybeRefOrGetter<string | undefined>;
	query?: MaybeRefOrGetter<SearchParams>;
	method?: MaybeRefOrGetter<string>;
	headers?: MaybeRefOrGetter<Record<string, string>>;
	watch?: MaybeRefOrGetter<unknown>[];
	immediate?: boolean;
}

export interface C15tUseFetchReturn<T> {
	data: Ref<T | null>;
	pending: Ref<boolean>;
	error: Ref<Error | null>;
	refresh: () => Promise<void>;
}

interface FetchCacheEntry<T> {
	data: Ref<T | null>;
	pending: Ref<boolean>;
	error: Ref<Error | null>;
	refresh: () => Promise<void>;
}

const fetchCache = new Map<string, FetchCacheEntry<unknown>>();

function flattenQuery(
	params: SearchParams | undefined
): Record<string, string> {
	if (!params) {
		return {};
	}

	const flat: Record<string, string> = {};
	for (const [key, value] of Object.entries(params)) {
		const resolved = toValue(value);
		if (resolved === null || resolved === undefined) {
			continue;
		}

		flat[key] = String(resolved);
	}

	return flat;
}

function resolveFetchUrl(
	path: string | null,
	options: C15tUseFetchOptions
): string | null {
	if (!path) {
		return null;
	}

	const base = toValue(options.baseURL);
	const joined = base ? joinURL(base, path) : path;
	const query = flattenQuery(toValue(options.query));

	if (Object.keys(query).length === 0) {
		return joined;
	}

	return withQuery(joined, query);
}

function createFetchEntry<T>(
	target: string,
	options: C15tUseFetchOptions
): FetchCacheEntry<T> {
	const data = ref<T | null>(null) as Ref<T | null>;
	const pending = ref(false);
	const error = ref<Error | null>(null);

	async function execute(): Promise<void> {
		pending.value = true;
		error.value = null;

		try {
			const response = await fetch(target, {
				method: toValue(options.method) ?? 'GET',
				headers: toValue(options.headers),
			});

			if (!response.ok) {
				throw new Error(
					`[c15t] fetch failed (${response.status} ${response.statusText})`
				);
			}

			data.value = (await response.json()) as T;
		} catch (cause) {
			error.value = cause instanceof Error ? cause : new Error(String(cause));
			data.value = null;
		} finally {
			pending.value = false;
		}
	}

	const entry: FetchCacheEntry<T> = {
		data,
		pending,
		error,
		refresh: execute,
	};

	void execute();

	return entry;
}

function getOrCreateEntry<T>(
	target: string,
	options: C15tUseFetchOptions
): FetchCacheEntry<T> {
	const existing = fetchCache.get(target);
	if (existing) {
		return existing as FetchCacheEntry<T>;
	}

	const entry = createFetchEntry<T>(target, options);
	fetchCache.set(target, entry as FetchCacheEntry<unknown>);
	return entry;
}

export function useFetch<T>(
	url: MaybeRefOrGetter<string | null>,
	options: C15tUseFetchOptions = {}
): C15tUseFetchReturn<T> {
	const requestUrl = computed(() => resolveFetchUrl(toValue(url), options));

	const data = ref<T | null>(null) as Ref<T | null>;
	const pending = ref(false);
	const error = ref<Error | null>(null);
	let boundEntry: FetchCacheEntry<T> | null = null;

	function bindEntry(entry: FetchCacheEntry<T>): void {
		boundEntry = entry;
		data.value = entry.data.value;
		pending.value = entry.pending.value;
		error.value = entry.error.value;
	}

	watch(
		requestUrl,
		(target) => {
			if (!target) {
				boundEntry = null;
				data.value = null;
				pending.value = false;
				error.value = null;
				return;
			}

			bindEntry(getOrCreateEntry<T>(target, options));
		},
		{ immediate: options.immediate ?? true }
	);

	watch(
		() => boundEntry?.data.value,
		(value) => {
			if (boundEntry) {
				data.value = value ?? null;
			}
		}
	);

	watch(
		() => boundEntry?.pending.value,
		(value) => {
			if (boundEntry) {
				pending.value = value ?? false;
			}
		}
	);

	watch(
		() => boundEntry?.error.value,
		(value) => {
			if (boundEntry) {
				error.value = value ?? null;
			}
		}
	);

	if (options.watch) {
		for (const source of options.watch) {
			watch(source as Parameters<typeof watch>[0], () => {
				const target = requestUrl.value;
				if (target) {
					void getOrCreateEntry<T>(target, options).refresh();
				}
			});
		}
	}

	return {
		data,
		pending,
		error,
		refresh: async () => {
			const target = requestUrl.value;
			if (!target) {
				return;
			}

			await getOrCreateEntry<T>(target, options).refresh();
			if (boundEntry) {
				bindEntry(boundEntry);
			}
		},
	};
}
