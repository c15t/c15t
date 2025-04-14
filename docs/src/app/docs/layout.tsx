import type { ReactNode } from 'react';
import { DocsLayout } from '~/components/layouts/notebook';
import { source } from '~/lib/source';
import { Footer } from '../(home)/_components/footer';
import { docsOptions } from './layout.config';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <DocsLayout tree={source.pageTree} {...docsOptions}>
        {children}
      </DocsLayout>
      <Footer />
    </>
  );
}
