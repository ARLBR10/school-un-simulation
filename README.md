# School ONU Panel

Painel web para organizar uma simulação escolar da ONU. O projeto reúne páginas públicas, autenticação, controle de participantes, comitês, notícias, documentos, presenças e notas em uma única aplicação.

## Objetivo

O sistema foi criado para apoiar a operação de um evento educacional interno, com foco em estabilidade, permissões claras e manutenção simples. Ele não é uma rede social, não é uma plataforma de vigilância e não deve armazenar dados que não sejam necessários para conduzir a simulação.

## Funcionalidades

- Área pública com informações da simulação, comitês, notícias, regras, termos e privacidade.
- Login e autorização por vínculo de membro.
- Painel administrativo para gerenciar membros, usuários, comitês, notícias, documentos, presenças e notas.
- Fluxos específicos para imprensa, avaliação, operações e delegados.
- Backend em tempo real com Convex.
- Interface construída com TanStack Start, React 19, TanStack Router e Tailwind CSS 4.

## Privacidade

Este repositório deve conter apenas código e dados necessários para ajudar a simulação. É proibido incluir informações privadas da escola, dados pessoais desnecessários ou qualquer mecanismo de vigilância.

Dados técnicos e analíticos, quando usados, devem servir apenas para diagnóstico, segurança, auditoria e melhoria operacional do evento. A plataforma não deve vender dados nem usar analytics para publicidade comportamental.

## Stack

- Runtime e package manager: Bun.
- Frontend: TanStack Start, React 19, TanStack Router, Vite e Nitro.
- Backend: Convex.
- UI: Tailwind CSS 4, shadcn/radix-nova, reui data-grid e Lucide icons.
- Auth: Better Auth integrado ao Convex.
- Deploy planejado: Convex e Cloudflare Workers.

## Requisitos

- Bun instalado.
- Conta e projeto no Convex.
- Variáveis de ambiente configuradas para a aplicação.

Variáveis importantes:

- `VITE_CONVEX_URL`: URL do deployment Convex usada pelo frontend.
- `VITE_CONVEX_SITE_URL`: URL pública do site usada por auth e UploadThing.

## Desenvolvimento

Instale as dependências:

```bash
bun install
```

Rode a aplicação completa em desenvolvimento:

```bash
bun run dev
```

Também é possível rodar cada parte separadamente:

```bash
bun run vite:dev
bun run convex:dev
```

## Validação

Comandos úteis antes de enviar mudanças:

```bash
bunx tsc --noEmit
bun run lint
bun run vite:build
```

Não há suíte de testes configurada atualmente.

## Deploy

O projeto inclui scripts para build e deploy com Cloudflare Workers e Convex:

```bash
bun run cf-build
bun run cf-deploy
```

Confirme as variáveis de ambiente e o deployment do Convex antes de publicar.
