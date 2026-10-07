import { ConsentTheme } from 'c15t/next';
import type { ReactNode } from 'react';

import { brandTheme } from '@/lib/theme';

const BrandedLayout = ({ children }: { children: ReactNode }) => (
	<>
		<ConsentTheme theme={brandTheme} />
		{children}
	</>
);

export default BrandedLayout;
