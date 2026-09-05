/** Serialize diagnostic data without letting transport values break the panel. */
export const serializeDiagnostic = (value: unknown): string => {
	const seen = new WeakSet<object>();
	try {
		return (
			JSON.stringify(
				value,
				(_key, entry: unknown) => {
					if (typeof entry === 'bigint') {
						return String(entry);
					}
					if (entry !== null && typeof entry === 'object') {
						if (seen.has(entry)) {
							return '[Circular]';
						}
						seen.add(entry);
					}
					return entry;
				},
				2
			) ?? 'null'
		);
	} catch {
		return '"[Unserializable value]"';
	}
};
