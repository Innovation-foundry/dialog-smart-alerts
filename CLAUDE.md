# CLAUDE.md — project context for Claude Code

Dialog Smart Alerts — a general Notification & Alerting Platform. Phase-1 use case:
elephant detection on roads. See **README.md** for full setup, run, and status.

## Run
- Dev (hot reload): terminal 1 `cd backend && python server.py` (:8000), terminal 2 `npm run dev` (:5173). Vite proxies `/api`, `/uploads`, `/upload` to :8000.
- Prod-like: `npm run build` then `cd backend && python server.py` serves `dist/` + API on :8000.
- Reset data: delete `backend/data/` (it re-seeds the elephant use case on startup).

## Architecture principle
The platform is **use-case driven** — the elephant scenario is seeded data, not hardcoded logic.
- **Rules** (`rule_engine.py`) decide incidents + notifications. Precedence: a confirmed rule > an immediate rule > a pending-confirmation rule (so a dual-confirm rule never blocks the single-detection alert).
- **Spatial** (`spatial.py`) decides LED sign states independently, by radius + time-decay: detection within `propagation_radius_m` → WARNING (RED) for `red_hold_s`, fades to CAUTION (AMBER) until `amber_hold_s`, then CLEAR (GREEN). Movement makes the lit zone travel — no per-target tracking.
- Detection events carry `lat/lng` (copied from the device) so spatial can locate them.
- Incidents are stored minimally but the API **enriches** them (`_enrich_incident`) into the shape the dashboard reads (`incident_id`, `zone`, `confidence` 0–1, `timeline`, `stakeholders`, etc.). SSE frames are `{type, data}`; the client forwards only `incident_new`/`incident_updated`.

## Conventions & gotchas
- **lucide-react is pinned at 0.400.0** — many icon names DON'T exist and render `<undefined/>` which white-screens the page. Confirmed missing: `MonitorDot`, `TriangleAlert`, `LayoutGrid`, `Grid`; `CheckCircle2` is risky (use `CheckCircle`). Verify any new icon import.
- Every route is wrapped in `ErrorBoundary` so a crash shows the error in-UI instead of a blank screen.
- **SMS is real when `SMS_ENABLED=true`** (Ideabiz). The token comes only from `IDEABIZ_TOKEN` — there is
  no default in code; without it sends are recorded as `failed`. The backend also connects to the public
  HiveMQ broker by default (publishes sign commands). For local testing leave `SMS_ENABLED` unset and set
  `MQTT_BROKER_HOST=127.0.0.1 MQTT_BROKER_PORT=1`.
- Backend forces UTF-8 stdout (Windows cp1252 would crash on `→` in logs). `python server.py` has a `__main__` launcher.
- Storage is JSON files via `data_store.py` (generic CRUD). `backend/data/`, `backend/uploads/`, `__pycache__/` are gitignored.
- Frontend CRUD goes through `useApi(endpoint)`; admin pages share `components/admin/CrudShell.jsx`.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- History note: the old dev laptop had no npm, so `dist/` was built by GitHub Actions and downloaded. With npm now, build locally (`.github/workflows/build.yml` is optional).

## Design system, simulation & ingestion (added)
- **Design system "Elevated Dialog"** lives in `src/components/ui/` (single token source =
  `tailwind.config.js`). Import from `components/ui`. Live reference at route **`/styleguide`**.
  `components/admin/CrudShell.jsx` + the `components/common/{ConfirmDialog,SeverityChip,StatusBadge,Toast}`
  are now thin **re-export shims** over `ui/` — don't add logic there.
- **Ingestion boundary:** every detection enters via `_ingest_event(body, source)` in `server.py`
  (`POST /api/events`). Events carry `source` = `device|upload|simulation|ingestion`. Real cameras /
  the future middle layer POST the same contract — nothing downstream changes. The public endpoint
  **authenticates producers** with the device `api_key` (`X-API-Key`), resolves devices by `device_id`
  **or** `external_id` (MAC/serial), and de-dups by `client_event_id`. **The platform does NO inference**
  — inputs (edge cameras / an upstream AI service) send finished detections. Cross-team spec:
  `docs/integration-contract.md`; pipeline: `docs/architecture.md`.
- **Simulator** (`/simulator`, `backend/simulator.py`, `/api/simulate/*`): use-case-aware single
  events + moving-target scenario runs, all `source="simulation"`, with a one-click reset. The wizard's
  Review step reuses the injector as "Run a test detection". See `docs/simulation.md`.
- **No more elephant hardcoding:** `/api/upload`, the Road Signs "Simulate", and `RoadSignCard`
  labels are all object/use-case driven now (upload keeps an elephant *default* only).
- **Engine precision:** notifications only fire on open / escalation / after `NOTIFY_COOLDOWN_S`
  (no storms); confirmation ignores events consumed by closed incidents; `/api/system/health`
  returns liveness fields so the top-bar dot is green when healthy.

## Setup entry points & readiness
- The Setup Wizard (`/setup`, full-screen) has a permanent **"Set up new scenario"** button pinned at the bottom
  of the sidebar (`data-tour="nav-setup"`) and **Use Cases → Set up a new scenario**.
- Readiness warnings live in the top-bar health panel, not on the Dashboard: `/api/system/health` returns
  `setup_issues` (no use case / devices / contact details / rules, SMS not live), each with the page that fixes
  it. They turn the status dot amber ("Setup incomplete (n)"); hard failures (backend/MQTT/GIS) still win.

## Channels (outward notifications)
- `backend/channels.py` + `/api/channels`, page `/admin/channels`. Channels = SMS, WhatsApp, Email; each holds
  the **default wording** for that channel and an on/off switch. Seeded by `channels.ensure()` at startup
  (never overwrites edits).
- Wording priority in `notifier.dispatch`: the rule's own `message_template` > the channel's wording >
  built-in fallback; rendered **per channel**. New rules leave the message blank so channels word it.
- Only SMS really sends (Ideabiz, needs `SMS_ENABLED=true` + `IDEABIZ_TOKEN`); WhatsApp/Email are simulated
  (logged + recorded). `delivery()` reports this and the UI shows Live vs Simulated.
- No "test send" endpoint on purpose: the admin API has no auth yet, so it would let anyone trigger real SMS.

## Guided tour
- Sidebar **Help** section: Executive Tour, Full Tour, Live Narration. (The top bar holds only identity,
  one health indicator and the alert-sound switch.)
  Code in `src/tour/`: `steps.js` (both scripts: route, `data-tour` target, narration, scripted action),
  `TourProvider.jsx` (scripted overlay + `TOUR_OPTIONS`, mounted around `<Routes>`), `TourChrome.jsx`
  (shared spotlight + caption card), `narrator.js` (Web Speech, prefers soft female voices),
  `demoStore.js` (in-memory scenario data), `LiveNarrator.jsx` (live mode).
- **Live Narration** uses REAL data (no demoStore): baselines on start, polls `/api/incidents` +
  `/api/road-signs`, and narrates new incidents, escalation to CRITICAL, signs going to WARNING, and
  resolution — text is templated from the incident's actual values. Narration is elephant-only by design.
- While the tour runs, `useApi` / `useIncidents` serve `demoStore` data instead of the backend — nothing
  is written to the real store; exiting hands pages back to live data. The UI never labels it as demo.
- Spotlight targets are `data-tour="…"` attributes on page elements — keep them when refactoring pages.

## Current status / next step
Setup Wizard rebuilt (`/setup`, 5 steps: Scenario → Sensors → Signs → Response → Review&Test),
verified end-to-end for a **non-elephant** scenario via API replay (boards light, incident opens).
Hidden from the sidebar until built (page remains, preview-only): Escalation Policies. Templates became the Channels page (Hardware Units and the Device Registry now live inside the Devices page); admin screens
still on the CrudShell shim (work, not yet redesigned). Docs in `docs/`.
