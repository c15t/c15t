import { NextResponse } from 'next/server';

export async function POST(request: Request) {
	const body = await request.json();
	return NextResponse.json(
		{
			ok: true,
			subjectId: body.subjectId ?? 'benchmark-subject',
		},
		{
			headers: {
				'cache-control': 'no-store',
			},
		}
	);
}
