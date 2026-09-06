import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import type { ReactNode } from 'react';

const ClientLayout = ({ children }: { children: ReactNode }) => (
	<ConsentShell scenario="client">{children}</ConsentShell>
);

export default ClientLayout;
