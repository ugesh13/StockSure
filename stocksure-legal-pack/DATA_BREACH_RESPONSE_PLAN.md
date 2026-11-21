# StockSure Data Breach Response Plan (template)
Owner: [[INCIDENT_LEAD_NAME]] · Backup: [[BACKUP_NAME]] · Last reviewed: [[LAST_UPDATED_DATE]]
Not legal advice. Have a lawyer review before relying on it.

## 0. What counts as a breach
Any unauthorised access, disclosure, loss or alteration of personal data: leaked database credentials, a public backup, a bug that shows one customer another's orders, a lost laptop with exports, a compromised Aiven token.

## 1. First hour: contain
1. Declare an incident; write the time you found out (the clock starts at awareness).
2. Contain: rotate the exposed secret (database password, Aiven token, staff key), revoke sessions, disable the affected endpoint.
3. Preserve evidence: do NOT wipe logs; snapshot the relevant logs and DB state.
4. Do not delete data to "hide" it.

## 2. Assess (first 24 hours)
Fill in: what happened, when, how, which tables/fields, how many people, what the data could be used for, whether it is still happening.

## 3. Notify
| Who | When | What to include |
|---|---|---|
| Each affected person | Without delay | Nature and extent, when it happened, likely consequences, what we did, what they should do, a contact person |
| Data Protection Board of India | Without delay, then a detailed report within 72 hours of becoming aware (longer only if the Board allows in writing) | Broad facts, cause, timeline, impact, mitigation, who was responsible, proof that users were told |
Use plain language. Send by the contact the user gave (email/SMS) and post a banner on the site.

## 4. Recover
Fix root cause, restore from clean backup, test, re-enable. Keep the record of every step.

## 5. After
Blameless review within 7 days; add a test or control; update the privacy policy and this plan; keep the incident record for [[RETENTION_INCIDENT_RECORDS]].

## 6. Contacts
Incident lead [[INCIDENT_LEAD_NAME]] [[INCIDENT_LEAD_PHONE]] · Hosting [[HOSTING_PROVIDER]] · Aiven support · Lawyer [[LAWYER_CONTACT]]

## 7. Drill
Run a tabletop drill every [[DRILL_MONTHS]] months: "the database password is on GitHub — go."
