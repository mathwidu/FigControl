# FigControl Security Review

Data: 2026-05-01

## Escopo

Revisão pré-produção focada em autenticação, envio de e-mails transacionais,
tokens, autorização, validação de entrada, headers HTTP, PWA/cache, deploy e
operações no Swarm.

## Ações aplicadas

- Rate limit de autenticação passou a usar múltiplos baldes por rota:
  - IP + e-mail para abuso direcionado.
  - IP global para impedir troca de e-mails a partir da mesma origem.
  - E-mail global para reduzir abuso distribuído contra a mesma conta.
- Rotas de cadastro, login, reenvio de verificação, recuperação de senha,
  confirmação de tokens, refresh e logout receberam limites compatíveis com o
  risco de cada fluxo.
- O IP real agora é calculado com `trust proxy` atrás do Traefik, evitando
  bypass simples por `X-Forwarded-For` enviado pelo cliente.
- Cadastro com e-mail já existente deixou de retornar conflito explícito,
  reduzindo enumeração de contas.
- Erros brutos do Resend não são mais devolvidos ao usuário.
- API e Web receberam headers defensivos adicionais.
- DTO de bulk update recebeu limite de tamanho e tamanho máximo de código de
  figurinha.
- `ValidationPipe` agora rejeita propriedades desconhecidas.

## Riscos residuais aceitos para v1

- O rate limit é em memória. Como as stacks atuais usam uma réplica, isso cobre
  o cenário de produção previsto. Se aumentarmos réplicas da API, precisamos
  migrar rate limit para Redis, Postgres ou outro store compartilhado.
- Tokens ficam no `localStorage`, o que aumenta o impacto de qualquer XSS. A
  v1 reduz superfície com React escaping, CSP, ausência de HTML dinâmico vindo
  de usuário e poucas dependências, mas a solução mais forte é migrar refresh
  token para cookie `HttpOnly`, `Secure`, `SameSite`.
- Ainda não há CAPTCHA ou proof-of-work nos fluxos de e-mail. Com tráfego
  público alto ou abuso real, esse passa a ser o próximo bloqueio recomendado.
- Não há monitoramento/alerta dedicado para volume de e-mails. O Resend deve ser
  monitorado manualmente no início da produção.
- `npm audit` reporta vulnerabilidade moderada de `postcss` via `next@16.2.4`.
  A versão estável mais recente do Next ainda depende de `postcss@8.4.31`, e o
  fix automático sugere downgrade quebrado. Como o app não processa CSS enviado
  por usuários em runtime, o risco prático é baixo para a v1. Atualizar assim que
  houver release estável do Next com `postcss >= 8.5.10`.

## Checklist antes da produção

- Conferir que `CORS_ORIGIN` de produção contém apenas
  `https://figcontrol.matheusduarte.dev.br`.
- Usar segredos JWT longos e únicos para DEV e PROD.
- Usar chaves Resend separadas por ambiente, se possível.
- Validar SPF, DKIM e DMARC do domínio usado no remetente.
- Manter `replicas: 1` na API enquanto o rate limit for em memória.
- Rodar smoke autenticado após o deploy.
- Revisar logs do Resend nas primeiras horas de produção.
