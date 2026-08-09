# M6 Task Breakdown: Privacy Center

**Milestone:** M6 - Privacy Center  
**Duration:** 3 weeks (15 business days)  
**Effort:** 120 hours  
**Team:** 3 engineers (1 privacy, 1 frontend, 1 security)  
**Master Plan:** M6_PRIVACY_CENTER_PLANNING.md  

---

## Task 6.1.1: Privacy Data Model & Score Engine

**Location:** `browser-features/chrome/common/privacy/`  
**Duration:** 3 days | **Effort:** 24 hours | **Owner:** Privacy Engineer

### Description
Implement the privacy metrics data model and privacy score calculation engine.

### Checklist
- [ ] Define privacy data model (io-ts codecs)
  - [ ] `PrivacyMetrics` interface: trackers_blocked, cookies, permissions, policies
  - [ ] `TrackerRecord`: domain, type, blocked_at, source
  - [ ] `PermissionGrant`: addon_id, permission, granted_at, last_used
  - [ ] `DataCollector`: name, purpose, data_types, consent_status
  - [ ] `PrivacyScore`: overall, categories, factors, timestamp
- [ ] Implement metrics collection
  - [ ] Tracker blocking counter (per session + total)
  - [ ] Cookie count by type (first-party, third-party, session)
  - [ ] Permission usage tracking (last_used timestamps)
  - [ ] Data collector registry
  - [ ] Metrics persistence (Services.prefs)
- [ ] Implement score calculation
  - [ ] Score factors (weighted):
    - Tracking protection: 30%
    - Cookie management: 20%
    - Permission hygiene: 20%
    - Data collection transparency: 15%
    - Policy coverage: 15%
  - [ ] Score range 0-100
  - [ ] Category scores (0-100 each)
  - [ ] Score history (daily snapshots)
  - [ ] Score explanation generation
- [ ] Implement score UI data
  - [ ] Score breakdown for dashboard
  - [ ] Improvement suggestions
  - [ ] Trend visualization data
- [ ] Write unit tests
  - [ ] Score calculation accuracy
  - [ ] Weighted categories
  - [ ] Edge cases (no data, all blocked)
  - [ ] History persistence
  - [ ] Explanation generation

### Verification
- [ ] Score calculation correct
- [ ] Metrics collected accurately
- [ ] History persisted
- [ ] 20+ test cases passing

---

## Task 6.1.2: Tracking Protection UI

**Location:** `browser-features/chrome/common/privacy/tracking/`  
**Duration:** 3 days | **Effort:** 24 hours | **Owner:** Frontend Engineer

### Description
Build the tracking protection interface with block/allow controls and statistics.

### Checklist
- [ ] Implement tracker detection
  - [ ] Tracker type classification (analytics, ads, social, fingerprinting)
  - [ ] Blocking rules engine
  - [ ] Allowlist management
  - [ ] Per-site overrides
- [ ] Implement UI components (SolidJS)
  - [ ] TrackingProtectionPanel: summary + controls
  - [ ] TrackerList: blocked trackers with type badges
  - [ ] TrackerFilter: filter by type
  - [ ] SiteOverride: per-site allow/block
  - [ ] StatsHeader: counts and charts
- [ ] Implement controls
  - [ ] Global toggle (on/off)
  - [ ] Per-type toggles (ads, analytics, social, fingerprinting)
  - [ ] Per-site overrides
  - [ ] Blocklist import/export
- [ ] Implement statistics
  - [ ] Trackers blocked (today, week, total)
  - [ ] Blocked by type (chart)
  - [ ] Top blocked domains
  - [ ] Time saved estimate
- [ ] Implement persistence
  - [ ] Settings in Services.prefs
  - [ ] Per-site overrides
  - [ ] Statistics history
- [ ] Write tests
  - [ ] Detection accuracy
  - [ ] Toggle functionality
  - [ ] Per-site overrides
  - [ ] Statistics accuracy
  - [ ] Persistence

### Verification
- [ ] Tracking protection functional
- [ ] UI accessible (WCAG AA)
- [ ] Statistics accurate
- [ ] 25+ test cases passing

---

## Task 6.1.3: Cookie Management

**Location:** `browser-features/chrome/common/privacy/cookies/`  
**Duration:** 2 days | **Effort:** 16 hours | **Owner:** Privacy Engineer

### Description
Implement comprehensive cookie management with per-site display and global controls.

### Checklist
- [ ] Implement cookie listing
  - [ ] Per-site cookie display (name, value, domain, path, expiry)
  - [ ] Cookie search/filter
  - [ ] Cookie count per site
  - [ ] Third-party cookie identification
- [ ] Implement cookie controls
  - [ ] Delete single cookie
  - [ ] Delete all cookies for site
  - [ ] Global clear (all cookies)
  - [ ] Third-party cookie blocking toggle
  - [ ] Session cookie handling
- [ ] Implement cookie settings
  - [ ] Default cookie policy (accept, reject, session-only)
  - [ ] Per-site exceptions
  - [ ] Cookie lifetime options
  - [ ] Import/export cookie settings
- [ ] Implement UI (SolidJS)
  - [ ] CookiePanel: site list + details
  - [ ] CookieDetail: individual cookie info
  - [ ] CookieControls: global + per-site
  - [ ] SearchBar
- [ ] Write tests
  - [ ] Listing accuracy
  - [ ] Delete operations
  - [ ] Global clear
  - [ ] Third-party blocking
  - [ ] Settings persistence

### Verification
- [ ] Cookie management functional
- [ ] UI accessible
- [ ] 20+ test cases passing

---

## Task 6.2.1: Permission Audit

**Location:** `browser-features/chrome/core/privacy/permissions/`  
**Duration:** 2 days | **Effort:** 16 hours | **Owner:** Security Engineer

### Description
Implement permission audit with usage tracking and unused permission detection.

### Checklist
- [ ] Implement permission tracking
  - [ ] Record permission usage (last_used)
  - [ ] Track permission grants (granted_at)
  - [ ] Permission source tracking (addon, site, browser)
  - [ ] Usage frequency counting
- [ ] Implement audit engine
  - [ ] Unused permission detection (no usage in 30 days)
  - [ ] Over-privileged permission detection
  - [ ] Risk level assessment
  - [ ] Audit report generation
- [ ] Implement auto-revoke
  - [ ] Auto-revoke unused permissions (configurable)
  - [ ] Revocation notification
  - [ ] Re-grant flow (user re-approval)
  - [ ] Audit log
- [ ] Implement UI (SolidJS)
  - [ ] PermissionList: all grants with usage
  - [ ] PermissionDetail: usage history
  - [ ] RevokeButton: manual revocation
  - [ ] AutoRevokeSettings
- [ ] Write tests
  - [ ] Usage tracking
  - [ ] Unused detection
  - [ ] Auto-revoke flow
  - [ ] Notification
  - [ ] Audit log

### Verification
- [ ] Audit functional
- [ ] Auto-revoke working
- [ ] 20+ test cases passing

---

## Task 6.2.2: Privacy Policy Parser

**Location:** `browser-features/chrome/core/privacy/policies/`  
**Duration:** 3 days | **Effort:** 24 hours | **Owner:** Privacy Engineer

### Description
Implement privacy policy parsing, scoring, and aggregation.

### Checklist
- [ ] Implement policy fetcher
  - [ ] Fetch policy from site (well-known URLs)
  - [ ] Policy caching (per site)
  - [ ] Policy update detection
  - [ ] Fetch failure handling
- [ ] Implement policy parser
  - [ ] Text extraction (HTML → plain text)
  - [ ] Section detection (data collection, sharing, retention)
  - [ ] Keyword-based analysis
  - [ ] Data type identification (personal, financial, location)
  - [ ] Consent language detection
- [ ] Implement policy scoring
  - [ ] Score 0-100 (privacy friendliness)
  - [ ] Category scores (collection, sharing, retention, rights)
  - [ ] Score explanation
  - [ ] Score history
- [ ] Implement aggregation
  - [ ] Site policy summary
  - [ ] Cross-site comparison
  - [ ] Policy change alerts
- [ ] Implement UI (SolidJS)
  - [ ] PolicyViewer: parsed policy display
  - [ ] PolicyScore: score + breakdown
  - [ ] PolicyList: all sites with scores
  - [ ] PolicyCompare: side-by-side
- [ ] Write tests
  - [ ] Parser accuracy (sample policies)
  - [ ] Scoring correctness
  - [ ] Caching
  - [ ] UI rendering

### Verification
- [ ] Parser 80%+ accuracy
- [ ] Scoring functional
- [ ] 25+ test cases

---

## Task 6.3.1: Settings Integration

**Location:** `browser-features/chrome/common/privacy/settings/`  
**Duration:** 2 days | **Effort:** 16 hours | **Owner:** Frontend Engineer

### Description
Integrate privacy center with M3 preference system.

### Checklist
- [ ] Create privacy settings schema
  - [ ] `floorp.privacy.tracking.enabled` (boolean)
  - [ ] `floorp.privacy.tracking.types` (array)
  - [ ] `floorp.privacy.cookies.policy` (string)
  - [ ] `floorp.privacy.permissions.autoRevoke` (boolean)
  - [ ] `floorp.privacy.permissions.revokeDays` (number)
  - [ ] `floorp.privacy.policies.autoFetch` (boolean)
- [ ] Implement settings UI
  - [ ] Privacy settings section in browser settings
  - [ ] Toggles for each setting
  - [ ] Save/apply behavior
  - [ ] Reset to defaults
- [ ] Implement reactive integration
  - [ ] SolidJS accessor for privacy config
  - [ ] CSS re-injection on change
  - [ ] Cross-feature sync
- [ ] Write tests
  - [ ] Settings persistence
  - [ ] Reactive updates
  - [ ] Reset behavior

### Verification
- [ ] Settings integrated
- [ ] Reactive updates working
- [ ] 10+ test cases

---

## M6 Milestone Verification

### Final Checklist
- [ ] All 6 tasks complete
- [ ] 100+ test cases passing
- [ ] Privacy score functional
- [ ] Tracking protection working
- [ ] Cookie management complete
- [ ] Permission audit active
- [ ] Policy parser 80%+ accurate
- [ ] Settings integrated

### Success Metrics
- [ ] Full transparency
- [ ] 80%+ policy parsing accuracy
- [ ] Settings persist and sync reliably

### Sign-Off
- **Privacy Engineer:** [sign]
- **Frontend Engineer:** [sign]
- **Security Engineer:** [sign]
- **QA:** [sign]
- **Milestone Owner:** [sign]

---

**Document Version:** 1.0  
**Created:** 2026-08-09  
**Last Updated:** 2026-08-09