# Design Studio Platform — production-oriented rebuild

This project replaces the original single-file React/Babel/localStorage prototype with a real client/server application.

## What was fixed

- Removed client-side admin credentials and fake 3-step authentication.
- Server-side password hashing with bcryptjs.
- HTTP-only, SameSite session cookie using JWT.
- Login rate limiting and global API rate limiting.
- Helmet security headers and strict CORS.
- SQLite persistence instead of localStorage.
- Transactional order creation and server-side validation with Zod.
- Real admin CRUD for packages, services, portfolio and testimonials.
- Persistent clients, orders, projects, revisions, files, notifications and audit log.
- Real file uploads with server-side size/type limits.
- Analytics endpoint and admin dashboard.
- Server-side password change.
- Safe image loading (`lazy`/`async`) in the public portfolio.
- Responsive Arabic RTL UI.
- Removed global `user-select:none`.
- Vite production build instead of Babel Standalone/Tailwind CDN runtime compilation.
- API/service layer separated from UI.

## Included business workflow

Customer → order form → server validation → database → notification → admin dashboard → project workspace → revisions/files → status progression.

The project also has extension points for proposals, invoices, payment providers, email/Telegram/WhatsApp notifications and a customer portal.

## Run locally

1. Copy `server/.env.example` to `server/.env`.
2. Change `JWT_SECRET` and `ADMIN_PASSWORD` before production.
3. Run `npm install` from the root.
4. Run `npm run dev`.
5. Open `http://localhost:5173`.
6. Admin login defaults to the values in `.env` (do not keep the example password in production).

## Production

Use a real secret manager/environment variables, HTTPS, a managed PostgreSQL database for multi-instance deployments, object storage/CDN for production assets, and a reverse proxy. SQLite is intentionally used here because it makes the project immediately runnable without external infrastructure; the database access layer is isolated enough to migrate to PostgreSQL.

## Database migration path

For a larger deployment, move SQLite to PostgreSQL and object storage to S3-compatible storage. Do not commit `server/data` or uploaded files.

## Notes

Payment processing, WhatsApp/Telegram credentials, transactional email and external object storage require provider credentials and therefore are not fabricated in this build. The core data model/API is ready for those integrations.

`legacy-index.html` is the original uploaded prototype retained only as a reference; it is not used by the new application.
