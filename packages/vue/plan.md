# c15t Vue

Implementation notes for `@c15t/vue`. Shared config types live in `@c15t/config`; Vue binds
`ConsentConfig` to `HTMLAttributes` in `packages/vue/src/lib/config.ts`.

## Quickstart

### Nuxt module

**`nuxt.config.ts`**

```ts
modules: ['c15t/nuxt']
c15t: {
	backendURL: 'https://example.inth.dev',
}
```

**`app.vue`**

```html
<template>
	<ConsentRoot />
</template>
```

**`app.config.ts`** (reactive, HMR)

```ts
export default defineAppConfig({
	c15t: {
		backendURL: 'https://example.inth.dev',
		tokens: {
			'consent-banner-background': 'hsl(228 100% 98%)',
		},
		components: {
			banner: {
				root: { class: 'my-banner' },
			},
		},
	},
})
```

### Vue plugin

```ts
import { createApp } from 'vue';
import App from './App.vue';
import { c15tVue } from '@c15t/vue/vue-plugin';
import c15tVite from '@c15t/vue/vite';

createApp(App).use(c15tVue, {
	backendURL: 'https://example.inth.dev',
	tokens: {},
	components: {},
}).mount('#app');
```

### Manual UI control

```vue
<script setup lang="ts">
import { useConsentActiveUI } from '@c15t/vue';

const activeUI = useConsentActiveUI();

function openBanner() {
	activeUI.value = 'banner';
}
</script>

<template>
	<button type="button" @click="openBanner">Open consent banner</button>
</template>
```

## Configuration

Flat `ConsentConfig` from `@c15t/config` (Vue: `ConsentConfig` via `lib/config.ts`):

```ts
interface ConsentConfig {
	backendURL?: string;
	disableAnimation?: boolean;
	trapFocus?: boolean;
	legalLinks?: ConsentLegalLinks;
	bannerLegalLinks?: ConsentLegalLinkKey[] | null;
	dialogLegalLinks?: ConsentLegalLinkKey[] | null;
	hideBranding?: boolean;
	bannerHideBranding?: boolean;
	dialogHideBranding?: boolean;
	showTrigger?: boolean;
	dialogShowTrigger?: boolean;
	models?: PolicyModel[];
	bannerModels?: PolicyModel[];
	// … flat per-surface keys — see @c15t/config
	tokens?: Record<string, string | number>;
	components?: {
		// HTMLAttributes only (class, style, aria-*, data-*, etc.)
		banner?: { root?: HTMLAttributes; card?: HTMLAttributes; /* … */ };
		dialog?: { root?: HTMLAttributes; /* … */ };
		link?: { banner?: HTMLAttributes; dialog?: HTMLAttributes; manager?: HTMLAttributes };
	};
}
```

**Lookup paths**

| Concern | Source |
|---------|--------|
| Slot overrides | `config.components?.[name]` — **HTMLAttributes only** |
| Legal link hrefs | `config.legalLinks` |
| Which links per surface | `config.bannerLegalLinks`, `config.dialogLegalLinks` |
| Branding / trigger / models | Cookie surfaces: `bannerHideBranding ?? hideBranding`, etc. IAB: `iabBanner*` / `iabDialog*` only |
| CSS variables | `config.tokens` → applied as `--{key}` on `:root` in `ConsentRoot` |
| Consent categories | `config.consentCategories` — policy with optional categories narrows this set; `necessary`-only policy does not |
| Scroll lock | `init.policy.ui.banner.scrollLock` / `init.policy.ui.dialog.scrollLock` |
| Focus trap | `config.trapFocus` (default `true`) |
| Animations off | `config.disableAnimation` |
| Policy footer layout | `init.policy.ui.*` via `lib/policy-surface.ts` (ordering, primary, fill) |

Primitives (`ButtonVariant`, `ButtonMode`, `ConsentActiveUI`, `ConsentSaveAction`) import
from `@c15t/config`. Do not re-export them from `lib/config.ts`.

No nested `theme`, no `components.*.slots`, no component swap `overrides`.

## Components

Exported from `@c15t/vue` (`packages/vue/src/index.ts`):

**Cookie / opt-in**

- `ConsentRoot`, `ConsentBanner`, `ConsentDialog`, `ConsentManager`
- `ConsentRoot`, `ConsentBanner`, `ConsentDialog`, `ConsentManager`
- `ConsentSwitch`, `ConsentToggle`
- `ConsentDescription`, `ConsentBadge`, `ConsentTag`, `ConsentLink`

**IAB / TCF**

- `IabConsentBanner`, `IabConsentDialog`
- `IabPurposeItem`, `IabStackItem`, `IabVendorList`

`ConsentRoot` fetches `/init`, provides state, and renders cookie or IAB banner/dialog when
`init.policy.model === 'iab'` and GVL data is present.

## Styling (Vue-first)

Three layers per element:

1. **Defaults** — CSS module class keys (`accordionStyles.trigger`, `switchStyles.root`, …)
2. **Config overrides** — `config.components` slot attrs (`class` / `style` only)
3. **Consumer attrs** — fallthrough on the root element (`inheritAttrs`)

**Behavior** — Reka UI sets Radix-compatible reactive attrs (`data-state`, `data-disabled`, …);
styled in CSS via `[data-state="open"]` etc., never from config. Do not use `data-slot`.

| Attribute kind | Source | Example |
|----------------|--------|---------|
| Presentation | component props | `data-variant`, `data-mode` on buttons |
| Animation | component state | `data-visible` on banner & dialog root/overlay |
| Behavioral | Reka / Radix | `data-state`, `data-disabled` on switch, accordion |
| Theme slots | config `components` | `class`, `style` only |

| Component | Default CSS source |
|-----------|-------------------|
| banner, dialog, manager shell | `@c15t/styles/consent-*.module.css` |
| accordion (consent categories) | `@c15t/styles/accordion.module.css` |
| button | `@c15t/styles/button.module.css` |
| switch, toggle | `@c15t/styles/switch.module.css` |
| link | `@c15t/styles/legal-links.module.css` |
| description, tag, badge | consent modules + `context` prop where needed |

### Config example

```ts
{
	backendURL: 'https://example.inth.dev',
	tokens: {
		'consent-banner-background': 'hsl(228 100% 98%)',
	},
	components: {
		banner: {
			root: { class: 'my-root' },
			card: { class: 'my-card', style: { padding: '1rem' } },
		},
		button: {
			primary: { class: 'my-btn' },
		},
	},
}
```

- `useConsentComponent('banner')` returns bindable slot attrs per key.
- CSS modules always apply via `:class`; class `headless` skips module styles (`:not(.headless)` in `@c15t/styles`).

### Binding pattern

```vue
<script setup lang="ts">
import { mergeProps } from 'vue';
import buttonStyles from '@c15t/styles/button.module.css';
import type { ButtonMode, ButtonVariant } from '@c15t/config';
import { useConsentComponent } from '../composables';

const props = withDefaults(
	defineProps<{
		variant?: ButtonVariant;
		mode?: ButtonMode;
		type?: 'button' | 'submit' | 'reset';
	}>(),
	{ variant: 'primary', mode: 'filled', type: 'button' },
);

const theme = useConsentComponent('button');
</script>

<template>
	<button
		v-bind="
			mergeProps(
				{
					type,
					'data-testid': 'consent-button',
					'data-variant': variant,
					'data-mode': mode,
				},
				(variant === 'primary' ? theme.primary : theme.secondary) ?? {},
			)
		"
		:class="buttonStyles.button"
	>
		<slot />
	</button>
</template>
```

Inner slots: `v-bind="theme.card"` then `:class="bannerStyles.card"`.

`ConsentDescription`, `ConsentTag`, and `ConsentLink` take **`context`**
(`'banner' | 'dialog' | 'manager' | 'iab-banner' | 'iab-dialog'`) for the correct slot.

### Headless (`.headless`)

Add `headless` on any element to disable CSS module styles. Config slot overrides still apply
via `v-bind="theme.<slot>"`.

## Composables

Implemented in `packages/vue/src/runtime/composables/`. Nuxt-only: `runtime/plugin.nuxt.ts` and `runtime/stub.nuxt.ts`.

```ts
const config = useConsentConfig();
const language = useConsentLanguage();
const init = useConsentInit();
const selection = useConsentSelection();
const iabSelection = useConsentIabSelection();
const activeUI = useConsentActiveUI();
const theme = useConsentComponent('banner');
const { shouldTrapFocus } = useConsentTrapFocus(isOpen);
```

### `useConsentTrapFocus(isOpen)`

Reads `config.trapFocus` (default `true`). Returns `{ trapFocus, shouldTrapFocus }` where
`shouldTrapFocus` is `isOpen && trapFocus`.

- **Teleport banners / IAB surfaces** — wrap the card in Reka `FocusScope` with
  `:trapped` and `:loop` bound to `shouldTrapFocus`; set `role="dialog"` /
  `aria-modal="true"` on the card when trapping.
- **Cookie dialog** — bind Reka `DialogRoot :modal="shouldTrapFocus"` (modal mode handles
  focus trapping internally).
- **Scroll lock** — separate concern via VueUse `useScrollLock` + policy `scrollLock`.

### `ConsentRoot`

```html
<ConsentRoot />
```

- Fetches `/init` when `backendURL` is set (from injected config)
- Applies `config.tokens` to `document.documentElement` (`--{key}`)
- Persists cookie selection and IAB selection to localStorage + POST `/subject`
- Renders cookie or IAB UI based on policy model

### `useConsentConfig()`

Returns injected `ConsentConfig` (supports `Ref` / `ComputedRef`). Universal
[`composables/config.ts`](src/runtime/composables/config.ts): `inject(consentConfigKey)` +
`defu(defaultConsentConfig, toValue(injected))`.

Config resolution order (later layers override earlier where merged):

1. `defaultConsentConfig` — always applied in `useConsentConfig()`
2. `runtimeConfig.public.c15t` — from `nuxt.config` `c15t` module options + env (build-time merge in module)
3. `app.config.c15t` — reactive (Nuxt `plugin.nuxt.ts`; wins over runtime)
4. Vue: optional `app.use(c15tVue, …)` provides same key as Nuxt plugin

Custom hosts: `provide(consentConfigKey, …)` on an ancestor (no `ConsentRoot` config prop).

### `useConsentLanguage()`

Writable computed ref for the active language. Drives `/init` refetch in `ConsentRoot`.

### `useConsentInit()`

Returns `InitOutput | undefined` from inject (GVL, translations, policy, custom vendors, …).

Nuxt: `useConsentInitNuxt()` wraps `useFetch('/init')` with language query.

### `useConsentComponent(component)`

Returns `ComputedRef<ConsentThemeResult<C>>` — slot attrs from `config.components?.[component]`.
Registry: `ConsentComponentSlots` in `@c15t/config`.

### `useConsentSelection()`

`Ref<string[]>` — selected cookie consent category keys. Owned by `ConsentRoot` persistence.

### `useConsentIabSelection()`

`Ref<ConsentIabSelection>` — IAB purpose/vendor/special-feature maps + `preferenceCenterTab`.
Use `createDefaultIabSelection()` for empty state. Nuxt: `useConsentIabSelectionNuxt()`.

IAB accept/reject/save logic lives in IAB SFCs; dialog uses local draft state until save.

### `useConsentActiveUI()`

`Ref<ConsentActiveUI | null>` — `'banner' | 'dialog' | … | 'manager'`. Nuxt:
`useConsentActiveUINuxt()`.

Types: `ConsentActiveUI`, `ConsentSaveAction` from `@c15t/config`.

## Package layout

```
packages/config/src/index.ts     # ConsentConfig, ConsentComponentSlots, primitives
packages/vue/src/lib/config.ts   # ConsentConfig<HTMLAttributes> binding only
packages/vue/src/composables.ts
packages/vue/src/injections.ts
packages/vue/src/index.ts        # composables + component exports
packages/vue/src/components/
```

## Open / future

- TC string generation for IAB persistence (`@c15t/iab`)
- Nuxt module wiring (plugin, auto-imports)
