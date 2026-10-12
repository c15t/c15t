import type { ReactNode } from 'react';

import { AccountNav } from '@/components/account-nav';

const AccountLayout = ({ children }: { children: ReactNode }) => (
	<div className="account">
		<p className="account-name">Signed in as Sam Okafor · sam@example.com</p>
		<div className="account-body">
			<AccountNav />
			<div className="account-content">{children}</div>
		</div>
	</div>
);

export default AccountLayout;
