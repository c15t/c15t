/**
 * Server Component Example: Consent Check Page
 *
 * This page demonstrates using the @c15t/node-sdk in a Next.js Server Component
 * to check a user's consent status before rendering content.
 *
 * Usage: /consent-check?externalId=user_123&type=analytics
 */

import { consentClient } from '../../lib/c15t-client';

interface ConsentCheckPageProps {
	searchParams: Promise<{
		externalId?: string;
		type?: string;
	}>;
}

export default async function ConsentCheckPage({
	searchParams,
}: ConsentCheckPageProps) {
	const params = await searchParams;
	const { externalId, type = 'analytics' } = params;

	// Validate required parameters
	if (!externalId) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
					<h1 className="text-xl font-semibold text-gray-900 mb-4">
						Consent Check
					</h1>
					<p className="text-gray-600 mb-4">
						Please provide an externalId query parameter.
					</p>
					<code className="block bg-gray-100 p-3 rounded text-sm">
						/consent-check?externalId=user_123&type=analytics
					</code>
				</div>
			</div>
		);
	}

	// Check consent using the node-sdk
	const result = await consentClient.checkConsent({
		externalId,
		type,
	});

	console.log(result);

	// const request2 = await consentClient.getSubject('sub_1119kTh8qRnq6WUP6gn3QkUbVV')

	// console.log(request2);

	// Handle error response
	if (!result.ok) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
					<h1 className="text-xl font-semibold text-red-600 mb-4">Error</h1>
					<p className="text-gray-600 mb-2">Failed to check consent status:</p>
					<code className="block bg-red-50 text-red-700 p-3 rounded text-sm">
						{result.error?.message || 'Unknown error'}
					</code>
					{result.error?.code && (
						<p className="text-sm text-gray-500 mt-2">
							Error code: {result.error.code}
						</p>
					)}
				</div>
			</div>
		);
	}

	// Render success response
	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-lg shadow-md p-6 max-w-2xl w-full">
				<h1 className="text-xl font-semibold text-gray-900 mb-4">
					Consent Status
				</h1>

				<div className="mb-4">
					<p className="text-sm text-gray-500">External ID</p>
					<p className="font-mono text-gray-900">{externalId}</p>
				</div>

				<div className="mb-4">
					<p className="text-sm text-gray-500">Consent Type</p>
					<p className="font-mono text-gray-900">{type}</p>
				</div>

				<div className="border-t pt-4">
					<p className="text-sm text-gray-500 mb-2">Response Data</p>
					<pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
						{JSON.stringify(result.data, null, 2)}
					</pre>
				</div>
			</div>
		</div>
	);
}
