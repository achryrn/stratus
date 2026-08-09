# M5: Developer Platform & Extension API

**Phase:** M3 - Advanced Features  
**Milestone:** M5 - Developer Platform  
**Date:** 2026-08-09  
**Status:** Planning Phase  
**Owner:** Platform Architecture Team  

---

## Executive Summary

M5 establishes the Stratus Developer Platform, a comprehensive extension/plugin API system enabling third-party developers to create features without modifying browser core. This platform includes WebExtensions compatibility, native addon hooks, and a centralized addon marketplace.

**Key Deliverables:**
1. WebExtensions API implementation (manifest v3 compatible)
2. Native addon hooks and lifecycle management
3. Addon marketplace infrastructure
4. Developer documentation and examples
5. Security and sandboxing layer

**Timeline:** 4 weeks  
**Team:** 2 Platform Engineers, 1 Security Engineer, 1 Developer Advocate  
**Effort:** 160 hours total  

---

## Part 1: Architecture Overview

### Stratus Extension System Design

```
┌─────────────────────────────────────────────────────┐
│         Addon Marketplace (Web)                     │
│  https://addons.stratus.dev (React SPA)            │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│     Addon Management API (TypeScript)                │
│  - Download/install addons                          │
│  - Manage versions and updates                      │
│  - Handle permissions and security                  │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│    WebExtensions API (Gecko ESR 153)                │
│  - Tabs, Windows, Bookmarks, Storage                │
│  - Content Scripts, Background Pages                │
│  - Permissions and Manifest v3                      │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│    Native Addon Hooks (C++ Bridge)                  │
│  - Lifecycle (install, enable, disable, remove)     │
│  - UI integration (toolbars, menus, sidebars)       │
│  - Storage and preferences access                   │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│         Gecko Core APIs                             │
│  - XPCOM components                                 │
│  - Preferences (Services.prefs)                     │
│  - File I/O, Network, Crypto                        │
└─────────────────────────────────────────────────────┘
```

### Security Model

- **Sandbox:** Content scripts run in isolated contexts
- **Permissions:** Manifest declares required permissions explicitly
- **Content Policy:** CSP enforces no inline scripts
- **Review Process:** All addons reviewed before marketplace listing

---

## Part 2: WebExtensions API Implementation

### M5.1: Core API Layers

#### Layer 1: Manifest v3 Parser

**File:** `browser-features/extensions/manifest-parser.ts`

```typescript
interface ManifestV3 {
  manifest_version: 3;
  name: string;
  version: string;
  description: string;
  icons?: { [size: string]: string };
  permissions: string[];
  host_permissions?: string[];
  content_scripts?: ContentScript[];
  background?: { service_worker: string };
  action?: {
    default_title?: string;
    default_popup?: string;
    default_icon?: { [size: string]: string };
  };
}

function parseManifest(manifestJson: string): ManifestV3 {
  // Parse and validate against schema
  // Check for required fields
  // Validate permissions against allowlist
  // Return typed manifest or throw error
}
```

**Responsibilities:**
- Parse manifest.json from addon packages
- Validate against Mozilla schema
- Check permission whitelist
- Extract metadata (name, version, icons)

**Success Criteria:**
- [ ] Parses 100+ real Firefox addons
- [ ] Rejects invalid manifests with clear errors
- [ ] Performance: <100ms per manifest

#### Layer 2: Permission System

**File:** `browser-features/extensions/permissions.ts`

```typescript
const ALLOWED_PERMISSIONS = {
  // Standard permissions
  "tabs": "Allows reading and modifying tab information",
  "windows": "Allows creating and managing windows",
  "bookmarks": "Allows reading and modifying bookmarks",
  "storage": "Allows persistent data storage",
  "cookies": "Allows reading and modifying cookies",
  
  // Content script permissions
  "content_scripts": "Ability to inject content into pages",
  "webRequest": "Ability to intercept network requests",
  
  // UI permissions
  "menus": "Create context menu items",
  "notifications": "Display desktop notifications",
};

function validatePermissions(requested: string[]): { valid: string[]; denied: string[] } {
  return {
    valid: requested.filter(p => p in ALLOWED_PERMISSIONS),
    denied: requested.filter(p => !(p in ALLOWED_PERMISSIONS)),
  };
}
```

**Responsibilities:**
- Maintain allowlist of safe permissions
- Validate addon permission requests
- Display permission prompts to users
- Enforce permission boundaries at runtime

**Success Criteria:**
- [ ] 20+ core permissions supported
- [ ] Permission denial doesn't crash addon
- [ ] User can review and revoke permissions

#### Layer 3: Addon Lifecycle

**File:** `browser-features/extensions/addon-lifecycle.ts`

```typescript
interface Addon {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  permissions: string[];
  installDate: Date;
  lastUpdateDate: Date;
  manifestData: ManifestV3;
}

class AddonLifecycleManager {
  async install(addonPackage: ArrayBuffer): Promise<Addon> {
    // Extract manifest, verify signature
    // Create addon record
    // Emit install event
    // Call addon's background script
  }

  async enable(addonId: string): Promise<void> {
    // Activate addon
    // Load content scripts
    // Emit enable event
  }

  async disable(addonId: string): Promise<void> {
    // Deactivate addon
    // Unload content scripts
    // Clean up event listeners
    // Emit disable event
  }

  async uninstall(addonId: string): Promise<void> {
    // Remove addon files
    // Clear storage
    // Emit uninstall event
  }

  async update(addonId: string, newVersion: ArrayBuffer): Promise<void> {
    // Backup current version
    // Extract and validate new version
    // Migrate storage/prefs if needed
    // Emit update event
  }
}
```

**Responsibilities:**
- Manage addon installation, enabling, disabling
- Handle version updates and migrations
- Emit lifecycle events for monitoring
- Persist addon state across sessions

**Success Criteria:**
- [ ] All lifecycle events fire correctly
- [ ] Storage persisted across sessions
- [ ] Updates don't lose user data

---

### M5.2: Content Script Sandboxing

**File:** `browser-features/extensions/content-script-sandbox.ts`

```typescript
class ContentScriptSandbox {
  /**
   * Inject content script into tab with isolated context
   * - Separate global scope from page JS
   * - Filter DOM access based on permissions
   * - Intercept messaging to background script
   */
  async injectIntoTab(
    tabId: number,
    scriptPath: string,
    permissions: string[]
  ): Promise<void> {
    // Load script file
    // Create isolated context
    // Set up message passing
    // Inject into tab
    // Monitor for errors
  }

  /**
   * Filter DOM access based on permissions
   * Addon can only access elements it has permission for
   */
  private filterDOMAccess(element: Element, permissions: string[]): Element | null {
    if (!permissions.includes("content_scripts")) return null;
    // Return filtered view of DOM
  }

  /**
   * Message passing between content script and background
   */
  private setupMessaging(addonId: string, tabId: number): void {
    // Set up secure message channel
    // Validate messages on both sides
    // Log all communication
  }
}
```

**Responsibilities:**
- Create isolated execution contexts for content scripts
- Prevent access to parent page's global scope
- Filter DOM access based on permissions
- Enable safe message passing

**Success Criteria:**
- [ ] Content scripts can't access page's window object
- [ ] DOM filtering prevents unauthorized access
- [ ] Message passing works reliably

---

### M5.3: Background Service Workers

**File:** `browser-features/extensions/background-worker.ts`

```typescript
class BackgroundServiceWorker {
  /**
   * Load background service worker for addon
   * Handles persistent event listening, alarms, timers
   */
  async load(addonId: string, workerScript: string): Promise<void> {
    // Create Worker context
    // Provide addon APIs (tabs, windows, storage, etc.)
    // Set up event listeners
    // Keep worker alive for addon lifetime
  }

  /**
   * Provide WebExtensions APIs to worker
   */
  private setupWorkerAPIs(worker: Worker): void {
    // chrome.tabs.*, chrome.windows.*, chrome.storage.*, etc.
    // Listen for messages from content scripts
    // Send responses back
  }

  /**
   * Handle alarms and timers
   */
  setupAlarms(addonId: string): void {
    // chrome.alarms API
    // Persist alarms across browser restarts
  }
}
```

**Responsibilities:**
- Load and manage background service workers
- Provide WebExtensions APIs to workers
- Handle persistent event listening
- Manage alarms and timers

**Success Criteria:**
- [ ] Worker stays alive for addon lifetime
- [ ] Alarms fire correctly
- [ ] APIs available and functional

---

## Part 3: Addon Marketplace Infrastructure

### M5.4: Marketplace Backend

**Objective:** API for addon discovery, installation, and management

**File:** `marketplace-backend/src/routes/addons.ts`

```typescript
interface AddonListing {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  rating: number; // 0-5
  downloads: number;
  reviews: Review[];
  permissions: string[];
  manifest: ManifestV3;
  downloadUrl: string;
  reviewStatus: "pending" | "approved" | "rejected";
}

// API Endpoints
GET /api/addons                          // List all addons
GET /api/addons/:id                      // Get addon details
POST /api/addons/search?q=query          // Search addons
GET /api/addons/:id/reviews              // Get addon reviews
POST /api/addons/:id/review              // Submit review
GET /api/addons/:id/versions             // Version history
POST /api/addons/submit                  // Submit new addon (requires auth)
PUT /api/addons/:id/update               // Update addon (requires auth)
DELETE /api/addons/:id                   // Unpublish addon (requires auth)
```

**Responsibilities:**
- Store addon metadata
- Manage versions and updates
- Handle user reviews and ratings
- Enable searching and filtering

**Success Criteria:**
- [ ] 50+ addons listed
- [ ] Search works with fuzzy matching
- [ ] Ratings and reviews functional
- [ ] API response time <500ms

### M5.5: Marketplace Frontend

**Objective:** Web UI for discovering and installing addons

**Technology:** React SPA  
**URL:** `https://addons.stratus.dev`

**Key Pages:**
1. **Homepage:** Featured addons, trending, recently updated
2. **Search Results:** Filter by category, rating, downloads
3. **Addon Details:** Full description, screenshots, reviews, version history
4. **Developer Dashboard:** Submit and manage addons
5. **Installation:** One-click install via browser protocol

**Features:**
- [ ] Search and filter by multiple criteria
- [ ] User reviews and ratings
- [ ] Screenshot gallery
- [ ] Version history with changelog
- [ ] One-click install integration
- [ ] Responsive mobile design

**Success Criteria:**
- [ ] Marketplace loads in <2s
- [ ] 100+ simultaneous users
- [ ] Mobile-friendly responsive UI

---

## Part 4: Developer Documentation & Tools

### M5.6: Addon Developer Guide

**Deliverable:** Comprehensive documentation site

**Contents:**
1. **Getting Started** (30 min read)
   - What is a WebExtension?
   - Hello World addon tutorial
   - Manifest v3 explained
   - Permission system guide

2. **API Reference** (200+ pages)
   - Each API documented with examples
   - Common patterns and recipes
   - Troubleshooting guide

3. **Best Practices**
   - Performance optimization
   - Security considerations
   - User experience patterns
   - Testing and debugging

4. **Sample Addons**
   - [ ] Tab manager addon (100 lines)
   - [ ] Bookmark enhancer addon (200 lines)
   - [ ] Custom theme addon (150 lines)
   - [ ] Content blocker addon (300 lines)

**Success Criteria:**
- [ ] Documentation covers 90%+ of API
- [ ] All code examples tested and working
- [ ] Developer can create addon in <2 hours

### M5.7: Developer Tools

**File:** `tools/addon-cli.ts`

```typescript
// Command-line tool for addon development

deno run addon-cli.ts init <name>          // Create new addon
deno run addon-cli.ts build                // Build addon package
deno run addon-cli.ts test                 // Run addon tests
deno run addon-cli.ts publish              // Submit to marketplace
deno run addon-cli.ts validate             // Validate manifest
```

**Features:**
- [ ] Project scaffolding
- [ ] Manifest validation
- [ ] Automated testing framework
- [ ] Build optimization
- [ ] Marketplace submission

---

## Part 5: Security & Sandboxing

### M5.8: Content Security Policy

**Objective:** Prevent malicious scripts in addons

**Policies:**
- No inline scripts (`<script>` tags)
- No `eval()` or `Function()` constructor
- External scripts must be from whitelist
- Strict CSP headers in all addon pages

**Implementation:**
```typescript
const CSP_HEADER = "default-src 'self'; script-src 'self'; style-src 'unsafe-inline'";

function enforceCSP(addonId: string, document: Document): void {
  // Inject CSP meta tag
  // Monitor for violations
  // Disable addon if violations detected
}
```

**Success Criteria:**
- [ ] Inline scripts blocked
- [ ] Violations logged and acted upon
- [ ] No performance degradation

### M5.9: Addon Code Review Process

**Objective:** Ensure addon security before marketplace listing

**Process:**
1. **Automated Scanning**
   - Manifest validation
   - Permission analysis
   - Known malware detection

2. **Manual Review** (for first-time authors)
   - Security engineer reviews code
   - Check for privacy violations
   - Verify permissions justified

3. **Approval**
   - Auto-approve if passes automated scan
   - Manual review for high-risk permissions
   - 24-48 hour review turnaround

**Success Criteria:**
- [ ] 95%+ auto-approval rate for safe addons
- [ ] Manual review <48 hours
- [ ] Zero malware in marketplace

---

## Part 6: Integration with M4 Features

### M5.10: Addon API for M4 Features

**File:** `browser-features/extensions/apis/workspaces-api.ts`

```typescript
/**
 * Allow addons to interact with M4 features
 */
class WorkspacesAPI {
  /**
   * Get all workspaces
   */
  async getWorkspaces(): Promise<Workspace[]> {
    // Return workspace list
  }

  /**
   * Switch to workspace
   */
  async switchToWorkspace(workspaceId: string): Promise<void> {
    // Switch workspace
  }

  /**
   * Listen for workspace changes
   */
  onWorkspaceChanged(callback: (workspace: Workspace) => void): void {
    // Register callback
  }
}

// Equivalent for split-view and vertical tabs
class SplitViewAPI { /* ... */ }
class VerticalTabsAPI { /* ... */ }
```

**Enables:**
- Addons to manage workspaces
- Addons to listen for layout changes
- Addons to customize split-view behavior

**Success Criteria:**
- [ ] APIs functional and tested
- [ ] Sample addon uses all APIs
- [ ] Documentation complete

---

## Timeline & Milestones

### Week 1: Foundation
- M5.1-5.3: Core API layers (manifest parser, permissions, lifecycle)
- M5.8-5.9: Security framework

### Week 2: Marketplace
- M5.4-5.5: Backend and frontend
- Initial addon testing

### Week 3: Developer Tools
- M5.6-5.7: Documentation and CLI
- Sample addons

### Week 4: Integration & Polish
- M5.10: M4 feature APIs
- Testing and optimization
- Go/No-Go decision

---

## Success Criteria & Sign-Off

- [ ] WebExtensions API 90%+ complete
- [ ] 50+ addons in marketplace
- [ ] Developer documentation complete
- [ ] CLI tools functional
- [ ] Security review passed
- [ ] Ready for M6 work

---

**Document Status:** Ready for M5 Planning Review  
**Created:** 2026-08-09
