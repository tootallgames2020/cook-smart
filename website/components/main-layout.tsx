import { Header } from './header';
import { BetaBanner } from './beta-banner';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <BetaBanner />
      <Header />
      <main className="flex-1">{children}</main>
    </div>
  );
}
