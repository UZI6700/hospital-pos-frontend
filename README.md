# MediCore HMS – Hospital POS frontend

React 18 + TypeScript + Vite, Tailwind, Zustand, React Router, Recharts, React Hook Form + Zod, Axios, socket.io-client, react-to-print, FullCalendar, i18next.

## Run
```
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## Demo logins (password `demo123`, mobile OTP `123456`)
admin · doctor · nurse · reception · pharmacist · lab · accounts · hr

Supervisor PIN for discount authorisation / bill cancellation: `1234`.
Patient portal: `/portal` (try `PT-000101`, OTP `123456`). Queue TV board: `/display`.

## Data
There is no backend. A seeded demo database (`src/utils/seed.ts`) lives in the browser's localStorage through the Zustand store (`src/app/store.ts`). Reset it under Settings › System › Backup & retention.

To connect a real backend set `VITE_API_URL` (Axios, `src/services/api.ts`) and `VITE_SOCKET_URL` (Socket.io, `src/services/socket.ts`), then replace the store actions with API calls.

## Needs a backend to be real
Authentication and password/IP policy enforcement, SMS/email/WhatsApp delivery, scheduled report e-mails, online payment gateway, GPS feed, DICOM/PACS, lab analyser and biometric integrations.
