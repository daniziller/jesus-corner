# Jesus' Corner — Web PWA

App bíblico progressivo (PWA) construído com **React + Vite**.

## Stack

| Camada       | Tecnologia              |
|--------------|-------------------------|
| UI           | React 18                |
| Build        | Vite 5                  |
| PWA          | vite-plugin-pwa         |
| Tipografia   | Montserrat (Google Fonts)|
| Estilo       | CSS Variables custom    |
| Estado       | useState / useEffect    |

---

## Setup rápido

```bash
# 1. Instalar dependências
npm install

# 2. Rodar em desenvolvimento
npm run dev

# 3. Build para produção
npm run build

# 4. Testar build de produção (com PWA)
npm run preview
```

Abrir `http://localhost:5173` no navegador.

Para instalar como PWA no celular:
1. Abrir no Chrome ou Safari
2. Menu → "Adicionar à tela inicial"

---

## Estrutura do projeto

```
src/
├── App.jsx                     # Raiz: estado global e navegação entre abas
├── main.jsx                    # Entry point React
├── index.css                   # Design system completo (variáveis CSS)
│
├── components/
│   ├── BottomNav.jsx           # Barra de navegação inferior
│   ├── acts/
│   │   └── ActsCard.jsx        # Card expansível ACTS (acordeão)
│   └── prayer/
│       └── PrayerRequests.jsx  # Sistema de pedidos de oração
│
├── screens/
│   ├── HomeScreen.jsx          # Início: anel %, sessão do dia, stats
│   ├── PrayerScreen.jsx        # Oração: timer + ACTS + pedidos
│   ├── JourneyScreen.jsx       # Jornada: mapa dos 8 blocos + cronograma
│   ├── ReadingScreen.jsx       # Leitura: lista de sessões
│   ├── ProgressScreen.jsx      # Progresso: anel grande + barras por bloco
│   └── ProfileScreen.jsx       # Perfil: dados + configurações
│
└── data/
    └── bibleBlocks.js          # Dados dos 8 blocos + sessões + planos
```

---

## Backend — Supabase

O app já usa Supabase (Postgres + Auth) para autenticação e sincronização de
progresso entre dispositivos — não é mais localStorage-only. Para rodar
localmente:

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. Em **Project Settings → API**, copie a Project URL e a chave anon.
3. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY`.
4. No **SQL Editor** do projeto, rode a migração em
   `supabase/migrations/0001_user_data.sql`.
5. Em **Authentication → Email Templates**, configure o template de
   recuperação de senha no formato OTP numérico (o app usa um código de 6
   dígitos, não um link mágico).

## Próximos passos para produção

### 1. Texto bíblico NVI
- API licenciada: `https://scripture.api.bible`
- Ou banco de dados próprio (requer licença da Biblica)

### 2. Deploy
```bash
# Vercel (mais simples)
npm install -g vercel
vercel

# Ou Netlify
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### 6. Ícones do app
Adicionar em `public/icons/`:
- `icon-192.png` (192×192px)
- `icon-512.png` (512×512px)

Usar o logo do Jesus' Corner como base.

---

## Variáveis CSS do Design System

```css
--or: #F97316      /* Laranja principal */
--olt: #FFF0E6     /* Laranja claro (backgrounds) */
--bk: #121212      /* Preto principal */
--g1 a --g6        /* Escala de cinzas */
--gr: #16A34A      /* Verde (pedidos atendidos) */
--re: #DC2626      /* Vermelho (pedidos negados) */
```

---

## Algoritmo de sessões por palavras (NVI)

A divisão das sessões segue a regra:
1. Sempre começa no início de um capítulo
2. Nunca interrompe um capítulo no meio
3. Soma capítulos consecutivos até atingir a meta
4. Se ultrapassar, conclui o capítulo inteiro
5. Próxima sessão começa no capítulo seguinte

Implementar em `src/utils/sessionAlgorithm.js` com base na contagem de
palavras por capítulo da NVI (requer licença da Biblica).
