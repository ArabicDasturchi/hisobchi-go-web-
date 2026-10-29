\# CLAUDE CODE MASTER PROMPT — HISOBCHI GO



You are the lead full-stack engineer, mobile architect, database engineer, and QA engineer responsible for implementing Hisobchi Go.



\## Project context



Hisobchi Go is a mobile-first accounting assistant for Uzbek merchants.



Team: Unikorumlar  

Founders: Abdulloh Ismoilov and Humoyun Anvarjon  

Primary UI language: Uzbek (Latin script)



Core principle:



AI understands the list. The merchant reviews and confirms it. Deterministic code calculates it. An independent calculation verifies it.



\## 1. Read the project first



Inspect the existing repository and Git status before making changes.



Read these documents if present:



\- `CLAUDE.md`

\- `README.md`

\- `docs/TZ-MVP.md`

\- `docs/ARXITEKTURA.md`

\- `docs/QARORLAR.md`

\- `docs/MUAMMOLAR.md`

\- `docs/SUHBATLAR.md`

\- `docs/RAQIBLAR.md`

\- `.env.example`



Some filenames may differ. Inspect the actual files rather than assuming their existence.



Identify the existing implementation, missing features, build errors, test status, environment configuration, and conflicts between documents.



Do not overwrite functioning code unnecessarily. Preserve relevant research and documented decisions.



After the inspection, create a concise implementation plan and immediately begin implementation.



\## 2. Required technology



Use the existing compatible project setup, prioritizing:



\- Expo

\- React Native

\- TypeScript

\- Expo Web

\- Supabase Auth

\- Supabase PostgreSQL

\- Supabase Edge Functions

\- Vercel

\- Automated tests



The target monorepo structure is:



`apps/mobile/`  

`packages/core/`  

`supabase/migrations/`  

`supabase/functions/`  

`docs/`



The shared business logic and calculation rules must live in `packages/core/`. PostgreSQL calculation must be implemented independently in SQL.



\## 3. Non-negotiable business rules



1\. AI must never calculate the authoritative total.

2\. AI must never write directly to the database.

3\. Never silently guess an ambiguous product, quantity, price, or unit.

4\. Preserve the original text fragment associated with each parsed value.

5\. Unresolved rows must be highlighted in yellow.

6\. A document with unresolved blocking issues cannot be confirmed.

7\. Calculate using TypeScript BigInt and independently using PostgreSQL SQL.

8\. If required calculation results differ, block posting.

9\. Never post a document before merchant confirmation.

10\. Never use floating-point arithmetic for monetary calculations.

11\. Posted ledger entries must be append-only.

12\. Correct posted entries using authorized reversal entries.

13\. Use idempotency keys to prevent duplicate financial operations.

14\. Keep API keys and service-role secrets out of the client.

15\. Never claim that an untested feature, build, or deployment works.



\## 4. Build the MVP workflow



Implement this complete workflow:



Input list → Parse → Review → Edit → Confirm → Dual calculation → Transactional posting → Result → Customer history.



\### Input screen



Build a clean Uzbek-language mobile-first interface with a large text input.



Example:



`chirmoq 10 ta 13 ming, yurak 5 ta 15 ming, momiq 20 ta 9 ming`



Include clear processing, loading, empty, success, and error states.



Voice input is optional until a real STT provider is configured. If unavailable, explain the limitation and keep text input fully functional.



\### Parsing



Use server-side structured AI parsing with schema validation.



Return structured product rows containing original text, product name, quantity, unit, price, and validation information.



Use deterministic numeric parsing where possible. Do not trust arbitrary AI-generated numbers without validation.



Unknown products, ambiguous matches, missing values, and uncertain numeric interpretations must be explicitly flagged.



\### Review and confirmation



Allow the merchant to review and edit all rows before posting.



Display product, quantity, unit, price, line total, original text fragment, and warning state.



Disable confirmation while blocking issues remain.



\### Core calculation



Implement and test:



\- `parseUzNumber()`

\- `calculateLineTotal()`

\- `calculateDocumentTotal()`

\- `validateDocument()`

\- `normalizeProductName()`



Use integer Uzbek so'm and BigInt for TypeScript monetary arithmetic.



Represent quantities as `qty\_milli`, with 1000 representing one base unit.



Use this line calculation rule:



`floor((qty\_milli \* unit\_price + 500) / 1000)`



Round each line independently and then sum the rounded line totals.



Define discount behavior explicitly if discounts are implemented. TypeScript and SQL must use identical rules.



\### Required sample



10 × 13,000 + 5 × 15,000 + 20 × 9,000 = 385,000 so'm.



Create independent test expectations for this and other edge cases.



\## 5. Independent SQL calculation and posting



Implement two independent calculation paths:



A. TypeScript BigInt calculation on the server.

B. A separate PostgreSQL SQL calculation function.



Do not implement the SQL path by calling the TypeScript calculation or simply accepting a client-supplied total.



On posting:



1\. Validate the document and all rows.

2\. Recalculate on the server.

3\. Recalculate independently in PostgreSQL.

4\. Compare required totals and line results.

5\. Block posting if any result differs.

6\. Insert the posted document and ledger entries atomically.

7\. Prevent duplicate operations using `client\_op\_id` and appropriate database constraints.

8\. Ensure transaction failure leaves no partial financial records.



The client-side total is only for immediate UI feedback.



\## 6. Database and security



Use Supabase migrations as the source of truth.



Implement the MVP-relevant portions of:



\- `shops`

\- `memberships`

\- `products`

\- `product\_aliases`

\- `price\_history`

\- `customers`

\- `captures`

\- `documents`

\- `document\_lines`

\- `ledger\_entries`

\- `audit\_log`



Use appropriate foreign keys, indexes, unique constraints, and tenant relationships.



Implement RLS so a user can access only shops where they have an authorized membership.



Do not rely on frontend visibility for authorization.



Prevent ordinary UPDATE and DELETE operations on posted ledger entries and protect posted documents using database-level enforcement where appropriate.



Use server-only secrets for Edge Functions. Never expose the Supabase service-role key in client code.



If real authentication configuration is missing, provide a clearly labeled demo mode using synthetic data. Never create an insecure shared production account.



\## 7. Customer history



Implement:



\- Customer list

\- Customer creation

\- Customer detail

\- Posted sales history

\- Document detail

\- Search by customer name



Only successfully posted documents appear as sales. Draft and blocked documents must not appear as completed sales.



Do not claim that full debt management, partial payments, or inventory management is implemented unless it is actually implemented and tested.



\## 8. Product matching



Normalize case, whitespace, and common Uzbek apostrophe variants.



Use exact aliases first. If fuzzy matching is implemented, return a limited candidate list and require the merchant to resolve ambiguous matches.



The AI may choose only from the supplied candidate list or return no match.



Never fabricate products. When a merchant resolves a product alias, save it only through a validated authorized operation.



\## 9. UI/UX



Build a professional and responsive application for Android, iOS, and web.



Requirements:



\- Uzbek Latin interface

\- Green/blue visual identity

\- Large touch targets

\- Clear readable typography

\- Accessible contrast

\- Yellow warning rows

\- Confirmation dialogs

\- Useful loading, empty, success, and error states

\- No dead buttons

\- No fake integrations

\- No unnecessary complexity



Required screens:



1\. Main input screen

2\. Parsing/loading state

3\. Review and correction screen

4\. Calculation result screen

5\. Customer list

6\. Customer detail and sales history

7\. Document detail

8\. Sign-in or demo configuration state



\## 10. Testing



Add automated tests for:



\- 385,000 so'm sample

\- Fractional quantities

\- Per-line rounding

\- One-so'm rounding boundaries

\- Negative and invalid inputs

\- Large-value boundaries

\- Uzbek number phrases

\- Missing quantity or price

\- Ambiguous products and units

\- Blocking unresolved rows

\- TypeScript/SQL agreement

\- Deliberate mismatch blocking

\- Duplicate submission prevention

\- Transaction rollback

\- Cross-shop RLS isolation

\- Append-only ledger restrictions



Do not generate expected values by calling the same function being tested.



Run the relevant tests after every major implementation step.



\## 11. Deployment and documentation



Configure Expo Web and Vercel using the actual project build configuration.



Verify build commands and output paths instead of guessing.



Update README and relevant project documentation to explain:



\- Requirements

\- Environment variables

\- Supabase setup

\- Migrations

\- Local development

\- Tests

\- Build and deployment

\- Known limitations

\- Deferred features



Do not commit credentials or real customer data.



Do not claim a deployment succeeded unless it has actually been verified.



\## 12. Execution order



Follow this order:



1\. Inspect the repository and report the current state.

2\. Repair or establish the project configuration.

3\. Implement core calculation and tests.

4\. Implement database migrations and RLS.

5\. Implement parsing and validation.

6\. Implement review and correction UI.

7\. Implement independent SQL calculation and transactional posting.

8\. Implement customer history.

9\. Implement authentication or a safe demo fallback.

10\. Integrate STT only if genuinely configured.

11\. Run tests and production build.

12\. Update documentation and report remaining blockers.



Work incrementally. Preserve existing functioning code. Do not stop after writing a plan. Do not leave critical business logic as TODO placeholders.



When credentials or external services are unavailable, implement a safe integration boundary, clearly report the limitation, and continue with independent work.



\## Definition of done



The MVP must support the complete text-to-document workflow, calculate the sample as 385,000 so'm, block unresolved rows and calculation mismatches, save confirmed documents exactly once, show sales in customer history, enforce tenant isolation, pass automated tests, and produce a successful production web build.



Begin repository inspection now and continue through implementation.



