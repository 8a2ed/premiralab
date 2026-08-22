# Deployment checklist

## Required environment

- NODE_ENV=production
- JWT_SECRET: 32+ random bytes
- ADMIN_USERNAME
- ADMIN_PASSWORD: 12+ characters
- CLIENT_ORIGIN: exact HTTPS frontend origin

## Security

- Enable HTTPS.
- Keep `studio_session` as an HTTP-only, Secure, SameSite cookie.
- Put the API behind a reverse proxy/WAF.
- Use a managed database and automated backups.
- Move uploads to object storage/CDN.
- Add CSP tailored to your deployed asset domains.
- Rotate JWT/session secrets through a secret manager.
- Monitor audit logs and login rate-limit events.

## Recommended next integrations

1. PostgreSQL + migration tooling.
2. S3/Supabase/Cloudinary for media.
3. Transactional email.
4. Telegram/WhatsApp notification worker.
5. Payment gateway with webhook verification.
6. Customer authentication and customer portal.
7. Proposal/invoice PDF generation.
8. Automated tests + CI.
