---
title: Script Loader
description: Load third-party scripts only after the required consent.
group: frameworks
---
> ℹ️ **Info:**
> This page is a placeholder for the v3 docs rewrite.

## Usage

TODO.

## Options

TODO.

## Clear stored tracking data

Script gating does not remove cookies or Web Storage entries that a script
already wrote. Add `clearOnRevocation` to your consent boundary or provider
options to remove declared data when its category is denied. See
[clear on revocation](/docs/integrations/clear-on-revocation) for configuration
and browser limits.
