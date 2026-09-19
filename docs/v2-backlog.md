# Life OS – v2 Backlog

Last updated: 2026-09-18

## Overview

This backlog captures 19 issues found during a full flow test of the Today, Fitness, and Routines modules — the only areas covered in v1 (Finance is out of scope for v1). This list is the first priority for the v2 build.

Item numbers below run 1–19 in reading order and match the numbering used in the [v2 PRD & ERD Baseline](./v2-prd-erd-baseline.md), which maps each item to a stage. Items 13 and 14 describe the same missing workout-edit feature, so there are 18 distinct problems.

## Auth

1. Login/Sign up is missing a show/hide password icon.

## UI Consistency & Design System

2. Input boxes are greyed and too rounded, inconsistent with other components.
3. "Add todo" button doesn't match the style of "new workout"/"new routine" buttons.
4. Swap in shadcn's custom calendar component for date pickers.
5. Sidebar should be collapsible.

## Performance

6. Page switching has a noticeable delay — investigate client-side caching to reduce lag.
7. Todo filter tab transitions (All/Completed/Active) feel laggy and jerky.

## Tasks (Todo) Module

8. Open question: should past dates be selectable when creating a todo? (Decided in the v2 PRD: yes, allowed.)
9. Rename "todo" to "tasks" app-wide for consistency and reusability.

## Fitness Module

10. Exercise-addition form needs a UX pass for friendliness.
11. Muscle Groups and Equipment should become their own submodules, similar to how Exercise is structured now.
12. Bug: finishing a workout shows "last logged ~15 hours ago" instead of reflecting that it just happened.
13. Workouts can't be edited once created.
14. Exercises can be edited but workouts can't — inconsistent; workout editing should be added.

## Routines Module

15. Routines need a time-of-day field.
16. Routine frequency needs to be customizable: daily, N times a week, or specific days of the week.
17. Items within a routine shouldn't be mandatory every occurrence — need a way to skip or vary items per instance (e.g., a face scrub isn't needed every day in a morning skincare routine).
18. The "view checklist" interaction for checking off items isn't user-friendly.

## Data Export

19. The export-data option should only appear when the user actually has data to export.
