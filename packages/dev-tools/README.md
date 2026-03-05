# @c15t/dev-tools

Developer tools for debugging and inspecting c15t consent management state.

## Features

- **Consents Panel**: View and toggle consent states in real-time
- **Location Panel**: Inspect location and apply geo/language overrides
- **Policy Panel**: Inspect detailed runtime policy-pack decision data
- **Scripts Panel**: Monitor script loading status
- **Actions Panel**: Quick actions for testing consent flows
- **Framework Agnostic**: Pure JavaScript core with React wrapper
- **TanStack DevTools Integration**: Use as a plugin in TanStack DevTools
- **CSS Animations**: Smooth, accessible animations with reduced motion support
- **Dark Mode**: Automatic dark mode support

## Installation

```bash
bun add @c15t/dev-tools
```

## Usage

### React

The easiest way to add DevTools to a React application:

```tsx
import { DevTools } from '@c15t/dev-tools/react';

function App() {
  return (
    <>
      <YourApp />
      <DevTools position="bottom-right" />
    </>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `namespace` | `string` | `'c15tStore'` | Window namespace for the store |
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | Position of the floating button |
| `defaultOpen` | `boolean` | `false` | Whether to start with panel open |
| `disabled` | `boolean` | `false` | Disable DevTools (e.g., in production) |

#### Production Usage

```tsx
<DevTools disabled={process.env.NODE_ENV === 'production'} />
```

### Vanilla JavaScript

For non-React applications or more control:

```typescript
import { createDevTools } from '@c15t/dev-tools';

const devtools = createDevTools({
  namespace: 'c15tStore',
  position: 'bottom-right',
});

// Control programmatically
devtools.open();
devtools.close();
devtools.toggle();

// Cleanup
devtools.destroy();
```

### TanStack DevTools Plugin

Integrate with TanStack DevTools:

```tsx
import { TanStackDevtools } from '@tanstack/react-devtools';
import { c15tDevtoolsPlugin } from '@c15t/dev-tools/tanstack';

function App() {
  return (
    <>
      <YourApp />
      <TanStackDevtools plugins={[c15tDevtoolsPlugin()]} />
    </>
  );
}
```

## Console API

The DevTools expose a global API for quick debugging:

```javascript
// Open/close the panel
window.__c15tDevTools.open();
window.__c15tDevTools.close();
window.__c15tDevTools.toggle();

// Check state
window.__c15tDevTools.getState();
// { isOpen: false, activeTab: 'consents', isConnected: true }
```

## Panels

### Consents

- View all consent types with enabled/disabled badges
- Toggle individual consents with immediate feedback
- Quick actions: Accept All, Reject All
- Shows consent model (opt-in, opt-out, iab)

### Location

- Detected country, region, and jurisdiction
- Compact active policy summary (policy ID + matcher + snapshot status)
- Set country, region, and language overrides
- View active consent model with description
- Clear all overrides

### Policy

- Runtime policy decision details from `/init`
- Policy ID, match strategy, and fingerprint
- Consent model, scope mode, purpose scope
- UI constraints (mode, allowed actions, primary action)
- i18n profile, expiry, and proof-capture summary
- Snapshot token presence indicator

### Scripts

- List configured scripts with consent requirements
- Status badges: Loaded, Pending, Blocked
- Network blocker status
- Summary of loaded vs pending scripts

### Actions

- Show consent banner
- Open preference center
- Re-fetch banner data
- Reset all consents
- Copy state to clipboard for debugging

## Styling

The DevTools use CSS variables for theming. Variables are prefixed with `--c15t-devtools-`:

```css
/* Override colors */
:root {
  --c15t-devtools-primary: hsl(220, 90%, 50%);
  --c15t-devtools-surface: hsl(0, 0%, 100%);
}
```

### Dark Mode

Dark mode is automatically applied when:
- The document has a `.dark` or `.c15t-dark` class
- System preference is dark (`prefers-color-scheme: dark`)

You can also force dark mode:

```css
.my-devtools-container {
  @extend .c15t-devtools-dark;
}
```

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

## License

GPL-3.0-only
