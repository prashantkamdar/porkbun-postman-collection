# Porkbun API v3 - Postman Collection

A git-native [Postman](https://www.postman.com/) collection for the
[Porkbun API v3](https://porkbun.com/api/json/v3/documentation), generated from
Porkbun's official [OpenAPI spec](https://porkbun.com/api/json/v3/spec)
(API version 3.62).

It covers all **139 operations** across 17 folders: domains, DNS and DNSSEC,
SSL, email, hosting, Cloudflare connect, webhooks, account and spend controls,
marketplace, aftermarket, closeouts, sandbox and the mock server. Requests ship
with **386 saved example responses**.

The collection is stored in Postman's v3 YAML format, one file per request,
so changes review cleanly in pull requests. A single-file v2.1 JSON export is
also included in [`exports/`](exports/) for the classic **Import** button and
Newman.

## Repository layout

```text
exports/                             Single-file v2.1 JSON (generated, for Import)
  Porkbun API v3.postman_collection.json
  Porkbun <Env>.postman_environment.json
postman/
  specs/porkbun-openapi.json         Pinned copy of the upstream OpenAPI spec
  collections/Porkbun API v3/        The collection (one folder per API area)
    .resources/definition.yaml       Collection description, variables, auth script
    <Folder>/<Request>.request.yaml  Requests
    <Folder>/.resources/...          Saved example responses
  environments/                      Production, Sandbox and Mock environments
scripts/
  update-spec.sh                     Re-download the spec and regenerate the collection
  postprocess-collection.mjs         Cleanup applied after every generation
  export-v2.mjs                      Build the exports/ JSON from the YAML
```

## Folders

| Folder | Requests |
| --- | --- |
| Utility | 4 |
| API Key Management | 2 |
| Pricing | 2 |
| Domain | 31 |
| Porkbun DNS | 15 |
| DNS | 6 |
| SSL | 2 |
| Email | 10 |
| Hosting | 11 |
| Cloudflare | 17 |
| Webhooks | 11 |
| Account | 17 |
| Marketplace | 2 |
| Aftermarket | 1 |
| Closeouts | 3 |
| Sandbox | 3 |
| Mock | 2 |

Many read endpoints accept both GET and POST. Those requests appear twice and
are labelled by method, for example `Retrieve all DNS records (GET)`.

## Environments

| Environment | `baseUrl` | Keys needed |
| --- | --- | --- |
| Porkbun Mock | `https://api.porkbun.com/api/json/v3/mock` | No |
| Porkbun Sandbox | `https://api.porkbun.com/api/json/v3` | Sandbox key (`pk1_sb_...`) |
| Porkbun Production | `https://api.porkbun.com/api/json/v3` | Live key (`pk1_...`) |

- **Mock** returns schema-accurate example responses and changes nothing. It
  is the quickest way to explore the API. The two requests in the `Mock`
  folder already include `/mock` in their path, so run those with the Sandbox
  or Production environment.
- **Sandbox** runs the full API against an isolated test account with fake
  credit. Hosting, email and closeouts return `SANDBOX_UNSUPPORTED` there.
- **Production** is the live API: registrations, renewals and DNS changes are
  real, and purchases are charged.

## Authentication

Porkbun authenticates with two headers, `X-API-Key` and `X-Secret-API-Key`. A
collection-level pre-request script adds both headers to every request from the
`apiKey` and `secretApiKey` variables of the active environment. When either is
empty, no auth headers are sent, which is what the mock server and public
endpoints (pricing, IP lookup) expect.

Do **not** fill the request **Authorization** tab. Postman's built-in API Key
auth only supports one header, so this collection leaves Auth empty (or
Inherit auth from parent) and injects both headers from the script instead.
Put your keys in the active environment's `apiKey` and `secretApiKey` fields
(use Current values in the Postman app so they stay off disk / out of git).
After Send, the Console shows the outgoing headers if you need to confirm.

### Getting keys

- **Sandbox, instantly with no signup:** send
  `API Key Management > Initiate an API key authorization request` with the
  body `{"sandbox": true}`. The response contains `apikey` and `secretapikey`
  for a throwaway test account with fake credit.
- **Live:** create a key at <https://porkbun.com/account/api>. Consider
  restricting it by IP, domain and permission scope.

### Keep keys out of git

The environment files in this repo intentionally contain **empty** secret
values. Put your keys in Postman's local/current values or the Postman Vault,
never in a committed file. `.gitignore` also excludes `*.local.*` files and
`.env*`. If you need a local environment file with real keys, name it
`<name>.local.environment.yaml`.

### Placeholder query parameters

OpenAPI generation fills optional query params with sample values
(`domain=string`, `nameContains=string`, `tlds=string`, and so on). Those are
sent as real filters, so a call like **Domain → List all domains (GET)** can
return `SUCCESS` with an empty list. On the Params tab, uncheck or clear every
filter you do not need and leave only what you intend (for example `start=0`).

## Usage

### Import into Postman

**Option 1: Import the single JSON file (simplest, any Postman app or web)**

1. Download
   [`exports/Porkbun API v3.postman_collection.json`](exports/Porkbun%20API%20v3.postman_collection.json)
   and, optionally, the `exports/*.postman_environment.json` files.
2. In Postman, click **Import** (or drag the files into the window) and select
   them.
3. **Porkbun API v3** appears under Collections. Pick an environment in the
   top-right, and for Sandbox or Production paste your keys into `apiKey` and
   `secretApiKey`.

This is a one-time copy. Edits you make in Postman stay in Postman and aren't
reflected in this repo.

**Option 2: Open the repo folder (desktop app v12+, stays in sync with git)**

The YAML source can be opened directly by the Postman desktop app through its
[Native Git](https://learning.postman.com/docs/use/native-git/overview/)
feature:

1. Clone the repo:
   `git clone https://github.com/<your-username>/porkbun-postman-collection.git`
2. In the Postman desktop app, open a workspace and click **Local file system**
   in the left sidebar.
3. Click **Open folders** and select the cloned `porkbun-postman-collection`
   folder (the repository root, which contains `.postman/` and `postman/`).
4. Connect it to your workspace when prompted.
5. The folder icon in the sidebar shows the raw YAML files. Switch to the
   collections view (the first icon in that row) to see **Porkbun API v3** as
   normal requests.
6. Select an environment in the top-right environment picker. For
   Sandbox or Production, paste your keys into `apiKey` and `secretApiKey`.

Alternatively, go to **Import > Connect Local Git Repo** and pick the same
folder. Edits you make in Postman are written back to the YAML files, so
`git diff` shows them like any other change.

**Option 3: Push to a Postman cloud workspace (shareable, works in the web app)**

```bash
postman login
postman workspace create --visibility personal   # creates and binds a workspace
postman workspace push                           # uploads collection + environments
```

After the push, the collection is in your cloud workspace and available in the
web app as well.

### Postman CLI

Install the CLI with `npm install -g postman-cli`, then:

```bash
# Explore with the credential-free mock server
postman collection run "postman/collections/Porkbun API v3" \
  -e "postman/environments/Porkbun Mock.environment.yaml" \
  -i Utility -i "Retrieve domain pricing (public) (GET)"

# Lint the collection
npm run lint

# Or run the v2.1 JSON export with Newman
npx newman run "exports/Porkbun API v3.postman_collection.json" \
  -e "exports/Porkbun Mock.postman_environment.json" --folder Utility
```

## Safety features worth knowing

- **Idempotency:** every write request sends `Idempotency-Key: {{$guid}}`, so
  each send gets a fresh key. To retry a request safely without repeating its
  effect, replace it with a fixed value and resend the identical body within 24
  hours. Porkbun then replays the original response.
- **Dry run:** billable and destructive writes accept `"dryRun": true` in the
  body to check price, funds and eligibility without doing anything.
- **Spend limit:** API purchases are capped at $100 per month by default until
  the account holder sets their own limit.

## Updating from the upstream spec

```bash
npm install            # once, installs the YAML dependency
npm run update-spec    # downloads the spec, regenerates, post-processes, lints, exports
git diff --stat        # review what changed upstream
```

`scripts/update-spec.sh` regenerates the collection from scratch with
`postman spec generate collection --folder-strategy Tags`, then
`scripts/postprocess-collection.mjs` applies the repo's conventions:

- Collection-level auth script and `apiKey` / `secretApiKey` variables.
- Placeholder `apikey` / `secretapikey` values removed from request bodies and
  headers.
- Request-level auth removed so every request uses the collection script.
- `Idempotency-Key` set to `{{$guid}}` instead of a fixed sample UUID.
- GET and POST variants of the same endpoint labelled by method.
- Folders ordered from setup (Utility, keys, pricing) to specialised areas.

Finally, `scripts/export-v2.mjs` rebuilds `exports/` from the YAML. If you edit
the YAML by hand or in Postman, run `npm run export` before committing so the
JSON stays in sync. Secret environment values are always exported empty.

The generator invents values for a few date-time fields that have no example in
the spec. As a result, a couple of saved example responses (`transferDate`)
change on every regeneration even when the spec hasn't.

The upstream spec has a few known syntax lint findings, such as an optional
trailing `{subdomain}` path parameter. These are left untouched in
`postman/specs/porkbun-openapi.json` so it stays an exact copy of upstream.

## Publishing to GitHub

With the [GitHub CLI](https://cli.github.com/):

```bash
gh repo create porkbun-postman-collection --public --source . --remote origin --push
```

Or with plain git, after creating an empty repository on GitHub:

```bash
git remote add origin git@github.com:<your-username>/porkbun-postman-collection.git
git push -u origin main
```

## Credits and license

The API, its documentation and the OpenAPI spec are by
[Porkbun](https://porkbun.com). This project is an unofficial collection and
is not affiliated with or endorsed by Porkbun.

The repository's own files (scripts, environments, docs) are released under
the [MIT License](LICENSE).
