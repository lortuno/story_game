# Story Game

Interactive branching stories with decisions, pictures and music.
Narrative logic is written in [Yarn Spinner](https://docs.yarnspinner.dev/) 3; the player is a React 19 + Vite app.

The first story, **Escape the Quarantine** (`src/stories/escape`), is a port of the original PHP escape room (2020),
playable in **Spanish and English** (ES | EN switch; `?lang=en` also works).

## Quick start

```bash
npm install
npm run dev          # http://127.0.0.1:5173
```

| Script | What it does |
|--------|--------------|
| `npm run dev` | Dev server (http://127.0.0.1:5173); editing any `.yarn` file reloads the story |
| `npm run build` | `dialogue:check` + type check + production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` / `npm run test:coverage` | Vitest (unit, component and full story walkthroughs); coverage gate 80% |
| `npm run lint` / `npm run typecheck` | oxlint / tsc |
| `npm run dialogue:check` | Compile every story's Yarn project and report errors with file and line |
| `npm run images -- --src <dir> --story <id>` | Convert source images to size-capped WebP + `dimensions.json` (`--quality 90 --only a,b` for clue images with fine print) |

Requires Node 22.18+ (scripts are TypeScript run natively by Node).

## Architecture

```
Yarn (.yarnproject) ──build time──▶ program JSON (+hash) ──▶ StoryController ──snapshot──▶ React UI
                     tooling/yarn                           src/engine          useSyncExternalStore
                                                              │
                                             ┌────────────────┼──────────────────┐
                                        SaveRepository     EventBus          AudioManager
                                        (localStorage)     (dev log / beacon)  (music, sfx)
```

- **Build-time Yarn compilation** (`tooling/yarn`): the browser ships only the Yarn runtime and the compiled program, not the compiler (main bundle ~99 KB gzip incl. React).
  Stories are lazy chunks, so adding stories doesn't grow the initial download.
- **Engine** (`src/engine`): framework-agnostic and fully unit-tested. Turns Yarn lines, commands and tags into immutable
  page snapshots, saves decisions (resuming replays them), and publishes events. The command, tag and markup grammar is in [`specs/story-engine.md`](specs/story-engine.md).
- **Events** (`src/events`): typed envelopes for every decision and state change — the seam for future sharing of
  node decisions and status (analytics, backend sync, multiplayer). No database needed today; set
  `VITE_EVENTS_ENDPOINT` to start shipping batches.
- **Persistence** (`src/persistence`): repository interface; localStorage now, swappable later.
- **UI** (`src/app`, `src/ui`): semantic HTML, CSS modules with design tokens, native `<dialog>` and `<details>`,
  keyboard- and screen-reader-friendly; no UI framework dependencies.

## Writing a story

1. Create `src/stories/<id>/` (copy `escape/index.ts` as a template) and register it in `src/stories/registry.ts`.
2. Write Yarn in `dialogue/<lang>/*.yarn` with a `dialogue/<lang>/<id>.yarnproject` per language, and register each in `locales` in `index.ts` (see "Languages" in the spec); set `startNode`. Escape every narrative `:` as `\:`. The Yarn Spinner VS Code extension gives syntax highlighting and a node graph.
3. Add images: `npm run images -- --src path/to/originals --story <id>`.
4. Drop music/sfx into `audio/music/` and `audio/sfx/` (Opus/OGG recommended; keep loops short and mono where possible).
5. `npm run dialogue:check && npm test`.

## Escape story notes

- Music and SFX commands are already in the Yarn scripts (`investigacion`, `tension`, `victoria`; sfx `desbloqueo`, `puerta`) but no
  audio files are included yet — add files with those names to enable them.
- The recipe books (26 MB of PDFs) are not bundled; the story links to the Google Drive copy, as the PHP version did.
- Images were converted from 3.3 MB of JPG/PNG to 0.9 MB of WebP; clue images use higher quality so hidden text stays legible.
