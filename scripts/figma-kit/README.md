# Figma kit

Rebuilds the Figma kit, "Kopikas: coin tray" (`HQvD32aReLKvVvA9GXEq1y`), from the running app. Figma follows the code: refresh it after the stage or the phone's To file screen changes, so new designs start from what ships.

What it builds, on the Stage page:

- **Stage · 1440 · light / dark** and **Phone · 375 · light**: the board's stage at `/?month=2026-09`, every drawing an editable vector, the text live and on the kit's text styles, colours bound to its variables, each roll grouped with its labels.
- **To file · 390 · light / dark**: the whole phone screen, with the header, panel, pills, tiles and tab bar as grouped layers.

Every colour variable carries its code syntax: the CSS variable in `app/globals.css` (`light/ink` is `var(--color-ink)`, `dark/ink` is `var(--color-chalk)`), or the name in `components/painted.tsx` for the cast's colours (`PAINTED_WRAPPERS[0]`, `PAINTED_METALS.copper.body`), so Dev Mode shows what the code calls it. The values are copies, not a sync: when a token changes in the code, change its variable too, and run the drift check (below) to catch one that was missed.

Every coin, squiggle and dot in these frames is an instance of its component on the Parts page, so a Part edited there reaches every frame; each keeps its place, turn, size and colour. The header's coin stays drawn, named Logo: the app always draws the brand mark with the same wobble, and the Part's differs. Rolls, bars and the tiles' mini rolls stay drawn too, since each one's height is its amount and the inside of an instance can't be resized.

A frame that is rebuilt keeps its old self, renamed "· replaced <date>" and moved left of everything. Delete those in Figma once they are no longer needed.

## Needs

- The dev server on :3000 with the local mock data, and Google Chrome (the exporters drive it headless).
- The Figma MCP's `upload_assets` and `use_figma`, with a Full or Dev seat on a paid plan (Professional allows 200 calls a day). On the free Starter plan or a View or Collab seat, the allowance is a handful a month, and a full refresh costs four calls: two `upload_assets`, because more than 60 SVGs go up and each call hands out at most 60 URLs, and two `use_figma`.

## Refresh

Pick fresh tags each time (for example `s2l s2d p2l t2l t2d`). The tag is part of every layer's name, and the builds find the uploaded layers by name. Run these from the repo root:

```bash
node scripts/figma-kit/export-stage.mjs 1440 light s2l
node scripts/figma-kit/export-stage.mjs 1440 dark s2d
node scripts/figma-kit/export-stage.mjs 375 light p2l
node scripts/figma-kit/export-screen.mjs light t2l
node scripts/figma-kit/export-screen.mjs dark t2d
node scripts/figma-kit/svgs.mjs s2l s2d p2l t2l t2d
```

1. Call `upload_assets` with `count` set to the number of new files (60 at most) and `currentPageId` set to `0:1`. Save the returned `submitUrl`s one per line, then run `node scripts/figma-kit/upload.mjs urls.txt`. Repeat until every file has gone up: `out/uploaded.txt` records them, so a rerun skips them.
2. Run `node scripts/figma-kit/gen-calls.mjs stage s2l s2d p2l` and `node scripts/figma-kit/gen-calls.mjs screens t2l t2d`.
3. Pass `out/call-stage.js`, then `out/call-screens.js`, to `use_figma` as the code. Each stays under its 50,000-character limit. Check the returned `missing` lists: a name there means its upload did not land, and `instances`, which says what each coin became.

To turn the coins and marks of frames already on the page into instances without rebuilding them, run `node scripts/figma-kit/gen-calls.mjs instances <frame id>...` and pass `out/call-instances.js` to `use_figma`.

## Drift check

Do the variables still hold the code's values? Run `node scripts/figma-kit/gen-calls.mjs drift` and pass `out/call-drift.js` to `use_figma`. It reads the colours from `app/globals.css` and `components/painted.tsx`, matches each variable by its code syntax, and changes nothing. `inStep: true` means every variable matches; `drift` lists any that don't, with both values; `notInFigma` lists code colours with no variable (the hover states are left out on purpose). Run it with each refresh, and whenever a colour changes in the code.

## Files

- `export-stage.mjs`: the stage as a scene, meaning its SVGs (styles resolved, rotation measured) and its text runs.
- `export-screen.mjs`: a whole phone screen. It adds boxes (fill, corners, inset ring, top rule), each tied to its container.
- `svgs.mjs`: writes the scenes' SVG layers to `out/svg`. `--parts` adds the 2026-10-18 Parts pieces.
- `upload.mjs`: posts the waiting SVGs to the upload URLs.
- `gen-calls.mjs`: writes the `use_figma` scripts into `out/` from the templates and `ledger.json`.
- `stage.tpl.js`, `screen.tpl.js`: the builds. `parts-2026-10-18.tpl.js` is a one-off, guarded so a second run adds nothing.
- `drift.tpl.js`: the drift check, read-only.
- `instances.tpl.js`: appended to both builds; turns their coins and marks into instances of the Parts, reading each coin's variant (metal and mood) off its drawing.
- `ledger.json`: the file's IDs for pages, variables, text styles, component sets and the current frames.
- `out/`: generated, not committed.
