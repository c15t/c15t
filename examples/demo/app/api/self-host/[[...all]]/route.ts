import type { NextRequest } from 'next/server';
import {
	createDemoInstance,
	postgresDb,
	tursoDb,
} from '../../../../lib/demo-c15t-instance';
import { DEFAULT_DEMO_POLICY_EXAMPLE } from '../../../../lib/policies';

const handleRequest = async (request: NextRequest) => {
	const example =
		request.nextUrl.searchParams.get('example') ?? DEFAULT_DEMO_POLICY_EXAMPLE;
	return createDemoInstance(example).handler(request);
};

export {
	handleRequest as GET,
	handleRequest as POST,
	handleRequest as PATCH,
	handleRequest as PUT,
	handleRequest as OPTIONS,
	postgresDb,
	tursoDb,
};
