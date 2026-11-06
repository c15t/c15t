# React Native consent screens

`@c15t/react-native` is a private alpha package in this repository. This guide
covers its current UI API and the migration from the previous web-style UI.
It is not available through the `c15t` umbrella package.

The native cores still own policy resolution, stored decisions, and consent
gates. Mount the standard screens inside `C15tProvider`. Configure the native
module and backend as described in the
[bare fixture](../internals/fixtures/react-native-bare/README.md) or
[Expo fixture](../internals/fixtures/expo-dev/README.md).

## Show the first prompt

```tsx
import { C15tProvider, ConsentBanner } from '@c15t/react-native';
import { View } from 'react-native';

export function App() {
	return (
		<C15tProvider>
			<View style={{ flex: 1 }}>
				{/* App screens go here. */}
				<ConsentBanner />
			</View>
		</C15tProvider>
	);
}
```

`ConsentBanner` opens a content-sized bottom sheet while the snapshot requires
a prompt. Manage preferences expands that sheet and opens the category list.
You do not need to mount a second component for that path. Pass `onCustomize`
when your app should open its own preferences screen instead.

Accept all and Reject all have equal size and styling. Choice prompts resist
downward dismissal and ignore scrim taps. Notice prompts may dismiss, which
acknowledges the notice without granting categories. Android Back returns from
preferences to the first layer before it can dismiss a notice.

## Open preferences from app settings

```tsx
import { ConsentPreferences } from '@c15t/react-native';
import { useState } from 'react';
import { Button } from 'react-native';

export function PrivacySettings() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button onPress={() => setOpen(true)} title="Privacy preferences" />
			<ConsentPreferences onClose={() => setOpen(false)} open={open} />
		</>
	);
}
```

The default `presentation="page"` uses an iOS system page sheet and an Android
full-screen page. Set `presentation="sheet"` for a full-height bottom sheet on
both platforms. Preferences can open when no prompt is pending.

Switches hold a draft. Save writes the categories shown in the list. Accept all
and Reject all write their respective decisions. A successful write calls
`onClose`; a failed write leaves the draft available for another attempt.
Closing, swiping away, or pressing Back without a decision writes nothing.
Reopening starts from the current snapshot.

Necessary stays on and disabled. Restricted categories stay off and disabled.
Each row uses a native switch and exposes its title and state to assistive
technology.

## Put preferences in a host screen

```tsx
import { ConsentWidget } from '@c15t/react-native';
import { ScrollView } from 'react-native';

export function PrivacyScreen() {
	return (
		<ScrollView>
			<ConsentWidget />
		</ScrollView>
	);
}
```

`ConsentWidget` renders the category list and decision buttons inline. Your app
owns its header, navigation, safe-area padding, and scrolling. The widget does
not mount a modal or a nested virtualized list. Its optional `onSave` callback
runs after Save, Accept all, or Reject all succeeds. Use it to confirm the
change or leave the host screen.

## Show IAB disclosures

The IAB components take a `ConsentIabDisplayModel` and return a complete
`ConsentIabSelection` through `onSave`. They do not read or persist IAB state
through `C15tProvider`. Your IAB integration supplies the disclosure, any stored
selection, and the persistence callback. It also controls `open` and closes the
component after recording a decision.

Return the persistence promise from `onSave`, for example
`onSave={(selection) => iab.save(selection)}`. Decision buttons stay disabled
while it is pending. If saving throws or the promise rejects, the draft stays
available for retry. Your callback reports the error and closes the component
only after persistence succeeds.

```tsx
import {
	ConsentIabPreferences,
	type ConsentIabDisplayModel,
	type ConsentIabSelection,
} from '@c15t/react-native';

interface IabSettingsProps {
	model: ConsentIabDisplayModel;
	onClose: () => void;
	onSave: (selection: ConsentIabSelection) => void | PromiseLike<void>;
	open: boolean;
}

export function IabSettings(props: IabSettingsProps) {
	return <ConsentIabPreferences.Root {...props} />;
}
```

`ConsentIabBanner` is the first-layer sheet. Its Manage action opens the
disclosure inside the same sheet. `ConsentIabPreferences.Root` opens the
standalone page or optional sheet. Both accept `initialSelection`, `copy`,
`styles`, and `theme`. Preferences also accepts `initialTab="purposes"` or
`initialTab="vendors"`.

The default preference slots are Header, Tabs, Body, and Footer. To add content
between them, pass those slots as children of Root:

```tsx
<ConsentIabPreferences.Root {...props}>
	<ConsentIabPreferences.Header />
	<ConsentIabPreferences.Tabs />
	<ConsentIabPreferences.Body />
	<ConsentIabPreferences.Footer />
</ConsentIabPreferences.Root>
```

Purpose and partner rows have separate controls for detail navigation and
switching consent. Partner search filters by name. Partner detail shows consent,
legitimate-interest objections, retention and storage disclosures, and external
policy links when the model provides them. Info buttons open system alerts.
Back and swipe navigation keep the draft. Closing preferences discards it on
the next opening. Closing alone never calls `onSave`.

## Match the app's theme

Every component accepts `theme` and named `styles` overrides. Standard components
also accept `hideBranding` to remove the preferences footnote. The first layer
has no branding mark.

```tsx
<ConsentBanner
	theme={{
		colors: { primary: '#0A7C55', onPrimary: '#FFFFFF' },
		darkColors: { primary: '#4FD1A1', onPrimary: '#003826' },
	}}
/>
```

The theme resolves platform and color scheme before applying overrides.
`colors` applies in both schemes; `darkColors` applies afterward in dark mode.
System fonts scale with the device settings, and reduced motion replaces
navigation slides with fades. Tap targets are at least 44 points on iOS and
48 dp on Android.

Use named parts such as `sheet`, `page`, `navBar`, `section`, `row`,
`searchField`, and `button` for local adjustments. `CONSENT_THEME_PARTS` lists
the supported keys, and `isConsentThemePart` checks a key at runtime. Preserve
equal styling for paired Accept all and Reject all actions.

## Migrate the previous alpha UI

| Previous API | Current API |
| --- | --- |
| `ConsentDialog` | `ConsentBanner` manages preferences itself; use `ConsentPreferences` for a standalone screen |
| `ConsentIabDrawer.Root` and its slots | `ConsentIabPreferences.Root` and the corresponding slots |
| `ConsentPreferences onRequestClose` | `ConsentPreferences onClose` |
| `useTrackingRequest` preferences `onRequestClose` | preferences `onClose`; spreading `tracking.preferences` still works |
| Web-style color and part names | Semantic native theme colors and `CONSENT_THEME_PARTS` |

Use `ConsentWidget` when the app already owns the settings page. For Apple
tracking journeys, keep `<ConsentPreferences {...tracking.preferences} />`
mounted inside the provider. Apple tracking authorization and category consent
remain separate decisions.

The [UI spec](UI.md) describes the shared screen models and fixtures for future
SwiftUI and Compose ports. Those models are internal to the React Native package;
they are not exported as a public import path.
