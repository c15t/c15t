export default defineEventHandler((event) => {
	const { country, region } = getQuery(event);
	const headers = event.node.req.headers;

	if (typeof country === 'string' && country.length > 0) {
		headers['x-c15t-country'] = country.toUpperCase();
	}

	if (typeof region === 'string' && region.length > 0) {
		headers['x-c15t-region'] = region.toUpperCase();
	}
});
