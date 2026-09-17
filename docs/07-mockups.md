# Life OS — High-Fidelity UI Mockups (Phase 6)

Source (visual canvas — view for pixel-level detail): https://claude.ai/code/artifact/e2a0b7dc-517b-4803-bed8-04c722dcdfb5

> These mockups are a visual design canvas, not a text document — open the link above to see them directly, or reference `05-design-system.md` for the exact tokens they're built from. This file captures the approved scope as a text reference for implementation.

Built on the Phase 4 design system tokens (`05-design-system.md`) and the Phase 5 wireframe structure (`06-wireframes.md`).

## Approved screens

Same four screens as the wireframes — Shell + Today (Todo), Fitness Overview, Fitness Log Workout, Routines — now at hi-fi with:

- Real design-system tokens applied (Inter, exact color/spacing/radius values from `05-design-system.md`)
- Inline stroke icons (Lucide, per the design system's iconography rules)
- Real accessible controls (checkboxes, inputs, buttons) in place of the wireframes' decorative placeholder divs
- Status colors corrected to each domain's own accent — **teal for Fitness, blue for Routines** (not Todo's violet, which the wireframes had reused everywhere)

## Interactivity built at this stage

- Sidebar nav and the Start/Finish workout buttons are wired as real links between the four boards, giving a click-through prototype.
- No other interactivity was built at this stage — full functional wiring (forms, CRUD, state) is Implementation Plan (Phase 7/8) work — see `08-implementation-plan.md`.
