# Router Architecture

## Overview

The dev-tools router has been refactored to use a modular, section-based architecture. Each tab is now its own component in a dedicated file, making the codebase more maintainable and easier to extend.

## Structure

```
packages/dev-tools/src/router/
├── router.tsx                 # Main router component
├── router.module.css          # Shared styles
└── sections/
    ├── index.ts               # Barrel export
    ├── consents.tsx           # Consents tab
    ├── compliance.tsx         # Compliance tab
    └── actions.tsx            # Actions tab (wrapper)
```

## Architecture Benefits

### 1. **Separation of Concerns**
Each section is isolated with its own:
- Component logic
- Data transformation
- Rendering logic
- ScrollArea wrapper

### 2. **Consistent UX**
All sections now use `ScrollArea` wrappers with consistent styling:
```typescript
<ScrollArea className={styles.scrollContainer}>
  {/* Section content */}
</ScrollArea>
```

### 3. **Easy to Extend**
Adding a new tab requires:
1. Create new file in `sections/`
2. Export from `sections/index.ts`
3. Add tab config to `router.tsx`
4. Add case to `renderSection()`

### 4. **Type Safety**
Each section receives properly typed props:
```typescript
interface ConsentsProps {
  state: PrivacyConsentState;
}
```

## Component Details

### Consents Section
**File**: `sections/consents.tsx`

**Purpose**: Displays all consent categories and their current state (Enabled/Disabled)

**Props**:
- `state: PrivacyConsentState` - Full consent manager state

**Features**:
- Iterates over `state.consents`
- Shows badge for each consent (green/red)
- Animated entrance with motion
- Scrollable content

### Compliance Section
**File**: `sections/compliance.tsx`

**Purpose**: Displays compliance settings by region (GDPR, CCPA, etc.)

**Props**:
- `state: PrivacyConsentState` - Full consent manager state

**Features**:
- Iterates over `state.complianceSettings`
- Shows Active/Inactive status
- Animated entrance with motion
- Scrollable content

### Actions Section
**File**: `sections/actions.tsx`

**Purpose**: Wrapper for the QuickActions component

**Props**: None (QuickActions handles its own state)

**Features**:
- Clean wrapper for QuickActions
- QuickActions has its own ScrollArea
- All 8 action buttons available

## Main Router

### Responsibilities
1. **Tab Management**: Handles active tab state
2. **State Provider**: Gets consent store and passes to sections
3. **Section Rendering**: Switches between sections based on active tab
4. **Tab Navigation**: Renders ExpandableTabs component

### Key Code
```typescript
const renderSection = () => {
  switch (activeSection) {
    case 'Consents':
      return <Consents state={state} />;
    case 'Compliance':
      return <Compliance state={state} />;
    case 'Actions':
      return <Actions />;
    default:
      return null;
  }
};
```

## Styling

All sections share the same CSS module (`router.module.css`):

### Key Classes
- `.tabsContainer` - Tab navigation area
- `.tabsScrollArea` - Horizontal scroll for tabs
- `.scrollContainer` - Vertical scroll for section content (480px max)
- `.contentContainer` - Padding and layout for content
- `.itemCard` - Individual item styling
- `.itemContent` - Item text layout
- `.itemTitle` - Item title text

### Consistent Heights
All sections use `max-height: 480px` to ensure consistent layout regardless of content.

## Animation

Sections use Framer Motion for smooth transitions:

```typescript
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
>
  {/* Section content */}
</motion.div>
```

Individual items also animate in with staggered delays:
```typescript
transition={{ delay: index * 0.05 }}
```

## Adding a New Section

### Example: Adding a "Scripts" Tab

1. **Create Section Component**
```typescript
// sections/scripts.tsx
export function Scripts({ state }: { state: PrivacyConsentState }) {
  return (
    <ScrollArea className={styles.scrollContainer}>
      <motion.div className={styles.contentContainer}>
        {/* Your content */}
      </motion.div>
    </ScrollArea>
  );
}
```

2. **Export from Index**
```typescript
// sections/index.ts
export { Scripts } from './scripts';
```

3. **Add to Router**
```typescript
// router.tsx
import { Scripts } from './sections';

type TabSection = 'Consents' | 'Compliance' | 'Actions' | 'Scripts';

const tabs = [
  // ... existing tabs
  { title: 'Scripts' as const, icon: Code },
];

const renderSection = () => {
  switch (activeSection) {
    // ... existing cases
    case 'Scripts':
      return <Scripts state={state} />;
  }
};
```

## Best Practices

### 1. **Always Wrap in ScrollArea**
Ensures consistent scrolling behavior across all sections.

### 2. **Use Motion for Animations**
Provides smooth transitions when switching tabs.

### 3. **Keep Sections Pure**
Sections should receive state as props, not fetch it directly.

### 4. **Share Styles**
Use the shared `router.module.css` for consistency.

### 5. **Type Everything**
Define clear prop interfaces for all sections.

## Performance

### Lazy Rendering
Only the active section is rendered, not all sections simultaneously.

### Memoization Opportunities
Future optimization: Wrap sections in `React.memo()` if state updates are frequent.

### Animation Performance
Motion animations use CSS transforms for optimal performance.

## Testing Considerations

Each section can be tested independently:

```typescript
import { render } from '@testing-library/react';
import { Consents } from './sections/consents';

test('renders consent items', () => {
  const mockState = {
    consents: {
      necessary: true,
      marketing: false,
    },
  };
  
  render(<Consents state={mockState} />);
  // assertions...
});
```

## Future Enhancements

Potential improvements:
- **State Management**: Use React Context to avoid prop drilling
- **Dynamic Tabs**: Load sections dynamically based on configuration
- **Tab Persistence**: Remember last active tab in localStorage
- **Keyboard Navigation**: Add hotkeys for tab switching
- **Search/Filter**: Add search bar to filter items within sections
- **Export/Import**: Per-section export capabilities





