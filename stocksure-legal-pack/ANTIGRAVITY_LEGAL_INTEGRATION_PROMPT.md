# STOCKSURE LEGAL + CONSENT INTEGRATION — MANDATORY WORK ORDER

You are integrating legal pages and consent controls into the StockSure frontend. Every rule below is REQUIRED. Skipping one is a failure, not a judgement call. Do not ask questions; where a value is unknown, keep the [[PLACEHOLDER]] token exactly as written.

## R0 Scope and safety
- Work ONLY in the personal StockSure frontend folder the user named. NEVER touch any hackathon or friend's frontend folder.
- No credentials in code, reports or prompts. Never print any .env.
- Copy `legal/*.html` and `legal/legal.css` into `public/legal/` unchanged. Do NOT fill or remove any [[PLACEHOLDER]]; the owner does that.
- Do not invent legal text. Do not remove the demo notice.

## R1 Consent banner (cookies and optional storage)
1. On first visit show a banner BEFORE any optional storage is written.
2. Buttons: "Accept all", "Reject all", "Choose". "Reject all" must be the same size, colour weight and prominence as "Accept all". No dark patterns.
3. Categories: Necessary (always on, no toggle), Preferences (language, preferred branch), Analytics (only if analytics exists). Every optional toggle defaults to OFF. NO pre-ticked box anywhere.
4. Before consent: write only the necessary keys (customer id, session token, consent record). Language and branch preference are NOT saved until Preferences is accepted (keep them in memory for the visit).
5. Store the choice in localStorage key `stocksure_consent_v1` as `{v,ts,preferences,analytics}`. Expire after [[CONSENT_DAYS]] days then re-ask.
6. Load NO third-party script, tag or pixel unless its category was accepted.

## R2 Withdrawal
1. A "Privacy choices" link in the footer of EVERY page opens the same panel with current settings.
2. Withdrawing takes one click and is as easy as giving consent. On withdrawal immediately delete the keys of that category.
3. Provide "Delete my local data" which clears all StockSure localStorage keys and the session.

## R3 Footer and legal links
Every page footer shows: legal name, address, website, customer care phone and email (use the [[PLACEHOLDER]] tokens), and links to Privacy, Terms, Cookies, Returns/Refunds/Shipping, Grievance. The grievance officer name, designation, email and phone must be visible on the Grievance page, linked from the footer.

## R4 Checkout and forms
1. Any consent checkbox is UNTICKED by default.
2. Terms acceptance is a separate unticked checkbox linking to Terms and Privacy; checkout is blocked until ticked.
3. Marketing or notification consent is a separate, optional, unticked checkbox. Never bundle it with terms.
4. If a date of birth or age is asked, show "I am 18 or older, or I have a parent/guardian's consent" as an unticked checkbox.
5. Show the demo notice near the pay button while payments are simulated.

## R5 Help chatbot with complaint escalation
1. A "Help" chat button is visible on every page.
2. The chat opens with: the grievance officer's name and contact (from the placeholders) and a line "Not satisfied? Choose Talk to a person."
3. The bot handles: stock questions, hold expiry, order status, and "File a complaint". A complaint creates a ticket id shown to the user and promises acknowledgement within 48 hours.
4. A persistent "Talk to a person" button is ALWAYS visible in the chat. Pressing it sends the full transcript plus ticket id to the human channel via `POST /support/handoff` if the backend has it; otherwise shows the grievance email and phone and a copyable transcript. Never trap the user in the bot.
5. Never invent a person's name. Use [[GRIEVANCE_OFFICER_NAME]].

## R6 Security headers
Copy `hosting/vercel.json` or `hosting/_headers` to the project root matching the host. Replace YOUR-API-HOST with the real API host from the env variable name VITE_API_URL (name only, never print its value). Keep CSP in Report-Only until R8-T6 passes, then switch to enforcing.

## R7 Do not
- Do not add analytics or trackers.
- Do not store personal data beyond what the Privacy page lists. If you find the app stores anything not listed there, REPORT it; do not hide it.

## R8 Tests — each must PASS with evidence
- T1 Fresh browser profile: before any click, localStorage holds no language/branch keys; banner visible.
- T2 "Reject all" then reload: banner gone, no optional keys, app still works.
- T3 "Accept all", then Privacy choices -> withdraw Preferences: those keys deleted within the same click.
- T4 Banner: Accept and Reject have equal size (report the measured pixel sizes) and no checkbox is checked by default (query `input[type=checkbox]:checked` returns 0 on first load of banner, checkout and forms).
- T5 Every route shows the footer with all five legal links; all links return 200.
- T6 No network request to any third-party host (list the hosts observed).
- T7 Chat: "File a complaint" yields a ticket id; "Talk to a person" is visible at all times and works.
- T8 `npm run build` and typecheck pass; existing tests still pass (report counts before and after; do not edit existing tests).
- T9 Placeholder scan: list every remaining [[TOKEN]] with file names. They must still be present.

## R9 Report (mandatory)
Output `LEGAL_INTEGRATION_REPORT.md` with: files changed, T1-T9 each PASS/FAIL with evidence, hosts contacted, storage keys found, anything that stores data not in the Privacy page, and what you did NOT do. No claim without evidence. If a test fails, say FAIL.
