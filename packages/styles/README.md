# @c15t/styles

**Shared CSS styles and utilities for C15T consent management components**

[![npm version](https://badge.fury.io/js/%40c15t%2Fstyles.svg)](https://badge.fury.io/js/%40c15t%2Fstyles)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

The `@c15t/styles` package provides a comprehensive styling system for C15T consent management components. It includes CSS modules, utility functions, theming support, and type-safe style merging capabilities.

## Features

- 🎨 **CSS Modules** - Pre-built styles for cookie banners, dialogs, and widgets
- 🔧 **Type-Safe Utilities** - TypeScript utilities for class name and style merging
- 🌙 **Dark Mode Support** - Built-in light/dark theme system
- 📱 **Responsive Design** - Mobile-first responsive layouts
- ♿ **Accessibility** - WCAG compliant styling and focus management
- ⚡ **Performance** - Memoized style merging for optimal rendering
- 🎯 **Framework Agnostic** - Works with React, Preact, Vue, and vanilla JS

## Installation

```bash
npm install @c15t/styles
# or
yarn add @c15t/styles
# or
pnpm add @c15t/styles
```

## Quick Start

### Basic CSS Import

```css
/* Import component styles */
@import '@c15t/styles/components/cookie-banner.css';
@import '@c15t/styles/components/consent-manager-dialog.css';
@import '@c15t/styles/components/consent-manager-widget.css';
```

### JavaScript Utilities

```typescript
import { 
  mergeClassNames, 
  applyThemeStyles,
  type ComponentTheme 
} from '@c15t/styles';

// Merge class names conditionally
const className = mergeClassNames([
  'btn',
  isActive && 'active',
  isPrimary ? 'btn-primary' : 'btn-secondary'
]);

// Apply theme styles
const buttonTheme: ComponentTheme = {
  root: { className: 'custom-button', style: { borderRadius: '8px' } }
};

const styles = applyThemeStyles(
  { className: 'btn' },
  buttonTheme,
  'root'
);
```

## CSS Components

### Cookie Banner

```html
<div class="c15t-banner-root c15t-banner-bottom-right">
  <div class="c15t-banner-card">
    <div class="c15t-banner-header">
      <h2 class="c15t-banner-title">Cookie Preferences</h2>
      <p class="c15t-banner-description">We use cookies to enhance your experience.</p>
    </div>
    <div class="c15t-banner-footer">
      <button class="c15t-banner-reject-button">Reject</button>
      <button class="c15t-banner-accept-button">Accept All</button>
    </div>
  </div>
</div>
```

### Consent Dialog

```html
<div class="c15t-dialog-overlay">
  <dialog class="c15t-dialog-root">
    <div class="c15t-dialog-container">
      <div class="c15t-dialog-card">
        <div class="c15t-dialog-header">
          <h2 class="c15t-dialog-title">Privacy Settings</h2>
          <p class="c15t-dialog-description">Manage your privacy preferences.</p>
        </div>
        <div class="c15t-dialog-content">
          <!-- Consent options -->
        </div>
        <div class="c15t-dialog-footer">
          <button>Save Preferences</button>
        </div>
      </div>
    </div>
  </dialog>
</div>
```

### Consent Widget

```html
<div class="c15t-widget-root">
  <div class="c15t-widget-card">
    <div class="c15t-widget-header">
      <h3 class="c15t-widget-title">Privacy</h3>
    </div>
    <div class="c15t-widget-content">
      <!-- Widget content -->
    </div>
  </div>
</div>
```

## Theming

### CSS Custom Properties

All components support extensive customization through CSS custom properties:

```css
:root {
  /* Banner theming */
  --banner-background-color: #ffffff;
  --banner-border-radius: 12px;
  --banner-text-color: #333333;
  
  /* Dialog theming */
  --dialog-max-width: 28rem;
  --dialog-animation-duration: 300ms;
  
  /* Widget theming */
  --widget-z-index: 1000;
  --widget-border-color: #e5e7eb;
}

/* Dark theme overrides */
:global(.c15t-dark) {
  --banner-background-color: #1f2937;
  --banner-text-color: #f9fafb;
  --dialog-background-color: #111827;
}
```

### TypeScript Theme Configuration

```typescript
import type { ComponentTheme } from '@c15t/styles';

interface BannerTheme extends ComponentTheme {
  root?: ComponentStyleValue;
  title?: ComponentStyleValue;
  description?: ComponentStyleValue;
  footer?: ComponentStyleValue;
}

const customBannerTheme: BannerTheme = {
  root: {
    className: 'my-banner',
    style: {
      '--banner-border-radius': '16px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
    }
  },
  title: {
    className: 'text-xl font-bold',
    style: { color: '#1f2937' }
  }
};
```

## Utility Functions

### Class Name Merging

```typescript
import { mergeClassNames, conditionalClassNames, createClassNameBuilder } from '@c15t/styles';

// Basic merging
const className = mergeClassNames('btn', 'btn-primary', isActive && 'active');

// Conditional classes
const className2 = conditionalClassNames('form-input', {
  'error': hasError,
  'success': isValid,
  'loading': isSubmitting
});

// Builder pattern
const className3 = createClassNameBuilder('btn')
  .variant('primary', variant === 'primary')
  .variant('large', size === 'large')
  .conditional({ 'loading': isLoading })
  .build();
```

### Style Merging

```typescript
import { 
  mergeComponentStyles, 
  applyThemeStyles, 
  createMemoizedStyleMerger 
} from '@c15t/styles';

// Merge different style formats
const merged = mergeComponentStyles(
  'base-class',
  { className: 'variant-class', style: { color: 'blue' } }
);

// Performance-optimized merging
const memoizedMerger = createMemoizedStyleMerger();
const styles = memoizedMerger(baseStyles, themeStyles, customStyles);

// Theme application
const result = applyThemeStyles(
  componentDefaults,
  userTheme,
  'primary',
  additionalStyles
);
```

## Framework Integration

### React/Preact

```tsx
import { mergeClassNames, type ComponentStyleValue } from '@c15t/styles';
import '@c15t/styles/components/cookie-banner.css';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'large';
  customStyles?: ComponentStyleValue;
}

function Button({ variant = 'primary', size, customStyles, children }: ButtonProps) {
  const className = mergeClassNames([
    'btn',
    `btn-${variant}`,
    size && `btn-${size}`,
    typeof customStyles === 'string' ? customStyles : customStyles?.className
  ]);
  
  return (
    <button 
      className={className}
      style={typeof customStyles === 'object' ? customStyles.style : undefined}
    >
      {children}
    </button>
  );
}
```

### Vue

```vue
<template>
  <button :class="buttonClass" :style="buttonStyle">
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { mergeClassNames, type ComponentStyleValue } from '@c15t/styles';

interface Props {
  variant?: 'primary' | 'secondary';
  customStyles?: ComponentStyleValue;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary'
});

const buttonClass = computed(() => 
  mergeClassNames([
    'btn',
    `btn-${props.variant}`,
    typeof props.customStyles === 'string' ? props.customStyles : props.customStyles?.className
  ])
);

const buttonStyle = computed(() => 
  typeof props.customStyles === 'object' ? props.customStyles.style : undefined
);
</script>
```

### Vanilla JavaScript

```javascript
import { mergeClassNames } from '@c15t/styles';
import '@c15t/styles/components/cookie-banner.css';

function createButton(options = {}) {
  const { variant = 'primary', size, customStyles, text } = options;
  
  const button = document.createElement('button');
  
  const className = mergeClassNames([
    'btn',
    `btn-${variant}`,
    size && `btn-${size}`,
    typeof customStyles === 'string' ? customStyles : customStyles?.className
  ]);
  
  button.className = className;
  
  if (typeof customStyles === 'object' && customStyles.style) {
    Object.assign(button.style, customStyles.style);
  }
  
  button.textContent = text;
  
  return button;
}
```

## Performance Optimization

### Memoized Style Merging

For frequently rendered components, use memoized style merging:

```typescript
import { createMemoizedStyleMerger } from '@c15t/styles';

// Create once per component type
const buttonStyleMerger = createMemoizedStyleMerger(100); // Cache 100 results

function Button(props) {
  // This will be cached based on the input values
  const styles = buttonStyleMerger(
    baseButtonStyles,
    props.variant && variantStyles[props.variant],
    props.customStyles
  );
  
  return <button className={styles.className} style={styles.style} />;
}
```

### CSS Custom Properties

Use CSS custom properties for dynamic theming without JavaScript:

```css
.my-component {
  background-color: var(--component-bg, #ffffff);
  border-radius: var(--component-radius, 8px);
  transition: all var(--component-transition-duration, 200ms) ease;
}

/* Theme variations */
.my-component[data-theme="dark"] {
  --component-bg: #1f2937;
}

.my-component[data-size="large"] {
  --component-radius: 12px;
}
```

## Browser Support

- Modern browsers (Chrome 88+, Firefox 78+, Safari 14+, Edge 88+)
- CSS custom properties support required
- ES2020+ for JavaScript utilities

## Contributing

Please read our [contributing guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
