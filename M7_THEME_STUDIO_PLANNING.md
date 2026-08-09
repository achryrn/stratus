# M7: Theme Studio & Advanced Customization

**Phase:** M3 - Advanced Features  
**Milestone:** M7 - Theme Studio  
**Date:** 2026-08-09  
**Status:** Planning Phase  
**Owner:** Design & Customization Team  

---

## Executive Summary

M7 implements the Theme Studio, an advanced customization platform enabling users and designers to create, share, and manage custom browser themes. This includes a visual theme editor, theme marketplace, and programmatic theme API.

**Key Deliverables:**
1. Visual theme editor with live preview
2. Theme marketplace (discover and install themes)
3. Theme API for developers
4. Theme persistence and synchronization
5. Advanced color and styling tools

**Timeline:** 4 weeks  
**Team:** 1 Design Engineer, 1 Frontend Engineer, 1 Backend Engineer  
**Effort:** 160 hours total  

---

## Part 1: Theme Architecture

### Theme Data Model

```typescript
interface Theme {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  thumbnail: string; // URL to preview image
  colors: ThemeColors;
  typography: ThemeTypography;
  components: ThemeComponents;
  wallpaper?: string; // Custom background
  metadata: ThemeMetadata;
}

interface ThemeColors {
  // Base palette
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;

  // Component-specific overrides
  tabs?: {
    active: string;
    inactive: string;
    background: string;
    border: string;
  };
  toolbar?: {
    background: string;
    button: string;
    buttonHover: string;
  };
  sidebar?: {
    background: string;
    text: string;
    border: string;
  };
}

interface ThemeTypography {
  fontFamily: string;
  fontSize: {
    base: number;
    small: number;
    large: number;
    heading: number;
  };
  fontWeight: {
    normal: number;
    medium: number;
    bold: number;
  };
}

interface ThemeComponents {
  borderRadius: {
    small: string;
    medium: string;
    large: string;
  };
  shadows: {
    small: string;
    medium: string;
    large: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

interface ThemeMetadata {
  created: Date;
  updated: Date;
  version: string;
  author: {
    name: string;
    email: string;
    url?: string;
  };
  license: "CC0" | "CC-BY" | "CC-BY-SA" | "proprietary";
  tags: string[];
  isPublic: boolean;
  downloads?: number;
  rating?: number;
}
```

### Theme System Architecture

```
┌─────────────────────────────────────────────────────┐
│         Theme Marketplace (Web)                     │
│  https://themes.stratus.dev (React SPA)            │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│     Theme Management API (TypeScript)                │
│  - Upload/download themes                           │
│  - Manage versions and updates                      │
│  - Handle ratings and reviews                       │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│       Theme Editor (SolidJS Component)               │
│  - Visual color picker                              │
│  - Live preview                                     │
│  - Template selection                               │
│  - Export/import                                    │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│    Theme Runtime Engine (TypeScript)                │
│  - CSS variable injection                           │
│  - Component theme application                      │
│  - Performance optimization                         │
│  - Storage and sync                                 │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│         Browser UI & Components                     │
│  - Tabs, toolbar, sidebar, menus                    │
│  - All use CSS variables from theme                 │
│  - Real-time updates                                │
└─────────────────────────────────────────────────────┘
```

---

## Part 2: Theme Editor Implementation

### M7.1: Visual Theme Editor

**File:** `browser-features/themes/theme-editor.tsx`

```typescript
export function ThemeEditor() {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");
  const [activeTab, setActiveTab] = useState<"colors" | "typography" | "components">(
    "colors"
  );

  return (
    <div className="theme-editor">
      {/* Header */}
      <div className="editor-header">
        <h1>Theme Studio</h1>
        <div className="actions">
          <button onClick={saveTheme}>Save Theme</button>
          <button onClick={exportTheme}>Export</button>
          <button onClick={shareTheme}>Share</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="editor-layout">
        {/* Left: Editor */}
        <div className="editor-panel">
          {/* Theme Name */}
          <div className="theme-name">
            <label>Theme Name</label>
            <input value={theme.name} onChange={e => setTheme({...theme, name: e.target.value})} />
          </div>

          {/* Tab Navigation */}
          <div className="editor-tabs">
            <button
              className={activeTab === "colors" ? "active" : ""}
              onClick={() => setActiveTab("colors")}
            >
              Colors
            </button>
            <button
              className={activeTab === "typography" ? "active" : ""}
              onClick={() => setActiveTab("typography")}
            >
              Typography
            </button>
            <button
              className={activeTab === "components" ? "active" : ""}
              onClick={() => setActiveTab("components")}
            >
              Components
            </button>
          </div>

          {/* Color Editor */}
          {activeTab === "colors" && <ColorEditor theme={theme} onChange={setTheme} />}

          {/* Typography Editor */}
          {activeTab === "typography" && (
            <TypographyEditor theme={theme} onChange={setTheme} />
          )}

          {/* Components Editor */}
          {activeTab === "components" && (
            <ComponentsEditor theme={theme} onChange={setTheme} />
          )}
        </div>

        {/* Right: Live Preview */}
        <div className="preview-panel">
          <div className="preview-controls">
            <label>Preview Mode</label>
            <select value={previewMode} onChange={e => setPreviewMode(e.target.value as any)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="preview-container" style={getThemeStyles(theme, previewMode)}>
            <ThemePreview theme={theme} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

### M7.2: Color Picker Component

**File:** `browser-features/themes/color-picker.tsx`

```typescript
export function ColorEditor({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
}) {
  const colors = theme.colors;

  return (
    <div className="color-editor">
      <h3>Color Palette</h3>

      {/* Base Colors */}
      <div className="color-group">
        <h4>Base Colors</h4>

        <ColorInput
          label="Primary"
          value={colors.primary}
          onChange={value =>
            onChange({...theme, colors: {...colors, primary: value}})
          }
        />

        <ColorInput
          label="Secondary"
          value={colors.secondary}
          onChange={value =>
            onChange({...theme, colors: {...colors, secondary: value}})
          }
        />

        <ColorInput
          label="Accent"
          value={colors.accent}
          onChange={value => onChange({...theme, colors: {...colors, accent: value}})}
        />

        <ColorInput
          label="Background"
          value={colors.background}
          onChange={value =>
            onChange({...theme, colors: {...colors, background: value}})
          }
        />

        <ColorInput
          label="Surface"
          value={colors.surface}
          onChange={value => onChange({...theme, colors: {...colors, surface: value}})}
        />

        <ColorInput
          label="Text"
          value={colors.text}
          onChange={value => onChange({...theme, colors: {...colors, text: value}})}
        />
      </div>

      {/* Tab-Specific Colors */}
      <div className="color-group">
        <h4>Tab Colors</h4>

        <ColorInput
          label="Active Tab"
          value={colors.tabs?.active || ""}
          onChange={value =>
            onChange({
              ...theme,
              colors: {
                ...colors,
                tabs: {...(colors.tabs || {}), active: value},
              },
            })
          }
        />

        <ColorInput
          label="Inactive Tab"
          value={colors.tabs?.inactive || ""}
          onChange={value =>
            onChange({
              ...theme,
              colors: {
                ...colors,
                tabs: {...(colors.tabs || {}), inactive: value},
              },
            })
          }
        />
      </div>

      {/* Harmony Tools */}
      <div className="harmony-tools">
        <h4>Color Harmony</h4>
        <button onClick={() => generateComplementary()}>Generate Complementary</button>
        <button onClick={() => generateAnalogous()}>Generate Analogous</button>
        <button onClick={() => generateTriadic()}>Generate Triadic</button>
      </div>
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="color-input">
      <label>{label}</label>
      <div className="input-group">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
        />
        <button
          className="color-swatch"
          style={{backgroundColor: value}}
          onClick={() => setIsOpen(!isOpen)}
        />
      </div>
      {isOpen && (
        <ColorPickerModal
          color={value}
          onChange={onChange}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
```

**Responsibilities:**
- Provide color picker UI
- Support hex/rgb/hsl input
- Offer color harmony suggestions
- Real-time preview update

**Success Criteria:**
- [ ] Color picker intuitive and fast
- [ ] Harmony tools generate valid colors
- [ ] Preview updates instantly

### M7.3: Typography Editor

**File:** `browser-features/themes/typography-editor.tsx`

```typescript
export function TypographyEditor({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
}) {
  const typo = theme.typography;

  return (
    <div className="typography-editor">
      <h3>Typography</h3>

      {/* Font Selection */}
      <div className="font-group">
        <label>Font Family</label>
        <select
          value={typo.fontFamily}
          onChange={e => onChange({...theme, typography: {...typo, fontFamily: e.target.value}})}
        >
          <option value="system-ui">System UI</option>
          <option value="'Segoe UI'">Segoe UI</option>
          <option value="'SF Pro Display'">SF Pro Display</option>
          <option value="'Roboto'">Roboto</option>
          <option value="'Inter'">Inter</option>
        </select>
      </div>

      {/* Font Sizes */}
      <div className="size-group">
        <h4>Font Sizes</h4>

        <SizeInput
          label="Base"
          value={typo.fontSize.base}
          onChange={value =>
            onChange({
              ...theme,
              typography: {
                ...typo,
                fontSize: {...typo.fontSize, base: value},
              },
            })
          }
        />

        <SizeInput
          label="Small"
          value={typo.fontSize.small}
          onChange={value =>
            onChange({
              ...theme,
              typography: {
                ...typo,
                fontSize: {...typo.fontSize, small: value},
              },
            })
          }
        />

        <SizeInput
          label="Large"
          value={typo.fontSize.large}
          onChange={value =>
            onChange({
              ...theme,
              typography: {
                ...typo,
                fontSize: {...typo.fontSize, large: value},
              },
            })
          }
        />
      </div>

      {/* Font Weights */}
      <div className="weight-group">
        <h4>Font Weights</h4>

        <WeightInput
          label="Normal"
          value={typo.fontWeight.normal}
          onChange={value =>
            onChange({
              ...theme,
              typography: {
                ...typo,
                fontWeight: {...typo.fontWeight, normal: value},
              },
            })
          }
        />

        <WeightInput
          label="Medium"
          value={typo.fontWeight.medium}
          onChange={value =>
            onChange({
              ...theme,
              typography: {
                ...typo,
                fontWeight: {...typo.fontWeight, medium: value},
              },
            })
          }
        />

        <WeightInput
          label="Bold"
          value={typo.fontWeight.bold}
          onChange={value =>
            onChange({
              ...theme,
              typography: {
                ...typo,
                fontWeight: {...typo.fontWeight, bold: value},
              },
            })
          }
        />
      </div>
    </div>
  );
}
```

**Responsibilities:**
- Select font family
- Configure font sizes
- Set font weights
- Show typography preview

**Success Criteria:**
- [ ] Font family change instant
- [ ] Size adjustments apply immediately
- [ ] Preview shows all weights

---

## Part 3: Theme Marketplace

### M7.4: Theme Marketplace Backend

**Objective:** Store and serve themes

**API Endpoints:**

```typescript
// Theme Discovery
GET /api/themes                          // List all themes
GET /api/themes/:id                      // Get theme details
POST /api/themes/search?q=query          // Search themes
GET /api/themes/:id/reviews              // Get reviews
GET /api/themes/trending                 // Trending themes
GET /api/themes/new                      // Recently added

// Theme Publishing
POST /api/themes                         // Submit new theme (requires auth)
PUT /api/themes/:id                      // Update theme (requires auth)
DELETE /api/themes/:id                   // Delete theme (requires auth)
POST /api/themes/:id/publish             // Publish theme

// User Interactions
POST /api/themes/:id/review              // Submit review
POST /api/themes/:id/rate                // Rate theme
POST /api/themes/:id/favorite            // Add to favorites

// Statistics
GET /api/themes/:id/stats                // View stats (downloads, ratings)
GET /api/stats/dashboard                 // Creator dashboard
```

**Theme Storage:**

```typescript
interface ThemeRecord {
  id: string;
  name: string;
  author: string;
  version: string;
  themeData: Theme;
  thumbnail: string; // Uploaded image
  previewScreenshots: string[]; // URLs
  downloads: number;
  rating: number;
  reviews: ThemeReview[];
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}
```

**Success Criteria:**
- [ ] Store 1000+ themes
- [ ] Search <500ms
- [ ] API response <1s

### M7.5: Theme Marketplace Frontend

**URL:** `https://themes.stratus.dev`

**Pages:**

1. **Homepage**
   - Featured themes
   - Trending this week
   - Recently added
   - Categories

2. **Theme Gallery**
   - Grid view with thumbnails
   - Filter by category, rating
   - Search by name/author
   - Sort by popularity, new, trending

3. **Theme Details**
   - Full preview with screenshots
   - Description and metadata
   - Author info and other themes
   - Reviews and ratings
   - One-click install button

4. **Creator Dashboard**
   - Upload new theme
   - Manage versions
   - View analytics
   - Respond to reviews

**Features:**
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Dark mode support
- [ ] One-click install integration
- [ ] Social sharing
- [ ] Wishlist/favorites
- [ ] User reviews and ratings

**Success Criteria:**
- [ ] Marketplace loads <2s
- [ ] 100+ simultaneous users
- [ ] Mobile experience smooth

---

## Part 4: Theme Runtime & Integration

### M7.6: Theme Runtime Engine

**File:** `browser-features/themes/theme-engine.ts`

```typescript
class ThemeEngine {
  private currentTheme: Theme | null = null;
  private cssVariables: Map<string, string> = new Map();

  /**
   * Load theme and apply to browser
   */
  async applyTheme(theme: Theme): Promise<void> {
    this.currentTheme = theme;

    // Convert theme to CSS variables
    this.generateCSSVariables(theme);

    // Inject into document
    this.injectCSSVariables();

    // Apply to all windows
    this.applyToAllWindows();

    // Persist to storage
    await this.saveThemePreference(theme.id);
  }

  /**
   * Generate CSS variable map from theme
   */
  private generateCSSVariables(theme: Theme): void {
    this.cssVariables.set("--stratus-primary", theme.colors.primary);
    this.cssVariables.set("--stratus-secondary", theme.colors.secondary);
    this.cssVariables.set("--stratus-accent", theme.colors.accent);
    this.cssVariables.set("--stratus-background", theme.colors.background);
    this.cssVariables.set("--stratus-surface", theme.colors.surface);
    this.cssVariables.set("--stratus-text", theme.colors.text);
    this.cssVariables.set("--stratus-text-secondary", theme.colors.textSecondary);
    this.cssVariables.set("--stratus-border", theme.colors.border);

    // Tab-specific
    if (theme.colors.tabs) {
      this.cssVariables.set("--stratus-tab-active", theme.colors.tabs.active);
      this.cssVariables.set("--stratus-tab-inactive", theme.colors.tabs.inactive);
    }

    // Typography
    this.cssVariables.set("--stratus-font-family", theme.typography.fontFamily);
    this.cssVariables.set(
      "--stratus-font-size-base",
      `${theme.typography.fontSize.base}px`
    );
    this.cssVariables.set(
      "--stratus-font-size-small",
      `${theme.typography.fontSize.small}px`
    );

    // Components
    this.cssVariables.set(
      "--stratus-border-radius-small",
      theme.components.borderRadius.small
    );
    this.cssVariables.set(
      "--stratus-border-radius-medium",
      theme.components.borderRadius.medium
    );
  }

  /**
   * Inject CSS variables into DOM
   */
  private injectCSSVariables(): void {
    let styleEl = document.getElementById("stratus-theme-variables");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "stratus-theme-variables";
      document.head.appendChild(styleEl);
    }

    let css = ":root {\n";
    for (const [key, value] of this.cssVariables) {
      css += `  ${key}: ${value};\n`;
    }
    css += "}";

    styleEl.textContent = css;
  }

  /**
   * Apply theme to all browser windows
   */
  private async applyToAllWindows(): Promise<void> {
    const windows = Services.wm.getEnumerator("navigator:browser");
    while (windows.hasMoreElements()) {
      const window = windows.getNext() as any;
      this.injectCSSVariables.call({document: window.document});
    }
  }

  /**
   * Save theme preference to storage
   */
  private async saveThemePreference(themeId: string): Promise<void> {
    const storage = await browser.storage.local.get("currentTheme");
    await browser.storage.local.set({
      currentTheme: themeId,
      themeAppliedAt: new Date().toISOString(),
    });
  }

  /**
   * Load saved theme on startup
   */
  async loadSavedTheme(): Promise<void> {
    const storage = await browser.storage.local.get("currentTheme");
    if (storage.currentTheme) {
      const theme = await this.fetchTheme(storage.currentTheme);
      if (theme) {
        await this.applyTheme(theme);
      }
    }
  }
}

// Global instance
export const themeEngine = new ThemeEngine();
```

**Responsibilities:**
- Load and apply themes
- Convert theme data to CSS variables
- Inject styles into all windows
- Persist theme preference

**Success Criteria:**
- [ ] Theme applies instantly
- [ ] All UI components update
- [ ] Preference persists
- [ ] No performance degradation

### M7.7: Theme Import/Export

**File:** `browser-features/themes/theme-io.ts`

```typescript
class ThemeIO {
  /**
   * Export theme as JSON file
   */
  async exportTheme(theme: Theme): Promise<Blob> {
    const json = JSON.stringify(theme, null, 2);
    return new Blob([json], {type: "application/json"});
  }

  /**
   * Export theme as .stratus file (ZIP)
   */
  async exportAsPackage(theme: Theme, thumbnail?: Blob): Promise<Blob> {
    const zip = new JSZip();

    // Add manifest
    zip.file("manifest.json", JSON.stringify(theme, null, 2));

    // Add thumbnail if provided
    if (thumbnail) {
      zip.file("thumbnail.png", thumbnail);
    }

    // Add preview screenshots
    for (let i = 0; i < theme.metadata.images?.length || 0; i++) {
      const imageUrl = theme.metadata.images[i];
      const imageBlob = await fetch(imageUrl).then(r => r.blob());
      zip.file(`screenshot-${i}.png`, imageBlob);
    }

    return zip.generateAsync({type: "blob"});
  }

  /**
   * Import theme from JSON
   */
  async importFromJSON(jsonFile: File): Promise<Theme> {
    const text = await jsonFile.text();
    const theme = JSON.parse(text) as Theme;
    this.validateTheme(theme);
    return theme;
  }

  /**
   * Import theme from .stratus package
   */
  async importFromPackage(packageFile: File): Promise<Theme> {
    const zip = new JSZip();
    await zip.loadAsync(packageFile);

    const manifestFile = zip.file("manifest.json");
    if (!manifestFile) {
      throw new Error("Invalid theme package: missing manifest.json");
    }

    const manifestText = await manifestFile.async("text");
    const theme = JSON.parse(manifestText) as Theme;
    this.validateTheme(theme);

    return theme;
  }

  /**
   * Validate theme data
   */
  private validateTheme(theme: Theme): void {
    if (!theme.name || !theme.author) {
      throw new Error("Invalid theme: missing name or author");
    }

    if (!theme.colors || !theme.colors.primary) {
      throw new Error("Invalid theme: missing required colors");
    }

    // More validation...
  }
}

export const themeIO = new ThemeIO();
```

**Responsibilities:**
- Export themes as JSON or packages
- Import themes from files
- Validate theme data
- Handle file I/O

**Success Criteria:**
- [ ] Export/import works reliably
- [ ] Validation catches errors
- [ ] Package format portable

---

## Part 5: Advanced Features

### M7.8: Theme Templates

**Objective:** Provide starting points for theme creation

**Built-in Templates:**
1. **Light (Minimal)** - Clean, light color scheme
2. **Dark (Carbon)** - Deep, dark theme
3. **High Contrast** - WCAG AAA compliant
4. **Colorful** - Vibrant, playful palette
5. **Corporate** - Professional, muted colors
6. **Retro** - Nostalgic 80s/90s aesthetic

**File:** `browser-features/themes/templates.ts`

```typescript
export const THEME_TEMPLATES = {
  light: {
    name: "Light (Minimal)",
    colors: {
      primary: "#0066ff",
      secondary: "#f0f0f0",
      accent: "#ff3333",
      background: "#ffffff",
      surface: "#f8f8f8",
      text: "#000000",
      textSecondary: "#666666",
      border: "#e0e0e0",
    },
    // ... rest of template
  },

  dark: {
    name: "Dark (Carbon)",
    colors: {
      primary: "#00ccff",
      secondary: "#1a1a1a",
      accent: "#ffaa00",
      background: "#0d0d0d",
      surface: "#1a1a1a",
      text: "#ffffff",
      textSecondary: "#aaaaaa",
      border: "#333333",
    },
    // ... rest of template
  },

  // ... more templates
};
```

**Success Criteria:**
- [ ] 6+ templates provided
- [ ] Templates cover diverse styles
- [ ] Users can quickly start customizing

### M7.9: Theme Sync & Cloud Storage

**Objective:** Sync themes across devices

**Features:**
- Save favorite themes to cloud
- Sync current theme across devices
- Access all created themes anywhere
- Backup and restore

**File:** `browser-features/themes/theme-sync.ts`

```typescript
class ThemeSyncManager {
  /**
   * Save theme to cloud
   */
  async saveToCloud(theme: Theme, authToken: string): Promise<void> {
    const response = await fetch("https://api.stratus.dev/themes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(theme),
    });

    if (!response.ok) {
      throw new Error("Failed to save theme to cloud");
    }
  }

  /**
   * Sync current theme across devices
   */
  async syncCurrentTheme(themeId: string, authToken: string): Promise<void> {
    // Upload current theme ID and metadata
    await fetch("https://api.stratus.dev/sync/theme", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({themeId}),
    });
  }

  /**
   * Load synced theme on other device
   */
  async loadSyncedTheme(authToken: string): Promise<Theme | null> {
    const response = await fetch("https://api.stratus.dev/sync/theme", {
      headers: {Authorization: `Bearer ${authToken}`},
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.theme;
  }
}
```

**Success Criteria:**
- [ ] Cloud sync works reliably
- [ ] Synced theme available across devices
- [ ] Backup/restore functional

---

## Timeline & Milestones

### Week 1: Foundation
- M7.1-7.3: Theme editor, color and typography tools
- Basic theme model

### Week 2: Marketplace
- M7.4-7.5: Backend and frontend
- Initial theme catalog

### Week 3: Runtime & Integration
- M7.6-7.7: Theme engine, import/export
- Full browser integration

### Week 4: Advanced Features
- M7.8-7.9: Templates, cloud sync
- Polish and optimization
- Go/No-Go decision

---

## Success Criteria & Sign-Off

- [ ] Theme editor fully functional
- [ ] 50+ themes in marketplace
- [ ] Import/export works reliably
- [ ] Theme runtime performant
- [ ] Cloud sync functional
- [ ] Documentation complete
- [ ] UI responsive and intuitive
- [ ] Ready for release

---

## Integration Points with Previous Milestones

**M3 Design System:**
- Uses Stratus color palette as default
- Typography system compatible
- Component styles update with themes

**M4 Features:**
- Vertical tabs styling customizable via themes
- Workspaces support theme switching
- Split-view colors themeable

**M5 Developer Platform:**
- Theme API available to addons
- Addons can create custom themes
- Addon UI respects current theme

**M6 Privacy Center:**
- Privacy settings displayed in current theme
- Theme doesn't interfere with privacy controls
- Accessibility maintained across themes

---

**Document Status:** Ready for M7 Planning Review  
**Created:** 2026-08-09
