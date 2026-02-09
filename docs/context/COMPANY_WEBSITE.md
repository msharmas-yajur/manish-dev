# Company Website Planning

## Overview
Marketing website alongside the Caladrius application:
- Modern design (Apple + Anthropic/Claude.ai inspired)
- GSAP animations for smooth interactions
- Responsive design (unlike the desktop-only app)
- CMS for content management
- Make.com integration for automated feature announcements

## Decisions Made
1. **CMS Choice**: WordPress (Headless) + React/Next.js frontend
2. **Database**: MariaDB (standard WordPress setup)
3. **Custom Fields**: Pods (free, all features included) - replaces ACF Pro
4. **Hosting**: Same Docker stack as Caladrius application
5. **Launch Priority**: MVP first (Home, About, Contact, then Features, Blog)
6. **Domain Structure**: Subdomain separation
   - `www.caladrius.com` → Company Website (Next.js + WordPress)
   - `app.caladrius.com` → Healthcare Application (React)

## Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    Company Website Stack                         │
│                                                                  │
│  ┌──────────────────────┐      ┌──────────────────────────────┐ │
│  │   WordPress (CMS)    │      │   Next.js Frontend           │ │
│  │   ├── Pods Plugin    │─────▶│   ├── GSAP Animations        │ │
│  │   ├── Yoast SEO      │ REST │   ├── Tailwind CSS           │ │
│  │   └── App Passwords  │ API  │   └── Apple/Claude Design    │ │
│  │   Port: 8082         │      │   Port: 8084                 │ │
│  └──────────────────────┘      └──────────────────────────────┘ │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────────┐      ┌──────────────────────────────┐ │
│  │      MariaDB         │      │       Make.com               │ │
│  │   Port: 3307         │      │   └── GitHub → WP Posts      │ │
│  └──────────────────────┘      └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Design Language

### Apple-Inspired
- Ultra-clean, minimalist layouts
- Large hero sections with bold typography
- Scroll-triggered animations, parallax effects

### Anthropic/Claude.ai-Inspired
- Warm color palette (cream, terracotta, soft gradients)
- Organic shapes and soft curves
- Elegant serif + sans-serif typography
- Trust-focused, conversational tone

### Color Palette
```css
--cream: #FAF9F6;
--warm-white: #FEFDFB;
--terracotta: #D4A574;
--deep-brown: #3D3129;
--soft-coral: #E8B4A0;
--sage: #A8B5A0;
```

### Typography
- Headings: Fraunces (elegant serif)
- Body: Inter (clean sans-serif)
- Code: JetBrains Mono

## Content Requirements
- **Pages**: Home, About, Products/Features, Pricing, Contact, Careers
- **Blog Posts**: Company news, industry insights
- **Feature Announcements**: Automated from GitHub releases
- **White Papers**: Downloadable PDFs with lead capture
- **Case Studies**: Customer success stories

## MVP Pages
| Priority | Page | Status |
|----------|------|--------|
| P0 | Home | Pending |
| P0 | About | Pending |
| P0 | Contact | Pending |
| P1 | Features | Pending |
| P1 | Blog | Pending |
| P2 | Pricing | Pending |
| P2 | Careers | Pending |
| P2 | White Papers | Pending |

## WordPress Plugin Stack
| Plugin | Purpose | License |
|--------|---------|---------|
| **Pods** | Custom post types + custom fields + relationships | Free (GPL) |
| **WP REST API** | Built-in, headless content delivery | Core |
| **Yoast SEO** | SEO management | Free |
| **WP GraphQL** | GraphQL API (optional) | Free |
| **Application Passwords** | API authentication for Make.com | Core (WP 5.6+) |

## Make.com Integration
```
GitHub Release → Make.com Scenario → CMS API → Website Rebuild
```
- Trigger: GitHub release webhook
- Action: Create feature announcement post
- Optional: Notify team via Slack/email

## Implementation Steps
1. [ ] Add WordPress + MariaDB to docker-compose.yml
2. [ ] Create Next.js website app in `apps/website/`
3. [ ] Configure WordPress with Pods plugin
4. [ ] Build GSAP animation components
5. [ ] Create MVP pages (Home, About, Contact)
6. [ ] Set up Make.com integration for feature announcements
