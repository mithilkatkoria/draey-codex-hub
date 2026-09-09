# Vdoc design preview

This is an unreleased, reversible design trial based on alpha.4.

Exactly four visible accounts use a centered two-column, two-row layout, capped at 1120px. Narrow windows stack these cards. Other account counts retain their existing adaptive layout. Names, percentages, reset details, statuses, and buttons are larger in the four-account view.

The title bar, startup animation, window title, and tray display Vdoc. A lightweight silver V with a violet fold replaces the D icon. The installer product identity, application identifier, account directories, updater URL, and repository name remain unchanged during this branding trial, to avoid introducing a data migration or separate installation.

Verification: 36 frontend tests and the production frontend build passed. Headless Edge checked 1, 3, 4, and 9 synthetic accounts at 800, 1280, and 1600px with no horizontal page overflow. Four accounts use two columns at 1280 and 1600px and one column at 800px. The preview image contains simulated data only.

The published alpha.4 downloads do not contain this trial. Revert the design-preview commit to restore the prior branding and layout.
