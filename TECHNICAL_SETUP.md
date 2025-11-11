# ⚙️ TECHNICAL SETUP - PRONTO PARA LOVABLE

**Objetivo:** Arquivo pronto para copiar/colar no Lovable

---

## 1️⃣ SUPABASE SQL - EXECUTAR PRIMEIRA COISA

```sql
-- Executar em: Supabase Dashboard → SQL Editor → New Query

-- ============================================
-- STEP 1: Criar tipos enums
-- ============================================

CREATE TYPE plan_type AS ENUM ('free', 'starter', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'unpaid');
CREATE TYPE installation_status AS ENUM ('draft', 'active', 'paused', 'error');
CREATE TYPE execution_status AS ENUM ('success', 'failed', 'timeout');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- ============================================
-- STEP 2: Categories table
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
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
  ('outros', 'Outros', '⚙️', '#95A5A6')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- STEP 3: Workflows table
-- ============================================

CREATE TABLE IF NOT EXISTS workflows (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category_id INT NOT NULL REFERENCES categories(id),

  difficulty difficulty_level DEFAULT 'easy',
  estimated_setup_time INT DEFAULT 5,

  workflow_json JSONB NOT NULL,
  required_integrations JSONB DEFAULT '[]'::jsonb,

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

CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category_id);
CREATE INDEX IF NOT EXISTS idx_workflows_min_plan ON workflows(min_plan);
CREATE INDEX IF NOT EXISTS idx_workflows_rating ON workflows(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_workflows_installs ON workflows(installs_count DESC);

-- ============================================
-- STEP 4: User Profiles (extend auth.users)
-- ============================================

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  plan_type plan_type DEFAULT 'free',
  plan_start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  plan_renewal_date TIMESTAMP,
  stripe_customer_id VARCHAR(255) UNIQUE,
  api_key VARCHAR(255) UNIQUE GENERATED ALWAYS AS (
    'sk_' || SUBSTR(MD5(RANDOM()::text), 1, 32)
  ) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 5: Subscriptions (Stripe)
-- ============================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_price_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),

  plan_type plan_type NOT NULL,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,

  status subscription_status DEFAULT 'active',
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- STEP 6: User Installations
-- ============================================

CREATE TABLE IF NOT EXISTS user_installations (
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

CREATE INDEX IF NOT EXISTS idx_installations_user ON user_installations(user_id);
CREATE INDEX IF NOT EXISTS idx_installations_status ON user_installations(status);
CREATE INDEX IF NOT EXISTS idx_installations_date ON user_installations(created_at DESC);

-- ============================================
-- STEP 7: Executions (Logs)
-- ============================================

CREATE TABLE IF NOT EXISTS executions (
  id BIGSERIAL PRIMARY KEY,
  installation_id INT NOT NULL REFERENCES user_installations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workflow_id INT NOT NULL REFERENCES workflows(id),

  status execution_status DEFAULT 'success',
  duration_ms INT,
  error_message TEXT,
  output_data JSONB,

  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_executions_user ON executions(user_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_installation ON executions(installation_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_month ON executions(DATE_TRUNC('month', executed_at), user_id);

-- ============================================
-- STEP 8: Monthly Usage (Rate Limiting)
-- ============================================

CREATE TABLE IF NOT EXISTS monthly_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month DATE NOT NULL,

  executions_count INT DEFAULT 0,
  active_workflows INT DEFAULT 0,

  UNIQUE(user_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_usage_user ON monthly_usage(user_id, year_month);

-- ============================================
-- STEP 9: Reviews
-- ============================================

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  workflow_id INT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  helpful_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(workflow_id, user_id)
);

-- ============================================
-- STEP 10: Enable RLS (Row Level Security)
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Workflows são públicos
ALTER TABLE workflows DISABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read their own profile"
  ON user_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can read their own installations"
  ON user_installations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create installations"
  ON user_installations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read their own subscriptions"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can read their own executions"
  ON executions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can read their own usage"
  ON monthly_usage FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read all reviews"
  ON reviews FOR SELECT
  USING (true);

-- ============================================
-- STEP 11: Helper Views
-- ============================================

CREATE OR REPLACE VIEW user_stats AS
SELECT
  u.id as user_id,
  u.email,
  up.plan_type,
  COALESCE(COUNT(DISTINCT ui.id), 0) as total_installed_workflows,
  COALESCE(SUM(mu.executions_count), 0) as total_executions,
  COALESCE(MAX(e.executed_at), up.created_at) as last_activity
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_installations ui ON u.id = ui.user_id AND ui.status = 'active'
LEFT JOIN monthly_usage mu ON u.id = mu.user_id
LEFT JOIN executions e ON u.id = e.user_id
GROUP BY u.id, u.email, up.plan_type, up.created_at;

CREATE OR REPLACE VIEW workflow_stats AS
SELECT
  w.id,
  w.slug,
  w.name,
  w.installs_count,
  COUNT(DISTINCT r.id) as total_reviews,
  AVG(r.rating) as avg_rating,
  COUNT(DISTINCT ui.id) as active_users,
  COALESCE(SUM(CASE WHEN e.status = 'success' THEN 1 ELSE 0 END), 0) as successful_executions
FROM workflows w
LEFT JOIN reviews r ON w.id = r.workflow_id
LEFT JOIN user_installations ui ON w.id = ui.workflow_id AND ui.status = 'active'
LEFT JOIN executions e ON ui.id = e.installation_id
GROUP BY w.id;

-- ============================================
-- STEP 12: Seed Initial Workflows (Sample)
-- ============================================

-- Adicionar um workflow de exemplo (você vai importar 2060 depois)
INSERT INTO workflows (
  slug,
  name,
  description,
  category_id,
  difficulty,
  estimated_setup_time,
  workflow_json,
  required_integrations,
  min_plan,
  feature_image_url,
  search_keywords
) VALUES (
  'email-automation-welcome',
  'Email Automation - Welcome Series',
  'Send automated welcome emails to new customers',
  (SELECT id FROM categories WHERE slug = 'marketing'),
  'easy',
  5,
  '{"nodes": [], "connections": []}'::jsonb,
  '["gmail", "airtable"]'::jsonb,
  'free',
  'https://images.unsplash.com/photo-1557821552-17105176677c?w=500&q=80',
  'email,marketing,automation,welcome'
);

-- ============================================
-- STEP 13: Crear Stripe Webhook Function
-- ============================================

CREATE OR REPLACE FUNCTION handle_stripe_webhook(
  stripe_event JSONB
) RETURNS JSON AS $$
DECLARE
  event_type VARCHAR;
  customer_id VARCHAR;
  subscription_id VARCHAR;
  price_id VARCHAR;
  plan_name VARCHAR;
BEGIN
  event_type := stripe_event->>'type';

  CASE event_type
    WHEN 'customer.subscription.created' THEN
      customer_id := stripe_event->'data'->'object'->>'customer';
      subscription_id := stripe_event->'data'->'object'->>'id';
      price_id := stripe_event->'data'->'object'->'items'->'data'->0->>'price';

      -- Mapear price_id para plan
      SELECT CASE
        WHEN price_id = 'price_1Px...' THEN 'starter'
        WHEN price_id = 'price_1Py...' THEN 'pro'
        ELSE 'free'
      END INTO plan_name;

      -- Atualizar subscription no DB
      INSERT INTO subscriptions (
        user_id,
        stripe_subscription_id,
        stripe_price_id,
        stripe_customer_id,
        plan_type,
        current_period_start,
        current_period_end,
        status
      )
      SELECT
        up.user_id,
        subscription_id,
        price_id,
        customer_id,
        plan_name::plan_type,
        NOW(),
        NOW() + INTERVAL '1 month',
        'active'::subscription_status
      FROM user_profiles up
      WHERE up.stripe_customer_id = customer_id
      ON CONFLICT (user_id) DO UPDATE SET
        stripe_subscription_id = subscription_id,
        stripe_price_id = price_id,
        plan_type = plan_name::plan_type,
        status = 'active'::subscription_status;

      RETURN json_build_object('status', 'success', 'action', 'subscription_created');

    WHEN 'customer.subscription.deleted' THEN
      subscription_id := stripe_event->'data'->'object'->>'id';

      UPDATE subscriptions
      SET status = 'canceled'::subscription_status
      WHERE stripe_subscription_id = subscription_id;

      UPDATE user_profiles
      SET plan_type = 'free'::plan_type
      WHERE stripe_customer_id = stripe_event->'data'->'object'->>'customer';

      RETURN json_build_object('status', 'success', 'action', 'subscription_deleted');

    ELSE
      RETURN json_build_object('status', 'ignored', 'type', event_type);
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FIM - Database Setup Completo!
-- ============================================

-- Para testar:
-- SELECT * FROM categories;
-- SELECT COUNT(*) FROM workflows;
```

---

## 2️⃣ ENVIRONMENT VARIABLES (.env.local)

```bash
# SUPABASE
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJXXX...

# STRIPE (pegar em https://dashboard.stripe.com/apikeys)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# OPTIONAL: Analytics
VITE_MIXPANEL_TOKEN=xxxxx
VITE_PLAUSIBLE_DOMAIN=seu-dominio.com
```

---

## 3️⃣ SUPABASE STORAGE SETUP

```bash
# 1. Criar bucket para imagens
# Supabase Dashboard → Storage → New Bucket
# Nome: "workflow-images"
# Público: YES

# 2. RLS Policy para storage
-- INSERT na tabela storage.objects:
CREATE POLICY "Allow public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'workflow-images');

CREATE POLICY "Allow authenticated uploads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'workflow-images');
```

---

## 4️⃣ STRIPE SETUP (Checklist)

1. Criar conta em https://stripe.com
2. Ir para Developers → API Keys
3. Copiar:
   - **Publishable Key:** pk_live_xxx → VITE_STRIPE_PUBLISHABLE_KEY
   - **Secret Key:** sk_live_xxx → Salvar em Supabase Secrets

4. Criar Products:
   ```
   Product: "Starter Plan"
   Price: $20/month
   Price ID: price_1Px... (copiar)

   Product: "Pro Plan"
   Price: $60/month
   Price ID: price_1Py... (copiar)
   ```

5. Webhook:
   - Ir para Developers → Webhooks
   - Add Endpoint: https://seu-dominio.com/api/stripe-webhook
   - Events: checkout.session.completed, customer.subscription.deleted
   - Copy Signing Secret

---

## 5️⃣ TYPESCRIPT TYPES (database.types.ts)

```typescript
// Gerado pelo: supabase gen types typescript

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: number;
          slug: string;
          name: string;
          description: string | null;
          icon: string | null;
          color: string | null;
          workflow_count: number;
          created_at: string;
        };
      };
      workflows: {
        Row: {
          id: number;
          slug: string;
          name: string;
          description: string;
          category_id: number;
          difficulty: 'easy' | 'medium' | 'hard';
          estimated_setup_time: number;
          workflow_json: object;
          required_integrations: string[];
          min_plan: 'free' | 'starter' | 'pro' | 'enterprise';
          installs_count: number;
          stars_count: number;
          views_count: number;
          average_rating: number;
          feature_image_url: string | null;
          demo_video_url: string | null;
          search_keywords: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      user_profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          plan_type: 'free' | 'starter' | 'pro' | 'enterprise';
          plan_start_date: string;
          plan_renewal_date: string | null;
          stripe_customer_id: string | null;
          api_key: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      subscriptions: {
        Row: {
          id: number;
          user_id: string;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          stripe_customer_id: string | null;
          plan_type: 'free' | 'starter' | 'pro' | 'enterprise';
          current_period_start: string;
          current_period_end: string;
          status: 'active' | 'past_due' | 'canceled' | 'unpaid';
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      user_installations: {
        Row: {
          id: number;
          user_id: string;
          workflow_id: number;
          status: 'draft' | 'active' | 'paused' | 'error';
          n8n_workflow_id: number | null;
          setup_config: object | null;
          last_execution: string | null;
          executions_this_month: number;
          created_at: string;
          updated_at: string;
        };
      };
      executions: {
        Row: {
          id: number;
          installation_id: number;
          user_id: string;
          workflow_id: number;
          status: 'success' | 'failed' | 'timeout';
          duration_ms: number | null;
          error_message: string | null;
          output_data: object | null;
          executed_at: string;
        };
      };
      monthly_usage: {
        Row: {
          id: number;
          user_id: string;
          year_month: string;
          executions_count: number;
          active_workflows: number;
        };
      };
      reviews: {
        Row: {
          id: number;
          workflow_id: number;
          user_id: string;
          rating: number;
          comment: string | null;
          helpful_count: number;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};
```

---

## 6️⃣ package.json

```json
{
  "name": "n8n-saas",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@supabase/supabase-js": "^2.38.0",
    "@stripe/react-stripe-js": "^2.4.0",
    "@stripe/stripe-js": "^2.1.0",
    "@tanstack/react-query": "^5.25.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.3.0",
    "lucide-react": "^0.292.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.36",
    "@types/react-dom": "^18.2.15",
    "@types/node": "^20.9.0",
    "typescript": "^5.2.2",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "postcss": "^8.4.31",
    "autoprefixer": "^10.4.16",
    "tailwindcss": "^3.3.0"
  }
}
```

---

## 7️⃣ PRICE IDs PARA STRIPE

**IMPORTANTE:** Você vai gerar esses IDs no Stripe Dashboard

```typescript
// src/lib/constants.ts

export const STRIPE_PRICES = {
  starter: {
    id: 'price_1Px...', // PREENCHER com ID do Stripe
    name: 'Starter',
    price: 2000, // $20 em cents
    currency: 'usd',
    interval: 'month',
    description: '50 workflows, 5.000 execuções/mês',
  },
  pro: {
    id: 'price_1Py...', // PREENCHER com ID do Stripe
    name: 'Pro',
    price: 6000, // $60 em cents
    currency: 'usd',
    interval: 'month',
    description: '500 workflows, 50.000 execuções/mês',
  },
};

export const PLAN_LIMITS = {
  free: {
    workflows: 5,
    executions_per_month: 500,
    team_members: 1,
    api_calls: 0,
  },
  starter: {
    workflows: 50,
    executions_per_month: 5000,
    team_members: 2,
    api_calls: 5000,
  },
  pro: {
    workflows: 500,
    executions_per_month: 50000,
    team_members: 5,
    api_calls: 50000,
  },
  enterprise: {
    workflows: 999999,
    executions_per_month: 999999,
    team_members: 999999,
    api_calls: 999999,
  },
};
```

---

## 8️⃣ ARQUIVOS JSON DOS 2060 WORKFLOWS

```bash
# Copiar o catálogo para a pasta pública

# De:
/Users/pedro/n8n-workflows/public/catalog.json

# Para:
seu-projeto-lovable/public/workflows-catalog.json

# E copiar workflows:
/Users/pedro/n8n-workflows/workflows/ → seu-projeto/public/workflows/
```

---

## ✅ CHECKLIST ANTES DE LEVAR PRO LOVABLE

- [ ] SQL executado no Supabase
- [ ] .env.local configurado
- [ ] Stripe account criado
- [ ] Supabase Storage configurado
- [ ] RLS policies habilitadas
- [ ] Webhooks Stripe configurados
- [ ] Catalog JSON exportado
- [ ] 2060 workflows JSON copiados
- [ ] package.json revisado

---

**Quando tudo estiver pronto, enviar para Lovable com este arquivo!**

