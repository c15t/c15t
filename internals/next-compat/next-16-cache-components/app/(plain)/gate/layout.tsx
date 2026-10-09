import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import type { ReactNode } from 'react';

const GateLayout = ({ children }: { children: ReactNode }) => (
	<ConsentShell
		styles={false}
		scenario="gate"
	>
		{children}
	</ConsentShell>
);

export default GateLayout;
