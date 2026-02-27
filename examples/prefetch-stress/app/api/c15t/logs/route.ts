import { getInitLogs } from '@/lib/init-log';

export const dynamic = 'force-dynamic';

export async function GET() {
	const logs = getInitLogs();
	const prefetchMarked = logs.filter(
		(log) =>
			log.purpose ||
			log.secPurpose ||
			log.nextRouterPrefetch ||
			log.middlewarePrefetch
	).length;

	return Response.json({
		total: logs.length,
		prefetchMarked,
		logs,
	});
}
