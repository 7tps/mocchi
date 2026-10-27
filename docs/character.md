# Mocchi — character and sprite system

Mocchi is an original character: a round cream mochi spirit with a mint sprout, navy outline and rosy cheeks. It is encouraging and calm and never scolds.

## Source of truth

`packages/design-system/src/sprites.ts` defines:

- a **32×32 grid** and a **15-colour palette** (index 0 transparent),
- a body model (ellipse with outline, shading and highlight) that squashes and bounces,
- eyes, mouths and effects per frame,
- 11 moods with frame lists and timing: `idle, blink, happy, thinking, curious, confused, sleepy, celebrating, encouraging, studying, waiting`,
- 8 cosmetics drawn as overlays: `sprout-bloom, scarf, hachimaki, glasses, sakura, grad-cap, lantern, star-crown`.

The desktop renders frames straight from this model onto a 32×32 canvas scaled with `image-rendering: pixelated`. Mobile and icons use exported PNGs.

## Exported assets (`npm run sprites`)

| File | Description |
| --- | --- |
| `assets/character/mocchi_<mood>.png` | Sprite sheet, frames left→right, each frame 256×256 (32 px × 8), transparent background |
| `assets/character/cosmetics/mocchi_<mood>_<cosmetic>.png` | Same sheet with a cosmetic applied |
| `assets/character/manifest.json` | Frame size, scale, frame count, frame duration (ms) and looping per mood |
| `assets/character/contact-sheet.png`, `cosmetics-sheet.png` | Review sheets |
| `assets/ui/icon-*.png`, `tray-*.png`, `icon-adaptive-fg.png` | App, tray and Android adaptive icons |
| `apps/mobile/src/sprites.generated.ts` | Static `require()` map for Metro |

Naming convention: `mocchi_<mood>[_<cosmetic>].png`, lowercase, hyphenated ids.

## Replacing the art

Hand-drawn sheets can replace the generated PNGs as long as they keep the naming, frame order, frame size multiple of 32, and the counts/timing in `manifest.json` (update `ANIMATIONS` in `sprites.ts` if timing changes). To use hand-drawn art on desktop too, swap the canvas renderer in `apps/desktop/src/renderer/components/Mocchi.tsx` for an `<img>` sheet like the mobile component — no other code depends on how frames are produced.

## Reactions

| Event | Mood |
| --- | --- |
| Correct answer | happy |
| Incorrect answer | encouraging |
| Question shown | thinking |
| Pop-up offered | curious (+ speech bubble, optional chime) |
| Session complete / goal / level up | celebrating |
| Paused or quiet hours | sleepy |
| Reviews waiting | waiting |
| Idle | idle with random blinks |

Animation can be turned off, and it also stops under the OS reduced-motion preference or the in-app "Reduce motion" setting.
