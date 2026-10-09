# Petio 0.3

Six expressive pixel companions for Windows: **Miso** (cat), **Ember** (little
devil), **Bumble** (bee), **Boo** (ghost), **Drowsy** (sleepy blue), and **Merlin**
(wizard). Removed characters migrate to Miso. Oversized saved pets are clamped
to the new 90% maximum; the default is 65%, with a 30% minimum.

## Run or update

```powershell
npm install
npm start
```

Use `npm run dist` to create the Windows installer in `release/`. Quit an older
running Petio from its tray before installing an update. No uninstall is needed.
Development installers are unsigned; saved preferences carry over.

## Interactions

Click the pet or its compact speech bubble for an evenly spaced menu around it.
The main menu contains Pet, a character-specific activity, Play, Rest & explore,
Reminders, and Settings. Play groups jump, flip, dance and play dead; Rest groups
stay, nap, explore, and next screen. Escape goes back or closes the menu.

Drag the pet to pick it up. Its body trails cursor movement on a damped spring,
with slight vertical stretch and a settling motion on release. Antennae sway and
lag, Miso's ears react, and Merlin's hat tip follows movement.

Jump and flip animations have anticipation, compressed legs, raised arms,
airborne expressions, tuck/rotation, impact, and recovery. Dance alternates feet,
hands, lean and expressions. Side views turn the torso as well as the screen.
Bumble and Boo have no legs and fly head first with their bodies trailing.

Signature activities: Miso pounces; Ember summons a trident; Bumble buzzes;
Boo vanishes; Drowsy yawns; Merlin casts a spell. Ember also occasionally summons
its trident while idle, with a 45-second minimum interval between automatic summons.

## Settings and reminders

The wardrobe shows six distinct silhouettes with live previews. Settings include
size (30–90%), walking speed, personality, roaming, screen travel, attention,
character prompts, always-on-top, and launch at login in installed builds.

Reminders support **one time** or **recurring**, using **minutes or hours only**.
Choose “In” for one time or “Every” for recurring reminders. The interval is between
1 minute and 168 hours. The list shows cadence, next occurrence, and Remove.
Petio must be running for timely delivery. On reopening, overdue recurring reminders
notify once and advance to the next future occurrence, avoiding a backlog of alerts.
Reminders use speech and Windows notifications when supported, even while the pet
is paused or hidden.

Attention visits default to every 15 minutes and can be disabled or adjusted.
The pet visits the center of the screen containing the cursor, then returns after
12 seconds if left alone. Dragging or choosing an activity cancels the return.
Automatic visits skip hidden, paused, sleeping pets and open menus.

Boo glides between monitors; Merlin enters and emerges from portals. Other companions
hop between screens. Display order is left-to-right, then top-to-bottom, wrapping
around. Negative coordinates and vertically arranged monitors are supported. On one
monitor, the pet turns around. Use the tray for pause, hide/show, settings, and quit.

## Performance and privacy

Desktop animation is capped at 30 fps and suspends while hidden or paused. The
wardrobe preview also stops on other settings tabs or when the window is hidden.
Reminders are checked once per second. Native click-through flags update only when
the hover state changes. Character previews are drawn once; reminder lists only
rebuild when their contents change.

All art is generated locally. Preferences, bond, energy, and reminder schedules
are stored in `personality.json` in Electron's user-data directory. No screen
content is captured by the app and no online services, API keys, or accounts are
needed. Cursor coordinates are used for dragging and monitor selection.

## Validation and code

```powershell
npm test
npm run smoke
```

Tests cover migration, settings limits, recurrence/catch-up, display routing,
physics settling, animation phases, and Ember's automatic activity. Native checks
exercise character selection, menu groups, signature actions, drag response,
bubble placement, hidden/paused rendering, recurring reminder forms and storage,
attention, connected-monitor travel, and safe window teardown.

Smoke tests use isolated data and screenshots under `.smoke/` and briefly open
windows. This does not alter the installed pet's memory.

- `src/main.cjs`: native windows, tray, scheduling, movement, storage, and IPC.
- `src/brain.cjs`: validation, recurrence, activity selection, monitor routing.
- `src/art.js`: character geometry and drawing.
- `src/poses.js`: anticipation, airborne, landing, and dance poses.
- `src/physics.js`: damped drag spring.
- `src/renderer.js`: drawing loop, bubble anchoring, and action menu.
- `src/settings.*`: wardrobe, habits, and reminder UI.
- `src/preload.cjs`: limited native API bridge.

Window-border perching and AI conversation are not implemented.

## 0.3 movement fixes and resource check

Coordinates are validated and negative zero is normalized before native movement.
Ghost screen wrap exits one edge and enters the destination edge rather than
sliding across all intervening monitors. Roaming preserves each monitor's height
and direction until an edge is reached. Drag lean trails movement; a larger hit
area, pointer-cancel handling, and click-through reset improve click recovery.

Hidden native polling drops to once per second; idle canvas animation runs at
15 fps, active animation at 30 fps. One-pixel fractional-DPI window rounding is
tolerated to avoid resizing and invalidating compositor surfaces on every move.

A short native measurement on this computer with GPU acceleration enabled averaged
approximately 0.8% CPU idle, 0.04% hidden, and 1.6% roaming across the app processes.
Their summed working sets were about 350 MB (shared pages may be counted more than
once). These are observed samples, not limits or a long-duration leak test.
No tile-memory warning appeared during that run. Raw results: `.smoke/performance.json`.
Use `node_modules\.bin\electron.cmd tools/performance.cjs` to repeat it.

## 0.4 personality and interaction update

Menus preserve the pet's desktop position at screen edges and appear in a compact
side panel with a staggered animation. Each companion has a quiet synthesized
sound motif; sound and volume are configurable. Audio suspends after each cue.
The six companions have distinct action labels and 336 dialogue variations.
Drowsy shuffles at 38% of the configured walking speed, with sliding feet,
a drooping head, sleepy side-profile eyes, and restrained antenna motion.

Boo maintains travel speed across adjacent aligned displays and fades through
nonadjacent wraparound edges. Merlin opens two temporary portal windows on the
source and destination displays; both close when travel ends or is cancelled.

Recurring reminders support every N minutes or hours (including every one minute
or hour). Native scheduler checks in tools/reminders.cjs advance the clock to
verify repeated delivery, persistence, missed occurrences and deletion.
These checks do not wait an actual hour. Native smoke checks cover edge positions,
menu bounds, audio suspension/muting, actions and dual-monitor portal cleanup.
Multi-monitor checks require at least two connected displays.

## Online friend visits

For Vercel + Neon hosting, use the `backend` project and follow [DEPLOYMENT.md](DEPLOYMENT.md). The desktop app supports a configurable HTTPS server in Friends & visits. Local testing remains available via [MULTIPLAYER.md](MULTIPLAYER.md).
