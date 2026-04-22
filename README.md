# Ehsaas Therapy Centre

Online therapy platform connecting clients with licensed psychologists.

## Stack

- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Backend: Express.js + MongoDB (Mongoose) + Socket.io
- Auth: JWT (client, therapist, admin roles)
- Payments: PhonePe
- Email: Nodemailer (Gmail SMTP)

## Running locally

Prerequisites: Node.js 20+, MongoDB (local or Atlas).

```sh
npm install
cd server && npm install && cd ..

# Start backend (port 5001)
cd server && node server.js

# In another terminal, start frontend (port 5174)
npm run dev
```

Copy `server/.env.example` to `server/.env` and fill in `MONGODB_URI`, `JWT_SECRET`, email/PhonePe credentials.

## Deployment

Deployed on Railway. Push to `main` auto-triggers a deployment.

Required Railway env vars:
- `MONGODB_URI`
- `JWT_SECRET`
- `EMAIL_USER`, `EMAIL_PASS`
- `CLIENT_URL`
- `NODE_ENV=production`
- PhonePe credentials
