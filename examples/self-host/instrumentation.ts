export const register = async () => {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		const { prepareDatabase } = await import('./lib/database');
		await prepareDatabase();
	}
};
