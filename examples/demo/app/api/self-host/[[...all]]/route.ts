import type { NextRequest } from 'next/server';
import {
	createDemoInstance,
	postgresDb,
	tursoDb,
} from '../../../../lib/demo-c15t-instance';
import {
	DEFAULT_SCENARIO_ID,
	DEMO_SCENARIO_HEADER,
} from '../../../../lib/scenarios';

const handleRequest = async (request: NextRequest) => {
	const scenario =
		request.headers.get(DEMO_SCENARIO_HEADER) ??
		request.nextUrl.searchParams.get('scenario') ??
		DEFAULT_SCENARIO_ID;
	return createDemoInstance(scenario).handler(request);
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
