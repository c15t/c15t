---
"@c15t/react-native": patch
---

Put the spacing of the card surfaces onto the numbers the web surface measures. A heading now sits 8 above its copy in the dialog and the preference centre, where it sat 4: `panel.module.css` spends `--consent-dialog-header-gap` between the children of `.header` and then `--consent-dialog-card-gap` on the second one, and both are `--c15t-space-xs`, so the live card reads 8 box to box. The banner keeps its own 16 header inset and spends the 8 on the band's lower edge, because only there does the copy continue in the band under the heading. With the step right, a four-category card adds up to 499, the height the web card measures at 411x914; with the step at 4 it came to 495. A bottom sheet's grab handle draws in the `switchTrack` colour rather than `border`: the border token leaves 25 channels between a 4pt bar and a white card, which is not a bar anyone can find.
