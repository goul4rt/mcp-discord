> Esta e a traducao em Portugues (BR). [Read in English](../../README.md)

# mcp-discord

> O servidor MCP open-source mais completo para Discord.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org)
[![GitHub stars](https://img.shields.io/github/stars/goul4rt/mcp-discord.svg?style=social)](https://github.com/goul4rt/mcp-discord)

Deixe qualquer cliente MCP (Claude, Cursor, agentes customizados) com controle total sobre o Discord — mensagens, moderacao, canais, cargos e muito mais. Nascido do uso em producao no [delfus.app](https://delfus.app), aberto para a comunidade.

**[Portugues (BR)](docs/pt-br/README.md)**

---

## Por que mcp-discord?

- **30+ ferramentas** em 8 categorias — servidores, canais, mensagens, reacoes, membros, cargos, moderacao e monitoramento
- **Modo duplo** — rode de forma independente (processo proprio) ou integre como plugin no seu bot discord.js existente
- **Apenas REST ou Gateway** — escolha entre o modo REST leve ou o gateway WebSocket completo para funcionalidades em tempo real
- **Dois transportes** — stdio (padrao, para Claude Desktop / Claude Code) ou HTTP com autenticacao via Bearer token
- **Testado em producao** — construido e usado em producao no [delfus.app](https://delfus.app)

---

## Inicio Rapido

### Pre-requisitos

- [Node.js](https://nodejs.org) 18 ou superior
- Um [token de bot do Discord](https://discord.com/developers/applications)

### Instalacao

```bash
# Clone o repositorio
git clone https://github.com/goul4rt/mcp-discord.git
cd mcp-discord

# Instale as dependencias
npm install

# Build
npm run build
```

### Configuracao

```bash
cp .env.example .env
```

Edite o `.env` e adicione o token do seu bot Discord:

```env
DISCORD_TOKEN=your-bot-token-here
```

### Executar

```bash
# Transporte stdio (padrao — para clientes MCP como o Claude)
npm start

# Transporte HTTP (para clientes remotos/web)
npm run start:http
```

---

## Configuracao do Cliente MCP

### Claude Desktop / Claude Code

Adicione ao seu arquivo de configuracao MCP:

```json
{
    "mcpServers": {
        "discord": {
            "command": "node",
            "args": ["dist/standalone.js"],
            "cwd": "/path/to/mcp-discord",
            "env": {
                "DISCORD_TOKEN": "your-bot-token-here"
            }
        }
    }
}
```

### Com Gateway (funcionalidades em tempo real)

```json
{
    "mcpServers": {
        "discord": {
            "command": "node",
            "args": ["dist/standalone.js"],
            "cwd": "/path/to/mcp-discord",
            "env": {
                "DISCORD_TOKEN": "your-bot-token-here",
                "DISCORD_USE_GATEWAY": "true"
            }
        }
    }
}
```

---

## Ferramentas

### Servidor / Guild (2 ferramentas)

| Ferramenta | Descricao |
|------------|-----------|
| `list_servers` | Lista todos os servidores Discord que o bot tem acesso |
| `get_server_info` | Obtem informacoes detalhadas sobre um servidor especifico |

### Canais (7 ferramentas)

| Ferramenta | Descricao |
|------------|-----------|
| `get_channels` | Lista todos os canais de um servidor |
| `get_channel` | Obtem informacoes detalhadas sobre um canal |
| `create_channel` | Cria canais de texto, voz, categoria, anuncio, forum ou palco |
| `edit_channel` | Edita nome, topico, NSFW, slowmode, posicao e categoria do canal |
| `delete_channel` | Exclui permanentemente um canal |
| `create_thread` | Cria uma thread em um canal (opcionalmente a partir de uma mensagem) |
| `archive_thread` | Arquiva uma thread |

### Mensagens (8 ferramentas)

| Ferramenta | Descricao |
|------------|-----------|
| `send_message` | Envia mensagens com texto, embeds ricos e respostas |
| `read_messages` | Le mensagens recentes com paginacao (ate 100) |
| `search_messages` | Busca mensagens por conteudo, autor ou canal |
| `edit_message` | Edita uma mensagem do bot |
| `delete_message` | Exclui uma unica mensagem |
| `delete_messages_bulk` | Exclui em massa de 2 a 100 mensagens (com menos de 14 dias) |
| `pin_message` | Fixa uma mensagem |
| `unpin_message` | Desfixxa uma mensagem |

### Reacoes (2 ferramentas)

| Ferramenta | Descricao |
|------------|-----------|
| `add_reaction` | Adiciona reacao com emoji (Unicode ou customizado) |
| `remove_reaction` | Remove uma reacao |

### Membros / Usuarios (4 ferramentas)

| Ferramenta | Descricao |
|------------|-----------|
| `list_members` | Lista membros do servidor com paginacao |
| `get_member` | Obtem informacoes detalhadas do membro (cargos, apelido, data de entrada) |
| `get_user` | Obtem informacoes de qualquer usuario do Discord pelo ID |
| `search_members` | Busca membros por nome de usuario ou apelido |

### Cargos (4 ferramentas)

| Ferramenta | Descricao |
|------------|-----------|
| `list_roles` | Lista todos os cargos com permissoes, cores e contagem de membros |
| `create_role` | Cria um novo cargo |
| `add_role` | Adiciona um cargo a um membro |
| `remove_role` | Remove um cargo de um membro |

### Moderacao (4 ferramentas)

| Ferramenta | Descricao |
|------------|-----------|
| `timeout_user` | Silencia temporariamente um usuario (ate 28 dias) |
| `kick_user` | Expulsa um usuario do servidor |
| `ban_user` | Bane um usuario com exclusao opcional de mensagens |
| `unban_user` | Remove o banimento de um usuario |

### Monitoramento (2 ferramentas)

| Ferramenta | Descricao |
|------------|-----------|
| `get_audit_log` | Visualiza o log de auditoria do servidor (banimentos, expulsoes, alteracoes) |
| `check_mentions` | Encontra @mencoes recentes do bot ou de um usuario |

---

## Arquitetura

```
┌─────────────────────────────────────────────────┐
│                  MCP Client                      │
│          (Claude, Cursor, custom)                │
└──────────────────┬──────────────────────────────┘
                   │ stdio or HTTP
┌──────────────────▼──────────────────────────────┐
│               MCP Server                         │
│         (transport + tool routing)                │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│            Tool Registry                         │
│         (30 tools, Zod validation)               │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│          DiscordProvider (interface)              │
├─────────────────────┬───────────────────────────┤
│ StandaloneProvider  │  IntegratedProvider        │
│ (own token + REST/  │  (uses host bot's          │
│  optional gateway)  │   existing connection)      │
└─────────────────────┴───────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│              Discord API                         │
└─────────────────────────────────────────────────┘
```

**Abstracao de Provider:** as ferramentas MCP nunca acessam o discord.js diretamente. Elas chamam a interface `DiscordProvider`, que tem duas implementacoes:

- **StandaloneProvider** — cria sua propria conexao usando um token de bot. Prioriza REST, com gateway opcional. Use quando rodar como processo separado.
- **IntegratedProvider** — recebe um `Client` discord.js existente do bot hospedeiro. Zero overhead, cache e gateway compartilhados. Use quando embutir em um bot existente.

---

## Guia de Integracao

Para usar o mcp-discord como plugin dentro do seu bot discord.js existente:

```typescript
import { IntegratedProvider, createMcpServer } from 'mcp-discord';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Seu client discord.js existente
const provider = new IntegratedProvider({ client: myDiscordClient });
await provider.connect();

const server = createMcpServer({ provider });
const transport = new StdioServerTransport();
await server.connect(transport);
```

O `IntegratedProvider` utiliza a conexao gateway existente do seu bot — sem WebSocket extra, sem autenticacao extra, sem memoria extra.

---

## Referencia de Configuracao

| Variavel | Obrigatorio | Padrao | Descricao |
|----------|-------------|--------|-----------|
| `DISCORD_TOKEN` | Sim | — | Token do bot Discord |
| `DISCORD_USE_GATEWAY` | Nao | `false` | Conecta ao gateway WebSocket do Discord para funcionalidades em tempo real |
| `MCP_TRANSPORT` | Nao | `stdio` | Modo de transporte: `stdio` ou `http` |
| `MCP_PORT` | Nao | `3100` | Porta do servidor HTTP (apenas quando `MCP_TRANSPORT=http`) |
| `MCP_AUTH_TOKEN` | Nao | — | Bearer token para autenticacao no transporte HTTP |

---

## Contribuindo

Contribuicoes sao bem-vindas! Veja o [CONTRIBUTING.md](CONTRIBUTING.md) para configuracao do ambiente de desenvolvimento, estilo de codigo e como adicionar novas ferramentas.

---

## Licenca

[MIT](LICENSE)

---

## Autor

Criado por [@goul4rt](https://github.com/goul4rt). Nasceu do [delfus.app](https://delfus.app), aberto para a comunidade.
