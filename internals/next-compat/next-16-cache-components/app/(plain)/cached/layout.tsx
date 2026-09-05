import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import type { ReactNode } from 'react';

const CachedLayout = ({ children }: { children: ReactNode }) => (
	<ConsentShell scenario="cached">{children}</ConsentShell>
);

export default CachedLayout;
