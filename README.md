# Coleção curada de workflows n8n (prontos para import)

Este repositório agora é focado em dois artefatos apenas:

- `workflows/`: automações n8n em JSON, validadas com as chaves `nodes` e `connections`.
- `templates/`: material de apoio (guias `.md` e bundles `.zip`).

Ferramentas auxiliares vivem em `tools/` e os catálogos exportados ficam em `public/`.

## Estrutura das pastas

```
workflows/
  marketing/ | vendas/ | suporte/ | outros/   # workflows agrupados por heurística
templates/
  *.md / *.zip                                 # guias e packs complementares
public/catalog.json                            # inventário gerado automaticamente
tools/
  cleanup.mjs | build-catalog.mjs              # scripts Node ESM
```

## Como usar os workflows

1. Escolha o arquivo JSON dentro de `workflows/<categoria>/`.
2. Importe diretamente no n8n (`Import from file`).
3. Configure as credenciais exigidas por cada nó (nenhum segredo fica salvo no JSON).
4. Teste o fluxo em modo “test” antes de publicar em produção.

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run cleanup:dry` | Executa o diet em modo leitura, listando tudo que seria movido/removido. |
| `npm run cleanup:apply` | Aplica o diet: mantém apenas workflows/templates válidos. |
| `npm run catalog` | Recria `public/catalog.json` a partir dos workflows vigentes. |

## Licença e avisos

- Os workflows rodam **na sua instância** n8n. Revise permissões e limites antes de executar.
- Remova ou substitua qualquer credencial/secreto depois de importar.
- Sempre que usar assets de terceiros, mantenha a atribuição original do autor.
- Este repositório continua sob a licença mencionada em `LICENSE`.
