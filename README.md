# MediLedger Healthcare Consortium Demo

MediLedger is a full-stack demonstration application for a synthetic healthcare-record sharing workflow. The React/Vite frontend is served by the Express process, which also provides the `/api` endpoints. The ledger and IPFS layers in this repository are local simulations.

## Run locally

Use Node.js 22.14.0 (see `.node-version`) and npm:

```sh
npm ci
npm run build
npm run server
```

Open `http://localhost:3001`. The server seeds fictional demo data at startup. For frontend development with hot reload, use two terminals:

```sh
npm run server
npm run dev
```

Vite proxies `/api` requests to `http://localhost:3001` during development.

## Create a separate hosted demo

The root `render.yaml` describes a standalone Render web service that builds the frontend and runs the Express API in the same process. To create a separate deployment:

1. Push or merge this repository revision to the branch you want to deploy.
2. In Render, create a new **Blueprint** and connect this repository. Keep the service name `medical-storage-demo` or choose another name that identifies this as a separate demo.
3. Review the blueprint and create the service. It builds with `npm ci --include=dev && npm run build`, starts with `npm run server`, and checks `/api/status` for readiness.
4. Open the service's Render URL. The frontend and API share the same origin, so no frontend API URL or CORS configuration is needed.

The blueprint disables automatic deploys so this service does not deploy every subsequent branch update without an explicit Render action. It does not change the existing Vercel project. The current `vercel.json` only rewrites frontend paths to the SPA and does not deploy the Express API; use the Render blueprint for the combined application.

## Demo and deployment limits

- All patient, provider, record, consent, and audit examples must remain fictional. Do not enter real patient information or credentials.
- The backend uses an in-memory Fabric-style ledger and IPFS-compatible store. It is not connected to a real Hyperledger Fabric network or IPFS cluster, and its state is reset when the process restarts or redeploys.
- API endpoints do not provide production authentication or authorization. The frontend role selector is for demonstration. Keep this deployment limited to synthetic demo use; it is not suitable for real healthcare data or production clinical workflows.
- A hosted demo requires creating a new Render service from the Blueprint. Preparing this repository does not create a cloud service or deploy it.

## Project commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run server` | Start the Express API and serve `dist/` when available |
| `npm run build` | Type-check and build the production frontend |
| `npm run lint` | Run Oxlint |
| `npm run bench` | Run the local synthetic benchmark |
