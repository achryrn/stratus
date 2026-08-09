# M5 Task Breakdown: Developer Platform

**Milestone:** M5 - Developer Platform  
**Duration:** 4 weeks (20 business days)  
**Effort:** 160 hours  
**Team:** 3 engineers (1 platform, 1 security, 1 frontend)  
**Master Plan:** M5_DEVELOPER_PLATFORM_PLANNING.md  

---

## Task 5.1.1: Manifest V3 Parser & Validation

**Location:** `browser-features/chrome/platform/manifest/`  
**Duration:** 2 days | **Effort:** 16 hours | **Owner:** Platform Engineer

### Description
Parse and validate WebExtension manifests (Manifest V3 format) for addon installation.

### Checklist
- [ ] Create manifest type definitions (io-ts codec)
  - [ ] `ManifestV3` interface: name, version, description, permissions
  - [ ] `BackgroundSpec`: service_worker, type, scripts
  - [ ] `ContentScriptSpec`: matches, js, css, run_at, all_frames
  - [ ] `ActionSpec`: default_title, default_icon, default_popup
  - [ ] `PermissionsSpec`: host_permissions, optional_permissions
  - [ ] `IconsSpec`: 16, 32, 48, 128 sizes
  - [ ] `OptionsUISpec`: page, open_in_tab
  - [ ] `CommandsSpec`: keyboard shortcuts map
- [ ] Implement manifest file loader (`loadManifest(path)`)
  - [ ] Read JSON file with error handling
  - [ ] Validate schema with io-ts decode
  - [ ] Return typed manifest or validation errors
- [ ] Implement validation rules
  - [ ] Required fields present (name, version, manifest_version)
  - [ ] Version format semver (x.y.z)
  - [ ] Name length limits (1-75 chars)
  - [ ] Description length limit (1-132 chars)
  - [ ] Permission names valid & known
  - [ ] Icon sizes valid (16/32/48/128)
  - [ ] Background worker valid JS file reference
  - [ ] Content script match patterns valid
- [ ] Write unit tests
  - [ ] Valid manifest passes
  - [ ] Invalid manifests rejected with clear errors
  - [ ] Edge cases (empty permissions, missing icons)
  - [ ] Version parsing (semver edge cases)
  - [ ] Match pattern validation (valid/invalid patterns)
- [ ] Document manifest schema

### Verification
- [ ] 20+ test cases passing
- [ ] All validation errors human-readable
- [ ] Schema documented for developers

---

## Task 5.1.2: Permission System

**Location:** `browser-features/chrome/platform/permissions/`  
**Duration:** 3 days | **Effort:** 24 hours | **Owner:** Security Engineer

### Description
Implement the addon permission system with whitelist-based permission registry.

### Checklist
- [ ] Define permission registry
  - [ ] 20+ core permissions (storage, tabs, bookmarks, history, cookies, notifications, alarms, webNavigation, webRequest, activeTab, scripting, downloads, topSites, browserSettings, privacy, proxy, sessions, tabs, clipboardRead/Write, geolocation)
  - [ ] Permission descriptions (user-facing)
  - [ ] Permission risk levels (low/medium/high)
  - [ ] Required permission warnings
- [ ] Implement permission manager (`PermissionManager`)
  - [ ] `grantPermission(addonId, permission)` method
  - [ ] `revokePermission(addonId, permission)` method
  - [ ] `hasPermission(addonId, permission)` check
  - [ ] `getPermissions(addonId)` list
  - [ ] Permission storage (Services.prefs)
  - [ ] Runtime permission checks for API calls
- [ ] Implement host permission handling
  - [ ] Match pattern storage
  - [ ] Origin permission checks
  - [ ] Optional permission requests
  - [ ] Permission revocation notifications
- [ ] Implement permission warnings
  - [ ] Generate warning list for UI display
  - [ ] Localized warning strings
  - [ ] Sensitive permission highlighting
- [ ] Write unit tests
  - [ ] Grant/revoke lifecycle
  - [ ] Persistence across restarts
  - [ ] Host pattern matching
  - [ ] Warning generation
  - [ ] Security edge cases (permission escalation)
- [ ] Write security review
  - [ ] Permission escalation vectors
  - [ ] Principle of least privilege verification
  - [ ] Addon isolation boundaries

### Verification
- [ ] All 20+ permissions working
- [ ] Permission checks enforced in APIs
- [ ] Warnings accurate and localized
- [ ] Security review complete

---

## Task 5.1.3: Addon Lifecycle Manager

**Location:** `browser-features/chrome/platform/lifecycle/`  
**Duration:** 3 days | **Effort:** 24 hours | **Owner:** Platform Engineer

### Description
Manage addon installation, enable/disable, update, and uninstall lifecycle.

### Checklist
- [ ] Implement addon storage
  - [ ] Addon directory structure (`addons/<id>/`)
  - [ ] Manifest + files layout
  - [ ] Version manifest (installed versions)
  - [ ] Installation records (installed_at, source)
- [ ] Implement install process
  - [ ] `installFromFile(path)` - local .xpi/zip install
  - [ ] `installFromUrl(url)` - remote install
  - [ ] Manifest validation before install
  - [ ] Permission warnings display
  - [ ] User confirmation flow
  - [ ] File extraction to addon directory
  - [ ] Registry entry creation
- [ ] Implement enable/disable
  - [ ] `enableAddon(id)` - activate features
  - [ ] `disableAddon(id)` - deactivate features
  - [ ] State persistence (prefs)
  - [ ] Feature registration/unregistration
  - [ ] Content script injection/removal
- [ ] Implement uninstall
  - [ ] `uninstallAddon(id)` with confirmation
  - [ ] Remove files and registry entries
  - [ ] Clean up permissions
  - [ ] Notify extension APIs
- [ ] Implement update process
  - [ ] Version check against update URL
  - [ ] Download new version
  - [ ] Install in staging (backup current)
  - [ ] Rollback on failure
  - [ ] Update permissions diff
  - [ ] User notification
- [ ] Write unit tests
  - [ ] Full install/uninstall cycle
  - [ ] Enable/disable state changes
  - [ ] Update with version comparison
  - [ ] Rollback on failed update
  - [ ] Error handling (corrupt files, invalid manifests)
  - [ ] Concurrency (simultaneous installs)

### Verification
- [ ] Full lifecycle tested end-to-end
- [ ] State persists across restarts
- [ ] Error cases handled gracefully
- [ ] 25+ test cases passing

---

## Task 5.1.4: Content Script Sandboxing

**Location:** `browser-features/chrome/platform/sandbox/`  
**Duration:** 4 days | **Effort:** 32 hours | **Owner:** Security Engineer

### Description
Implement content script injection with isolated execution context and DOM access control.

### Checklist
- [ ] Implement script injection engine
  - [ ] Injection timing (document_start, document_end, document_idle)
  - [ ] Match pattern evaluation
  - [ ] Frame targeting (all_frames, top_frame)
  - [ ] JS and CSS injection
  - [ ] Multiple scripts per addon
- [ ] Implement isolated world execution
  - [ ] Separate JS realm for content scripts
  - [ ] No access to page JS variables
  - [ ] Wrapped DOM API exposure
  - [ ] Event interception isolation
- [ ] Implement messaging system
  - [ ] Content script ↔ background messaging
  - [ ] `sendMessage`/`onMessage` API
  - [ ] `sendNativeMessage` (native apps)
  - [ ] Response callbacks with timeout
  - [ ] Message size limits
- [ ] Implement DOM access control
  - [ ] Read-only DOM operations allowed
  - [ ] Write operations permission-gated
  - [ ] Event listener restrictions
  - [ ] XHR/fetch restriction to host permissions
- [ ] Implement security hardening
  - [ ] Sandbox escape detection
  - [ ] Prototype pollution guards
  - [ ] CSP enforcement in scripts
  - [ ] Memory leak prevention
- [ ] Write unit tests
  - [ ] Injection timing correctness
  - [ ] Match pattern filtering
  - [ ] Isolated world verification
  - [ ] Messaging round-trip
  - [ ] Security boundary tests
- [ ] Write security review
  - [ ] Sandbox escape analysis
  - [ ] DOM access audit
  - [ ] Prototype pollution review

### Verification
- [ ] Scripts execute in isolated world
- [ ] DOM access controls enforced
- [ ] Messaging reliable with timeouts
- [ ] Security review passed

---

## Task 5.1.5: Background Service Worker

**Location:** `browser-features/chrome/platform/worker/`  
**Duration:** 3 days | **Effort:** 24 hours | **Owner:** Platform Engineer

### Description
Implement background service worker support for addon lifecycle and API access.

### Checklist
- [ ] Implement service worker lifecycle
  - [ ] Worker startup (on addon enable)
  - [ ] Idle timeout (30s default)
  - [ ] Wake-up triggers (events, messages)
  - [ ] Shutdown and cleanup
  - [ ] Crash recovery
- [ ] Implement API provisioning
  - [ ] `chrome.*` API namespace exposure
  - [ ] API method binding with permission checks
  - [ ] Event registration
  - [ ] `importScripts` support
- [ ] Implement alarms API
  - [ ] `alarms.create`, `alarms.get`, `alarms.clear`
  - [ ] Alarm scheduling (delay, period)
  - [ ] Alarm persistence
  - [ ] Alarm firing events
- [ ] Implement timers
  - [ ] `setTimeout`, `setInterval` in worker
  - [ ] Timer cleanup on shutdown
  - [ ] Long-running task handling
- [ ] Implement worker communication
  - [ ] Port-based messaging (chrome.runtime.connect)
  - [ ] Message routing to content scripts
  - [ ] Response correlation
- [ ] Write unit tests
  - [ ] Lifecycle (start, idle, wake, shutdown)
  - [ ] API availability
  - [ ] Alarms scheduling and firing
  - [ ] Timer cleanup
  - [ ] Crash recovery
  - [ ] Memory stability over time

### Verification
- [ ] Worker lifecycle correct
- [ ] APIs functional with permission checks
- [ ] Alarms reliable
- [ ] 20+ test cases passing

---

## Task 5.2.1: Marketplace Backend

**Location:** `marketplace/server/`  
**Duration:** 4 days | **Effort:** 32 hours | **Owner:** Backend Engineer

### Description
Build REST API backend for addon marketplace with validation, security, and search.

### Checklist
- [ ] Set up Node.js/Express server
  - [ ] Project scaffold (npm init, tsconfig)
  - [ ] Database (SQLite for MVP)
  - [ ] ORM models (Addon, User, Review, Download)
  - [ ] API routes structure
  - [ ] Environment config
- [ ] Implement addon endpoints
  - [ ] `GET /api/addons` - list (pagination, filter, search)
  - [ ] `GET /api/addons/:id` - details
  - [ ] `POST /api/addons` - submit (auth required)
  - [ ] `PUT /api/addons/:id` - update
  - [ ] `DELETE /api/addons/:id` - remove (moderator)
  - [ ] `GET /api/addons/:id/download` - download counter + file
  - [ ] `GET /api/addons/:id/reviews` - reviews list
  - [ ] `POST /api/addons/:id/reviews` - submit review
- [ ] Implement search
  - [ ] Full-text search on name/description
  - [ ] Category filtering
  - [ ] Sort (popular, recent, rating)
  - [ ] Pagination
- [ ] Implement auth
  - [ ] User registration/login (JWT)
  - [ ] Developer role management
  - [ ] Moderator/admin roles
- [ ] Implement security
  - [ ] Input validation (zod schemas)
  - [ ] File upload validation (size, type, malware scan hook)
  - [ ] Rate limiting
  - [ ] SQL injection prevention
  - [ ] XSS protection
- [ ] Write API tests
  - [ ] All CRUD endpoints
  - [ ] Auth flows
  - [ ] Search/filter/pagination
  - [ ] Error handling
  - [ ] Rate limiting

### Verification
- [ ] All endpoints functional
- [ ] Auth working
- [ ] Search returning correct results
- [ ] Security measures in place
- [ ] 30+ API tests passing

---

## Task 5.2.2: Marketplace Frontend

**Location:** `marketplace/client/`  
**Duration:** 4 days | **Effort:** 32 hours | **Owner:** Frontend Engineer

### Description
Build React SPA for addon marketplace with browsing, search, and installation flows.

### Checklist
- [ ] Set up React project
  - [ ] Vite + React + TypeScript scaffold
  - [ ] Router setup (React Router)
  - [ ] State management (Zustand)
  - [ ] Styling (CSS modules or Tailwind)
  - [ ] API client (fetch wrapper)
- [ ] Implement pages
  - [ ] Home: featured addons, categories, search
  - [ ] Browse: paginated list with filters
  - [ ] Addon details: screenshots, description, reviews, install button
  - [ ] Developer dashboard: my addons, submit form, analytics
  - [ ] Login/Register pages
  - [ ] Admin: moderation queue, user management
- [ ] Implement components
  - [ ] AddonCard (thumbnail, name, rating, installs)
  - [ ] RatingStars
  - [ ] CategoryFilter
  - [ ] SearchBar
  - [ ] PaginationControls
  - [ ] InstallButton (with permission warnings)
  - [ ] ReviewForm
  - [ ] ScreenshotGallery
- [ ] Implement installation flow
  - [ ] Install button → permission dialog
  - [ ] Confirmation → download to browser
  - [ ] Success feedback
  - [ ] Already installed state
- [ ] Implement responsive design
  - [ ] Mobile-friendly layout
  - [ ] Touch targets ≥44px
  - [ ] Accessibility (WCAG AA)
- [ ] Write frontend tests
  - [ ] Component rendering
  - [ ] API interactions (mocked)
  - [ ] Navigation flows
  - [ ] Form validation

### Verification
- [ ] All pages functional
- [ ] Installation flow works end-to-end
- [ ] Responsive on mobile/desktop
- [ ] Accessibility checked
- [ ] 20+ component tests passing

---

## Task 5.3.1: Developer Documentation

**Location:** `docs/m5/`  
**Duration:** 2 days | **Effort:** 16 hours | **Owner:** Technical Writer

### Description
Create comprehensive developer documentation for building Stratus addons.

### Checklist
- [ ] Create API reference
  - [ ] All `chrome.*` API methods documented
  - [ ] Parameter types and return values
  - [ ] Examples for each API
  - [ ] Permission requirements
- [ ] Create getting-started guide
  - [ ] Manifest file walkthrough
  - [ ] Hello World addon tutorial
  - [ ] Content script tutorial
  - [ ] Background worker tutorial
  - [ ] UI action tutorial (popup)
- [ ] Create guides
  - [ ] Messaging between parts
  - [ ] Storage API usage
  - [ ] Permissions handling
  - [ ] Debugging tools
  - [ ] Testing addons
- [ ] Create reference materials
  - [ ] Manifest schema reference
  - [ ] API compatibility matrix
  - [ ] Common patterns
  - [ ] Migration guide (MV2 → MV3)
- [ ] Create tutorials
  - [ ] Build a tab manager addon
  - [ ] Build a theme addon
  - [ ] Build a privacy addon

### Verification
- [ ] All APIs documented
- [ ] Getting started guides complete
- [ ] Examples tested and working
- [ ] Documentation reviewed

---

## Task 5.3.2: CLI Tools

**Location:** `tools/addon-cli/`  
**Duration:** 2 days | **Effort:** 16 hours | **Owner:** Platform Engineer

### Description
Build command-line tools for addon development and validation.

### Checklist
- [ ] Create `stratus-addon` CLI
  - [ ] `stratus-addon init` - scaffold new addon
  - [ ] `stratus-addon build` - bundle addon files
  - [ ] `stratus-addon lint` - validate manifest
  - [ ] `stratus-addon test` - run addon tests
  - [ ] `stratus-addon pack` - create .xpi package
  - [ ] `stratus-addon sign` - sign addon package
  - [ ] `stratus-addon publish` - submit to marketplace
- [ ] Implement validation features
  - [ ] Manifest validation (reuse parser)
  - [ ] File size checks
  - [ ] Version validation
  - [ ] Security scan hooks
- [ ] Implement packaging
  - [ ] Zip file creation (.xpi)
  - [ ] Directory structure validation
  - [ ] Hash generation
- [ ] Write tests
  - [ ] Each command functional
  - [ ] Error handling
  - [ ] Exit codes correct

### Verification
- [ ] All commands working
- [ ] Init→build→pack flow tested
- [ ] CLI documented in README

---

## Task 5.4.1: M4 Feature API Exposure

**Location:** `browser-features/chrome/platform/api/`  
**Duration:** 2 days | **Effort:** 16 hours | **Owner:** Platform Engineer

### Description
Expose M4 features (workspaces, split-view, vertical tabs) to addon developers.

### Checklist
- [ ] Create `chrome.workspaces` API
  - [ ] `workspaces.getAll()`
  - [ ] `workspaces.create(name, color?)`
  - [ ] `workspaces.switch(id)`
  - [ ] `workspaces.archive(id)`
  - [ ] `workspaces.onSwitched` event
  - [ ] `workspaces.onCreated` event
- [ ] Create `chrome.splitView` API
  - [ ] `splitView.create()`
  - [ ] `splitView.destroy()`
  - [ ] `splitView.setOrientation(orientation)`
  - [ ] `splitView.getState()`
  - [ ] `splitView.onChanged` event
- [ ] Create `chrome.tabsLayout` API
  - [ ] `tabsLayout.getStyle()`
  - [ ] `tabsLayout.setStyle(style)`
  - [ ] `tabsLayout.onChanged` event
- [ ] Create permission registration
  - [ ] `workspaces`, `splitView`, `tabsLayout` permissions
  - [ ] Permission warnings
- [ ] Write tests
  - [ ] API methods functional
  - [ ] Events fire correctly
  - [ ] Permission checks enforced

### Verification
- [ ] M4 APIs documented
- [ ] Permission system updated
- [ ] Tests passing

---

## Task 5.5.1: Addon Code Review Process

**Location:** `docs/m5/review-process.md`  
**Duration:** 1 day | **Effort:** 8 hours | **Owner:** Security Engineer

### Description
Establish addon submission review process for marketplace safety.

### Checklist
- [ ] Create review checklist
  - [ ] Manifest validation
  - [ ] Permission necessity check
  - [ ] Code scan (static analysis)
  - [ ] Malware pattern detection
  - [ ] Data collection audit
  - [ ] Network behavior review
- [ ] Create review workflow
  - [ ] Submission → queued
  - [ ] Automated scan
  - [ ] Manual review
  - [ ] Approval/rejection
  - [ ] Appeal process
- [ ] Create review tools
  - [ ] Static analysis integration
  - [ ] Malware signature database
  - [ ] Data collection detector
  - [ ] Network endpoint scanner
- [ ] Create documentation
  - [ ] Submission requirements
  - [ ] Review timeline (SLA)
  - [ ] Common rejection reasons
  - [ ] Appeal process

### Verification
- [ ] Review process documented
- [ ] Automated tools in place
- [ ] Team trained on process

---

## M5 Milestone Verification

### Final Checklist
- [ ] All 10 tasks complete
- [ ] 100+ test cases passing
- [ ] 20+ API methods implemented
- [ ] Marketplace operational
- [ ] Developer docs published
- [ ] CLI tools functional
- [ ] Review process active
- [ ] Security review complete

### Success Metrics
- [ ] 50+ addons in marketplace (target after 1 month)
- [ ] Zero malware listings
- [ ] 90%+ API implementation
- [ ] Developer onboarding <1 hour

### Sign-Off
- **Platform Engineer:** [sign]
- **Security Engineer:** [sign]
- **Frontend Engineer:** [sign]
- **QA:** [sign]
- **Milestone Owner:** [sign]

---

**Document Version:** 1.0  
**Created:** 2026-08-09  
**Last Updated:** 2026-08-09
