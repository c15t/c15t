export default defineEventHandler(async (event) => {
	const body = await readBody<{ subjectId?: string }>(event);
	setHeader(event, 'cache-control', 'no-store');
	return {
		ok: true,
		subjectId: body.subjectId ?? 'benchmark-subject',
	};
});
