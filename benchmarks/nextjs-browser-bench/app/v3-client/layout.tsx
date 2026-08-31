import type { ReactNode } from 'react';

import { NextjsV3ClientBenchmarkProvider } from '../_bench/v3-provider';

const V3ClientLayout = ({ children }: { children: ReactNode }) => {
	return (
		<NextjsV3ClientBenchmarkProvider scenario="nextjs-v3-client">
			{children}
		</NextjsV3ClientBenchmarkProvider>
	);
};

export default V3ClientLayout;
