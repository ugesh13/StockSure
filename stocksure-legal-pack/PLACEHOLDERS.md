# Fill these before going live
Search the `legal/` folder for `[[` to find each one. Red-highlighted in the browser.

| Token | What to put |
|---|---|
| LEGAL_NAME | Your registered business name (not "StockSure" unless registered) |
| REGISTERED_ADDRESS | Registered office and branch addresses |
| WEBSITE_URL | Live site address |
| CUSTOMER_CARE_PHONE / EMAIL | Real, monitored contacts |
| GRIEVANCE_OFFICER_NAME / DESIGNATION / EMAIL / PHONE / HOURS | A real named person who reads the mail |
| GSTIN | Your GST number (if registered) |
| LAST_UPDATED_DATE | Date you publish |
| RETENTION_ORDERS / SEARCH / CONTACT / INCIDENT_RECORDS | How long you keep each kind of data (decide, then keep to it) |
| SESSION_DAYS, CONSENT_DAYS, ANALYTICS_DAYS | Lifetimes in days |
| HOLD_MINUTES | 10 (matches the backend) |
| RESPONSE_DAYS | Your promise for data requests (max 90) |
| HOSTING_PROVIDER, OTHER_PROCESSORS | Vercel/Netlify etc, plus any email/SMS/payment provider |
| RETURN_DAYS, REFUND_DAYS, NON_RETURNABLE_CATEGORIES, PICKUP_WINDOW, DELIVERY_STATEMENT_OR_NONE | Your real policy |
| JURISDICTION_CITY | City for courts |
| INCLUSIVE_OF_TAX_STATEMENT | e.g. "inclusive of GST" if true |
| REMOVE_THIS_NOTICE_WHEN_LIVE, DEMO_REFUND_LINE, REMOVE_IF_* | Delete demo wording and unused rows when real payments start |
| INCIDENT_LEAD_*, BACKUP_NAME, LAWYER_CONTACT, DRILL_MONTHS | Breach plan owners |

Rule: never publish a page that still contains `[[`.
