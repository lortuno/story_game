# Story Game

Interactive branching stories with decisions, pictures and music.
Narrative logic is written in [ink](https://www.inklestudios.com/ink/); the player is a React 19 + Vite app.

The first story, **Escape the Quarantine** (`src/stories/escape`), is a port of the original PHP escape room in `escape/`.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

| Script | What it does |
|--------|--------------|
| `npm run dev` | Dev server; editing any `.ink` file reloads the story |
| `npm run build` | `ink:check` + type check + production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` / `npm run test:coverage` | Vitest (unit, component and full story walkthroughs); coverage gate 80% |
| `npm run lint` / `npm run typecheck` | oxlint / tsc |
| `npm run ink:check` | Compile every story and report ink errors with file and line |
| `npm run images -- --src <dir> --story <id>` | Convert source images to size-capped WebP + `dimensions.json` (`--quality 90 --only a,b` for clue images with fine print) |

Requires Node 22.18+ (scripts are TypeScript run natively by Node).

## Architecture

```
ink (.ink files) ──build time──▶ compiled JSON (+hash) ──▶ StoryController ──snapshot──▶ React UI
                  tooling/ink                              src/engine          useSyncExternalStore
                                                              │
                                             ┌────────────────┼──────────────────┐
                                        SaveRepository     EventBus          AudioManager
                                        (localStorage)     (dev log / beacon)  (music, sfx)
```

- **Build-time ink compilation** (`tooling/ink`): the browser ships only the ink runtime (~35 KB gzip), not the compiler.
  Stories are lazy chunks, so adding stories doesn't grow the initial download.
- **Engine** (`src/engine`): framework-agnostic and fully unit-tested. Turns ink lines + tags into immutable page
  snapshots, autosaves, and publishes events. The tag and markup grammar is in [`specs/story-engine.md`](specs/story-engine.md).
- **Events** (`src/events`): typed envelopes for every decision and state change — the seam for future sharing of
  node decisions and status (analytics, backend sync, multiplayer). No database needed today; set
  `VITE_EVENTS_ENDPOINT` to start shipping batches.
- **Persistence** (`src/persistence`): repository interface; localStorage now, swappable later.
- **UI** (`src/app`, `src/ui`): semantic HTML, CSS modules with design tokens, native `<dialog>` and `<details>`,
  keyboard- and screen-reader-friendly; no UI framework dependencies.

## Writing a story

1. Create `src/stories/<id>/` (copy `escape/index.ts` as a template) and register it in `src/stories/registry.ts`.
2. Write ink in `ink/main.ink` (+ `INCLUDE chapters/…`). Inky works for previewing text.
3. Add images: `npm run images -- --src path/to/originals --story <id>`.
4. Drop music/sfx into `audio/music/` and `audio/sfx/` (Opus/OGG recommended; keep loops short and mono where possible).
5. `npm run ink:check && npm test`.

## Escape story notes

- Music and SFX tags are already in the ink (`investigacion`, `tension`, `victoria`; sfx `desbloqueo`, `puerta`) but no
  audio files are included yet — add files with those names to enable them.
- The recipe books (`escape/documents/books.zip`, 26 MB) are not bundled; the story links to the original Google Drive
  copy, as the PHP version did.
- Images were converted from 3.3 MB of JPG/PNG to 0.9 MB of WebP; clue images use higher quality so hidden text stays legible.
