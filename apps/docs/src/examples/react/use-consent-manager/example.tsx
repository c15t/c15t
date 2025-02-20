export const pages = {
	'App.tsx': `import { ConsentManagerProvider, ConsentManagerDialog, CookieBanner } from '@c15t/react';
import { ExampleContent } from './ExampleContent';
import { clearLocalStorage } from './lib/utils';

export default function App() {
    // Clear localStorage on mount to ensure a clean state
    clearLocalStorage();

    return (
        <ConsentManagerProvider 
            initialGdprTypes={['necessary', 'marketing', 'analytics']}
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
            <button 
                onClick={() => setShowPopup(true)} 
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
            >
                Open Cookie Settings
            </button>
            
         	  <main className="mx-auto max-w-2xl text-center">
					    <div className="bg-gradient-to-t light:from-black/40 dark:from-white/40 light:to-black/10 dark:to-white/10 bg-clip-text font-bold text-[60px] text-transparent leading-none tracking-tighter">c15t.com</div>
			      </main>
        </div>
    );
}`,
};
