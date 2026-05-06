# FigControl Fase 2: Perfil, Leaderboard e Base para Trocas

## Objetivo

Evoluir o FigControl de um controle individual de álbum para uma experiência social leve, começando por perfil público e leaderboard, sem implementar ainda o motor de match de trocas.

A Fase 2 deve preservar usuários já existentes em produção: contas antigas continuam usando o álbum normalmente, mesmo sem perfil preenchido.

## Decisões de Produto

### Perfil do Usuário

O usuário poderá configurar:

- Apelido público.
- Cidade.
- Estado brasileiro.
- Interesse futuro em trocas.

O país não será exibido nem solicitado no formulário. Para v1 desta fase, assumimos Brasil e validamos apenas estados brasileiros.

O apelido é a identidade pública do usuário. A tela deve tratar isso como uma checagem simples: o usuário digita um apelido e o app informa se está disponível. A versão normalizada do apelido existe apenas no banco para evitar duplicidades técnicas, por exemplo `Matheus`, `matheus` e `MÁTHEUS` representarem a mesma reserva de nome.

### Leaderboard

O leaderboard será uma corrida de progresso total do álbum/coleção rastreada. A ordenação principal é por quem tem mais figurinhas marcadas como `Tenho`, considerando o total rastreado atual de `994` figurinhas.

Critérios de ordenação:

1. Maior quantidade de figurinhas marcadas como `Tenho`.
2. Menor quantidade de figurinhas faltantes.
3. Data mais antiga em que o usuário chegou naquele progresso, quando disponível.
4. Data de entrada no leaderboard como desempate final.

O ranking mostra:

- Posição.
- Apelido.
- Cidade e estado.
- Progresso total, por exemplo `822/994`.
- Quantidade de faltantes.
- Quantidade de repetidas.

O leaderboard não deve mostrar email, ID de usuário, tokens ou qualquer dado de conta.

### Entrada no Ranking

Para entrar no leaderboard, o usuário precisa ter:

- Email verificado.
- Apelido válido e disponível.
- Cidade preenchida.
- Estado brasileiro preenchido.

Depois que o usuário entrar no leaderboard, a saída não ficará disponível pela interface comum. Isso mantém a ideia de corrida consistente. Por responsabilidade operacional e privacidade, o sistema deve preservar uma forma administrativa/manual de remover ou ocultar um perfil em caso de solicitação de suporte, abuso ou necessidade legal.

### Trocas Futuras

O campo de interesse em trocas será coletado agora, mas não cria descoberta de usuários nem contato entre pessoas nesta fase.

O futuro match poderá usar:

- Repetidas de um usuário: figurinhas com `quantity > 1`.
- Faltantes de outro usuário: figurinhas com `quantity = 0`.
- Cidade e estado para priorizar trocas próximas.

Nesta Fase 2, a única entrega relacionada a trocas é preparar o perfil e registrar o opt-in futuro.

## Modelo de Dados

### `user_profiles`

Tabela nova, um perfil por usuário.

Campos:

- `user_id`: chave primária e FK para `users.id`.
- `nickname`: apelido como o usuário digitou, preservando capitalização.
- `nickname_normalized`: apelido normalizado e único.
- `city_name`: cidade exibida no leaderboard.
- `state_code`: UF brasileira.
- `exchange_opt_in`: booleano, default `false`.
- `leaderboard_joined_at`: timestamp nullable; quando preenchido, o usuário participa do leaderboard.
- `profile_completed_at`: timestamp nullable para marcar o primeiro preenchimento útil.
- `created_at`.
- `updated_at`.

Índices:

- Único em `nickname_normalized`.
- Índice em `leaderboard_joined_at`.
- Índice em `(state_code, city_name)`.

### `user_collection_stats`

Tabela de projeção/cache para ranking.

Campos:

- `user_id`.
- `collection_id`.
- `tracked_have`.
- `tracked_missing`.
- `base_have`.
- `base_missing`.
- `duplicate_count`.
- `last_progress_at`.
- `updated_at`.

Chave primária composta:

- `(user_id, collection_id)`.

Essa tabela evita calcular o ranking inteiro toda vez lendo todas as quantidades por usuário.

## APIs

### Perfil

- `GET /me/profile`: retorna o perfil do usuário autenticado. Se não existir, retorna estado vazio com `leaderboardEligible=false`.
- `PATCH /me/profile`: cria ou atualiza apelido, cidade, estado e interesse em trocas.
- `GET /profiles/nickname-availability?nickname={nickname}`: retorna se o apelido está disponível para o usuário atual.
- `POST /me/profile/leaderboard/join`: marca `leaderboard_joined_at` se o perfil estiver elegível.

### Leaderboard

- `GET /leaderboard/world-cup-2026`: retorna ranking paginado dos usuários inscritos.

Resposta mínima:

```json
{
  "collectionSlug": "world-cup-2026",
  "total": 994,
  "items": [
    {
      "rank": 1,
      "nickname": "Matheus",
      "cityName": "Porto Alegre",
      "stateCode": "RS",
      "trackedHave": 822,
      "trackedMissing": 172,
      "duplicateCount": 31
    }
  ],
  "me": {
    "rank": 12,
    "trackedHave": 410,
    "trackedMissing": 584,
    "duplicateCount": 8,
    "joined": true
  }
}
```

## UI/UX

### Primeiro Acesso Após Fase 2

Usuários logados sem perfil veem um modal leve:

- Título: `Crie seu perfil no FigControl`.
- Campo de apelido com feedback de disponibilidade.
- Cidade.
- Estado.
- Checkbox ou switch para `Tenho interesse em futuras trocas`.
- Botão principal: `Salvar perfil`.
- Botão secundário: `Agora não`.

O modal não bloqueia o uso do álbum. Se o usuário escolher `Agora não`, o álbum segue funcionando.

### Página Perfil

Criar uma entrada de navegação para `Perfil`.

A página mostra:

- Email da conta como informação privada.
- Status de email verificado.
- Apelido.
- Cidade.
- Estado.
- Interesse em futuras trocas.
- Status do ranking.
- Botão `Entrar no ranking`, quando elegível.

Depois que o usuário entrar no ranking, a UI mostra `Você está participando do ranking` e não exibe botão de saída.

### Página Leaderboard

Criar uma entrada visível e discreta para `Ranking`.

A página mostra:

- Top ranking paginado.
- Destaque da posição do usuário atual, se ele entrou no ranking.
- Mensagem para usuário sem perfil ou fora do ranking: `Complete seu perfil para participar da corrida`.

## Migração e Usuários Existentes

As migrations não devem exigir dados novos na tabela `users`. Todos os campos de perfil começam ausentes.

Usuários existentes:

- Continuam logando.
- Continuam marcando figurinhas.
- Não aparecem no leaderboard até criarem perfil e entrarem no ranking.
- Têm seus stats populados por backfill para que, ao entrarem no ranking, a posição seja imediata.

## Privacidade e Segurança

- Email nunca aparece no leaderboard.
- Cidade e estado aparecem no leaderboard para participantes.
- Entrada no leaderboard exige ação explícita.
- Termos e Privacidade devem explicar apelido, cidade, ranking e uso futuro para trocas.
- A API deve limitar tamanho e formato do apelido.
- A API deve bloquear palavrões e termos reservados em uma lista inicial simples.
- A API deve impedir enumeração abusiva de apelidos com rate limit no endpoint de disponibilidade.

## Fora de Escopo Nesta Fase

- Chat entre usuários.
- Exposição de telefone, WhatsApp ou email.
- Match automático de trocas.
- Busca pública por cidade.
- Ranking por cidade.
- Badges, conquistas ou gamificação extra.
- Upload de avatar.

## Critérios de Aceite

- Usuário antigo sem perfil continua usando o álbum normalmente.
- Usuário consegue criar perfil com apelido disponível, cidade e estado.
- Apelidos iguais com diferença de caixa ou acento são tratados como indisponíveis.
- Usuário só entra no leaderboard com email verificado e perfil completo.
- Leaderboard ordena por maior progresso total rastreado.
- Cidade e estado aparecem para usuários ranqueados.
- Nenhum email aparece no leaderboard.
- Stats são atualizados quando o usuário altera figurinhas.
- Backfill cria stats para usuários já existentes.
- Termos e Privacidade refletem a Fase 2.
