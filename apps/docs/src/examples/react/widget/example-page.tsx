import { c15tClientExample } from '~/examples/c15t-client-example';

export const pages = {
	'c15t.ts': c15tClientExample,
	'CustomWidget.tsx': `'use client';
  
import { useConsentManager } from '@c15t/react';
import * as ConsentManagerWidget from '@c15t/react/consent-manager-widget';
export function CustomWidget() {
  const { hasConsented } = useConsentManager();
  
  // If the user has consented, don't show the dialog
  if (hasConsented()) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <ConsentManagerWidget.Root className="w-sm">
          <ConsentManagerWidget.Accordion>
            <ConsentManagerWidget.AccordionItems />
          </ConsentManagerWidget.Accordion>
          <ConsentManagerWidget.Footer className="mt-4 flex flex-row justify-between">
            <ConsentManagerWidget.FooterSubGroup>
              <ConsentManagerWidget.RejectButton>
                Reject All
              </ConsentManagerWidget.RejectButton>
              <ConsentManagerWidget.AcceptAllButton>
                Accept All
              </ConsentManagerWidget.AcceptAllButton>
            </ConsentManagerWidget.FooterSubGroup>
            <ConsentManagerWidget.SaveButton>
              Save
            </ConsentManagerWidget.SaveButton>
          </ConsentManagerWidget.Footer>
        </ConsentManagerWidget.Root>
    </div>
  );
}`,
	'App.tsx': `import { ConsentManagerProvider, ConsentManagerDialog, CookieBanner } from '@c15t/react';
import { ExampleContent } from './example-content';
import { clearLocalStorage } from './lib/utils';
import { CustomWidget } from './CustomWidget';
import { offlineClient } from './c15t';

export default function App() {
    // Clear localStorage on mount to ensure a clean state
    clearLocalStorage();
    return (
        <ConsentManagerProvider 
            options={offlineClient}
        >
            <CustomWidget />
            <ExampleContent />
        </ConsentManagerProvider>
    );
}`,
	'example-content.tsx': `import { useConsentManager } from '@c15t/react';
import { useEffect } from 'react';
import { setupDarkMode } from './lib/utils';
export function ExampleContent() {
  const { setShowPopup, getConsent } = useConsentManager();
  // Setup dark mode handling
  useEffect(() => setupDarkMode(), []);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 dark:bg-[#18191c]">
      <main className="mx-auto max-w-2xl text-center">
      </main>
    </div>
  );
}`,
};
