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
already wrote. Configure [clear on revocation](/docs/integrations/clear-on-revocation)
on your runtime, or attach its module to your existing kernel, to remove
declared data when its category is denied.
