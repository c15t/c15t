import type { ConsentManagerOptions } from '@c15t/react';

export const c15tConfig = {
  // Using hosted c15t (consent.io) or self-hosted instance
  mode: 'c15t',
  backendURL: 'https://dev.c15t.dev',
  
  // Optional: Add callback functions for various events
  callbacks: {
    onConsentSet: (response) => {
      console.log('Consent has been saved');
    }
  }
} satisfies ConsentManagerOptions;

// Use in your app layout:
// <ConsentManagerProvider options={c15tConfig}>
//   {children}
//   <CookieBanner />
//   <ConsentManagerDialog />
// </ConsentManagerProvider>
