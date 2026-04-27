# ECA Research Grants Portal

An internal portal for managing ECA research grant applications, hosted on Azure App Service (UAE North).

- **Live URL:** https://researchgrants-portal-fub3erb6hwawctay.uaenorth-01.azurewebsites.net
- **Kudu/SCM:** https://researchgrants-portal-fub3erb6hwawctay.scm.uaenorth-01.azurewebsites.net

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.17.0 |
| pnpm | 10.x (see `packageManager` in `package.json`) |
| PowerShell | 7+ (pwsh) |

Install pnpm if needed:
```sh
npm install -g pnpm
```

---

## Local Development

```sh
pnpm install
pnpm dev
```

The dev server starts at `http://localhost:5173`.

---

## Building for Production

```sh
pnpm build
```

This runs two steps in sequence:

1. `build:client` — Vite bundles the React SPA into `dist/spa/`
2. `build:server` — Vite bundles the Express server into `dist/server/node-build.mjs`

To start the production build locally:
```sh
pnpm start
```

---

## Deployment to Azure

Deployments use the **Kudu VFS API** to push files directly to the Azure App Service container. No Git remote or ZIP deploy is involved.

### Before running any script

Open the script you intend to run and verify the `$Root` variable points to your local project root:

```powershell
$Root = "C:\path\to\your\Research Grants Portal"
```

The publish credentials (`$PubUser` / `$PubPass`) are already embedded in the scripts from the Azure publish profile.

---

### Script Reference

| Script | Purpose |
|--------|---------|
| `push-server.ps1` | **Full deploy** — uploads server bundle + `.well-known` file, restarts container, verifies |
| `restart-app.ps1` | Restart the container without uploading new files |
| `upload-wellknown.ps1` | Upload server bundle + `microsoft-identity-association.json`, restart, verify |
| `verify-wellknown.ps1` | Quick check — confirms the `.well-known` endpoint returns valid JSON |
| `check-deploy.ps1` | Diagnostics — inspects live files on Azure via Kudu commands |

---

### Full Deployment (typical workflow)

Run this after every `pnpm build`:

```powershell
.\push-server.ps1
```

What it does:
1. Uploads `dist/server/node-build.mjs` and its source map to `site/wwwroot/dist/server/`
2. Uploads `microsoft-identity-association.json` to `site/wwwroot/dist/spa/.well-known/`
3. Triggers a container restart by writing a `LAST_RESTART` app setting via the Kudu API
4. Waits 35 seconds for the container to come back up
5. Polls `/.well-known/microsoft-identity-association.json` for up to 2 minutes to confirm the new server is serving correctly

A successful run ends with:

```
  SUCCESS  HTTP 200
  URL: https://.../.well-known/microsoft-identity-association.json
  Body: { "associatedApplications": [...] }
```

---

### Restart Only (no new files)

Use this when you need to bounce the container without deploying new code — e.g., after changing environment variables in the Azure portal:

```powershell
.\restart-app.ps1
```

Same wait-and-verify logic as `push-server.ps1`.

---

### Upload `.well-known` File Only

If only the `microsoft-identity-association.json` needs updating:

```powershell
.\upload-wellknown.ps1
```

This also re-uploads the server bundle (to keep it in sync) and restarts.

---

### Verify Live Endpoint

Quick sanity check without touching anything:

```powershell
.\verify-wellknown.ps1
```

Prints the HTTP status, `Content-Type`, and body of the `.well-known` response.

---

### Diagnostics

Inspect the actual files on the Azure container via Kudu remote commands:

```powershell
.\check-deploy.ps1
```

Reports:
- Whether `dotfiles` handling is present in the live `node-build.mjs`
- Contents of the `.well-known/` directory
- The `static` middleware line in the server bundle
- Modification time of the live `node-build.mjs`

---

## Run Tests

```sh
pnpm test
```

## Type Check

```sh
pnpm typecheck
```

## Format

```sh
pnpm format.fix
```
