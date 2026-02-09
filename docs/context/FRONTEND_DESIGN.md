# Frontend & Design

## Design Guidelines
- Material Design 3 for web
- Desktop/laptop only (min-width: 1024px)
- No mobile responsiveness required
- Healthcare-focused UI/UX

## Frontend Architecture Decisions
- **Vite over Create React App**: Faster builds, better ESM support, smaller bundle
- **Desktop-Only**: Healthcare professionals use desktop/laptop workstations

## Key Layout Dimensions
| Component | Width | Behavior |
|-----------|-------|----------|
| Left Rail | 56px | Always visible, icons only |
| Left Drawer | +180px | Expands on toggle |
| Right Rail | 56px | Always visible, tool icons |
| Right Panel | +400px | Expands when tool selected |
| AppBar | 64px height | Fixed top |

## Design References
Screenshots in `/docs/ScreenDesigns/`:
- `Patient List.jpeg` - Main layout, drawers collapsed
- `Patient List With Left Navbar Drawer.jpeg` - Left drawer expanded
- `Patient List With CoPilotKit.jpeg` - Right panel with AI chat
- `Patient List - Create New Patients Option.jpeg` - Create patient modal
