# Tenent mvp v1

Build Tenet — a pre-trade discipline assistant for FX prop-firm traders. The trader writes a trade plan via chat, the app evaluates it against their personal rulebook using OpenAI's GPT-5, and returns a structured verdict (GO AHEAD / PROCEED WITH CAUTION / NO GO / PROMPT) with rule-by-rule reasoning.




This is the v1 production build — REAL OpenAI integration, NO simulated state machines. Day 1 scope is text-only (no voice, no image attach yet — those land in Day 2).




================================================================

TECH STACK

================================================================

- React + TypeScript + Tailwind (Lovable defaults)

- React Router for routing

- localStorage for persistence (rulebook only — no user identity yet)

- OpenAI Chat Completions API direct integration

- Lovable Secrets for API key storage (NOT in frontend code)




================================================================

DESIGN SYSTEM

================================================================

Light mode. Clean, editorial, premium feel — think Stripe meets Linear.




Colours:

- Background: #FAFAF8 (warm off-white)

- Surface: #FFFFFF

- Border: #ECEAE4 (subtle 1px)

- Ink primary: #1A1A1A

- Ink secondary / muted: #888888

- Accent (Tenet teal): #1D9E75

- AI bubble background: #F0FAF6 with 2px teal #1D9E75 left border

- Trader bubble background: #F1F4F8 (right-aligned)

- Verdict colours:

  - GO AHEAD: text #0E7C5A, surface #E6F4EF

  - PROCEED WITH CAUTION: text #B85E00, surface #FDF1DC

  - NO GO: text #B91C1C, surface #FBE9E9




Typography: Inter (Roboto fallback). Headings semibold, body regular. 14–16px body, 12px captions.




Layout: generous padding, 1px subtle borders, soft 8px rounded corners. No harsh shadows.




================================================================

ROUTING

================================================================

- `/` — entry point, redirects based on rulebook state

- `/welcome` — empty state when no rulebook exists

- `/rulebook/new` — single-page form to create rulebook (first time)

- `/rulebook` — single-page form to edit rulebook

- `/home` — main landing when rulebook exists (rulebook summary + Evaluate CTA)

- `/evaluate` — chat-based evaluation flow

- `/verdict` — verdict screen (passes verdict data via React Router state)

- `/history` — placeholder "Coming soon" page (just a centered message)

- `/settings` — placeholder "Coming soon" page




App-level routing guard (CRITICAL — must not create redirect loop):

```

useEffect(() => {

  const path = location.pathname;

  // NEVER redirect away from these routes — they handle their own state

  if (path === '/welcome' || path === '/rulebook/new' || path === '/rulebook') return;




  let rulebook = null;

  try {

    const raw = localStorage.getItem('tenet_rulebook');

    if (raw) rulebook = JSON.parse(raw);

  } catch (e) {

    rulebook = null;

  }




  const isComplete = rulebook

    && typeof rulebook.strategy_name === 'string'

    && rulebook.strategy_name.trim().length > 0

    && Array.isArray(rulebook.qualifying_criteria) && rulebook.qualifying_criteria.length > 0

    && Array.isArray(rulebook.entry_rules) && rulebook.entry_rules.length > 0

    && Array.isArray(rulebook.exit_rules) && rulebook.exit_rules.length > 0

    && Array.isArray(rulebook.risk_management) && rulebook.risk_management.length > 0;




  if (!isComplete && path !== '/welcome' && path !== '/rulebook/new') {

    navigate('/welcome', { replace: true });

  }

}, [location.pathname]);

```




================================================================

GLOBAL SHELL (visible on /home, /history, /settings, /rulebook)

================================================================

Left sidebar (200px wide, white surface, border-right #ECEAE4):

- Top: "T Tenet" logo (teal dot + name, 16px / 600)

- Nav items (14px, with icon + label):

  - Home (house icon)

  - Trade history (clock-arrow icon) — leads to /history placeholder

  - Settings (gear icon) — leads to /settings placeholder

- Active nav item: background #F5F5F0, ink primary, subtle left teal accent border




Top right: "AC" avatar circle (40px, light gray fill, AC initials) with chevron dropdown (just visual, no menu for v1)




Hidden on: /evaluate, /verdict (focused experience — no sidebar). Show "← Back to Home" link on top-left and "Save as draft ▸" on top-right of those screens instead.




================================================================

SCREEN 1: /welcome (empty state when no rulebook)

================================================================

Centered content, max 720px wide. Generous vertical space.




- Small uppercase muted caption: "WELCOME TO TENET"

- H1: "Let's start with your rules."

- Subtext (3 lines, 16px ink-secondary):

  "Before you can check a trade against your discipline, we need to capture

  the rules you trade by. Set them up once — you can edit anytime."

- Single CTA card (centered, ~440px wide):

  - Card with 1px border, 24px padding, hover shadow

  - Icon: speech bubble (lucide icon) in teal

  - Title (16px / 600): "Set up my rulebook"

  - Description (13px muted): "Capture your strategy and the rules you trade by. About 5 minutes."

- Card is clickable — navigates to /rulebook/new

- Small footer note (12px muted italic): "Either way, you're in control. Edit anything anytime."




================================================================

SCREEN 2: /rulebook/new AND /rulebook (single-page form)

================================================================

Same component, two route entries. Use a `mode` prop or location-based check: "new" vs "edit".




Layout — full sidebar visible. Main content max 880px wide, generous padding.




Breadcrumb (top, 13px muted):

- new: "Rulebook › New rulebook"

- edit: "Rulebook › Edit"




Page header:

- H1: "Set up your rulebook" (new) or "Edit your rulebook" (edit)

- Subtext (14px muted italic): "Capture your strategy and the rules you trade by. Required sections are marked with *."




Form sections (single page, all sections visible — NOT a wizard, NOT conversational):




Each section card: white surface, 1px border #ECEAE4, 8px radius, 20px padding, stacked vertically with 20px gap between cards.




Inside each section:

- Section heading: uppercase tracked-out 12px / 600 teal #1D9E75 (e.g., "STRATEGY NAME", "QUALIFYING CRITERIA")

- Required indicator (if required): subtle gray "* required" pill on the right of the heading

- Helper text below heading (12px muted): describes the section




Section 1 — STRATEGY NAME * (single text input)

- Helper: "Give your strategy a name you'll recognise."

- Input: single-line, full-width within card, 14px, placeholder "e.g., London H1 Breakout"

- Max length 80 chars

- Stores as `strategy_name: string`




Section 2 — QUALIFYING CRITERIA * (list editor)

- Helper: "Conditions the market must meet before you consider a trade."

- Existing rules render as rows:

  - Row layout: bullet (•) + rule text (14px ink) + delete icon (✕, color #888 → red on hover) on the right, 8px gap

  - Rows separated by 8px vertical gap

- Below the list, the add control:

  - Single-line text input, full-width, placeholder e.g., "Price above 200 EMA on H4"

  - "+ Add a criterion" button right of input (or press Enter inside the input)

- Stores as `qualifying_criteria: string[]`




Section 3 — ENTRY RULES * (same pattern)

- Helper: "How and when you actually enter a position."

- Placeholder e.g., "H1 close above prior session high"

- "+ Add an entry rule"

- Stores as `entry_rules: string[]`




Section 4 — EXIT RULES * (same pattern)

- Helper: "Stops, targets, and invalidation conditions."

- Placeholder e.g., "Stop below entry candle low"

- "+ Add an exit rule"

- Stores as `exit_rules: string[]`




Section 5 — RISK / SAFETY * (same pattern)

- Helper: "Risk per trade, per day, per week."

- Placeholder e.g., "1% per trade"

- "+ Add a risk rule"

- Stores as `risk_management: string[]`




Section 6 — SOFT META-RULES (optional, same pattern)

- NO required indicator

- Helper: "Situations where you skip trading even if the setup looks good (news, holidays, fatigue, etc.)."

- Placeholder e.g., "No trades during NFP"

- "+ Add a soft rule"

- Stores as `soft_meta_rules: string[]`




Sticky footer bar (border-top #ECEAE4, white background, 20px padding, full width):

- For /rulebook/new:

  - Left: "Cancel" link (color muted, 14px). If no rulebook saved yet, this is disabled with tooltip "Complete your rulebook to continue."

  - Right: "Save & activate" button (primary teal filled #1D9E75, white text 14px / 500, 8px radius, 12px vertical / 24px horizontal padding)

- For /rulebook (edit):

  - Left: "Discard changes" ghost button (1px border, muted text)

  - Right: "Save changes" button (primary teal filled, same dimensions)




VALIDATION on save:

1. strategy_name non-empty (trimmed)

2. qualifying_criteria, entry_rules, exit_rules, risk_management each have ≥ 1 entry (trimmed)

3. soft_meta_rules can be empty []




If validation fails:

- Highlight failed section cards with 1px red #DC2626 border

- Show toast at bottom (red, 4s auto-dismiss): "Please complete all required sections"

- Stay on the form




If validation passes:

- Trim all string entries (drop empty ones)

- Write JSON to localStorage key `tenet_rulebook`

- For /rulebook/new: success toast "Rulebook activated", navigate to /home after 1.2s

- For /rulebook: success toast "Rulebook saved", stay on /rulebook




================================================================

SCREEN 3: /home (rulebook summary + Evaluate CTA)

================================================================

Sidebar visible (Home active).




Header section (max 1080px wide):

- H1: "Home"

- Below H1, muted line: "Your active rulebook · {strategy_name} · {total_rules} rules · activated {date}"

  - total_rules = sum of all sections' lengths

  - date is when rulebook was created/last edited (store activated_at in localStorage on save)




Divider (1px #ECEAE4, full-width margin-top 24px).




YOUR RULEBOOK section:

- Caption above (12px uppercase muted, 8px above grid): "YOUR RULEBOOK"

- 2-column grid of cards, 16px gap. On narrow screens, collapse to 1 column.




Cards (one per section):

1. STRATEGY NAME card

2. QUALIFYING CRITERIA card

3. ENTRY RULES card

4. EXIT RULES card

5. RISK / SAFETY card

6. SOFT META-RULES card




Each card:

- White surface, 1px border #ECEAE4, 8px radius, 20px padding

- Top row: section heading uppercase tracked-out 12px / 600 teal #1D9E75 on the left, "Edit ▸" link (12px muted, hover teal) on the right

- Below the heading, the section content:

  - For STRATEGY NAME: the strategy name in 14px ink

  - For all rule sections: a vertical list of rules, each with bullet • prefix

- If a section has 0 rules (soft only), show muted italic "None set" instead of empty list




"Edit ▸" link behavior:

- Navigates to /rulebook

- Optionally focus the corresponding section (anchor scroll) — nice-to-have




Below the cards section, a horizontal divider (1px #ECEAE4, 32px vertical margin).




EVALUATE CTA (centered):

- Primary teal button (#1D9E75 fill, white text 16px / 500, 12px vertical / 28px horizontal padding, 8px radius)

- Label: "Evaluate my idea →"

- Below the button (12px gap), centered muted italic line: "Speak your trade plan — entry, exit, size, why. I'll check it against your own rules in seconds."

- Click navigates to /evaluate




(NO demo scenarios section in v1 — remove entirely)




================================================================

SCREEN 4: /evaluate (chat-based evaluation, text only)

================================================================

Sidebar HIDDEN. Top header bar instead:

- Height 48px, white background, border-bottom 1px #ECEAE4

- Left: "← Back to Home" link (14px muted, color #888) — confirm modal if conversation has any trader messages

- Center: "T" logo dot + "Evaluating your idea" (14px muted)

- Right: "Save as draft ▸" link (14px muted, placeholder — no real save in v1)




Two-column layout below header:

- LEFT 60% (max 720px): Chat

- RIGHT 40% (max 440px): Live trade plan + Run CTA




LEFT COLUMN — Chat:

- Scrollable conversation area, 24px padding all sides

- Auto-scroll to bottom on new messages

- AI bubble pattern: soft teal background #F0FAF6, 2px teal #1D9E75 left border, max-width 70%, 12px padding, 8px radius. Caption above bubble: "Tenet" with small teal dot (•) prefix, 11px muted, 6px gap.

- Trader bubble pattern: light gray #F1F4F8 background, right-aligned, max-width 70%, 12px padding, 8px radius. Caption above bubble: "You", 11px muted, right-aligned, 6px gap.

- Typing indicator: three animated dots in an AI bubble for ~1s before each AI response renders

- Conversation starts with one AI bubble: "What's the trade?" (no typing indicator on first message)




Input bar (sticky bottom of left column, 96px tall):

- White surface, border-top 1px #ECEAE4

- Layout (left to right, 12px gap):

  - (placeholder space for future paperclip — 32px width empty for now)

  - Text input field (flex-grow, multi-line textarea, auto-expanding up to 4 rows, 14px placeholder "Type your trade plan here..." with border 1px #ECEAE4, 12px padding, 8px radius)

  - (placeholder space for future mic — 36px width empty for now)

  - Send button: 36px teal filled circle (#1D9E75) with white ↑ arrow icon. Disabled (light gray) when input is empty.




Keyboard:

- Cmd/Ctrl + Enter or click Send → submits

- Enter alone → new line in input




RIGHT COLUMN — Live trade plan + Run CTA:

- Sticky to right edge

- White surface, border 1px #ECEAE4, 8px radius




Header (48px, border-bottom #ECEAE4, 16px padding):

- Title (13px / 500): "Your trade plan"

- Subtitle (11px muted italic): "Filling as we talk."




Body (scrollable, 20px padding, max-height = viewport - header - footer):

- For each field in `extracted_plan` (from latest AI response), render a row if value is non-null:

  - Field label (uppercase 11px muted tracked-out, e.g., "PAIR", "DIRECTION", "ENTRY", "STOP", "TARGET", "SIZE / RISK", "R:R", "REASONING", "CONTEXT")

  - Adjacent to the label: a small pill (10px text, light gray background, 4px padding, rounded) saying either "FROM YOUR INPUT" or "COMPUTED"

    - All extracted fields are "FROM YOUR INPUT" except R:R which is "COMPUTED" (when entry, stop, target are all provided)

  - Below the label/pill: the value in 14px ink

  - Vertical spacing between rows: 14px

- If extracted_plan is null/empty: show centered muted italic line "Your trade plan will appear here as you tell me."




Footer (border-top #ECEAE4, 20px padding, white):

- "Run my evaluation" CTA button

- Two visual states based on the LATEST AI response's verdict_word:

  - State A (verdict_word === "PROMPT"): ghost outlined button (1px border #ECEAE4, label "Run evaluation" in muted 14px / 500), with hint below in 12px italic muted: "Tenet has open questions — answer above for the most useful verdict."

  - State B (verdict_word is GO AHEAD / PROCEED WITH CAUTION / NO GO): primary teal filled (#1D9E75, white text "Run my evaluation →" 14px / 500), with hint below in 12px italic teal: "Ready when you are."

- Button is clickable in both states. Clicking → navigates to /verdict, passing the latest AI response data (full JSON) via React Router location state.




================================================================

SCREEN 5: /verdict (verdict result, full-page)

================================================================

Sidebar HIDDEN. Header bar instead:

- Left: "← Back to conversation" link (14px muted) — returns to /evaluate without resetting state

- Center: "T" logo + "Trade check verdict" (14px muted)

- (No right-side actions for v1)




Reads verdict data from location.state (the JSON from the last API response).




Main content (centered, max 900px):




Verdict banner (40px below header):

- Large colored block, 24px padding, 8px radius, full content width

- For GO AHEAD: surface #E6F4EF, 2px left border #0E7C5A (or 4px solid teal-darker)

- For PROCEED WITH CAUTION: surface #FDF1DC, 2px left border #B85E00

- For NO GO: surface #FBE9E9, 2px left border #B91C1C

- Inside the banner:

  - Verdict word in massive caps, 56px / 700, color matched to verdict text colour (#0E7C5A, #B85E00, #B91C1C)

  - Below the verdict word, 16px italic in the same colour: the `summary` field from the JSON




Plan summary chip row (below the banner, 20px margin-top):

- Inline chip pills (each: light gray background, 6px padding, 4px radius, 12px text), separated by 8px:

  - {pair}, {direction}, "{entry} → {target}", "{size_or_risk}", "R:R {rr_ratio}"

  - Skip any chip whose value is null




RULES CHECKED · {count} caption (uppercase tracked-out 11px muted, 32px margin-top, 16px margin-bottom)




Rules list:

- One row per rule from the `rules` array

- Row layout:

  - Left: status icon, 16px:

    - "Passed" → green ✓ (#0E7C5A)

    - "Failed" → red ✗ (#B91C1C)

    - "Cannot evaluate" → amber ◐ (#B85E00) — half-filled circle

  - Middle (flex-grow): rule label (14px / 600 ink) on top, explanation (13px muted, color shifts to verdict colour if status is Failed) below

  - 16px vertical padding per row

  - 1px border-bottom #ECEAE4 (except last row)

- Below the last row, if `closing_note` is present, render it in a slight indent (16px left), italic 14px ink-secondary, with 16px margin-top




Action footer (border-top #ECEAE4, 24px margin-top, 20px padding, NOT sticky — just at bottom of content):

- Left: "Edit trade plan" ghost outlined button (1px border #ECEAE4, muted text)

  - Clicking returns to /evaluate, conversation intact

- Right: Action button styled in verdict colour:

  - GO AHEAD: teal filled "Acknowledge & proceed"

  - PROCEED WITH CAUTION: amber filled #B85E00 with white text "Proceed with caution"

  - NO GO: red filled #B91C1C with white text "Override declaration ▸" — clicking opens a modal:

    - Modal title: "Override the verdict?"

    - Body: "Type ACCEPT VIOLATION below to confirm you're knowingly breaking your own rules."

    - Input field: placeholder "Type ACCEPT VIOLATION", 14px

    - Buttons: "Cancel" (ghost), "Override" (red filled, disabled until input exactly matches "ACCEPT VIOLATION")

    - On Override: close modal, show toast "Override recorded. Trade not endorsed by Tenet." Then no further navigation (history would be next).




If verdict_word is "PROMPT": this screen should not normally be reached (Run CTA in State A is ghost-outlined). But if it is reached, render a fallback message: "Tenet still has open questions — return to the conversation to provide more detail."




================================================================

SCREEN 6: /history and /settings (placeholders)

================================================================

Sidebar visible. Main content centered: just a heading "Coming soon" in 24px / 600, muted subtext "Trade history (or Settings) will be available in a future update." No further functionality.




================================================================

OPENAI INTEGRATION

================================================================

API: OpenAI Chat Completions

- Endpoint: https://api.openai.com/v1/chat/completions

- Model: "gpt-5"

- Headers:

  - Authorization: Bearer {process.env.OPENAI_API_KEY or Lovable secret named OPENAI_API_KEY}

  - Content-Type: application/json

- Request body MUST include:

  - "model": "gpt-5"

  - "messages": [system, user]

  - "response_format": { "type": "json_object" }

  - "max_completion_tokens": 6000

- CRITICAL: Do NOT include "temperature" (gpt-5 family rejects custom temperature)

- CRITICAL: Use "max_completion_tokens", NOT "max_tokens" (deprecated for gpt-5)




API key handling: API key MUST be stored in Lovable Secrets / Edge Function env, NOT in frontend code. If Lovable's preferred pattern is a Supabase Edge Function that proxies the OpenAI call, use that. The frontend should call the Edge Function with the conversation state; the Edge Function adds the Authorization header.




Message structure on each turn:

- "system" message: a constant SYSTEM_PROMPT (see below — embed as a string constant)

- "user" message: structured as:

  ```

<RULEBOOK>

  {JSON.stringify(rulebook, null, 2)}

</RULEBOOK>




<CONVERSATION_HISTORY>

  Trader: "{trader message 1}"

  Tenet: "{AI response 1's summary or follow_up_question}"

  Trader: "{trader message 2}"

  ...

</CONVERSATION_HISTORY>




<LATEST_INPUT>

  {trader's most recent message}

</LATEST_INPUT>

  ```




Response handling:

- Parse choices[0].message.content as JSON

- Expected shape:

  ```

  {

    "verdict_word": "GO AHEAD" | "PROCEED WITH CAUTION" | "NO GO" | "PROMPT",

    "summary": string,

    "rules": [ { "status": "Passed" | "Failed" | "Cannot evaluate", "label": string, "explanation": string } ],

    "closing_note": string,

    "follow_up_question": string (only if verdict_word is PROMPT),

    "extracted_plan": {

      "pair": string | null,

      "direction": "LONG" | "SHORT" | null,

      "entry": string | null,

      "stop": string | null,

      "target": string | null,

      "size_or_risk": string | null,

      "rr_ratio": string | null,

      "reasoning": string | null,

      "context": string | null

    }

  }

  ```

- If JSON.parse fails: try stripping markdown code fences (```json ... ```) first. If still fails, show error toast "Tenet's response couldn't be read. Try again."

- If API returns HTTP error: show error toast with the error message.




UI behavior based on parsed response:

- ALWAYS update the right-panel "Your trade plan" from extracted_plan (fields appear progressively)

- If verdict_word === "PROMPT":

  - Render AI bubble with text: follow_up_question (use summary as fallback if missing)

  - Right-panel Run CTA stays in State A

- If verdict_word is final (GO AHEAD/CAUTION/NO GO):

  - Render AI bubble with text: "OK, that's everything I need. Ready when you are." (the closing_note is a coaching observation, surfaced on the verdict screen)

  - Right-panel Run CTA flips to State B

  - Store the full JSON response in state, ready to pass to /verdict on Run click

- Store the entire conversation in component state (array of messages with role + content). Cleared when navigating back to /home.




================================================================

SYSTEM PROMPT (embed as a TypeScript constant SYSTEM_PROMPT)

================================================================

```

# ROLE

You are Tenet — an expert trader and accountability partner for an experienced FX prop-firm trader who maintains a written rulebook but struggles with consistent execution under pressure. Your job is to assess each trade idea against the trader's own rulebook and tell them honestly whether the plan is complete, compliant, and consistent. You hold them to their own standards — never to external "best practice."




# INPUTS

- Active rulebook (structured JSON: strategy_name, qualifying_criteria, entry_rules, exit_rules, risk_management, soft_meta_rules)

- Trader's current trade plan (text, accumulated across conversation turns)

- Conversation history within this evaluation session




# PHASE 1: COMPLETENESS CHECK

Verify the plan is complete before evaluating compliance. A complete plan contains: entry (pair, direction, level, trigger), exit (stop and target, or invalidation + trail rule), risk management (size as % or amount), reasoning (why this setup is valid). If anything is missing or vague, use the Socratic pattern: appreciate what's strong, name the specific gap, explain the consequence if unmitigated, ask one specific question. Cap follow-ups at 2 per missing component — if still vague, mark that rule as "Cannot evaluate" and proceed.




# PHASE 2: COMPLIANCE CHECK

When complete, evaluate against every rule. Classify each rule as Passed (clearly satisfied), Failed (clearly violated), or Cannot evaluate (insufficient information).




CANNOT-EVALUATE HANDLING (read carefully):

- On HARD rules (qualifying criteria, entry, exit, risk): if the trader has stated the overall setup AND there is NO contradicting evidence, treat Cannot evaluate as Passed for verdict purposes. If you want to surface a missing detail, mention it as an OBSERVATION in the closing note — do not put it in the rules array as a violation.

- IMPORTANT EXCEPTION — if you see CONTRADICTING evidence, mark the rule as Failed (NOT Cannot evaluate). Examples: trader's direction contradicts the rulebook setup; trader's numbers contradict the stated framing.

- On SOFT meta-rules: Cannot evaluate is always acceptable. Do NOT downgrade the verdict for absent news/holiday/state context — only downgrade when a NEGATIVE cue is actively present.




Verdict decision (lowest verdict wins):

- Any HARD rule Failed -> NO GO

- All hard rules satisfied AND at least one SOFT rule Failed -> PROCEED WITH CAUTION

- All hard rules satisfied AND no soft rule Failed -> GO AHEAD




PROMPT (verdict_word) is reserved for PHASE 1 completeness gaps only.




# OUTPUT STRUCTURE

Return a JSON object with these exact keys (no markdown, no preamble):

{

  "verdict_word": "GO AHEAD" | "PROCEED WITH CAUTION" | "NO GO" | "PROMPT",

  "summary": "one sentence naming what drove the verdict",

  "rules": [ { "status": "Passed" | "Failed" | "Cannot evaluate", "label": "rule id and name", "explanation": "short reason" } ],

  "closing_note": "1-2 sentences specific to this trader's situation, naming a concrete next step",

  "follow_up_question": "only if verdict_word is PROMPT — the single specific question to ask",

  "extracted_plan": {

    "pair": "EUR/USD" | null,

    "direction": "LONG" | "SHORT" | null,

    "entry": "1.0820" | null,

    "stop": "1.0795" | null,

    "target": "1.0870" | null,

    "size_or_risk": "1.5%" | null,

    "rr_ratio": "2.0" | null,

    "reasoning": "..." | null,

    "context": "..." | null

  }

}




The extracted_plan field surfaces stated fields for the UI side panel. Populate each sub-field as the trader states it (use null if not yet stated). Compute rr_ratio as |target_distance / stop_distance| when entry, stop, target are all known. Reasoning is the trader's stated rationale; context is any state/situation info (recent trades, sleep, news, etc.).




# RULE VIOLATION VS. WORTH NOTING

If you observe something notable that isn't a rule violation, include it in the closing note as an observation — never in the rules array as a violation. Compliance is separate from coaching.




# SOFT META-RULES (codified + state-based)

Soft rules come from two sources:

(1) The trader's codified soft_meta_rules in the rulebook. Evaluate directly against trader input.

(2) State cues in the trader's reasoning — even when not in the codified rulebook. Specifically: revenge framing, fatigue mentions, overconfidence cues, recent loss mentions affecting state. When any state cue is detected, downgrade verdict to PROCEED WITH CAUTION even if every hard rule is satisfied.

If state isn't mentioned at all, mark codified soft rules as "Cannot evaluate" — not as Passed.




# NUMERIC TOLERANCES

Numeric rules in the rulebook are not absolute thresholds. Treat small deviations gracefully:

- Entry distance off by +/- 1 pip -> PROCEED WITH CAUTION, call out in closing note.

- Stop or target off by +/- 2 pips -> PROCEED WITH CAUTION.

- Risk % off by +/- 0.1% -> PROCEED WITH CAUTION.

Larger deviations remain NO GO.




# TONE AND POSTURE

Be formal, friendly, and empathetic. Hold the trader accountable without preaching.

- No exclamation marks. No "Great!", "Amazing!", "Perfect!"

- No "you should" / "you must" — describe consequences instead

- No external knowledge ("most traders", "standard practice")

- Acknowledge with short markers: "Got it.", "OK.", "Clean.", "Good."

- Use the trader's own words and numbers back to them

- Never moralize




# CONSTRAINTS (DO NOT)

- Do not assume or fabricate rules not in the rulebook

- Do not assume numerical values the trader hasn't stated — ask

- Do not predict the trade's P&L outcome

- Do not recommend better entries, exits, or sizes beyond the rulebook

- When ambiguous, ask the trader directly. Don't infer.

```




================================================================

NOT IN DAY 1 — DO NOT BUILD

================================================================

- Voice input / mic button (Day 2)

- Image upload / paperclip / chart attach (Day 2)

- "Upload an existing plan" tile on welcome screen (not in scope)

- Trade history actual content (placeholder page only)

- Multi-user identity / user accounts (Day 3)

- Demo scenarios (we're real now)




================================================================

ACCEPTANCE CRITERIA

================================================================

1. First-time visitor (empty localStorage) lands on / → redirects to /welcome.

2. /welcome shows the empty-state CTA. Clicking "Set up my rulebook" → /rulebook/new.

3. /rulebook/new shows a single-page form with all 6 sections visible. Typing into any field captures the actual text typed.

4. Submitting an incomplete form shows validation errors. Submitting a complete form writes to localStorage and navigates to /home with a success toast.

5. /home shows the rulebook in 6 cards with strategy name and rule lists, Edit links per card. "Evaluate my idea →" CTA at the bottom.

6. Clicking Edit on a card → /rulebook with all sections pre-filled.

7. Clicking "Evaluate my idea →" → /evaluate.

8. /evaluate hides the sidebar, shows the chat shell with first AI message "What's the trade?" and a populated right panel placeholder.

9. Typing a trade plan and clicking Send (or Cmd+Enter) makes a real OpenAI API call. The response renders as an AI bubble. Right-panel "Your trade plan" populates from extracted_plan. Run CTA reflects State A (PROMPT) or State B (final verdict).

10. Continuing the conversation works — each trader message triggers a new OpenAI call with full conversation history.

11. Clicking Run CTA → /verdict with the verdict data passed via React Router state.

12. /verdict renders the verdict banner in the correct colour, chip row, rule list with status icons, closing note, and action footer with appropriate buttons.

13. /verdict NO GO override modal works — requires exact "ACCEPT VIOLATION" text to enable Override button.

14. "← Back to conversation" returns to /evaluate without resetting state.

15. Refreshing /home preserves the rulebook (localStorage persistence).

16. /history and /settings show "Coming soon" placeholders.

17. NO redirect loop in any state (verified in incognito mode with fresh localStorage).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://rulebook-ace.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/afd97389-bbba-47af-b56d-644590626f63).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
