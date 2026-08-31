/**
 * Visits values in order without starting the next callback until the previous
 * callback settles.
 *
 * @param values Values to visit.
 * @param callback Work to perform for each value.
 * @returns A promise that settles after every callback has completed.
 * @internal
 */
interface SequentialOperation<Value> {
	run: (value: Value) => Promise<void>;
}

export const forEachSequential = async <Value>(
	values: Iterable<Value>,
	operation: SequentialOperation<Value>
): Promise<void> => {
	const iterator = values[Symbol.iterator]();
	const visitNext = async (): Promise<void> => {
		const next = iterator.next();
		if (next.done) {
			return;
		}

		await operation.run(next.value);
		await visitNext();
	};

	await visitNext();
};
