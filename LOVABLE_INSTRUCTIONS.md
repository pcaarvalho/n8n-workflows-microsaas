# 🚀 INSTRUÇÕES DETALHADAS PARA LOVABLE

**Versão:** 1.0
**Data:** 2025-11-11
**Status:** PRONTO PARA IMPLEMENTAÇÃO

---

## 📋 BRIEF EXECUTIVO

**Nome do Projeto:** n8n Workflows SaaS
**Descrição Curta:** Marketplace de automações prontas. 2.000+ workflows, 4 planos de preço, Stripe + Supabase.

**Stack Obrigatório:**
- ✅ React 18 + TypeScript
- ✅ Vite (build tool)
- ✅ Tailwind CSS
- ✅ Supabase (database + auth + storage)
- ✅ Stripe integration

**Timeline:** MVP em 7 dias

---

## 🎯 FEATURES CRÍTICAS (MVP)

### Tier 1: IMPRESCINDÍVEL
```
Landing Page
├── Hero section com CTA
├── 3 features destacadas
├── Pricing table (side-by-side)
└── Footer com links

Authentication
├── Sign-up (email + password)
├── Sign-in
├── Password reset
└── Email verification

Marketplace (Catalog)
├── Grid de workflows (20 por página)
├── Search bar (busca simples)
├── Filtro por categoria (4: marketing, vendas, suporte, outros)
├── Cards com: nome, descrição, installs, rating
└── Pagination ou infinite scroll

Workflow Detail
├── Modal ou página dedicada
├── Description + setup time
├── Screenshot/preview
├── Required integrations
├── Install button

Dashboard (Protected)
├── Overview: Total installs, Next billing date
├── Installed workflows list
├── Quick install CTA

Billing (Stripe)
├── Current plan display
├── Upgrade button → Stripe checkout
├── Usage gauge (executions this month)
```

### Tier 2: IMPORTANTE (Deploy em Semana 2)
```
Analytics
├── Executions chart (últimos 30 dias)
├── Top workflows by usage
├── Cost breakdown

Settings
├── Profile management
├── API key generation
├── Billing history

Reviews
├── Star rating per workflow
├── User comments
```

---

## 🗄️ BANCO DE DADOS SUPABASE

### TABELAS ESSENCIAIS

```sql
-- 1. Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enum types
CREATE TYPE plan_type AS ENUM ('free', 'starter', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'unpaid');
CREATE TYPE installation_status AS ENUM ('draft', 'active', 'paused', 'error');
CREATE TYPE execution_status AS ENUM ('success', 'failed', 'timeout');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- 3. Categories
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  color VARCHAR(7),
  workflow_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categories (slug, name, icon, color) VALUES
  ('marketing', 'Marketing', '📧', '#FF6B6B'),
  ('vendas', 'Vendas', '💰', '#4ECDC4'),
  ('suporte', 'Suporte', '🎧', '#45B7D1'),
  ('outros', 'Outros', '⚙️', '#95A5A6');

-- 4. Workflows (Catálogo)
CREATE TABLE workflows (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category_id INT NOT NULL REFERENCES categories(id),

  difficulty difficulty_level DEFAULT 'easy',
  estimated_setup_time INT DEFAULT 5,

  workflow_json JSONB NOT NULL,
  required_integrations JSONB DEFAULT '[]',

  min_plan plan_type DEFAULT 'free',

  installs_count INT DEFAULT 0,
  stars_count INT DEFAULT 0,
  views_count INT DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,

  feature_image_url TEXT,
  demo_video_url TEXT,
  search_keywords VARCHAR(500),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflows_category ON workflows(category_id);
CREATE INDEX idx_workflows_min_plan ON workflows(min_plan);
CREATE INDEX idx_workflows_rating ON workflows(average_rating DESC);

-- 5. Users (via Supabase Auth)
-- IMPORTANTE: Users já vêm com Supabase Auth
-- Apenas adicionar campos customizados

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  plan_type plan_type DEFAULT 'free',
  plan_start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  plan_renewal_date TIMESTAMP,
  stripe_customer_id VARCHAR(255) UNIQUE,
  api_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Subscriptions (Stripe)
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_price_id VARCHAR(255),

  plan_type plan_type NOT NULL,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,

  status subscription_status DEFAULT 'active',
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. User Installations
CREATE TABLE user_installations (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id INT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,

  status installation_status DEFAULT 'draft',
  n8n_workflow_id INT,
  setup_config JSONB,

  last_execution TIMESTAMP,
  executions_this_month INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, workflow_id)
);

CREATE INDEX idx_installations_user ON user_installations(user_id);
CREATE INDEX idx_installations_status ON user_installations(status);

-- 8. Executions (Logs)
CREATE TABLE executions (
  id BIGSERIAL PRIMARY KEY,
  installation_id INT NOT NULL REFERENCES user_installations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workflow_id INT NOT NULL REFERENCES workflows(id),

  status execution_status DEFAULT 'success',
  duration_ms INT,
  error_message TEXT,

  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_executions_user ON executions(user_id, executed_at DESC);
CREATE INDEX idx_executions_month ON executions(DATE_TRUNC('month', executed_at));

-- 9. Monthly Usage (Rate Limiting)
CREATE TABLE monthly_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month DATE NOT NULL,

  executions_count INT DEFAULT 0,
  active_workflows INT DEFAULT 0,

  UNIQUE(user_id, year_month)
);

-- 10. Reviews
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  workflow_id INT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  helpful_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES (Usuário só vê seus próprios dados)
CREATE POLICY "Users can read their own profile"
  ON user_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can read their own installations"
  ON user_installations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can read their own subscriptions"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can read public workflows"
  ON workflows FOR SELECT
  USING (true);
```

### SETUP SUPABASE CLI

```bash
# 1. Instalar Supabase CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Link projeto
supabase link --project-ref seu_project_ref

# 4. Executar migrations
supabase db push

# 5. Gerar tipos TypeScript
supabase gen types typescript > src/database.types.ts
```

---

## 🔌 STRIPE INTEGRATION

### STRIPE PRICE IDs (você vai preencher)

```typescript
// src/lib/constants.ts

export const STRIPE_PRICES = {
  starter: {
    priceId: 'price_1Px...', // Preencher após criar no Stripe
    amount: 2000, // USD $20
    currency: 'usd',
    interval: 'month',
  },
  pro: {
    priceId: 'price_1Py...',
    amount: 6000, // USD $60
    currency: 'usd',
    interval: 'month',
  },
  enterprise: {
    custom: true,
    amount: 0,
  },
};

export const PLAN_LIMITS = {
  free: {
    workflows_limit: 5,
    executions_per_month: 500,
    team_members: 1,
  },
  starter: {
    workflows_limit: 50,
    executions_per_month: 5000,
    team_members: 2,
  },
  pro: {
    workflows_limit: 500,
    executions_per_month: 50000,
    team_members: 5,
  },
  enterprise: {
    workflows_limit: 999999,
    executions_per_month: 999999,
    team_members: 999999,
  },
};
```

### STRIPE WEBHOOK

```typescript
// Supabase Edge Function: supabase/functions/stripe-webhook/index.ts

import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export default async (req: Request) => {
  const signature = req.headers.get('stripe-signature')!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );
  } catch {
    return new Response('Webhook Error', { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;

      // Update subscription no Supabase
      const subscription = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
      });

      if (subscription.data.length > 0) {
        const sub = subscription.data[0];

        await supabase.from('subscriptions').upsert({
          stripe_subscription_id: sub.id,
          stripe_price_id: sub.items.data[0].price.id,
          plan_type: getPlanTypeFromPriceId(sub.items.data[0].price.id),
          current_period_start: new Date(sub.current_period_start * 1000),
          current_period_end: new Date(sub.current_period_end * 1000),
          status: 'active',
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

function getPlanTypeFromPriceId(priceId: string): string {
  const mapping: Record<string, string> = {
    'price_1Px...': 'starter',
    'price_1Py...': 'pro',
  };
  return mapping[priceId] || 'free';
}
```

---

## 📁 ESTRUTURA DE PASTAS VITE

```
src/
├── main.tsx
├── index.css
│
├── lib/
│   ├── supabase.ts           # Cliente Supabase
│   ├── stripe.ts             # Stripe client
│   ├── constants.ts          # PRICING, LIMITS, API
│   └── utils.ts              # Helpers
│
├── hooks/
│   ├── useAuth.ts            # auth context
│   ├── useUser.ts            # user data
│   ├── useWorkflows.ts       # fetch workflows (React Query)
│   └── useSubscription.ts    # current plan
│
├── components/
│   ├── Layout.tsx
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   │
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── ProtectedRoute.tsx
│   │
│   ├── marketplace/
│   │   ├── WorkflowCard.tsx
│   │   ├── WorkflowGrid.tsx
│   │   ├── SearchBar.tsx
│   │   ├── FilterSidebar.tsx
│   │   └── WorkflowDetail.tsx
│   │
│   ├── dashboard/
│   │   ├── Overview.tsx
│   │   ├── InstalledList.tsx
│   │   └── InstallModal.tsx
│   │
│   └── billing/
│       ├── PricingTable.tsx
│       ├── UpgradeModal.tsx
│       └── UsageGauge.tsx
│
├── pages/
│   ├── Landing.tsx
│   ├── Marketplace.tsx
│   ├── Dashboard.tsx
│   ├── Billing.tsx
│   ├── Settings.tsx
│   └── NotFound.tsx
│
├── types/
│   ├── index.ts
│   └── database.types.ts    # Gerado por Supabase CLI
│
└── App.tsx
```

---

## 🔑 ENVIRONMENT VARIABLES

```bash
# .env.local (NÃO COMMITAR!)

# Supabase
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxx...

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# API
VITE_API_URL=http://localhost:3000

# Analytics (opcional)
VITE_MIXPANEL_TOKEN=xxx
```

---

## 🎨 TAILWIND CUSTOMIZATION

```javascript
// tailwind.config.js

export default {
  content: ['./src/**/*.{jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FF6B6B',
        secondary: '#4ECDC4',
        accent: '#45B7D1',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
```

---

## 📱 RESPONSIVE BREAKPOINTS

```typescript
// Use shadcn/ui responsiveness
// mobile-first: xs (default) → sm → md → lg → xl → 2xl

// Examples:
// <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
// <button className="text-sm md:text-base lg:text-lg">
```

---

## 🧪 EXEMPLO: COMPONENTE WorkflowCard

```typescript
// src/components/marketplace/WorkflowCard.tsx

import { useState } from 'react';
import { Workflow } from '@/types';

interface WorkflowCardProps {
  workflow: Workflow;
  onInstall: (workflowId: number) => void;
}

export function WorkflowCard({ workflow, onInstall }: WorkflowCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleInstall = async () => {
    setIsLoading(true);
    try {
      await onInstall(workflow.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-4">
      {/* Image */}
      {workflow.feature_image_url && (
        <img
          src={workflow.feature_image_url}
          alt={workflow.name}
          className="w-full h-40 object-cover rounded-md mb-4"
        />
      )}

      {/* Title */}
      <h3 className="text-lg font-bold mb-2">{workflow.name}</h3>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
        {workflow.description}
      </p>

      {/* Metadata */}
      <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
        <span>📥 {workflow.installs_count} installs</span>
        <span>⭐ {workflow.average_rating || 'N/A'}</span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-4">
        {workflow.required_integrations?.map((int) => (
          <span
            key={int}
            className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
          >
            {int}
          </span>
        ))}
      </div>

      {/* CTA Button */}
      <button
        onClick={handleInstall}
        disabled={isLoading}
        className="w-full bg-primary text-white py-2 rounded-md font-medium hover:bg-opacity-90 disabled:opacity-50"
      >
        {isLoading ? 'Instalando...' : 'Instalar'}
      </button>
    </div>
  );
}
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Antes de Deploy
- [ ] Variáveis de ambiente configuradas
- [ ] Stripe webhook URL configurada
- [ ] Supabase RLS policies ativadas
- [ ] Email verification habilitada
- [ ] CORS configurado
- [ ] SSL certificate (Vercel automático)

### Deploy Steps
```bash
# 1. Build
npm run build

# 2. Preview localmente
npm run preview

# 3. Push para GitHub
git add .
git commit -m "feat: initial MVP"
git push origin main

# 4. Vercel (conectado ao GitHub)
# Deploy automático ao push em main
```

---

## 📊 ANALYTICS SETUP (Mixpanel)

```typescript
// src/lib/analytics.ts

import { Mixpanel } from 'mixpanel-browser';

const mixpanel = Mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN);

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  mixpanel.track(eventName, properties);
};

export const trackPageView = (pageName: string) => {
  trackEvent('page_view', { page: pageName });
};

// Usage:
// trackEvent('workflow_installed', { workflow_id: 123, plan: 'starter' });
// trackEvent('upgrade_clicked', { from_plan: 'free', to_plan: 'pro' });
```

---

## ✅ ACCEPTANCE CRITERIA (MVP)

### Landing Page
- [ ] Hero section visível e responsivo
- [ ] CTA buttons funcionais
- [ ] Pricing section visível
- [ ] Footer com links

### Auth Flow
- [ ] Sign-up funciona
- [ ] Email verification
- [ ] Sign-in funciona
- [ ] Password reset funciona

### Marketplace
- [ ] Lista de workflows carrega
- [ ] Search funciona
- [ ] Filtros funcionam
- [ ] Cards exibem corretamente

### Install Flow
- [ ] Botão install funciona
- [ ] Modal/página de confirmação
- [ ] Workflow aparece em "My Workflows"

### Billing
- [ ] Plano atual exibido
- [ ] Upgrade button → Stripe checkout
- [ ] Webhook Stripe atualiza DB

### Dashboard
- [ ] Overview KPIs
- [ ] Installed list
- [ ] Usage gauge

---

## 🆘 SUPORTE

### Se der erro no Supabase
```bash
# Checar logs
supabase functions logs stripe-webhook

# Local development
supabase start
supabase db reset
```

### Se Stripe não funcionar
- Verificar STRIPE_SECRET_KEY está no Supabase Secrets
- Testar webhook com Stripe CLI: `stripe listen`
- Verificar price IDs estão corretos

### Performance Issues
- Adicionar índices SQL (já incluso)
- Usar React Query para cache
- Lazy load images
- Code splitting com React.lazy

---

## 📝 DEPLOYMENT FINAL

**Quando tudo estiver pronto:**

1. **Supabase:** Deploy automático
2. **Vercel:** Deploy automático (GitHub push)
3. **Stripe:** Ativar live mode (swap test keys)
4. **Email:** Configurar Resend (ou SendGrid)
5. **Analytics:** Ativar Mixpanel

---

## 🎯 PRÓXIMAS VERSÕES (Roadmap)

- **v1.1:** Team collaboration
- **v1.2:** Custom workflows builder
- **v1.3:** Workflow templates marketplace
- **v2.0:** White-label solution

---

**Documento finalizado. Pronto para Lovable!**

