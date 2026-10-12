# GoGo challenge activity icons

Six activity illustrations and two challenge-type illustrations generated with the built-in image_gen tool,
using `design-assets/marketing/gogo-thumbs-up.png` as the mascot identity reference.
Original transparent PNGs are saved here. The exact shared prompt and each pose
instruction are recorded in `prompts.json` and `type-prompts.json`.

The selector displays each icon at 48 CSS pixels with an adjacent activity label
and a selected-state checkmark. Runtime assets are in `public/assets/brand/activities/`:
96px WebP files for 2x displays and 144px `@3x` files for 3x displays, with
transparent backgrounds and 10% safe padding.

Recreate exports with `node scripts/prepare-activity-assets.mjs`.

Activities: push-ups, squats, plank, run, walk, and burpees. The burpee icon depicts
the finishing jump; its visible label identifies the complete exercise.
Jumping Jacks is excluded from the current six-activity preset selection.

Challenge types: Solo Challenge shows one GoGo giving a thumbs-up; Team Goal shows
two GoGos high-fiving. Both use the same 48px display size, high-density exports,
transparent backgrounds, and selected-state checkmarks as the activity icons.

Validation: production build, TypeScript, transparent alpha and dimensions, and
an isolated browser render of the actual modal in light/dark themes and at a
375px mobile viewport. Both type toggles and all six activity buttons were exercised
without Firebase requests. `selector-preview.png` shows the mobile solo view;
`team-selector-preview.png` shows the mobile team view, both in dark theme.
