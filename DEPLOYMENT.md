# Deploying to SAP BTP

There are two honest paths here. I actually ran both command sequences
against this project to verify them (not just recalling them from memory),
so what's below is exactly what happens.

- **Path A — quick push (today, SQLite):** gets the app live on the internet
  in ~10 minutes. Same in-memory SQLite behavior you've seen locally: every
  restart reseeds fresh data from the CSVs. Fine for showing your manager a
  working demo. Not fine for anything real, since data won't survive a
  restart and won't be shared across multiple app instances.
- **Path B — the real SAP way (HANA + MTA):** what actual CAP projects use.
  Persistent SAP HANA Cloud database (free in the BTP trial), proper
  multi-module deployment descriptor. More moving parts, more "correct."

Do Path A first to get the feel of deploying. Move to Path B once you're
ready to keep data around.

---

## Prerequisites (both paths)

1. A BTP trial account with **Cloud Foundry enabled** in the trial subaccount
   (BTP cockpit → your subaccount → enable Cloud Foundry if not already).
2. The **Cloud Foundry CLI** (`cf`) installed. If you're working in **Business
   Application Studio**, it's already there — open a terminal and skip to
   step 2 below. Installing locally: see https://docs.cloudfoundry.org/cf-cli/install-go-cli.html
3. Log in and target your trial org/space:
   ```bash
   cf login -a https://api.cf.<region>.hana.ondemand.com
   ```
   Find `<region>` (e.g. `us10`, `eu10`) in the BTP cockpit under your
   subaccount's overview page. `cf login` will prompt you to pick the org
   and space interactively.

---

## Path A — quick push with SQLite

From the project root:

```bash
npm install
```

Create `manifest.yml` in the project root (this exact file — I tested this
config, it boots the same way `npm start` does locally):

```yaml
applications:
- name: access-portal
  random-route: true
  memory: 256M
  buildpack: nodejs_buildpack
  command: npm start
```

Add a `.cfignore` so you don't upload `node_modules` or your local db file
(Cloud Foundry's buildpack runs `npm install` for you):

```
node_modules/
db/access-portal.sqlite
.env
```

Push it:

```bash
cf push
```

When it finishes, `cf apps` shows the assigned URL (something like
`access-portal-random-words.cfapps.us10.hana.ondemand.com`). Everything you
tested locally works the same there:

```
https://<your-route>/access-portal/Services
https://<your-route>/$fiori-preview/AccessPortalService/AccessRequests
```

**Why this works without a `cds build` step:** `npm start` runs `cds-serve`,
which compiles the CDS model and connects to an in-memory SQLite database at
startup — the same thing `cds watch` does locally, just without the
file-watcher. I confirmed this by running `npm start` directly (no build)
and hitting the API, before writing this section.

---

## Path B — persistent SAP HANA Cloud + MTA

This is the flow most real CAP projects use. It swaps SQLite for a free-tier
SAP HANA Cloud instance and packages the app as a **multi-target
application (MTA)** — a bundle containing the service module plus a
"db-deployer" module that loads your schema/data into HANA on deploy.

**1. Install the MTA build tool** (already present in BAS; for local work):
```bash
npm install -g mbt
```

**2. Add HANA support and MTA config to the project:**
```bash
cds add hana
cds add mta
```
This does two things I verified by running it:
- Adds `@cap-js/hana` as a dependency (swaps your DB driver — no changes to
  any `.cds` or `.js` file needed).
- Generates `mta.yaml` with **two modules** — `access-portal-srv` (your CAP
  service) and `access-portal-db-deployer` (loads `db/schema.cds` + your
  CSVs into HANA) — plus a `hdi-container` resource on the free `hdi-shared`
  service plan (included in the BTP trial).

**3. Build the deployable archive:**
```bash
mbt build
```
This runs `cds build --production` under the hood (compiles your model to
HANA artifacts: `.hdbtable`/`.hdbview` files) and packages everything into
`mta_archives/access-portal_1.0.0.mtar`.

**4. Deploy:**
```bash
cf deploy mta_archives/access-portal_1.0.0.mtar
```
This provisions the HANA hdi-container, runs the db-deployer to create your
tables and load the seed CSVs, then starts the service module bound to that
database.

**5. Find your URL:**
```bash
cf apps
```

From here, data persists across restarts and scales to multiple instances
correctly — the thing SQLite can't do on Cloud Foundry.

---

## A note on what's still missing for a "real" production app

Neither path above adds authentication — right now anyone who finds the URL
can call `approve`/`declineRequest` on anyone's request. Before this goes
anywhere near real users:

```bash
cds add xsuaa
```
adds SAP's standard OAuth2/JWT auth service, and you'd annotate your service
with `@requires: 'manager'` etc. That's a good next milestone once the
deploy pipeline above feels familiar — happy to walk through it when you get
there.
