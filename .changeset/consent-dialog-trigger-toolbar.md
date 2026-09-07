---
'@c15t/react': minor
'@c15t/nextjs': minor
---

Add `ConsentDialogTriggerToolbar`, a draggable toolbar that always includes one action for opening the preference center and accepts app-owned actions such as a theme toggle or support chat. Actions take a stable `id`, a `label`, an `icon`, and `onSelect`, with `pressed` and `disabled` for toggles and unavailable controls. The toolbar supports horizontal and vertical orientation with arrow-key navigation, snaps to a corner like the existing trigger, and styles through the `trigger.toolbar`, `trigger.toolbarItem`, and `trigger.toolbarIcon` slots. The toolbar's built-in action names the strongest right on the active rule: under an opt-out rule it reads "Do not sell or share my personal information" and carries `data-right="opt-out"`, otherwise "Manage preferences" with `data-right="preferences"`, and a host `preferences.label` still wins. Both the toolbar and `ConsentDialogTrigger` accept `showWhen="after-prompt"`, which hides the control while a choice or notice is owed and shows it once the visitor has answered.
