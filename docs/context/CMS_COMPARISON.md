# CMS Comparison

## WordPress (Headless) — CHOSEN
| Aspect | Details |
|--------|---------|
| **Type** | Traditional CMS, can be headless |
| **Database** | MySQL/MariaDB |
| **API** | REST API built-in, GraphQL via plugin |
| **Pros** | Huge ecosystem, familiar to content teams, ACF for custom fields |
| **Cons** | PHP stack (different from Node/Python), security concerns, bloated |
| **GSAP** | Via custom frontend (React/Next.js) |
| **Best For** | Teams familiar with WordPress, need plugin ecosystem |

## Strapi
| Aspect | Details |
|--------|---------|
| **Type** | Headless CMS (Node.js) |
| **Database** | PostgreSQL, MySQL, SQLite, MongoDB |
| **API** | REST + GraphQL |
| **Pros** | Self-hosted, customizable, good admin UI, uses existing PostgreSQL |
| **Cons** | Can be resource-heavy, v5 breaking changes |
| **Best For** | Teams wanting Node.js stack, self-hosted control |

## Payload CMS
| Aspect | Details |
|--------|---------|
| **Type** | Headless CMS (TypeScript-native) |
| **Database** | MongoDB, PostgreSQL (v3+) |
| **API** | REST + GraphQL + Local API |
| **Pros** | TypeScript-first, excellent DX, code-based config, self-hosted |
| **Cons** | Smaller community, newer |
| **Best For** | TypeScript teams, developers who want code-first approach |

## Sanity
| Aspect | Details |
|--------|---------|
| **Type** | Headless CMS (Hosted + Self-hosted studio) |
| **Database** | Sanity Cloud (hosted) |
| **API** | GROQ (custom query language) + GraphQL |
| **Pros** | Real-time collaboration, excellent content modeling, portable text |
| **Cons** | Hosted data (vendor lock-in), costs at scale, learning GROQ |
| **Best For** | Content teams needing real-time collaboration |

## Directus
| Aspect | Details |
|--------|---------|
| **Type** | Headless CMS (wraps any SQL database) |
| **Database** | PostgreSQL, MySQL, SQLite, etc. |
| **API** | REST + GraphQL |
| **Pros** | Use existing database, beautiful admin, self-hosted |
| **Cons** | Less opinionated, setup complexity |
| **Best For** | Teams with existing database, want flexibility |

## Ghost
| Aspect | Details |
|--------|---------|
| **Type** | Publishing platform (can be headless) |
| **Database** | MySQL/SQLite |
| **API** | Content API + Admin API |
| **Pros** | Beautiful editor, built for publishing, newsletters, memberships |
| **Cons** | Less flexible for non-blog content, limited custom fields |
| **Best For** | Content-heavy sites, newsletters, memberships |

## Keystatic
| Aspect | Details |
|--------|---------|
| **Type** | Git-based CMS |
| **Database** | Git (files in repo) |
| **API** | Direct file access, works with Astro/Next.js |
| **Pros** | No database needed, version controlled content, free |
| **Cons** | Not for large teams, no real-time collab, content in code repo |
| **Best For** | Developer-managed content, static sites |

## Recommendation Matrix
| Requirement | Best Options |
|-------------|--------------|
| Matches existing stack (Node/TS) | **Payload**, Strapi, Directus |
| Uses existing PostgreSQL | **Directus**, Strapi, Payload v3 |
| Best developer experience | **Payload**, Sanity |
| Best for content teams | Sanity, WordPress, **Ghost** |
| Self-hosted, no vendor lock-in | **Payload**, Strapi, Directus, Ghost |
| Simplest setup | **Keystatic**, Ghost |
| Enterprise features | Sanity, WordPress, Strapi |
| TypeScript-native | **Payload** |
