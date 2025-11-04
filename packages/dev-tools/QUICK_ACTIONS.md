# Quick Actions Implementation

## Overview

The Quick Actions toolbar provides developers with instant controls for testing and debugging c15t consent management. This feature is accessible through a new "Actions" tab in the dev-tools panel.

## Features Implemented

### 1. **Reset Consents**
- **Action**: Resets all consent preferences to default values
- **Method**: Calls `state.resetConsents()`
- **Use Case**: Quickly return to initial state when testing consent flows
- **Notification**: Shows success message confirming reset

### 2. **Clear LocalStorage**
- **Action**: Removes stored consent data from browser's localStorage
- **Method**: Removes `'privacy-consent-storage'` key
- **Use Case**: Test first-time user experience without clearing all browser data
- **Notification**: Confirms localStorage cleared successfully

### 3. **Toggle All Consents**
- **Action**: Enables or disables all consent categories at once
- **Behavior**: 
  - If all consents are enabled → disables all
  - If any consent is disabled → enables all
- **Method**: Iterates through all consent types and calls `state.setConsent()`
- **Use Case**: Quickly test "Accept All" and "Reject All" scenarios
- **Notification**: Shows whether consents were enabled or disabled

### 4. **Simulate Country**
- **Action**: Cycles through realistic country scenarios with actual banner visibility
- **Countries Included**:
  - 🇬🇧 UK (GDPR - Banner shows)
  - 🇺🇸 USA/Non-CA (No banner)
  - 🇩🇪 Germany (GDPR - Banner shows)
  - 🇫🇷 France (GDPR - Banner shows)
  - 🇨🇭 Switzerland (CH laws - Banner shows)
  - 🇧🇷 Brazil (LGPD - Banner shows)
  - 🇨🇦 Canada (PIPEDA - Banner shows)
  - 🇦🇺 Australia (Privacy Act - Banner shows)
  - 🇯🇵 Japan (APPI - Banner shows)
  - 🇰🇷 South Korea (PIPA - Banner shows)
  - 🇲🇽 Mexico (No banner)
  - 🇮🇳 India (No banner)
- **Behavior**: 
  - Sets location info with country code, region, and jurisdiction
  - Automatically triggers banner if country requires it
  - Shows "✓ Banner would show" or "✗ Banner hidden" in notification
- **Method**: Calls `state.setLocationInfo()` and conditionally `state.setShowPopup()`
- **Use Case**: Test real-world scenarios for different countries without VPN/proxy
- **Notification**: Shows country flag, name, and banner visibility status

### 5. **Switch Language (i18n)**
- **Action**: Cycles through all available translations
- **Languages Supported**:
  - 🇬🇧 English (en)
  - 🇩🇪 Deutsch (de)
  - 🇪🇸 Español (es)
  - 🇫🇷 Français (fr)
  - 🇮🇹 Italiano (it)
  - 🇵🇹 Português (pt)
  - 🇳🇱 Nederlands (nl)
  - 🇨🇳 中文 (zh)
  - 🇫🇮 Suomi (fi)
  - 🇮🇩 Indonesia (id)
  - 🇮🇱 עברית (he)
- **Method**: Calls `state.setTranslationConfig()` with new language preference
- **Behavior**: Disables auto language switch to force selected language
- **Use Case**: Test UI translations and ensure proper i18n implementation
- **Notification**: Shows language flag and name

### 6. **Reload Scripts**
- **Action**: Forces update of all consent-based scripts
- **Method**: Calls `state.updateScripts()`
- **Return Value**: Shows count of loaded and unloaded scripts
- **Use Case**: Verify script loading behavior after consent changes
- **Notification**: Displays number of scripts loaded/unloaded

### 7. **Show Popup**
- **Action**: Manually triggers the consent banner
- **Method**: Calls `state.setShowPopup(true, true)` with force flag
- **Use Case**: Re-display banner for testing without clearing consent
- **Notification**: Confirms popup triggered

### 8. **Export State**
- **Action**: Downloads current state as JSON file
- **Exported Data**:
  - config
  - consents & selectedConsents
  - consentInfo
  - locationInfo & jurisdictionInfo
  - complianceSettings
  - gdprTypes
  - UI state (showPopup, isPrivacyDialogOpen)
  - privacySettings
  - scripts (sanitized - no callbacks)
  - loadedScripts
  - timestamp
- **File Format**: JSON with 2-space indentation
- **Filename**: `c15t-state-{timestamp}.json`
- **Use Case**: Save state for debugging, bug reports, or documentation
- **Notification**: Confirms successful export

## UI Organization

Actions are grouped into three sections:

### Consent Management
- Reset Consents
- Toggle All Consents

### Storage & State
- Clear LocalStorage (destructive variant)
- Export State

### Testing & Debugging
- Simulate Country
- Switch Language
- Reload Scripts
- Show Popup

## Component Structure

```
/packages/dev-tools/src/
├── components/
│   └── actions/
│       ├── quick-actions.tsx         # Main component
│       └── quick-actions.module.css  # Styles
└── router/
    └── router.tsx                    # Updated to include Actions tab
```

## Notification System

- Floating notifications appear in top-right corner
- Auto-dismiss after 3 seconds
- Two variants: success (default) and error (destructive)
- Animated slide-in effect
- Shows clear feedback for each action

## Icon Usage

- Reset Consents: `refresh`
- Clear LocalStorage: `minus`
- Toggle All: `radio-button`
- Simulate Country: `world`
- Switch Language: `language`
- Reload Scripts: `refresh`
- Show Popup: `eye`
- Export State: `external-link`
- Tab Icon: `speed-fast`
- Consents Tab: `radio-button`

All icons from the custom icon system (`Icon` component).

## Error Handling

All actions wrapped in try-catch blocks:
- Gracefully handle failures
- Display error notifications
- Never crash the dev-tools panel

## Type Safety

- Full TypeScript typing throughout
- LocationInfo type includes all required properties
- Proper jurisdiction codes from backend schema
- Type assertions only where mathematically guaranteed

## Styling

- Follows existing dev-tools design system
- Dark mode by default with light mode overrides
- Consistent spacing and typography
- Hover states for all action cards
- Responsive layout

## Backend Integration

The **Simulate Country** feature currently uses hard-coded country/jurisdiction mappings based on the backend's geo logic. For more advanced testing, you could enhance this to:

### Option 1: Call Backend API
```typescript
// Fetch real banner info from backend
const response = await fetch(`${backendURL}/consent/show-banner`, {
  headers: {
    'X-Country-Code': countryCode,
    'Accept-Language': language,
  }
});
const data = await response.json();
state.setLocationInfo(data.location);
```

### Option 2: Use fetchConsentBannerInfo
```typescript
// Use the built-in method
await state.fetchConsentBannerInfo();
```

This would:
- Test actual backend responses
- Validate geo-location logic
- Fetch real translations from backend
- Simulate network latency
- Test error handling

### Language Integration

The **Switch Language** feature currently only updates the `defaultLanguage` preference. To fully integrate with translations:

1. **Include translations in initial config**: The app needs to provide translations via `translationConfig`
2. **Fetch from backend**: Some setups fetch translations dynamically from the backend
3. **Pre-load all languages**: Include all translation files in the bundle

Example of full integration:
```typescript
import { baseTranslations } from '@c15t/translations';

// Include all translations
state.setTranslationConfig({
  translations: baseTranslations,
  defaultLanguage: nextLanguage.code,
  disableAutoLanguageSwitch: true,
});
```

## Future Enhancements

Potential additions:
- **Backend Integration**: Call real `/consent/show-banner` API endpoint
- **Undo/Redo**: Functionality for state changes
- **Import State**: Load state from JSON file
- **Action History Log**: Timeline of all dev-tool actions
- **Keyboard Shortcuts**: Quick access to common actions
- **Preset Configurations**: Save/load common test scenarios
- **Copy State**: Copy to clipboard in addition to download
- **Network Simulation**: Test slow connections, timeouts, failures
- **Cookie Inspector**: View and modify cookies set by c15t
- **Compliance Checker**: Validate current state against regulations

