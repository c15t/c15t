import type { Script, ScriptCallbackInfo } from '@c15t/core';

const registrationStates = new WeakMap<
	ScriptCallbackInfo,
	readonly ScriptCallbackInfo[]
>();

/** Read each loader's state before evaluating compound feature conditions. @internal */
export const getScriptRegistrations = (
	info: ScriptCallbackInfo
): readonly ScriptCallbackInfo[] => registrationStates.get(info) ?? [info];

type ConfigFields = Record<PropertyKey, unknown>;
type ConfigCopy = ConfigFields | unknown[];

/** Copy only configuration data; callbacks and SDK instances keep their identity. */
const isConfigObject = (value: unknown): value is ConfigFields => {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const prototype: unknown = Object.getPrototypeOf(value);
	return (
		(Array.isArray(value) && prototype === Array.prototype) ||
		prototype === Object.prototype ||
		prototype === null
	);
};

const snapshotConfig = (
	value: unknown,
	seen = new WeakMap<ConfigFields, ConfigCopy>()
): unknown => {
	if (!isConfigObject(value)) {
		return value;
	}
	const known = seen.get(value);
	if (known) {
		return known;
	}
	const copy: ConfigCopy = Array.isArray(value)
		? Array.prototype.slice.call(value)
		: Object.create(Object.getPrototypeOf(value));
	seen.set(value, copy);
	for (const key of Reflect.ownKeys(value)) {
		if (Object.prototype.propertyIsEnumerable.call(value, key)) {
			Object.defineProperty(copy, key, {
				configurable: true,
				enumerable: true,
				value: snapshotConfig(value[key], seen),
				writable: true,
			});
		}
	}
	return copy;
};

const configKeys = (value: ConfigFields): (string | symbol)[] =>
	Reflect.ownKeys(value).filter(
		(key) =>
			Object.prototype.propertyIsEnumerable.call(value, key) &&
			value[key] !== undefined
	);

const equalConfig = (
	previous: unknown,
	next: unknown,
	seen = new WeakMap<ConfigFields, ConfigFields>()
): boolean => {
	if (Object.is(previous, next)) {
		return true;
	}
	if (!isConfigObject(previous) || !isConfigObject(next)) {
		return false;
	}
	if (
		Object.getPrototypeOf(previous) !== Object.getPrototypeOf(next) ||
		(Array.isArray(previous) && previous.length !== next.length)
	) {
		return false;
	}
	const known = seen.get(previous);
	if (known) {
		return known === next;
	}
	seen.set(previous, next);
	const keys = configKeys(previous);
	return (
		keys.length === configKeys(next).length &&
		keys.every(
			(key) =>
				Object.hasOwn(next, key) && equalConfig(previous[key], next[key], seen)
		)
	);
};

/**
 * Reuse browser scripts with equal options before mounting and across rerenders.
 * Only callers retain configurations; disposal releases the running lifecycle.
 * Functions and SDK instances compare by identity; data compares by value.
 *
 * @returns A factory scoped to one integration.
 * @internal
 */
export const createScriptReuse = <OptionsType extends object>() => {
	interface Entry {
		options: OptionsType;
		script: Script;
	}
	const entries = new Set<WeakRef<Entry>>();
	const collected = new FinalizationRegistry<WeakRef<Entry>>((reference) => {
		entries.delete(reference);
	});

	return (
		options: OptionsType,
		create: (options: OptionsType) => Script
	): Script => {
		if (typeof document !== 'undefined') {
			for (const reference of entries) {
				const entry = reference.deref();
				if (!entry) {
					entries.delete(reference);
				} else if (equalConfig(entry.options, options)) {
					return entry.script;
				}
			}
		}
		const savedOptions = snapshotConfig(options) as OptionsType;
		let current: Script | undefined = create(savedOptions);
		const script: Script = { ...current };
		const entry = { options: savedOptions, script };
		const reference = new WeakRef(entry);
		collected.register(entry, reference);
		const register = (): void => {
			if (typeof document !== 'undefined') {
				entries.add(reference);
			}
		};
		register();
		const standaloneRegistration = Symbol('script-registration');
		const registrations = new Map<symbol, ScriptCallbackInfo>();
		const registrationOf = (info: ScriptCallbackInfo): symbol =>
			info.registration ??
			registrations.keys().next().value ??
			standaloneRegistration;
		const combine = (info: ScriptCallbackInfo): ScriptCallbackInfo => {
			const states = [...registrations.values()];
			const vendor = states.find((state) => state.vendor)?.vendor;
			const combined = {
				...info,
				hasConsent: states.every((state) => state.hasConsent),
				vendor: vendor
					? {
							...vendor,
							granted: states.every((state) => state.vendor?.granted !== false),
						}
					: undefined,
			};
			registrationStates.set(combined, states);
			return combined;
		};
		const activate = (info: ScriptCallbackInfo): Script => {
			current ??= create(entry.options);
			registrations.set(registrationOf(info), info);
			register();
			return current;
		};
		script.onBeforeLoad = (info) =>
			activate(info).onBeforeLoad?.(combine(info));
		script.onConsentChange = (info) =>
			activate(info).onConsentChange?.(combine(info));
		script.onDispose = (info) => {
			const removed = registrations.delete(registrationOf(info));
			const remaining = registrations.values().next().value;
			if (remaining) {
				if (removed) {
					current?.onConsentChange?.(combine(remaining));
				}
				return;
			}
			// Keep the weak reservation for callers that retain and remount this script.
			const previous = current;
			current = undefined;
			previous?.onDispose?.(info);
		};
		script.onLoad = (info) => activate(info).onLoad?.(combine(info));
		return script;
	};
};
