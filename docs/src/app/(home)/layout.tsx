import { HomeLayout } from 'fumadocs-ui/layouts/home';
import type { ReactNode } from 'react';
import { homePageOptions } from '~/app/layout.config';

export default function Layout({ children }: { children: ReactNode }) {
  return <HomeLayout {...homePageOptions}>{children}</HomeLayout>;
}
