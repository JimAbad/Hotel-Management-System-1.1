# Deployment (Render) — deployment branch

This branch is prepared for deploying the monorepo to Render using two services (Backend Web Service and Frontend Static Site). Secrets are removed and replaced with `.env.example` files.

## Option A: Render Blueprint (recommended)
Use `render.yaml` at the repo root to spin up both services automatically.

1) In Render, click New → Blueprint, paste repo URL and pick branch `deployment`.
2) Review services:
   - `hotel-backend` (Node Web Service) with health check `/healthz`.
   - `hotel-frontend` (Static Site) publishing `dist`.
3) Fill required environment variables (marked `sync: false`) after creation.
4) Deploy. Update `VITE_API_URL` to your backend URL and register PayMongo webhook.

## Backend (Node Web Service)
- Repository: this repo, branch `deployment`
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Health check: `GET /healthz`

### Environment Variables (Render Dashboard)
- `MONGO_URI`
- `JWT_SECRET`
- `XENDIT_SECRET_API_KEY`
- Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`, `FROM_NAME`, `EMAIL_PROVIDER`, `BREVO_API_KEY`, `DISABLE_EMAIL_SEND` (optional)
- URLs: `APP_URL`, `FRONTEND_URL` (set to your frontend Render URL)
- PayMongo: `PAYMONGO_API_KEY` (or `PAYMONGO_TEST_SECRET_KEY`), `PAYMONGO_PUBLIC_KEY`, `PAYMONGO_WEBHOOK_URL` (set to `https://<backend-service>.onrender.com/paymongo/webhook`), `PAYMONGO_WEBHOOK_SECRET` (set after registration)

CORS is configured to allow `onrender.com` origins plus `FRONTEND_URL` and `APP_URL`.

### Webhook Registration (PayMongo)
Once backend is live, register your webhook pointing to Render URL:

```sh
node backend/scripts/registerPaymongoWebhook.js --url https://<backend-service>.onrender.com/paymongo/webhook --events payment.paid,payment.failed,qrph.expired
```
Copy the returned `Webhook Secret Key` and set `PAYMONGO_WEBHOOK_SECRET` in the Render backend service. Remove old/ngrok webhooks to avoid duplicates.

## Frontend (Render Static Site)
- Repository: this repo, branch `deployment`
- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- SPA routing: enable redirect all routes to `index.html`

### Environment Variables
- `VITE_API_URL` → `https://<backend-service>.onrender.com`
- `VITE_XENDIT_PUBLIC_KEY`
- `VITE_PAYMONGO_PUBLIC_KEY`

## Sanity Checks
- Backend: `GET /healthz`, `GET /api/rooms`, `GET /api/rooms/summary`
- Frontend: App loads and calls backend via `VITE_API_URL`
- Webhook: run a test payment to trigger `payment.paid` → booking status updates

## Notes
- Secrets must not be committed. Use `.env.example` templates and Render dashboard for real values.
- The PayMongo webhook route is mounted at `POST /paymongo/webhook` and validates signatures.
