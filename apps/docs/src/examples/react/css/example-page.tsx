import { c15tClientExample } from '~/examples/c15t-client-example';

export const pages = {
	'App.tsx': `import { ConsentManagerProvider, ConsentManagerDialog, CookieBanner } from '@c15t/react';
import { ExampleContent } from './example-content';
import { clearLocalStorage } from './lib/utils';
import { offlineClient } from './c15t';

import buttons from './buttons.module.css';
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
              'banner.root': {
                style: {
                  position: 'fixed',
                  bottom: 0,
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 1.0)',
                },
              },
              'banner.card': {
                style: {
                  maxWidth: '32rem',
                  margin: 'auto',
                  borderRadius: '0.375rem',
                },
              },
              'banner.header.title': {
                style: {
                  fontSize: '1.25rem',
                  fontWeight: 'semibold',
                  color: '#1a202c',
                },
              },
              'banner.header.description': {
                style: {
                  marginTop: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#637381',
                },
              },
              'banner.footer': {
                style: {
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                },
              },
              'banner.footer.sub-group': {
                style: {
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '0.5rem',
                },
              },
              // Using CSS Modules
              'banner.footer.reject-button': buttons.reject,					
              'banner.footer.accept-button': buttons.accept,           
              'banner.footer.customize-button': buttons.customize
        }}
        />
        <ConsentManagerDialog />
        <ExampleContent />
        </ConsentManagerProvider>
    );
}`,
	'buttons.module.css': `
.accept {
	background-color: #3b82f6;
	color: #fff;
	padding: 0.5rem 1rem;
}

.accept:hover {
	background-color: #2563eb;
}

.customize {
	background-color: #f3f4f6;
	color: #1a202c;
	padding: 0.5rem 1rem;
}

.customize:hover {
	background-color: #e5e7eb;
}

.reject {
	background-color: #ef4444;
	color: #000;
	padding: 0.5rem 1rem;
}

.reject:hover {
	background-color: #dc2626;
}
`,
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
