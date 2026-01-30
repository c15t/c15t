/**
 * API Route Example: Consent Operations
 *
 * This file demonstrates using the @c15t/node-sdk in Next.js API routes
 * to perform consent operations server-side.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { consentClient } from '@/lib/c15t-client';

/**
 * GET /api/consent?externalId=xxx&type=analytics
 *
 * Check consent status for a user.
 */
export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const externalId = searchParams.get('externalId');
	const type = searchParams.get('type') || 'analytics';

	if (!externalId) {
		return NextResponse.json(
			{ error: 'externalId query parameter is required' },
			{ status: 400 }
		);
	}

	const result = await consentClient.checkConsent({
		externalId,
		type,
	});

	if (!result.ok) {
		return NextResponse.json(
			{
				error: result.error?.message || 'Failed to check consent',
				code: result.error?.code,
			},
			{ status: result.error?.status || 500 }
		);
	}

	return NextResponse.json(result.data);
}

/**
 * POST /api/consent
 *
 * Create a new subject with consent preferences.
 *
 * Request body:
 * {
 *   "subjectId": "sub_xxx",
 *   "externalSubjectId": "user_123",
 *   "type": "cookie_banner",
 *   "domain": "example.com",
 *   "preferences": { "analytics": true, "marketing": false },
 *   "givenAt": 1234567890
 * }
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		const {
			subjectId,
			externalSubjectId,
			type = 'cookie_banner',
			domain,
			preferences,
			givenAt = Date.now(),
		} = body;

		if (!subjectId || !domain || !preferences) {
			return NextResponse.json(
				{ error: 'subjectId, domain, and preferences are required' },
				{ status: 400 }
			);
		}

		const result = await consentClient.createSubject({
			type,
			subjectId,
			externalSubjectId,
			domain,
			preferences,
			givenAt,
		});

		if (!result.ok) {
			return NextResponse.json(
				{
					error: result.error?.message || 'Failed to create subject',
					code: result.error?.code,
				},
				{ status: result.error?.status || 500 }
			);
		}

		return NextResponse.json(result.data, { status: 201 });
	} catch {
		return NextResponse.json(
			{ error: 'Invalid request body' },
			{ status: 400 }
		);
	}
}
