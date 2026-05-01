# FigControl VPS Runbook

Este projeto segue o mesmo desenho operacional usado no VanRides: Docker Swarm, Portainer, Traefik, rede
`network_swarm_public`, GHCR e secrets versionados.

## DNS

Crie registros `A` no Cloudflare apontando para o IP publico da VPS:

- `figcontrol.matheusduarte.dev.br`
- `figcontrol-api.matheusduarte.dev.br`
- `figcontrol-dev.matheusduarte.dev.br`
- `figcontrol-api-dev.matheusduarte.dev.br`

Mantenha como `DNS only` ate o Let's Encrypt emitir os certificados.

## Banco compartilhado

O deploy usa o Postgres compartilhado do Swarm, por exemplo `postgres_postgres:5432`.

Crie bancos e usuarios proprios:

```bash
PGID="$(docker ps -q -f name=postgres_postgres | head -n 1)"
docker exec -it "$PGID" psql -U postgres -c "CREATE DATABASE figcontrol_db;"
docker exec -it "$PGID" psql -U postgres -c "CREATE USER figcontrol_user WITH PASSWORD '<SENHA_PROD>';"
docker exec -it "$PGID" psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE figcontrol_db TO figcontrol_user;"

docker exec -it "$PGID" psql -U postgres -c "CREATE DATABASE figcontrol_dev_db;"
docker exec -it "$PGID" psql -U postgres -c "CREATE USER figcontrol_dev_user WITH PASSWORD '<SENHA_DEV>';"
docker exec -it "$PGID" psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE figcontrol_dev_db TO figcontrol_dev_user;"
```

## Secrets do Swarm

Use URLs completas do Postgres como secrets para nao expor senha no YAML:

```bash
printf '%s' 'postgresql://figcontrol_user:<SENHA_PROD>@postgres_postgres:5432/figcontrol_db?schema=public' \
  | docker secret create figcontrol_database_url_v1 -
printf '%s' '<JWT_ACCESS_PROD_32_CHARS_MIN>' | docker secret create figcontrol_jwt_access_secret_v1 -
printf '%s' '<JWT_REFRESH_PROD_32_CHARS_MIN>' | docker secret create figcontrol_jwt_refresh_secret_v1 -
printf '%s' '<RESEND_API_KEY_PROD>' | docker secret create figcontrol_resend_api_key_v1 -

printf '%s' 'postgresql://figcontrol_dev_user:<SENHA_DEV>@postgres_postgres:5432/figcontrol_dev_db?schema=public' \
  | docker secret create figcontrol_dev_database_url_v1 -
printf '%s' '<JWT_ACCESS_DEV_32_CHARS_MIN>' | docker secret create figcontrol_dev_jwt_access_secret_v1 -
printf '%s' '<JWT_REFRESH_DEV_32_CHARS_MIN>' | docker secret create figcontrol_dev_jwt_refresh_secret_v1 -
printf '%s' '<RESEND_API_KEY_DEV>' | docker secret create figcontrol_dev_resend_api_key_v1 -
```

O remetente configurado nas stacks e `FigControl <noreply@notifications.matheusduarte.dev.br>`.
Pode reutilizar o mesmo dominio/subdominio do VanRides se ele ja estiver verificado no Resend com SPF/DKIM corretos.
Se quiser separar reputacao/identidade visual depois, crie outro subdominio no Resend e altere `FIGCONTROL_EMAIL_FROM`.

Checklist do Resend antes de abrir producao:

- Dominio/subdominio verificado no Resend.
- DNS com SPF, DKIM e, se possivel, DMARC publicados.
- `FIGCONTROL_EMAIL_FROM` usando um remetente do dominio verificado.
- Secret `figcontrol_resend_api_key_v1` criado com chave ativa.
- Cadastro novo recebendo email de verificacao.
- Recuperacao de senha recebendo email com link valido.

## Backup e restore

Backup manual do banco de producao:

```bash
FIGCONTROL_BACKUP_DATABASE=figcontrol_db \
FIGCONTROL_BACKUP_USER=postgres \
FIGCONTROL_BACKUP_DIR=/opt/figcontrol/backups \
  scripts/postgres-backup.sh
```

Backup manual do banco DEV:

```bash
FIGCONTROL_BACKUP_DATABASE=figcontrol_dev_db \
FIGCONTROL_BACKUP_USER=postgres \
FIGCONTROL_BACKUP_DIR=/opt/figcontrol/backups \
  scripts/postgres-backup.sh
```

Restore exige confirmacao explicita para evitar acidente:

```bash
CONFIRM_RESTORE=figcontrol_db \
FIGCONTROL_RESTORE_DATABASE=figcontrol_db \
FIGCONTROL_RESTORE_USER=postgres \
  scripts/postgres-restore.sh /opt/figcontrol/backups/figcontrol_db_YYYYMMDD_HHMMSS.dump
```

Antes de restaurar producao, faca um backup novo e valide o arquivo em DEV quando possivel.

## Primeira subida no Portainer

Crie duas stacks versionadas:

```bash
docker stack deploy -c deploy/swarm/figcontrol.dev.traefik.yml figcontrol-dev
docker stack deploy -c deploy/swarm/figcontrol.traefik.yml figcontrol-prod
```

O container da API executa `prisma migrate deploy` e o seed auditado do catalogo na inicializacao.

## CI/CD

Branches:

- `dev`: publica `ghcr.io/mathwidu/figcontrol-api:dev-<sha>` e `ghcr.io/mathwidu/figcontrol-web:dev-<sha>`, depois atualiza `figcontrol-dev_api` e `figcontrol-dev_web`.
- `prod`: publica tags `prod-<sha>`, depois atualiza `figcontrol-prod_api` e `figcontrol-prod_web`.

Secrets do GitHub:

- `VPS_HOST`
- `VPS_PORT`
- `VPS_USER`
- `VPS_SSH_KEY` ou `VPS_SSH_PRIVATE_KEY`
- `GHCR_PUSH_USERNAME`
- `GHCR_PUSH_TOKEN`
- `GHCR_READ_USERNAME`
- `GHCR_READ_TOKEN`
- `FIGCONTROL_SMOKE_EMAIL` opcional, usuario verificado usado no smoke autenticado
- `FIGCONTROL_SMOKE_PASSWORD` opcional, senha do usuario verificado usado no smoke autenticado

Repository variables opcionais:

- `GHCR_IMAGE_REPO_API`, default: `<owner>/<repo>-api`
- `GHCR_IMAGE_REPO_WEB`, default: `<owner>/<repo>-web`

Se o repositorio se chamar `mathwidu/FigControl`, os defaults geram:

- `ghcr.io/mathwidu/figcontrol-api`
- `ghcr.io/mathwidu/figcontrol-web`

Esses nomes ja batem com as stacks deste projeto. Se usar outro nome de repositorio, configure as duas variables.

### Primeiro deploy

O workflow atual atualiza services ja existentes no Swarm. Na primeira subida, siga esta ordem:

1. Crie o repositorio no GitHub.
2. Configure os secrets e variables acima.
3. Faca push da branch `dev`; o job vai buildar e publicar as imagens `dev-latest` no GHCR.
4. Crie a stack `figcontrol-dev` no Portainer ou via SSH:

```bash
docker stack deploy -c deploy/swarm/figcontrol.dev.traefik.yml figcontrol-dev
```

5. Rode novamente o workflow da branch `dev` pelo `workflow_dispatch`, ou faca novo push pequeno.
6. Depois de validar DEV, repita o mesmo ciclo para `prod` com a stack `figcontrol-prod`.

## Smoke pos-deploy

O workflow executa `scripts/smoke-figcontrol.sh` automaticamente depois do update dos services. Sem
`FIGCONTROL_SMOKE_EMAIL` e `FIGCONTROL_SMOKE_PASSWORD`, ele valida health, manifest PWA e catalogo publico. Com
essas credenciais, tambem valida login, colecao autenticada e update de figurinha.

Manual DEV:

```bash
FIGCONTROL_SMOKE_WEB_URL=https://figcontrol-dev.matheusduarte.dev.br \
FIGCONTROL_SMOKE_API_URL=https://figcontrol-api-dev.matheusduarte.dev.br \
FIGCONTROL_SMOKE_EMAIL=teste+figcontrol@example.com \
FIGCONTROL_SMOKE_PASSWORD='Senha-forte-123!' \
  scripts/smoke-figcontrol.sh
```

Manual PROD:

```bash
FIGCONTROL_SMOKE_WEB_URL=https://figcontrol.matheusduarte.dev.br \
FIGCONTROL_SMOKE_API_URL=https://figcontrol-api.matheusduarte.dev.br \
FIGCONTROL_SMOKE_EMAIL=teste+figcontrol-prod@example.com \
FIGCONTROL_SMOKE_PASSWORD='Senha-forte-123!' \
  scripts/smoke-figcontrol.sh
```

Checagens rapidas com `curl`:

```bash
curl -i https://figcontrol-api-dev.matheusduarte.dev.br/health
curl -i https://figcontrol-api.matheusduarte.dev.br/health
curl -i https://figcontrol-dev.matheusduarte.dev.br/manifest.webmanifest
curl -i https://figcontrol.matheusduarte.dev.br/manifest.webmanifest
```

Fluxo funcional:

```bash
curl -sS -X POST https://figcontrol-api-dev.matheusduarte.dev.br/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"teste+figcontrol@example.com","password":"Senha-forte-123!","confirmPassword":"Senha-forte-123!"}'
```

Confirme o email pelo link recebido. Depois faca login:

```bash
curl -sS -X POST https://figcontrol-api-dev.matheusduarte.dev.br/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"teste+figcontrol@example.com","password":"Senha-forte-123!"}'
```

Com o `accessToken` do login, valide:

```bash
curl -sS https://figcontrol-api-dev.matheusduarte.dev.br/me/collection/world-cup-2026 \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

curl -sS -X PATCH https://figcontrol-api-dev.matheusduarte.dev.br/me/collection/world-cup-2026/stickers/BRA20 \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"quantity":2}'
```

Esperado:

- `summary.base.total = 980`
- `summary.tracked.total = 992`
- `BRA20` com `quantity = 2`

## Rollback

Use a imagem anterior do service:

```bash
docker service inspect figcontrol-prod_api --format '{{.PreviousSpec.TaskTemplate.ContainerSpec.Image}}'
docker service inspect figcontrol-prod_web --format '{{.PreviousSpec.TaskTemplate.ContainerSpec.Image}}'
docker service update --rollback figcontrol-prod_api
docker service update --rollback figcontrol-prod_web
```
