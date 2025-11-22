## Changes To Include
- Rooms pricing
  - Remove Economy 3h test override and use DB price in calculations (`frontend/src/Rooms.jsx:110–115` removed; `Rooms.jsx:322` merge order).
  - Economy 3h total = ₱200 by using ₱59.523/hour in totals (`backend/controllers/bookingController.js:111`), seed updated (`backend/addRooms.js:25`).
- PayMongo deposit
  - QRPh intent amount set to 10% with ₱20 minimum (`frontend/src/PayMongoQR.jsx:55`).
- UI labels
  - My Bookings displays “paid in partial” when `paymentStatus` is `partial` (`frontend/src/MyBookings.jsx:231–233`).

## Branch Prep
- Ensure working tree is clean and the above files reflect changes.
- Create or switch to `deploy/qrph-partial-payment`.

## Push Steps
- Stage modified files:
  - `frontend/src/Rooms.jsx`, `frontend/src/PayMongoQR.jsx`, `frontend/src/MyBookings.jsx`, `backend/controllers/bookingController.js`, `backend/addRooms.js`.
- Commit: “QRPh deposit (10% min ₱20), Economy 3h ₱200, label partial”.
- Push to remote `deploy/qrph-partial-payment`.

## Deploy
- Render services already point to `deploy/qrph-partial-payment` (`render.yaml`).
- Trigger redeploy for backend `hotel-backend` and frontend `hotel-frontend`.

## Post-Deploy Validation
- Backend: verify `/healthz` responds 200.
- Frontend: open `VITE_API_URL` site and test:
  - Book Economy for 3 hours, confirm total ≈ ₱200.
  - Go to PayMongo QR page; confirm intent created for deposit (`pending`).
  - After webhook, confirm booking shows `Payment Status: paid in partial`.

## Live Walkthrough
- I’ll log in using your account (`green2`), book Economy for 3 hours, show QR page status, and confirm My Bookings reflects partial payment.

Confirm and I’ll perform the branch push and guide you through the redeploy + UI verification.