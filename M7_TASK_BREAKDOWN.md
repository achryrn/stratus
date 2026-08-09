# M7 Task Breakdown: Theme Studio

**Milestone:** M7 - Theme Studio  
**Duration:** 4 weeks (20 business days)  
**Effort:** 160 hours  
**Team:** 3 engineers (1 design engineer, 1 frontend, 1 backend)  
**Master Plan:** M7_THEME_STUDIO_PLANNING.md  

---

## Task 7.1.1: Theme Data Model & Engine

**Location:** `browser-features/chrome/common/themes/`  
**Duration:** 3 days | **Effort:** 24 hours | **Owner:** Design Engineer

### Description
Implement theme data model and CSS variable injection runtime engine.

### Checklist
- [ ] Define theme data model (io-ts codecs)
  - [ ] `Theme` interface: id, name, version, colors, typography, components
  - [ ] `ThemeColors`: accent, background, foreground, surface, border, hover, active
  - [ ] `ThemeTypography`: font_family, font_size, line_height, font_weight, headings
  - [ ] `ThemeComponents`: tabs, toolbar, sidebar, panels, buttons, inputs
  - [ ] `ThemeMeta`: author, description, tags, screenshots, created_at
- [ ] Implement theme storage
  - [ ] Theme file format (.stratus JSON)
  - [ ] Theme directory (`themes/<id>/`)
  - [ ] Theme registry (installed themes)
  - [ ] Active theme persistence (Services.prefs)
- [ ] Implement CSS variable engine
  - [ ] Theme → CSS variable mapping
  - [ ] Variable injection (style element injection)
  - [ ] Variable removal on theme change
  - [ ] Fallback to default (Stratus) values
  - [ ] Invalid theme values sanitized
- [ ] Implement theme application
  - [ ] `applyTheme(theme)` - inject variables
  - [ ] `removeTheme()` - revert to defaults
  - [ ] Theme preview (temporary apply)
  - [ ] Theme application timing (<1s)
- [ ] Write unit tests
  - [ ] Theme model validation
  - [ ] CSS variable generation
  - [ ] Injection/removal
  - [ ] Fallback behavior
  - [ ] Invalid theme handling
  - [ ] Application performance

### Verification
- [ ] Theme engine functional
- [ ] Application <1s
- [ ] 25+ test cases passing

---

## Task 7.1.2: Visual Theme Editor

**Location:** `browser-features/chrome/common/themes/editor/`  
**Duration:** 4 days | **Effort:** 32 hours | **Owner:** Frontend Engineer

### Description
Build the interactive visual theme editor with live preview.

### Checklist
- [ ] Set up editor UI (SolidJS)
  - [ ] EditorLayout: sidebar + preview + properties panel
  - [ ] ThemeList: installed themes sidebar
  - [ ] ColorPicker component
  - [ ] TypographyPanel: font controls
  - [ ] ComponentsPanel: per-component settings
  - [ ] LivePreview: browser UI mockup
- [ ] Implement color tools
  - [ ] Color picker (HSV/HSL/RGB)
  - [ ] Color harmony tools (complementary, analogous, triadic)
  - [ ] Contrast checker (WCAG AA)
  - [ ] Color palette suggestions
- [ ] Implement typography editor
  - [ ] Font family selector
  - [ ] Font size slider
  - [ ] Line height control
  - [ ] Weight selector
  - [ ] Heading styles
- [ ] Implement component customization
  - [ ] Tabs (radius, gap, background, active color)
  - [ ] Toolbar (background, border, height)
  - [ ] Sidebar (background, width, border)
  - [ ] Panels (background, radius, shadow)
  - [ ] Buttons (colors, radius, padding)
  - [ ] Inputs (background, border, focus)
- [ ] Implement live preview
  - [ ] Browser mockup with real CSS variables
  - [ ] Instant updates on change
  - [ ] Preview toggle (light/dark)
  - [ ] Preview at different zoom levels
- [ ] Implement save/load
  - [ ] Save theme (name, version)
  - [ ] Load existing theme
  - [ ] Export to .stratus file
  - [ ] Import from .stratus
- [ ] Write tests
  - [ ] Editor interactions
  - [ ] Color tools
  - [ ] Live preview updates
  - [ ] Save/load/export/import
  - [ ] Accessibility of editor

### Verification
- [ ] Editor fully functional
- [ ] Live preview real-time
- [ ] Export/import working
- [ ] 30+ test cases

---

## Task 7.2.1: Theme Marketplace Backend

**Location:** `marketplace-server/` (shared with M5)  
**Duration:** 4 days | **Effort:** 32 hours | **Owner:** Backend Engineer

### Description
Build REST API backend for theme marketplace.

### Checklist
- [ ] Extend marketplace server
  - [ ] Theme model (addon_type = "theme")
  - [ ] Theme endpoints:
    - `GET /api/themes` - list (filter, sort, paginate)
    - `GET /api/themes/:id` - details
    - `POST /api/themes` - submit
    - `PUT /api/themes/:id` - update
    - `DELETE /api/themes/:id` - remove
    - `GET /api/themes/:id/download` - download
    - `POST /api/themes/:id/rate` - rating
  - [ ] Theme validation (schema)
  - [ ] Theme preview storage (screenshots)
  - [ ] Download counting
- [ ] Implement theme search
  - [ ] Search by name/tags/description
  - [ ] Filter by color scheme
  - [ ] Sort by downloads/rating/recent
- [ ] Implement theme rating
  - [ ] Rating system (1-5 stars)
  - [ ] Rating aggregation
  - [ ] Review text (optional)
- [ ] Implement security
  - [ ] Theme file validation (no executable content)
  - [ ] CSS injection sanitization
  - [ ] File size limits
  - [ ] Rate limiting
- [ ] Write API tests
  - [ ] All theme endpoints
  - [ ] Validation
  - [ ] Search/filter/sort
  - [ ] Rating
  - [ ] Error handling

### Verification
- [ ] All endpoints functional
- [ ] Theme validation working
- [ ] 25+ API tests passing

---

## Task 7.2.2: Theme Marketplace Frontend

**Location:** `marketplace-client/` (shared with M5)  
**Duration:** 3 days | **Effort:** 24 hours | **Owner:** Frontend Engineer

### Description
Build React frontend for theme marketplace.

### Checklist
- [ ] Implement theme pages
  - [ ] ThemeBrowse: grid of theme cards
  - [ ] ThemeDetail: preview, description, install
  - [ ] ThemeSearch: search + filters
  - [ ] ThemeSubmit: developer form
  - [ ] MyThemes: developer dashboard
- [ ] Implement components
  - [ ] ThemeCard: thumbnail, name, rating, installs
  - [ ] ThemePreview: live CSS preview
  - [ ] InstallButton: one-click apply
  - [ ] RatingStars
  - [ ] ColorSchemeBadge
- [ ] Implement install flow
  - [ ] Install → download .stratus
  - [ ] Apply immediately option
  - [ ] Preview before install
  - [ ] Already installed state
- [ ] Implement responsive design
  - [ ] Grid adapts to screen size
  - [ ] Touch targets ≥44px
  - [ ] WCAG AA accessible
- [ ] Write frontend tests
  - [ ] Component rendering
  - [ ] Install flow
  - [ ] Search/filter
  - [ ] Form validation

### Verification
- [ ] Marketplace pages functional
- [ ] Install flow works
- [ ] 20+ component tests

---

## Task 7.3.1: Theme Templates

**Location:** `browser-features/chrome/common/themes/templates/`  
**Duration:** 2 days | **Effort:** 16 hours | **Owner:** Design Engineer

### Description
Create built-in theme templates showcasing the theme system.

### Checklist
- [ ] Create 6+ templates
  - [ ] Stratus Classic (default purple)
  - [ ] Ocean Blue (calm blue palette)
  - [ ] Midnight Dark (dark theme)
  - [ ] Forest Green (nature palette)
  - [ ] Sunset Orange (warm palette)
  - [ ] Grayscale Minimal (monochrome)
  - [ ] Custom template (users can duplicate)
- [ ] Design template palettes
  - [ ] Each template: full color set
  - [ ] Typography variations
  - [ ] Component styling variations
  - [ ] Light/dark variants where applicable
- [ ] Implement template preview
  - [ ] Template thumbnails
  - [ ] One-click apply
  - [ ] Template duplication (start from)
- [ ] Write tests
  - [ ] Template validity (schema)
  - [ ] Template application
  - [ ] Template rendering

### Verification
- [ ] 6+ templates working
- [ ] All apply correctly
- [ ] Schema valid

---

## Task 7.3.2: Cloud Sync & Backup

**Location:** `browser-features/chrome/common/themes/sync/`  
**Duration:** 2 days | **Effort:** 16 hours | **Owner:** Backend Engineer

### Description
Implement theme cloud sync and backup across devices.

### Checklist
- [ ] Implement sync service
  - [ ] Account-based sync (existing auth)
  - [ ] Theme upload (create/update)
  - [ ] Theme download (pull changes)
  - [ ] Conflict resolution (last-write-wins)
  - [ ] Sync status indicator
- [ ] Implement backup
  - [ ] Automatic backup (daily)
  - [ ] Manual backup trigger
  - [ ] Backup restore
  - [ ] Backup history (last 10)
- [ ] Implement sync UI
  - [ ] Sync settings (enable/disable)
  - [ ] Sync status display
  - [ ] Manual sync button
  - [ ] Backup/restore controls
- [ ] Write tests
  - [ ] Sync round-trip
  - [ ] Conflict resolution
  - [ ] Backup/restore
  - [ ] Error handling (offline)

### Verification
- [ ] Sync reliable
- [ ] Backup/restore working
- [ ] 20+ test cases

---

## M7 Milestone Verification

### Final Checklist
- [ ] All 6 tasks complete
- [ ] 120+ test cases passing
- [ ] Theme engine functional
- [ ] Editor complete with live preview
- [ ] Marketplace operational
- [ ] 6+ templates ready
- [ ] Cloud sync working

### Success Metrics
- [ ] 50+ themes in marketplace (target after 1 month)
- [ ] Theme application <1s
- [ ] Cloud sync reliable across devices

### Sign-Off
- **Design Engineer:** [sign]
- **Frontend Engineer:** [sign]
- **Backend Engineer:** [sign]
- **QA:** [sign]
- **Milestone Owner:** [sign]

---

**Document Version:** 1.0  
**Created:** 2026-08-09  
**Last Updated:** 2026-08-09