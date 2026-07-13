# Access Portal — your first CAP + Fiori app

An employee requests access to a service (for now just **Discord**) → their
manager approves or rejects it → on approval, a Discord invite link is
generated and emailed to the employee. This is the "employee portal" your
manager described, built the same way real SAP BTP side-by-side extensions
are built: **CAP** for the backend/OData service, **Fiori elements** for the
UI, **SQLite** for the database (swap for HANA later — same code).

---

## 1. Mapping your notes to real SAP terms

| Your note | What it actually is |
|---|---|
| Fiori/UI5 – frontend | **UI5** is the JS framework. **Fiori** is SAP's design system/set of apps built with UI5 (and Fiori *elements* = UI5 apps that are auto-generated from annotations instead of hand-coded). |
| RAP/CAPM – Middleware [logic] | Two **alternative** ways to build the service layer. **RAP** (ABAP RESTful Application Programming Model) = ABAP, used for extending S/4HANA *on the ABAP stack*. **CAPM** (Cloud Application Programming Model) = Node.js or Java, used for building services *on BTP* (side-by-side). You're using CAPM here. |
| S/4HANA db – backend | S/4HANA is the ERP; **HANA** is its database. You don't need either to learn CAP — CAP is database-agnostic, which is why we can use SQLite locally and point it at HANA later by changing config, not code. |
| Joule – Generate code needs functional specification | Joule is SAP's AI copilot, now embedded in BAS/ABAP, that can scaffold code from a written functional spec. Worth trying once you're inside BAS — not needed for this MVP. |
| BAS | **Business Application Studio** — SAP's cloud IDE (a hosted VS Code) for building CAP/UI5 apps. Free with a BTP trial account. |
| Service OData – like ODBC | Fair analogy. **OData** is a REST-based, standardized protocol for exposing/consuming data over HTTP, the way **ODBC** standardizes DB access over a driver interface. CAP/RAP both expose OData automatically from your data model. |
| Cloud connector | A secure tunnel from BTP (cloud) to systems running inside your company's network (on-prem HANA, MySQL, etc.). You don't need it yet since everything here runs inside BTP/locally. You'd need it the day you point this app at an on-prem database. |

---

## 2. Your 5 explore items, answered

**1) Free S/4HANA subscription**
There's no full free S/4HANA *system* you can keep indefinitely, but there are three practical options:
- **SAP S/4HANA Cloud Public Edition trial** — 30 days, zero setup, shared demo tenant with guided tours (sales, procurement, finance, etc). No customization or BTP integration. Sign up at sap.com's S/4HANA trial page.
- **SAP S/4HANA Fully-Activated Appliance** (via SAP Cloud Appliance Library) — a real, customizable on-premise system you self-host on AWS/Azure/GCP. Free license, but *you pay the cloud provider's hosting cost* (roughly a few € per running hour).
- For just learning CAP/Fiori/BTP (which is 90% of your task), **you don't need S/4 at all** — that's exactly why we're using SQLite here.

**2) Create a database — MySQL**
Skip it for now, per your own note. CAP's SQLite plugin gives you a real relational DB with zero setup — same CDS data model works against MySQL/Postgres/HANA later by changing one config block, not your code.

**3) Cloud Connector to reach the database**
Only needed once your DB lives *outside* BTP (on-prem MySQL/HANA, or on a VM your company controls). Setup outline for later: install the Cloud Connector agent inside your network → register it against your BTP subaccount → expose the specific DB host/port → CAP then connects to it via the "Connectivity" service and a destination, instead of a direct connection string. Not needed for this project.

**4) Is BAS/UI5 available?**
Yes. Every SAP BTP **trial account** (free, 90 days, no credit card) comes with Business Application Studio already subscribed in the "trial" subaccount — go to the BTP trial cockpit → Quick Tool Access → Business Application Studio → Create Dev Space → pick the "Full Stack Cloud Application" or "SAP Fiori" dev space type. UI5 is free and open-source (openui5.org) regardless of any BTP account.

**5) A simple app with a UI, in BTP**
That's exactly what's in this folder. Read on.

---

## 3. What's actually in this project

```
access-portal/
├── app/
│   └── approvals/            ← real, standalone UI5/Fiori Elements app (see below)
├── db/
│   ├── schema.cds          ← data model: Employees, Managers, Services, AccessRequests
│   └── data/*.csv          ← seed data (one manager, one employee, "Discord" as a service)
├── srv/
│   ├── access-portal-service.cds     ← the OData service definition + actions
│   ├── access-portal-service-ui.cds  ← Fiori annotations (List Report + Object Page + buttons)
│   ├── access-portal-service.js      ← the business logic
│   └── lib/
│       ├── discord.js       ← creates a single-use Discord invite via the Bot API
│       └── mailer.js        ← emails the invite link (or logs it if no SMTP configured)
├── .env.example
└── package.json
```

**How a request flows, end to end:**
1. Employee calls `submitRequest` (email, name, service, reason) → a `Pending` `AccessRequests` row is created.
2. Manager opens the Fiori preview, sees the pending list, opens one, clicks **Approve** or **Reject**.
3. `approve` handler: looks up the service → if it's "Discord", calls the Discord Bot REST API to mint a single-use, 7-day invite link → emails that link to the employee → marks the row `Approved`.
4. `declineRequest` handler: marks the row `Rejected` and emails the employee why.

I named the reject action `declineRequest` instead of `reject` — CAP's base service class already reserves the method name `reject` internally, and reusing it silently breaks your custom logic. Worth remembering as a gotcha.

**About Discord specifically:** there's no Discord API to invite someone by email directly — invites are just join-links. So the real pattern (used here, and by everyone who does this integration) is: a bot mints a link, and *you* deliver that link via email. `srv/lib/discord.js` has the exact setup steps once you're ready to use a real Discord bot; until then it returns a clearly-fake placeholder link so you can test the whole flow without any credentials.

---

## 4. Run it locally right now

You need Node.js 18+ installed.

```bash
cd access-portal
npm install
npx cds watch
```

You'll see `server listening on http://localhost:4004`. Then:

- **See the data / try the API:** open `http://localhost:4004` — CAP lists every entity and service.
- **See the Fiori Elements UI** — two ways to view it:
  1. **Live preview** (generated on the fly from the annotations in `access-portal-service-ui.cds`, no separate app project):
     `http://localhost:4004/$fiori-preview/AccessPortalService/AccessRequests`
  2. **`app/approvals`** — an actual, standalone UI5/Fiori Elements project (real `manifest.json`, `Component.js`, routing config — the same output SAP's own tooling in BAS would generate), open it at:
     `http://localhost:4004/approvals/webapp/index.html`

     I generated this with `@sap-ux/fiori-elements-writer` — the same library BAS's "Fiori Application Generator" wizard uses under the hood — pointed at this project's live `$metadata`. It needs no separate `npm install` or dev server: `manifest.json`'s data source is a relative path (`/access-portal/`), so as long as `cds watch` is running, both the API and the UI are served from the same origin and it just works. Open `app/approvals/webapp/` in your editor to see real UI5 project files — `Component.js`, the routing config in `manifest.json`, the (empty, since annotations already live in the CDS layer) local `annotations/annotation.xml`. This is the folder you'd hand to `cf push`/MTA later as its own deployable HTML5 module, separate from the `srv` module.
- **Submit a request** (simulating the employee screen) via curl or Postman:
  ```bash
  curl -X POST http://localhost:4004/access-portal/submitRequest \
    -H "Content-Type: application/json" \
    -d '{"employeeEmail":"you@example.com","employeeName":"You","serviceName":"Discord","reason":"testing"}'
  ```
- Then go back to the Fiori preview, open that request, and click **Approve**. Watch the terminal — it'll log the "email" (invite link included) since no real SMTP/Discord credentials are set yet.

Every restart reseeds fresh data from `db/data/*.csv` (SQLite is in-memory by default) — handy while you're experimenting, but it means nothing persists. When you're ready to keep data between restarts, tell CAP to use a file instead of memory (see comment in `package.json` — add a `cds.requires.db.credentials.url` pointing at a `.sqlite` file).

---

## 5. Move it into Business Application Studio (BAS)

1. Get a free BTP trial account (sap.com → BTP trial → sign up, no card needed, 90 days).
2. In the trial cockpit → **Quick Tool Access → SAP Business Application Studio** → **Create Dev Space** → choose **"Full Stack Cloud Application"**.
3. Once it opens, clone or upload this project folder (`git clone` if you push it to GitHub, or drag-and-drop the files).
4. Open a terminal in BAS, `npm install`, then `cds watch` — identical to local.
5. From here, if you want a *persisted, deployable* Fiori app (rather than just the live preview), run the wizard:
   `Command Palette → "Fiori: Open Application Generator"` → pick **List Report Page**, point it at your local CAP service and the `AccessRequests` entity. That generates a real `app/access-requests/` folder you can deploy to an HTML5 app repo on BTP.

---

## 6. What's deliberately left out (next steps, not blockers)

- **Authentication / roles** — right now anyone can call any action; there's no concept of "logged-in manager" vs "logged-in employee". CAP has built-in support for this (`@requires`, `xsuaa` on BTP) — worth adding once the happy path works.
- **Real Discord + email credentials** — fill in `.env` (copy from `.env.example`) once you've created a Discord bot and have SMTP creds (or use SAP BTP's own email/notification services once deployed there).
- **More than one service** — add a row to `db/data/com.access-Services.csv` (e.g. "GitHub") and the data model/UI already support it. The `approve` handler currently only wires up automatic invites for "Discord"; add an `else if` branch per new service as you build them out.
- **HANA instead of SQLite** — change the `cds.requires.db` block in `package.json` to `{"kind": "hana"}` and run `cds deploy` against a real HANA instance. No changes to `.cds` files or `.js` logic needed — this is the whole point of CAP being database-agnostic.
