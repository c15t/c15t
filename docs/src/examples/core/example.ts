export const pages = {
  'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cookie Banner Example</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="app">
        <h1>c15t.com</h1>
        <p>This is an example of a cookie banner implementation using vanilla JavaScript and the c15t core package.</p>
    </div>

    <div id="cookie-banner" class="cookie-banner">
        <div class="cookie-banner-card">
            <div class="cookie-banner-header">
                <h2 class="cookie-banner-title">We value your privacy</h2>
                <p class="cookie-banner-description">
                    We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
                </p>
            </div>
            <div class="cookie-banner-footer">
                <div class="cookie-banner-footer-group">
                    <button id="reject-button" class="cookie-banner-button reject">Reject All</button>
                </div>
                <button id="accept-button" class="cookie-banner-button accept">Accept All</button>
            </div>
        </div>
    </div>

    <script src="script.js" type="module"></script>
</body>
</html>`,

  'styles.css': `
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
  
  body {
    font-family: 'Inter', sans-serif;
  }

  /* Base styles */
:root {
    --cookie-banner-bg: #ffffff;
    --cookie-banner-text: #1a1a1a;
    --cookie-banner-border: #e5e7eb;
    --cookie-banner-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --cookie-banner-radius: 0.75rem;
}

.dark {
    --cookie-banner-bg: #1a1a1a;
    --cookie-banner-text: #ffffff;
    --cookie-banner-border: #374151;
}

.cookie-banner {
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    right: 1rem;
    z-index: 50;
    display: none;
}

.cookie-banner.show {
    display: block;
    animation: slideUp 0.3s ease-out;
}

.cookie-banner-card {
    max-width: 28rem;
    margin: 0 auto;
    background-color: var(--cookie-banner-bg);
    border: 1px solid var(--cookie-banner-border);
    border-radius: var(--cookie-banner-radius);
    box-shadow: var(--cookie-banner-shadow);
    overflow: hidden;
}

.cookie-banner-header {
    padding: 1.5rem;
}

.cookie-banner-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--cookie-banner-text);
}

.cookie-banner-description {
    margin: 0.5rem 0 0;
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--cookie-banner-text);
    opacity: 0.8;
}

.cookie-banner-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--cookie-banner-border);
    background-color: rgba(0, 0, 0, 0.02);
}

.cookie-banner-footer-group {
    display: flex;
    gap: 0.5rem;
    flex: 1;
}

.cookie-banner-button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
}

.cookie-banner-button.reject {
    background-color: #f3f4f6;
    color: #374151;
}

.cookie-banner-button.reject:hover {
    background-color: #e5e7eb;
}

.cookie-banner-button.customize {
    background-color: #f3f4f6;
    color: #374151;
}

.cookie-banner-button.customize:hover {
    background-color: #e5e7eb;
}

.cookie-banner-button.accept {
    background-color: #2563eb;
    color: white;
}

.cookie-banner-button.accept:hover {
    background-color: #1d4ed8;
}

@keyframes slideUp {
    from {
        transform: translateY(100%);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

@media (min-width: 640px) {
    .cookie-banner {
        max-width: 28rem;
        left: auto;
    }
    
    .cookie-banner-footer {
        flex-wrap: nowrap;
    }
}`,

  'script.js': `
import { createConsentManagerStore, createConsentClient } from 'https://cdn.skypack.dev/c15t';

// Configuration for the consent manager
const config = {
    client: {
        backendURL: '/api/c15t-demo',
        defaultPreferences: {
            analytics: true,
            marketing: true,
            preferences: true,
        }
    },
    store: {
        namespace: 'c15tExample',
        trackingBlockerConfig: {
            disableAutomaticBlocking: false
        }
    }
};

// Create the client and store
const client = createConsentClient(config.client);
const consentManager = createConsentManagerStore(client, config.store.namespace, {
    trackingBlockerConfig: config.store.trackingBlockerConfig
});

// Get the cookie banner element
const cookieBanner = document.getElementById('cookie-banner');
const acceptButton = document.getElementById('accept-button');
const rejectButton = document.getElementById('reject-button');

// Show the banner if consent hasn't been given yet
if (consentManager.getState().showPopup) {
    cookieBanner.classList.add('show');
}

// Handle accept all
acceptButton.addEventListener('click', async () => {
    console.log('accept all');
    const state = consentManager.getState();
    state.saveConsents('all');
    
    try {
        const { data } = await client.setConsent({
            type: 'cookie_banner',
            domain: window.location.hostname,
            preferences: state.consents,
            metadata: {
                source: 'cookie_banner',
                acceptanceMethod: 'accept_all_button'
            }
        });
        console.log('Consent saved:', data);
    } catch (error) {
        console.error('Failed to save consent:', error);
    }
    
    cookieBanner.classList.remove('show');
});

// Handle reject all
rejectButton.addEventListener('click', async () => {
    console.log('reject all');
    const state = consentManager.getState();
    state.saveConsents('necessary');
    
    try {
        const { data } = await client.setConsent({
            type: 'cookie_banner',
            domain: window.location.hostname,
            preferences: state.consents,
            metadata: {
                source: 'cookie_banner',
                acceptanceMethod: 'reject_all_button'
            }
        });
        console.log('Consent saved:', data);
    } catch (error) {
        console.error('Failed to save consent:', error);
    }
    
    cookieBanner.classList.remove('show');
});
`,
};
