import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import type { ReactNode } from 'react';

const PrefetchLayout = ({ children }: { children: ReactNode }) => (
	<ConsentShell scenario="prefetch">{children}</ConsentShell>
);

export default PrefetchLayout;
