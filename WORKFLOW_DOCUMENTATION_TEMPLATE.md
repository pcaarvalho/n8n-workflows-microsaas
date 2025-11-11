# 📋 WORKFLOW DOCUMENTATION TEMPLATE

Use este template para documentar cada workflow importante. Lovable irá exibir essas informações.

---

## EXEMPLO: Email Automation - Welcome Series

### 🎯 Objetivo
Enviar série de 5 emails automáticos para novos clientes, aumentando engagement em 40%.

### 📊 Estatísticas
- **Installs:** 500+
- **Rating:** 4.8/5 ⭐
- **Tempo de Setup:** 5 minutos
- **Dificuldade:** 🟢 Fácil
- **Categoria:** Marketing

---

## 🔧 Configuração Necessária

### Integrações Obrigatórias
- [ ] **Gmail** - Conta Google com permissão de envio
- [ ] **Airtable** - Base com tabela de contatos
- [ ] **Zapier** (opcional) - Para sincronização adicional

### Credenciais Necessárias
1. **Gmail API Key**
   - Gerar em: https://console.cloud.google.com/
   - Scopes necessários: `gmail.send`, `gmail.labels`

2. **Airtable API Token**
   - Gerar em: https://airtable.com/account/tokens
   - Permissões: `data.records:read`, `data.records:write`

3. **Webhook URL (seu site)**
   - Usar para rastrear cliques em emails

---

## 📝 Passo a Passo Setup

### PASSO 1: Conectar Gmail (2 minutos)
```
1. Clique em "Gmail" na interface
2. Selecione "Send Email"
3. Faça login com sua conta Google
4. Autorize acesso
5. Pronto ✅
```

### PASSO 2: Conectar Airtable (2 minutos)
```
1. Vá para Airtable → Sua Base
2. Copie o ID da base: https://airtable.com/app/XXX/tblXXX
3. Gere API token em: https://airtable.com/account/tokens
4. Cole no n8n
5. Pronto ✅
```

### PASSO 3: Configurar Templates de Email (1 minuto)
```
Editar os 5 templates:
- Email 1: Bem-vindo! (1h após signup)
- Email 2: Dica de uso (1 dia após)
- Email 3: Case de sucesso (3 dias após)
- Email 4: Desconto exclusivo (5 dias após)
- Email 5: Suporte disponível (7 dias após)

Deixar placeholders:
{{name}} = nome do cliente
{{product_name}} = nome do seu produto
```

---

## 🎨 Resultado Final

### O que acontece:
```
NOVO CLIENTE SE INSCREVE
        ↓
[Workflow Acionado]
        ↓
Email 1: Bem-vindo [nome]! (1h)
        ↓
Email 2: Veja como outros usam... (1 dia)
        ↓
Email 3: Caso de sucesso: Empresa X economizou R$ 5k (3 dias)
        ↓
Email 4: Você merece 20% off [nome]! (5 dias)
        ↓
Email 5: Time de suporte pronto para ajudar (7 dias)
        ↓
[Cliente engajado + conversão de upgrade]
```

---

## 📈 Métricas para Rastrear

| Métrica | Esperado | Sua Taxa |
|---------|----------|---------|
| Open Rate | 35%+ | ___ |
| Click Rate | 5%+ | ___ |
| Conversion (Free→Paid) | 10%+ | ___ |
| Days to First Purchase | 5-10 dias | ___ |

---

## ❌ Troubleshooting

### Emails não estão sendo enviados
- [ ] Verificar Gmail autenticado corretamente
- [ ] Verificar Airtable tem novos contatos
- [ ] Executar workflow manualmente para testar

### Muitos emails sendo enviados duplicadamente
- [ ] Verificar se workflow tem 2 triggers acionados
- [ ] Usar `Unique` node para deduplicação

### Airtable não está sendo atualizado
- [ ] Verificar permissões do API token
- [ ] Verificar ID da tabela/campo está correto

---

## 🚀 Próximos Passos

### Otimizações Simples:
1. **A/B Testing:** Testar 2 versões de assuntos
2. **Segmentação:** Diferentes séries por tipo de cliente
3. **Integração SMS:** Adicionar SMS no dia 3

### Integrar com:
- Stripe (se vende produto)
- Slack (notificar vendas quando cliente compra)
- Google Sheets (backup dos contatos)

---

## 📚 Documentação Completa

**Workflow JSON:** `email-automation-welcome.json`

**Nodes Inclusos:**
1. **Airtable Trigger** - Acionado quando novo contato chega
2. **Delay** - Espera antes de cada email
3. **Gmail Send** - Envia email personalizado (×5)
4. **Webhook** - Rastreia cliques

---

## 🎁 Bônus: Variações

Depois que rodar este, você pode criar:

1. **Welcome Series + SMS**
   - Adicionar Twilio para SMS
   - Mensagens mais curtas no celular

2. **Onboarding + Video**
   - Enviar vídeo tutorial (YouTube)
   - Rastrear visualizações

3. **Abandoned Cart Recovery**
   - Modificar para enviar quando cliente abandona carrinho
   - Ofertar desconto para reconquistar

---

## 💡 Dicas Extras

### ✅ Melhores práticas:
- **Personalize:** Usar {{name}} em tudo
- **Timing:** Horários melhores: 9am, 2pm, 5pm
- **Frequência:** Máximo 1 email/dia por série
- **Subject:** Testar sujeitos curtos (<40 chars)

### ❌ Evitar:
- Muitos emails de uma vez (spam)
- Designs muito complexos
- Links sem rastreamento

---

## 📞 Precisa de Suporte?

- **Documentação:** https://n8n.io/docs
- **Community:** https://community.n8n.io
- **Suporte Premium:** suporte@seu-dominio.com

---

---

# 📋 TEMPLATE VAZIO (USE PARA OUTROS WORKFLOWS)

## [NOME DO WORKFLOW]

### 🎯 Objetivo
[O que o workflow faz em 1 frase]

### 📊 Estatísticas
- **Installs:** [Número]
- **Rating:** [X/5] ⭐
- **Tempo de Setup:** [X minutos]
- **Dificuldade:** 🟢 Fácil / 🟡 Médio / 🔴 Difícil
- **Categoria:** [Marketing/Vendas/Suporte/Outro]

### 🔧 Configuração Necessária
- [ ] **Integração 1:** Descrição
- [ ] **Integração 2:** Descrição

### 📝 Passo a Passo Setup
```
Passo 1: ...
Passo 2: ...
Passo 3: ...
```

### 🎨 Resultado Final
[Descrever o fluxo esperado]

### 📈 KPIs
[Métricas a rastrear]

### ❌ Troubleshooting
[Problemas comuns + soluções]

### 🚀 Próximos Passos
[Como estender este workflow]

---

# 🎯 TOP 20 WORKFLOWS PARA DOCUMENTAR (PRIORIDADE)

Baseado em 2.060 workflows, focar documentação nestes (maior ROI):

## Marketing (10)
1. Email Automation - Welcome Series
2. Email Automation - Newsletter Sender
3. Social Media - Auto-post Instagram/LinkedIn
4. Lead Scoring - Airtable CRM
5. Google Sheets - Contact Database Sync
6. SMS Marketing - Bulk Send
7. Landing Page - Form to CRM
8. Content Calendar - HubSpot Integration
9. Email List Cleanup - Remove Invalid
10. Marketing Analytics - Dashboard Auto-Update

## Sales (5)
1. Pipeline Automation - Deal Notifications Slack
2. Follow-up Reminders - Overdue Leads
3. Proposal Generator - Google Docs
4. Contract Management - DocuSign Auto-Send
5. Revenue Dashboard - Stripe Integration

## Support (5)
1. Ticket Automation - Email to Ticketing System
2. FAQ Chatbot - OpenAI Integration
3. Survey Response - Post-Interaction
4. Escalation Rules - Priority Queue
5. Knowledge Base - Auto-Categorize Articles

---

## 📝 COMO GERAR DOCUMENTAÇÃO EM MASSA

### Usando Script Python (você pode rodar):

```python
import json
import os

workflows_dir = "workflows"
docs_output = "docs/workflows"

os.makedirs(docs_output, exist_ok=True)

for category in os.listdir(workflows_dir):
    category_path = os.path.join(workflows_dir, category)

    if not os.path.isdir(category_path):
        continue

    for workflow_file in os.listdir(category_path):
        if not workflow_file.endswith('.json'):
            continue

        with open(os.path.join(category_path, workflow_file)) as f:
            workflow = json.load(f)

        # Gerar markdown básico
        doc = f"""# {workflow.get('name', workflow_file)}

### 🎯 Objetivo
[Descrição automática a partir do n8n]

### 🔧 Integrações
{', '.join(workflow.get('tags', []))}

### 📝 Setup
Ver documentação em n8n.

---
"""

        # Salvar
        output_file = os.path.join(
            docs_output,
            f"{workflow_file.replace('.json', '.md')}"
        )
        with open(output_file, 'w') as f:
            f.write(doc)

print("✅ Documentação gerada!")
```

---

**Use este arquivo como referência ao documentar cada workflow para Lovable!**

