import { c15tMiddleware } from '@c15t/nextjs';
import { type NextRequest, NextResponse } from 'next/server';

export default async function middleware(request: NextRequest) {
	await c15tMiddleware(request);

	return NextResponse.next();
}
