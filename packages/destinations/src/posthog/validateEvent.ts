type validateEventProps = {
	distinct_id?: string;
	event?: string;
	properties?: Record<string, unknown>;
};

export function validateEvent<T extends validateEventProps>(json: T) {
	if (!json.event || json.event === '') {
		throw new Error('Event does not have a name');
	}

	const topLevelDistinctId = json.distinct_id;
	const propertiesLevelDistinctId = json.properties?.distinct_id;

	if (topLevelDistinctId === '' || propertiesLevelDistinctId === '') {
		throw new Error('The distinct_id field of an event has an empty value');
	}

	if (!topLevelDistinctId && !propertiesLevelDistinctId) {
		throw new Error('Event does not have the distinct_id field set');
	}
}
