# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## 체크인 (Check-in)

The app's single core domain entity — a timestamped, location-anchored journal entry the user creates to record where they are and, optionally, what they're doing. A Check-in always carries a captured or fallback GPS coordinate and the local calendar date it belongs to; a note and a photo are optional and can be added or changed after creation. Once saved, a Check-in is edited in place (via its detail screen) rather than superseded by a new one — there is no versioning or history per Check-in.

A Check-in's local calendar date (not its UTC timestamp) is what the Today screen filters and groups by, so a Check-in belongs to exactly one day regardless of time zone travel after the fact.

Deleting a Check-in from a list view is not immediate: it enters a short undo window (see Delayed Delete) before the underlying row and any attached photo file are actually removed.

## Delayed Delete

The pattern used for swipe-to-delete on a Check-in: the row is hidden from the list immediately, but the underlying database row and its photo file are not removed until a short countdown (surfaced to the user as an undo snackbar) elapses without the user reversing the action. Committing early — via leaving the screen, starting a new action, or the countdown expiring — finalizes the deletion; reversing it during the window fully restores the row to the list with no trace of the pending deletion.
