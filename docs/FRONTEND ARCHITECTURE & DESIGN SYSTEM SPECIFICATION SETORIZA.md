# FRONTEND ARCHITECTURE & DESIGN SYSTEM SPECIFICATION: SETORIZA
Version: 1.0.0
Framework: React + Vite
Styling: Tailwind CSS + shadcn/ui
State/Routing: React Router v6 + Context API / Zustand
Theme Support: Native Light/Dark Mode Toggle

---

## 1. DESIGN SYSTEM & TOKENS

### 1.1. Color Palette (Tailwind Configuration)
Abaixo está a configuração oficial do Tailwind CSS integrada ao nosso Design System, mapeando as cores corporativas do Setoriza e integrando-as com o padrão semântico do shadcn/ui.

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        setoriza: {
          // O azul marinho profundo da marca e tipografia principal
          primary: '#001638', 
          
          // O verde oficial do WhatsApp/Balão superior para novos chamados e alertas
          green: '#25D366', 
          
          // O azul claro/ciano do balão inferior para chamados em andamento
          blueLight: '#24A1DE', 
        },
        // Mapeamento semântico para o padrão do shadcn/ui
        background: {
          light: '#F8FAFC',
          dark: '#020617'
        },
        surface: {
          light: '#FFFFFF',
          dark: '#0F172A'
        }
      }
    }
  }
}
```

### 1.2. Typography
- **Primary Font Family:** `Inter`, sans-serif (via Google Fonts/Tailwind standard).
- **Scale and Weights:**
  - `h1`: 24px / Bold (700) - Page Titles / Logos
  - `h2`: 18px / Semi-Bold (600) - Sidebar Sectors / Card Headings
  - `body-main`: 14px / Regular (400) - Chat Messages / Input Forms
  - `body-medium`: 14px / Medium (500) - Customer Names / Interactive UI Elements
  - `caption`: 11px / Regular (400) - Timestamps / Micro-badges

---

## 2. ROLE-BASED ACCESS CONTROL (RBAC)

The frontend must evaluate the `role` attribute from the user session JWT payload to restrict route accessing and component rendering.

### 2.1. Permitted States by Role
- **`MASTER`**: Full visibility. Access to `/chat`, `/users`, `/sectors`, `/reports`, `/settings`.
- **`ADMIN`**: Corporate visibility. Access to `/chat`, `/users`, `/sectors`, `/reports`. Blocked from `/settings`.
- **`USER`**: Restricted operator visibility. Access ONLY to `/chat`. Blocked from all administrative routes.

### 2.2. Data Filtering Rules for `USER` Role inside `/chat`
- **Queue Tab ("Aguardando"):** Displays tickets where `status == "AGUARDANDO_ATENDIMENTO"` AND `ticket.sector` matches the user's assigned sectors. Show a visible **"Assumir Chamado"** action.
- **My Chats Tab ("Em Andamento"):** Displays ONLY tickets where `status == "EM_ANDAMENTO"` AND `assignedAgentId == currentUser.id`.

---

## 3. UI LAYOUT & COMPONENT TREE (THREE-COLUMN ARCHITECTURE)

The live chat view is a single-viewport dashboard optimized to prevent scrolling exhaustion.