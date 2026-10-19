import type { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

/** Shared page chrome: sticky header, main region, footer. */
export default function Layout({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
