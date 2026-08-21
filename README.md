# PreRich - Dev Workspace

This repo contains the PreRich scratch game. The workspace has been refactored to a Vite + TypeScript development flow.

Quick start:

1. Install dependencies

```bash
npm install
```

2. Run dev server

```bash
npm run dev
```

Notes:
- The app expects `Lucid` to be loaded in the page (for wallet interactions). In production the UI will import `lucid-cardano` and use a provider.
- `blockfrost-proxy` is provided to hide the Blockfrost project id. Set `PROXY_API_KEY` and `BLOCKFROST_PROJECT_ID` in the proxy `.env` before running.
