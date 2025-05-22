import type { ReactNode } from 'react';
import { homePageOptions } from '~/app/layout.config';
import { HomeLayout } from '~/components/layouts/home';

export default function Layout({ children }: { children: ReactNode }) {
	return <HomeLayout {...homePageOptions}>{children}</HomeLayout>;
}
