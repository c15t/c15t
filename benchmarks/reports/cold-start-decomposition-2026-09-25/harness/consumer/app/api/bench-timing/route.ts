import { drainMarks } from '../../bench-timing';

export const dynamic = 'force-dynamic';

export const GET = () =>
	Response.json(drainMarks(), { headers: { 'cache-control': 'no-store' } });
