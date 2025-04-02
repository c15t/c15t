import { c15tClientExample } from '~/examples/c15t-client-example';

export const pages = {
	'c15tClient.ts': c15tClientExample,
	'App.tsx': `import { ConsentManagerProvider, ConsentManagerDialog, CookieBanner } from '@c15t/react';
import { ExampleContent } from './ExampleContent';
import { clearLocalStorage } from './lib/utils';
import { clientConfig } from './c15tClient';

export default function App() {
    // Clear localStorage on mount to ensure a clean state
    clearLocalStorage();

    return (
        <ConsentManagerProvider 
            client={c15tClient}
            initialGdprTypes={['necessary', 'marketing']}
        >
            <CookieBanner />
            <ConsentManagerDialog />
            <ExampleContent />
        </ConsentManagerProvider>
    );
}`,

	'ExampleContent.tsx': `import { useConsentManager } from '@c15t/react';
import { setupDarkMode } from './lib/utils';
import { useEffect } from 'react';

export function ExampleContent() {
    const { setShowPopup, getConsent } = useConsentManager();
    
    // Setup dark mode handling
    useEffect(() => setupDarkMode(), []);

    return (
        <div className="min-h-screen flex flex-col justify-center items-center gap-4 dark:bg-[#18191c] p-4">
         	  <main className="mx-auto max-w-2xl text-center">
					    <div className="bg-gradient-to-t light:from-black/40 dark:from-white/40 light:to-black/10 dark:to-white/10 bg-clip-text font-bold text-[60px] text-transparent leading-none tracking-tighter">c15t.com</div>
			      </main>
        </div>
    );
}`,
};
