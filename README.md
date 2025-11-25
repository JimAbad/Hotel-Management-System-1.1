<<<<<<< HEAD
# Hotel-mngmnt-sys1.1

/* admin account
 username: employee
 password: password123 */
=======
# Hotel-Management-System-1.1
>>>>>>> refs/rewritten/Merge-origin-main-into-main-resolve-unrelated-histories-

test add

billings updated
## PayMongo Integration Notes

- Backend now supports PayMongo QR/e-wallet payment flow via `sources` and webhooks.
- When a user starts payment, the server creates a PayMongo `source` with `metadata.bookingId` so webhook events map back to the booking.
- On `source.chargeable`, the server creates a PayMongo `payment` using the secret key; booking flips to `paid` when the `payment.paid` webhook arrives.

### Required Environment Variables (Backend)

Set these in your deployment environment (do not commit real secrets):

- `PAYMONGO_PUBLIC_KEY`: Public key used for creating sources.
- `PAYMONGO_SECRET_KEY`: Secret key used for creating payments.
- `PAYMONGO_WEBHOOK_SECRET`: Webhook signing secret used to verify payload signatures.
- `FRONTEND_URL` or `APP_URL`: Base URL used for redirect links in PayMongo sources.

### Webhook Endpoint Configuration

- Point PayMongo webhooks to: `https://<your-backend-domain>/webhooks/paymongo`
- Ensure events include at least:
  - `payment.paid`
  - `payment.failed`
  - `source.chargeable`
  - `qrph.expired`

### Render/Deployment Setup

- Add `PAYMONGO_PUBLIC_KEY`, `PAYMONGO_SECRET_KEY`, and `PAYMONGO_WEBHOOK_SECRET` to your deploy environment.
- Restart the service after changing env vars.

### Frontend Flow

- After booking, user is redirected to `/paymongo-qr/:bookingId` showing the QR code.
- The page polls booking payment details; upon `paid`, it shows confirmation.
