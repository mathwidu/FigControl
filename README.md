# FigControl

Controle sincronizado do album Panini FIFA World Cup 2026.

## Stack

- `npm workspaces`
- `apps/web`: Next.js App Router
- `apps/api`: NestJS + Prisma + PostgreSQL
- `packages/shared`: tipos e helpers compartilhados
- Deploy: Docker Swarm + Traefik + Portainer + GHCR

## Local

```bash
cp .env.example .env
npm install
docker compose up -d db
npm run prisma:migrate --workspace apps/api
npm run seed --workspace apps/api
npm run dev
```

Web: `http://localhost:3000`

API: `http://localhost:3001`

No `docker compose`, emails de verificacao e reset usam `FIGCONTROL_EMAIL_PROVIDER=log`; os links aparecem nos logs da API:

```bash
docker compose logs -f api
```

## Auth

- `POST /auth/register`: cria conta e envia email de verificacao.
- `POST /auth/email-verifications/confirm`: confirma email por token.
- `POST /auth/email-verifications/resend`: reenvia verificacao com cooldown.
- `POST /auth/login`: emite JWT apenas para email verificado.
- `POST /auth/password-resets`: envia link de redefinicao de senha.
- `POST /auth/password-resets/confirm`: redefine senha e revoga refresh tokens antigos.
