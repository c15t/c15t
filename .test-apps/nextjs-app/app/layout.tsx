import type { Metadata } from 'next';
import { ConsentManager } from "../components/consent-manager";

export const metadata: Metadata = {
  title: 'Test Next.js App',
  description: 'Testing c15t CLI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
        <html lang="en">
          <body>
    		<ConsentManager>
    			{children}
    		</ConsentManager>
    	</body>
        </html>
      )
}
