import { clearInitLogs } from '@/lib/init-log';

export const dynamic = 'force-dynamic';

export async function POST() {
	clearInitLogs();
	return Response.json({ ok: true });
}
