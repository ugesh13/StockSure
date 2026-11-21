# StockSure Legal Pack (templates)

**Read first:** these are templates, not legal advice. A lawyer should review them before you take real customers. They describe what StockSure actually collects today; if the app changes, change the pages.

## Your eight points, mapped
| # | Your point | Where |
|---|---|---|
| 1 | Privacy policy | legal/privacy-policy.html |
| 2 | Consent, no pre-ticks, easy withdrawal | Privacy + Cookies pages, integration prompt R1, R2, R4 |
| 3 | Complaint contact + chatbot then human | legal/grievance-redressal.html, prompt R5 |
| 4 | Cookies and tracking | legal/cookie-and-storage-policy.html, prompt R1 |
| 5 | Terms and conditions | legal/terms-and-conditions.html |
| 6 | Online sales: returns, refunds, shipping, name, address | legal/returns-refunds-shipping.html, footer (prompt R3) |
| 7 | (missing from your list) | Not provided |
| 8 | SSL and breach notice | hosting/vercel.json or _headers, DATA_BREACH_RESPONSE_PLAN.md |

## Steps
1. Fill PLACEHOLDERS.md.
2. Give ANTIGRAVITY_LEGAL_INTEGRATION_PROMPT.md to Antigravity in your PERSONAL frontend folder only.
3. Open the pages in a browser and read them as a customer.
4. Run a breach drill once.

## Honest limits
- StockSure is a demo store with simulated payments; the pages say so. Remove that wording only when real payments start.
- You need a real, named grievance officer and working contacts. A page with fake contacts is worse than none.
- HTTPS comes from Vercel/Netlify automatically; the header files add HSTS and others. The CSP is Report-Only so it will not break the 3D scene; tighten it after testing.
- The chatbot-then-human escalation is your design choice; it is good practice, not itself a legal requirement.
