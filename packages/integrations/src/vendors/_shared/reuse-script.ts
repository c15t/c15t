import type { Script } from '@c15t/core';

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
 * Reuse mounted scripts with equal options across framework rerenders.
 * Only mounted browser scripts are retained, and removal releases them.
 * Functions and SDK instances compare by identity; data compares by value.
 *
 * @returns A factory scoped to one integration.
 * @internal
 */
export const createScriptReuse = <OptionsType extends object>() => {
	const active = new Set<{ options: OptionsType; script: Script }>();

	return (
		options: OptionsType,
		create: (options: OptionsType) => Script
	): Script => {
		for (const entry of active) {
			if (equalConfig(entry.options, options)) {
				return entry.script;
			}
		}
		const savedOptions = snapshotConfig(options) as OptionsType;
		let current: Script | undefined = create(savedOptions);
		const script: Script = { ...current };
		const entry = { options: savedOptions, script };
		const activate = (): Script => {
			current ??= create(savedOptions);
			if (typeof document !== 'undefined') {
				active.add(entry);
			}
			return current;
		};
		script.onBeforeLoad = (info) => activate().onBeforeLoad?.(info);
		script.onConsentChange = (info) => current?.onConsentChange?.(info);
		script.onDispose = (info) => {
			active.delete(entry);
			const previous = current;
			current = undefined;
			previous?.onDispose?.(info);
		};
		script.onLoad = (info) => activate().onLoad?.(info);
		return script;
	};
};
