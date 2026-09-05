import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import type { ReactNode } from 'react';

const ISRLayout = ({ children }: { children: ReactNode }) => (
	<ConsentShell scenario="isr">{children}</ConsentShell>
);

export default ISRLayout;
