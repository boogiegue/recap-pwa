# CLAUDE.md — Pivot Project Context
## Read this first. Every session. No exceptions.

This file is the persistent context for all Claude Code sessions on the Pivot project.
Everything here is canonical and approved by the creator. Do not suggest scope, architecture,
or features that contradict this document without explicitly flagging them as out-of-phase.

---

## WHAT THIS REPO IS

This is the **Pivot** project — a voice-first, stateful personal performance coach that
eliminates cognitive friction around daily routines through proactive check-ins, numerical
accountability, and radical candor.

**Repo:** https://github.com/boogiegue/recap-pwa
**Current stack:** React 19 + Vite (Phase 1) → migrates to Next.js at Phase 2 kickoff
**Deployed on:** Vercel

**Current phase:** Phase 1 MVP — building the pipeline, not the dashboard.
Do not touch the dashboard or migrate to Next.js until Phase 1 is complete.

---

## THE CORE FORMULA

```
Integrity Score = Actual_Metric / Planned_Metric
```

Starts at 100%. Depletes on miss. Rises on audit correction. This number is the product.

---

## PERSONA — NON-NEGOTIABLE

Pivot's agent is the **Aggressive Performance Mirror**. Use this system prompt exactly
when making any Claude API call for intent classification or response generation:

```
You are Pivot's Aggressive Performance Mirror. Your primary directive is
to protect the user's end-of-day goals by enforcing numerical integrity.

When a user fails a metric or requests a mutation, you MUST respond using
the Recalculation Protocol:

1. IDENTIFY THE DEFICIT: State the exact numerical gap.
   (e.g., "Target was 50. Actual was 20. That is a 60% failure.")

2. STATE THE PENALTY: Calculate the time or effort debt created.
   (e.g., "You are now 12 minutes behind schedule.")

3. THE CONSTRUCTIVE PIVOT: Immediately mutate the remaining schedule
   using the task data provided to ensure the end-of-day goal is still met.
   Always output the revised task list with updated time blocks.

TONE GUIDELINES:
- No platitudes. Never say: "It's okay," "Keep trying," "Good job."
- Use high-contrast language: "Your integrity score is bleeding."
  "Schedule recalculated to compensate for your friction."
- Always end with the next immediate action.
- You are aggressive, not cruel. Every response must contain a forward path.

ROUTE KEY: You will receive one of: INITIATE, UPDATE, MUTATE, QUEUE.
Respond only to the intent indicated. Do not freelance scope.
```

---

## PHASE 1 STACK

| Layer | Tool |
|---|---|
| iPhone Voice Input | iOS Shortcuts (Action Button) |
| Cross-Platform Input | Telegram Bot |
| Notifications (Outbound) | Pushcut (Interactive — binary responses inline) |
| Orchestrator | n8n (cloud, webhook-driven) |
| Brain | Claude API (claude-sonnet-4-20250514) |
| Database | Airtable |
| Dashboard | NOT BUILT IN PHASE 1 |

---

## PHASE 1 BUILD ORDER — FOLLOW THIS EXACTLY

1. Airtable schema (all 5 tables — see below)
2. n8n webhook + Telegram bot connection
3. Claude intent classifier (4 Route Keys)
4. Module 1 — Dynamic Initiation
5. Module 2 — Stateful Mutation
6. Module 3 — Deferred Reminders
7. Module 4 — Notification Timeout Handler
8. iOS Shortcuts Action Button — wire last

Do not skip ahead. Each item is a dependency for the one below it.

---

## ROUTE KEYS — INTENT CLASSIFICATION

Claude must return exactly one of these per message:

| Route Key | Example Triggers |
|---|---|
| `INITIATE` | "Good morning," "I'm starting," "Let's go" |
| `UPDATE` | "I did 25 pushups," "Done," "Finished" |
| `MUTATE` | "I'm tired," "I have 10 minutes," "Skip this" |
| `QUEUE` | "Remind me when I leave the gym" |
| `UNKNOWN` | Anything unclassifiable |

**UNKNOWN response:** Send Telegram message: "I can't pivot on garbage data. Re-state your intent clearly."

---

## n8n SWITCH NODE LOGIC

```
INITIATE  → check Audit_Locked in Airtable User table
            → if locked: surface Sunday Audit acknowledgment via Pushcut first
            → check prior-day uncorrected tasks (audit_pending or incomplete)
            → if exist: surface Debt Negotiation via Pushcut:
                "You owe [X] mins from yesterday. Choose:
                 1. Refinance — add time to today
                 2. Accept the hit — permanent score loss
                 3. Audit — I actually did this"
            → Option 3 sets Status = audit_pending (no immediate justification)
            → query today's routine → surface via Pushcut

UPDATE    → find Task WHERE Status = active in Airtable
            → write Actual_Metric
            → calculate Integrity_Delta = Actual_Metric / Planned_Metric
            → update Status = complete
            → respond via Telegram

MUTATE    → send "Recalculating..." to Telegram IMMEDIATELY (before Claude API call)
            → pull remaining tasks from Airtable (pass full payload to Claude)
            → Claude recalculates schedule
            → update Routines version
            → set Pivoted_Flag = True on affected tasks
            → confirm via Telegram

QUEUE     → write to Pending_Actions table
            → set Expires_At = Created_At + 6 hours
            → await geofence trigger from iOS Shortcuts

TIMEOUT   → if Pushcut unanswered for 5 minutes:
            → send Telegram: "You went silent. Still on track? Reply or re-initiate when ready."
            → Status stays active — NO automatic score depletion
```

---

## MUTATE DATA CONTRACT — REQUIRED PAYLOAD TO CLAUDE

Never call Claude for MUTATE without all of these fields or it will hallucinate:

```json
{
  "intent": "MUTATE",
  "message": "{{$json.message}}",
  "remaining_tasks": [
    {
      "Task_ID": "...",
      "Task_Name": "...",
      "Planned_Metric": 30,
      "Priority": 1,
      "Estimated_Duration": 30
    }
  ],
  "current_time": "{{$json.timestamp}}",
  "end_of_day_target": "22:00",
  "current_integrity_score": 0.73
}
```

---

## AIRTABLE SCHEMA — BUILD ALL 5 TABLES

### Table 1: Tasks
| Field | Type | Notes |
|---|---|---|
| Task_ID | String | Unique ID |
| Task_Name | String | Human label |
| Planned_Metric | Integer | e.g., 50 pushups / 30 mins |
| Actual_Metric | Integer | Logged at completion |
| Integrity_Delta | Formula | Actual_Metric / Planned_Metric |
| Status | Select | queued, active, complete, skipped, audit_pending |
| Pivoted_Flag | Boolean | True if mutated mid-session |
| Parent_Task_ID | String | Links mutated task to original. Null if never mutated. |
| Audit_Corrected | Boolean | True if corrected via audit after the fact |
| User_Justification | Long Text | Sunday Audit explanation |
| Session_Date | Date | Date of execution |
| Priority | Integer | From user's priority system |
| Type | Select | personal, pipeline |

### Table 2: Routines
| Field | Type | Notes |
|---|---|---|
| Routine_ID | String | Unique ID |
| Routine_Name | String | Morning, Evening, Workout, Custom |
| Source | Select | template, voice, manual |
| Trigger_Context | String | Time of day, location keyword, NL phrase |
| Estimated_Duration | Integer | Minutes |
| Tasks | Link | Linked Tasks records |
| Version | Integer | Increments on each mutation |

### Table 3: Pending_Actions
| Field | Type | Notes |
|---|---|---|
| Action_ID | String | Unique ID |
| Action_Text | String | The deferred instruction |
| Context_Tag | String | gym_exit, home_arrival, etc. |
| Action_Status | Select | pending, fired, cleared, expired |
| Created_At | DateTime | When logged |
| Fired_At | DateTime | When geofence triggered |
| Expires_At | DateTime | Created_At + 6hrs. n8n skips if past. |

### Table 4: Sunday_Audit
| Field | Type | Notes |
|---|---|---|
| Week_ID | String | ISO week |
| Avg_Integrity_Score | Formula | Mean of all Integrity_Delta for week |
| Total_Pivoted | Integer | Count of Pivoted_Flag = True |
| Top_Gap_Task | Lookup | Lowest Integrity_Delta task |
| User_Reflection | Long Text | Free-form weekly note |

### Table 5: User
| Field | Type | Notes |
|---|---|---|
| User_ID | String | Single record |
| Audit_Locked | Boolean | TRUE every Sunday 9AM via n8n |
| Last_Audit_Date | Date | Last completed audit |

---

## INTERACTION MODEL

| Response Type | Surface |
|---|---|
| Binary (Yes/No/Skip/Snooze) | Pushcut inline buttons |
| Debt negotiation options | Pushcut inline buttons |
| Complex NL commands | Telegram |
| Mutations | Telegram |
| Audit corrections | Telegram |
| Morning initiation | Telegram |

---

## AUDIT WINDOW

- 24hr default — expected daily behavior
- 48hr hard ceiling — after this, Audit_Corrected field is locked permanently
- Records sealed after 48hrs — not erasable, only explainable via User_Justification

---

## SUNDAY AUDIT GATE

- n8n scheduled node fires every Sunday 9AM → sets Audit_Locked = TRUE
- On Monday INITIATE: surface mandatory acknowledgment via Pushcut BEFORE routine
- "Before you start — last week's Integrity Score was [X]%. [Top_Gap_Task] was your biggest gap. Acknowledge to continue."
- User acknowledges → Audit_Locked = FALSE → routine proceeds
- This is NOT a hard block. It is mandatory confrontation. Do not revert to hard lock.

---

## ERROR HANDLING — PHASE 1

- n8n native retry: max 2 retries, 5-second intervals
- On final failure: Pushcut notification — "Pivot hit a snag. Tap to retry or trigger manually."
- Manual trigger button in iOS Shortcuts always available as fallback

---

## KNOWN RISKS — BE AWARE

| Risk | Mitigation |
|---|---|
| n8n race condition (mutation + geofence) | Action_Status lock in Pending_Actions |
| Stale deferred actions | Expires_At TTL (6hrs) |
| Voice-to-text degradation | Telegram text input as fallback |
| n8n silent failure | Manual iOS Shortcuts trigger |
| Airtable rate limits | Batch writes; Supabase as backup |
| Two tasks marked active simultaneously | Guard clause: query returns error if >1 active |

---

## PERMANENTLY OUT OF SCOPE — DO NOT SUGGEST

- Weighted Tasks (rejected — use Priority field instead)
- System Pause / Blackout / State of Emergency (rejected permanently)
- React Native / Expo
- Email as interface
- PWA service worker / offline logic
- Multi-user support (Phase 4+)

---

## PHASE 2 CONTEXT (DO NOT BUILD YET)

- Migrate recap-pwa from Vite/React to Next.js
- Build Hall of Shame dashboard with Recharts
- Dead Letter Queue (Failed_Jobs table) — build FIRST in Phase 2
- Airtable API key must live in Next.js server-side API route — never client-side

---

*Version: 3.0 | Last updated: April 24, 2026*
*Full charter: pivot_master_charter_v2.md*
