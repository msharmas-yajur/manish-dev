# Caladrius Health AI Studio - Project Tasks

> **Last Updated:** January 28, 2026
> **Purpose:** Comprehensive tracking of all platform and application development tasks

---

## >>> NEXT STEPS <<<

**Pick up these tasks next (no dependencies, can run in parallel):**

| Task ID | File to Create | Status |
|---------|----------------|--------|
| A-001 | `src/contexts/LayoutContext.tsx` | :white_circle: TODO |
| A-002 | `src/features/tools/config/toolsConfig.ts` | :white_circle: TODO |
| A-003 | `src/features/tools/components/CopilotTool.tsx` | :white_circle: TODO |
| A-004 | `src/features/tools/components/IframeTool.tsx` | :white_circle: TODO |
| A-005 | `src/components/layout/config/navigationConfig.ts` | :white_circle: TODO |

**After these are done, update status to :white_check_mark: and move to Phase 2:**
- A-006 to A-010 (Core Components)

**Design References:** `/docs/ScreenDesigns/*.jpeg`

---

## Table of Contents
- [Platform Tasks](#platform-tasks)
- [Application Tasks](#application-tasks)
- [Company Website Tasks](#company-website-tasks)
- [Task Dependencies](#task-dependencies)

---

## Platform Tasks

Infrastructure, backend services, authentication, and core platform capabilities.

### Completed

| ID | Task | Status | Completed Date |
|----|------|:------:|----------------|
| P-001 | Core Infrastructure (PostgreSQL, MongoDB, Redis) | :white_check_mark: | Jan 2026 |
| P-002 | Backend Services (BFF, Python Backend) | :white_check_mark: | Jan 2026 |
| P-003 | LLM Service (multi-provider routing) | :white_check_mark: | Jan 2026 |
| P-004 | Celery Workers (embeddings, summarization, medical coding) | :white_check_mark: | Jan 2026 |
| P-005 | Authentication: Login, Register, Password Reset | :white_check_mark: | Jan 2026 |
| P-006 | Authentication: Google OAuth 2.0 | :white_check_mark: | Jan 2026 |
| P-007 | RBAC: Database schema, roles, permissions | :white_check_mark: | Jan 2026 |
| P-008 | RBAC: BFF service layer with Redis caching | :white_check_mark: | Jan 2026 |
| P-009 | RBAC: Middleware (requirePermission, requireRole, etc.) | :white_check_mark: | Jan 2026 |
| P-010 | RBAC: Role management API endpoints | :white_check_mark: | Jan 2026 |
| P-011 | CopilotKit Service Foundation (Port 8004) | :white_check_mark: | Jan 26, 2026 |
| P-012 | CopilotKit Medical Coding Agent (Snowstorm/SNOMED CT) | :white_check_mark: | Jan 26, 2026 |

### In Progress

| ID | Task | Status | Assignee | Notes |
|----|------|:------:|----------|-------|
| P-013 | CopilotKit - Patient Data Agent | :construction: | - | Phase 3 of CopilotKit |
| P-014 | CopilotKit - Clinical Documentation Agent | :construction: | - | Phase 4 of CopilotKit |
| P-015 | CopilotKit - Frontend Integration | :construction: | - | Phase 5 of CopilotKit |
| P-016 | CopilotKit - Testing & Documentation | :construction: | - | Phase 6 of CopilotKit |

### Pending

| ID | Task | Priority | Dependencies | Description |
|----|------|:--------:|--------------|-------------|
| P-017 | LiveKit Telehealth Integration | High | P-001 | Video/audio calls for telehealth |
| P-018 | Email Service for Password Reset | Medium | P-005 | Currently logs to console in dev |
| P-019 | Apply RBAC to Patient Routes | High | P-009 | Protect /api/patients endpoints |
| P-020 | Apply RBAC to Appointment Routes | High | P-009 | Protect /api/appointments endpoints |
| P-021 | Apply RBAC to Records Routes | High | P-009 | Protect /api/records endpoints |
| P-022 | Audit Logging Service | Medium | P-007 | Track all sensitive operations |
| P-023 | Rate Limiting per User/Role | Low | P-007 | Different limits by role |
| P-024 | API Versioning Strategy | Low | - | For future breaking changes |

---

## Application Tasks

Frontend UI framework, components, and user-facing features.

### UI Framework - Layout System

> **Reference Designs:** `/docs/ScreenDesigns/`

#### Phase 1: Foundation (No Dependencies - Can Run in Parallel)

| ID | Task | Status | Description |
|----|------|:------:|-------------|
| A-001 | Create LayoutContext | :white_circle: | State management for drawer open/close, active tool |
| A-002 | Create Tools Configuration | :white_circle: | Tool definitions, types, default tools array |
| A-003 | Create CopilotTool Component | :white_circle: | CopilotKit chat interface for right panel |
| A-004 | Create IframeTool Component | :white_circle: | Generic iframe wrapper for external tools |
| A-005 | Create Navigation Configuration | :white_circle: | Role-based menu items and filtering logic |

#### Phase 2: Core Components (After Phase 1)

| ID | Task | Status | Dependencies | Description |
|----|------|:------:|--------------|-------------|
| A-006 | Create AppBar Component | :white_circle: | A-001 | Top bar with logo, user menu |
| A-007 | Create LeftRail Component | :white_circle: | A-001, A-005 | Collapsed icon navigation (56px) |
| A-008 | Create LeftDrawer Component | :white_circle: | A-001, A-005 | Expanded navigation with labels (180px) |
| A-009 | Create RightRail Component | :white_circle: | A-001, A-002 | Tool icons rail (56px) |
| A-010 | Create RightPanel Component | :white_circle: | A-001, A-002, A-003, A-004 | Expanded tool panel (400px) |

#### Phase 3: Assembly (After Phase 2)

| ID | Task | Status | Dependencies | Description |
|----|------|:------:|--------------|-------------|
| A-011 | Create Layout Index Exports | :white_circle: | A-006 to A-010 | Export all components and constants |
| A-012 | Create MainLayout Component | :white_circle: | A-001 to A-011 | Orchestrates all layout pieces |

#### Phase 4: Integration (Final)

| ID | Task | Status | Dependencies | Description |
|----|------|:------:|--------------|-------------|
| A-013 | Update App.tsx | :white_circle: | A-012 | Use new MainLayout, remove old components |
| A-014 | Delete Old Layout Components | :white_circle: | A-013 | Remove Navbar.tsx, Sidebar.tsx |

### UI Framework - Component Specifications

#### A-001: LayoutContext
```typescript
// src/contexts/LayoutContext.tsx
interface LayoutContextState {
  leftDrawerOpen: boolean;
  rightPanelOpen: boolean;
  activeToolId: string | null;
  toggleLeftDrawer: () => void;
  toggleRightPanel: () => void;
  setActiveTool: (toolId: string) => void;
  closeRightPanel: () => void;
}
```

#### A-006: AppBar
- Blue gradient background (#1565C0)
- Left: Logo icon + "CALADRIUS HEALTH" (bold) + "AI STUDIO"
- Right: User avatar + name
- Height: 64px, fixed position

#### A-007: LeftRail
- Width: 56px, fixed
- Expand arrow at top
- Icon buttons: Dashboard, Patients, Settings
- Role-based filtering

#### A-008: LeftDrawer
- Width: 180px (expands from rail)
- "Navigation" header with collapse arrow
- Icon + label menu items
- Selected item: blue highlight

#### A-009: RightRail
- Width: 56px, fixed
- Collapse arrow at top
- Tool icons: Copilot, Snowstorm, SNOMED CT, CPT-4, ICD-10, Add Tool (+)
- Tooltips on hover

#### A-010: RightPanel
- Width: 400px (expands from rail)
- Tool header with close button
- Dynamic content based on activeToolId

### Feature Tasks

| ID | Task | Priority | Dependencies | Description |
|----|------|:--------:|--------------|-------------|
| A-020 | Patient List Page | High | A-013 | Table with search, filters, pagination |
| A-021 | Create Patient Modal | High | A-020 | ABHA registration methods |
| A-022 | Patient Detail Page | High | A-020 | View/edit patient information |
| A-023 | Dashboard Page | Medium | A-013 | Overview stats and charts |
| A-024 | Settings Page (Claude-style) | Medium | A-013 | Profile, Security, LLM, Connectors, Tools |
| A-025 | User Management Page | Medium | A-013, P-009 | Admin only - CRUD users, assign roles |
| A-026 | Appointments Page | Medium | A-013 | Calendar view, scheduling |
| A-027 | Medical Records Page | Medium | A-013 | Document management |

### Settings Page Sections (A-024)

| Section | Access | Description |
|---------|--------|-------------|
| Profile | All users | Name, email, avatar |
| Security | All users | Password, 2FA, sessions |
| LLM Providers | All users | API keys (OpenAI, Anthropic, Ollama) |
| Connectors | All users | External service integrations |
| Tools | All users | Configure right panel tools |
| Theme | All users | Light/Dark mode |
| Notifications | All users | Email, in-app preferences |
| Admin | system_admin | User management, roles, audit logs |

---

## Company Website Tasks

Marketing website with CMS (WordPress headless + Next.js).

### Pending

| ID | Task | Priority | Description |
|----|------|:--------:|-------------|
| W-001 | Add WordPress + MariaDB to docker-compose | P0 | Database and CMS setup |
| W-002 | Create Next.js website app | P0 | `apps/website/` |
| W-003 | Configure WordPress with Pods plugin | P0 | Custom post types |
| W-004 | Build GSAP animation components | P1 | Smooth transitions |
| W-005 | Home Page | P0 | Hero, features, CTA |
| W-006 | About Page | P0 | Company story, team |
| W-007 | Contact Page | P0 | Form, location |
| W-008 | Features Page | P1 | Product capabilities |
| W-009 | Blog Page | P1 | Articles, news |
| W-010 | Pricing Page | P2 | Plans, comparison |
| W-011 | Careers Page | P2 | Job listings |
| W-012 | Make.com Integration | P2 | GitHub releases to blog posts |

---

## Task Dependencies

### Dependency Graph

```
Platform Foundation
├── P-001 (Infrastructure) ─┬── P-002 (Backend)
│                           ├── P-003 (LLM Service)
│                           └── P-004 (Workers)
├── P-005 (Auth) ───────────┬── P-006 (Google OAuth)
│                           └── P-018 (Email Service)
└── P-007 (RBAC Schema) ────┬── P-008 (RBAC Service)
                            ├── P-009 (RBAC Middleware)
                            └── P-010 (Role API)

CopilotKit Integration
├── P-011 (Service Foundation)
└── P-012 (Medical Coding) ─┬── P-013 (Patient Data)
                            ├── P-014 (Clinical Docs)
                            ├── P-015 (Frontend)
                            └── P-016 (Testing)

Application UI Framework
├── A-001 (LayoutContext) ──┬── A-006 (AppBar)
│                           ├── A-007 (LeftRail)
│                           ├── A-008 (LeftDrawer)
│                           ├── A-009 (RightRail)
│                           └── A-010 (RightPanel)
├── A-002 (Tools Config) ───┼── A-009, A-010
├── A-003 (CopilotTool) ────┤
├── A-004 (IframeTool) ─────┤
├── A-005 (Nav Config) ─────┼── A-007, A-008
│                           │
├── A-011 (Index Exports) ──┼── Depends on A-006 to A-010
├── A-012 (MainLayout) ─────┼── Depends on all above
└── A-013 (App.tsx Update) ─┴── Depends on A-012
```

### Parallel Execution Groups

**Group 1 (No Dependencies):**
- A-001, A-002, A-003, A-004, A-005

**Group 2 (After Group 1):**
- A-006, A-007, A-008, A-009, A-010

**Group 3 (Sequential):**
- A-011 → A-012 → A-013 → A-014

---

## Status Legend

| Symbol | Meaning |
|:------:|---------|
| :white_check_mark: | Completed |
| :construction: | In Progress |
| :white_circle: | Pending |
| :red_circle: | Blocked |
| :warning: | Needs Review |

---

## Notes

### Design References
All UI designs are located in `/docs/ScreenDesigns/`:
- `Patient List.jpeg` - Main layout with collapsed drawers
- `Patient List With Left Navbar Drawer.jpeg` - Expanded left navigation
- `Patient List With CoPilotKit.jpeg` - Expanded right panel with AI chat
- `Patient List - Create New Patients Option.jpeg` - Create patient modal

### RBAC Roles
| Role | Access Level |
|------|--------------|
| system_admin | Full access (39 permissions) |
| physician | Clinical access (18 permissions) |
| nurse | Patient care (11 permissions) |
| medical_assistant | Limited clinical (8 permissions) |
| patient | Own data only (8 permissions) |
| billing_staff | Financial (7 permissions) |
| receptionist | Scheduling (7 permissions) |
| user | Default minimal (2 permissions) |

### Tech Stack Reference
- **Frontend:** React 19 + Vite + TypeScript + MUI
- **BFF:** Node.js + Express + TypeScript
- **Backend:** Python + FastAPI
- **AI:** CopilotKit + LLM Service (OpenAI/Anthropic/Ollama)
- **Healthcare:** Snowstorm (SNOMED CT), LiveKit (Telehealth)
