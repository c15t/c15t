import { c15tClientExample } from '~/examples/c15t-client-example';

export const pages = {
	'App.tsx': `import { ConsentManagerProvider, ConsentManagerDialog, CookieBanner } from '@c15t/react';
import { ExampleContent } from './example-content';
import { clearLocalStorage } from './lib/utils';
import buttons from './buttons.module.css';
import { offlineClient } from './c15t';

export default function App() {
  // Clear localStorage on mount to ensure a clean state
  clearLocalStorage();

    return (
        <ConsentManagerProvider 
            initialGdprTypes={['necessary', 'marketing']}
            options={offlineClient}
        >
          <CookieBanner 							
				    theme={{
              'banner.footer.accept-button': {
                style: {
                  '--button-background-color-dark': '#fff',
                  '--button-shadow-primary-dark': 'none',
                  '--button-primary-dark': 'black',
                  '--button-primary': 'red',
                },
              },
            }}
        />
        <ConsentManagerDialog />
        <ExampleContent />
        </ConsentManagerProvider>
    );
}`,
	'c15t.ts': c15tClientExample,
	'example-content.tsx': `import { useConsentManager } from '@c15t/react';
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
