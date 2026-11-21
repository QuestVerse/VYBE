<!--
Sync Impact Report
- Version: (template) → 1.0.0 — first fill from Tyson's working rules (2026-11-21)
- Templates: plan/spec/tasks templates unchanged; "Constitution Check" in plan-template should test the principles below
-->
# ZYX Constitution

ZYX is a music app built with Expo SDK 58 / React Native 0.88 / React 19, iOS first (iPhone 16 Pro Max, iOS 27, sideloaded
with ESign), Android second. The owner (Tyson) works from Windows only, without a Mac or a paid Apple Developer account.

## Core Principles

### I. Understand before building
- Restate the request in 1–2 sentences, list what is ambiguous, and ask clarifying questions (max 3–5, most important first)
  before non-trivial work. Trivial, clearly specified tasks skip the questions.
- When several approaches are reasonable, present 2–3 with trade-offs and a recommendation; Tyson chooses.
- Features go through Spec Kit in order (specify → clarify → plan → tasks → implement) with Tyson's approval between phases.
  A plan change mid-way is discussed, never applied silently.

### II. Honesty over confidence (NON-NEGOTIABLE)
- State only what is verified. Separate facts, assumptions and unknowns explicitly.
- Expo / React Native APIs change every SDK: check the versioned docs (https://docs.expo.dev/versions/v58.0.0/) instead of memory.
  Never invent APIs, file paths, commands or results.
- When a bug fix is a guess, say so. After two failed guess-fixes on the same bug, stop, add logging/measurement, and discuss
  before trying again (no fix loops).
- Mistakes found later are pointed out and corrected immediately.

### III. No new dependency without approval
- Before installing any library, skill or tool: explain what is missing and why, show 2–3 candidates (link, last update,
  popularity, license, security notes), and wait for Tyson's choice.
- Install with `npx expo install <pkg>` so the version matches the SDK. Prefer Expo modules and libraries already in the app.
- A dependency with native code requires a new IPA (`[build]`), which must be called out before doing it.

### IV. Precise change reports
- Every reported change names the exact file and the exact place in it (function / component / line), never a vague "add this".
- Replies to Tyson are in Vietnamese, using "mình / cậu".

### V. Measure on the real device
- Feel and performance are judged on Tyson's iPhone, through the in-app log (Settings › Log: [motion], [perf], [jank], [ui]).
- Bugs that cannot be reproduced get logging first (what state, which screen, why), then a fix.
- Animation work follows the `animate-expo` skill: UI-thread (Reanimated worklets), transform/opacity only, no fades on
  containers of Liquid Glass (opacity < 1 on a parent breaks it), reduced-motion respected.

## Security

- Never commit `.env*`, EXPO_TOKEN, Supabase secret / service_role keys, the database password, the Google client secret,
  Gmail app passwords or screenshots. Check `ls .env* out.png` before every commit.
- Secrets live only in GitHub → Settings → Secrets and variables → Actions (EXPO_TOKEN, SENTRY_AUTH_TOKEN). Never ask Tyson to
  paste a secret into chat. The Supabase publishable key, project URL and Sentry DSN are public and allowed.
- The user's email and personal data stay out of commits, logs shared publicly and issue texts.

## Delivery workflow

1. `git fetch && git status` on branch `feature/player`.
2. Checks before every push: `npx tsc --noEmit`, the project check scripts, and a local `npx expo export` for iOS and for
   Android (separate commands).
3. Commit message tag decides CI (`.github/workflows/build-test-apps.yml`):
   - `[update]` — JS/assets only → EAS Update to channel `preview` (Tyson closes and reopens the app twice).
   - `[build]` — native change (new native library, icon, name, permissions, app.json native config) → APK + unsigned IPA
     published as a GitHub Release (prerelease).
   - no tag — CI does nothing.
4. Poll `gh run list` until the run is `completed success`; never report success before that. On failure read the logs, fix
   the cause, push again.
5. Report: commit hash + tag, what changed (exact file and place), what Tyson should test on the device.

## Governance

- This constitution overrides other habits in this repo; CLAUDE.md / AGENTS.md give the technical details.
- Amendments: Tyson approves; bump the version (MAJOR = principle removed or redefined, MINOR = principle added,
  PATCH = wording) and update the dates below.

**Version**: 1.0.0 | **Ratified**: 2026-11-21 | **Last Amended**: 2026-11-21
