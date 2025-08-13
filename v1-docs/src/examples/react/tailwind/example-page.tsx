import { c15tClientExample } from '~/examples/c15t-client-example';

export const pages = {
	'App.tsx': `import { ConsentManagerProvider, ConsentManagerDialog, CookieBanner } from '@c15t/react';
import { ExampleContent } from './example-content';
import { clearLocalStorage } from './lib/utils';
import { offlineClient } from './c15t';
export default function App() {
    // Clear localStorage on mount to ensure a clean state
    clearLocalStorage();

    return (
        <ConsentManagerProvider 
            options={offlineClient}
        >
            <CookieBanner 
              noStyle
              theme={{
								'banner.root':
									'fixed bottom-0 w-full p-4 bg-white backdrop-blur-sm z-50',
								'banner.card': 'max-w-2xl mx-auto rounded-lg',
								'banner.header.title':
									'text-lg font-semibold text-gray-900',
								'banner.header.description':
									'mt-2 text-sm text-gray-600',
								'banner.footer': 'flex justify-end gap-4',
								'banner.footer.sub-group': 'flex flex-row gap-2',
								'banner.footer.reject-button':
									'bg-red-600 text-white hover:bg-red-700 px-2 py-1 rounded-md',
								'banner.footer.accept-button':
									'bg-blue-600 text-white hover:bg-blue-700 px-2 py-1 rounded-md    ',
								'banner.footer.customize-button':
									'bg-gray-100 text-gray-900 hover:bg-gray-200 px-2 py-1 rounded-md',
							}} />
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
