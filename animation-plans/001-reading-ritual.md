---
status: DONE
repo_revision: f08d025
created: 2026-08-24
skill: improve-animations → animate → review-animations
---

# PaperScroll reading ritual

## Intent

Motion should explain one thing: the reader is moving through a finite morning
edition. It must preserve reading position, keyboard behavior, and the quiet
paper feel. The signature is a restrained directional page change plus the
accent progress rule—not card choreography, bouncing, or dashboard effects.

## Findings to fix first

- `RoutinePage` handles ArrowRight globally, so it advances while Field/Plain
  has focus. Ignore interactive/contenteditable targets and repeated keys.
- The uncontrolled Abstract `<details>` node is reused between route params, so
  an opened abstract leaks into the next paper. Key it by paper ID.
- Passive scroll resets can join a View Transition too late. Use layout effects
  for route-level resets.
- Repeated Next activation can skip papers while a transition is running.

## Implementation

1. Add a single `navigateWithMotion` helper around React Router's supported
   `{ viewTransition: true }` navigation option. It checks reduced motion,
   writes one short-lived direction attribute to `<html>`, locks until the
   transition finishes, and has an instant fallback. Keyboard shortcuts remain
   instant and ignore repeats.
2. Keep routine chrome stable. Animate only `.routine-sheet` snapshots by 8px
   and opacity over 220ms using the existing `--ease-out` / `--ease-in-out`
   curves. Give the progress line a separate 180ms transform transition.
3. Crossfade the Field/Plain copy over 160ms with at most 2px of vertical
   movement. Keep abstract, section heading, switch, and actions fixed.
4. Replace the completion scale pop and SVG draw with a 240ms accent rule
   completion and a 220ms, 4px heading settle. Reduced motion keeps a short
   opacity fade but removes translation.
5. Shorten Abstract's reveal to 180ms and reset it on each paper.

## Acceptance

- Field/Plain + ArrowRight never advances the route.
- One shortcut or activation advances exactly one paper; held keys do not skip.
- Each next paper begins at the top with its Abstract collapsed.
- The full shared routine still works with View Transitions unavailable.
- Desktop and 390×844 retain stable sticky chrome and ≥44px primary targets.
- Reduced motion initiates no View Transition and uses no spatial movement.
- No duplicate `view-transition-name`, `transition: all`, scale-from-zero,
  `ease-in`, blur, or spring is introduced.
