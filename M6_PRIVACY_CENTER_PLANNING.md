# M6: Privacy Center & Data Management

**Phase:** M3 - Advanced Features  
**Milestone:** M6 - Privacy Center  
**Date:** 2026-08-09  
**Status:** Planning Phase  
**Owner:** Privacy & Security Team  

---

## Executive Summary

M6 implements a comprehensive Privacy Center providing users with transparent, granular control over data collection, tracking, and permissions. This unified dashboard gives users visibility into what data sites collect and how to manage it.

**Key Deliverables:**
1. Privacy dashboard and settings UI
2. Tracking protection and cookie management
3. Site permission audit and revocation
4. Data collection transparency reporting
5. Privacy policy aggregation

**Timeline:** 3 weeks  
**Team:** 1 Privacy Engineer, 1 UX Designer, 1 Frontend Engineer  
**Effort:** 120 hours total  

---

## Part 1: Privacy Center Architecture

### Privacy Data Model

```typescript
interface PrivacyMetrics {
  trackersBlocked: number;
  cookiesAllowed: number;
  cookiesBlocked: number;
  permissionsGranted: PermissionGrant[];
  dataCollectors: DataCollector[];
  privacyScore: number; // 0-100
}

interface PermissionGrant {
  site: string;
  permission: "location" | "camera" | "microphone" | "notifications" | "clipboard";
  granted: Date;
  lastUsed?: Date;
  revokeAction: () => Promise<void>;
}

interface DataCollector {
  name: string;
  type: "analytics" | "advertising" | "social" | "unknown";
  trackerCount: number;
  sitesActive: string[];
  dataCollected: string[];
}

interface PrivacyPolicy {
  site: string;
  url: string;
  lastUpdated: Date;
  dataCollected: string[];
  thirdParties: string[];
  retentionPeriod: string;
}
```

### Privacy Dashboard Layout

```
┌────────────────────────────────────────────────────────┐
│                   Privacy Center                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Privacy Score: 78/100  ████████░░                    │
│  Status: Good - 23 trackers blocked this week          │
│                                                        │
├────────────────────────────────────────────────────────┤
│  Quick Stats                                           │
│  ┌──────────┬──────────┬──────────┬──────────┐        │
│  │ Trackers │ Cookies  │ Perms    │ Policies │        │
│  │ 142      │ 234      │ 12       │ 8        │        │
│  └──────────┴──────────┴──────────┴──────────┘        │
│                                                        │
├────────────────────────────────────────────────────────┤
│  Navigation                                            │
│  [ Tracking ] [ Cookies ] [ Permissions ] [ Policies ] │
│                                                        │
├────────────────────────────────────────────────────────┤
│  Main Content Area (dynamic based on tab)              │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Part 2: Privacy Dashboard Implementation

### M6.1: Privacy Score Calculation

**File:** `browser-features/privacy/privacy-score.ts`

```typescript
class PrivacyScoreCalculator {
  /**
   * Calculate overall privacy score (0-100)
   * Factors:
   * - Tracking protection enabled: +25
   * - Cookies blocked: +15 (per 50 blocked)
   * - Permissions minimal: +20 (fewer than 5)
   * - HTTPS usage: +20
   * - Private browsing: +20
   */
  calculateScore(metrics: PrivacyMetrics): number {
    let score = 50; // Base score

    // Tracking factor
    if (metrics.trackersBlocked > 100) score += 25;
    else if (metrics.trackersBlocked > 50) score += 15;
    else if (metrics.trackersBlocked > 0) score += 5;

    // Cookie factor
    const cookieRatio = metrics.cookiesBlocked / (metrics.cookiesAllowed + 1);
    score += Math.min(15, cookieRatio * 5);

    // Permissions factor
    if (metrics.permissionsGranted.length < 5) score += 20;
    else if (metrics.permissionsGranted.length < 10) score += 10;

    // HTTPS factor
    const httpsPercentage = await calculateHTTPSUsage();
    if (httpsPercentage > 95) score += 20;
    else if (httpsPercentage > 80) score += 10;

    return Math.min(100, score);
  }

  /**
   * Generate privacy report
   */
  async generateReport(): Promise<PrivacyReport> {
    return {
      score: this.calculateScore(metrics),
      trackersBlocked: metrics.trackersBlocked,
      cookiesManaged: metrics.cookiesAllowed + metrics.cookiesBlocked,
      permissionsReview: metrics.permissionsGranted.length,
      recommendedActions: this.getRecommendations(metrics),
    };
  }
}
```

**Responsibilities:**
- Calculate privacy score based on multiple factors
- Generate privacy report with recommendations
- Track privacy metrics over time

**Success Criteria:**
- [ ] Score calculation accurate
- [ ] Metrics collected reliably
- [ ] Report generation <1s

### M6.2: Tracking Protection UI

**File:** `browser-features/privacy/tracking-protection.tsx`

```typescript
export function TrackingProtectionPanel() {
  const [trackersBlocked, setTrackersBlocked] = useState<TrackerInfo[]>([]);
  const [filterType, setFilterType] = useState<"all" | "ads" | "analytics">("all");

  return (
    <div className="tracking-protection">
      <h2>Tracking Protection</h2>

      {/* Stats */}
      <div className="tracker-stats">
        <StatCard label="Blocked This Week" value={trackersBlocked.length} />
        <StatCard label="Known Trackers" value={142} />
        <StatCard label="Protection Level" value="Standard" />
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button active={filterType === "all"} onClick={() => setFilterType("all")}>
          All ({trackersBlocked.length})
        </button>
        <button active={filterType === "ads"} onClick={() => setFilterType("ads")}>
          Advertising ({adsCount})
        </button>
        <button active={filterType === "analytics"} onClick={() => setFilterType("analytics")}>
          Analytics ({analyticsCount})
        </button>
      </div>

      {/* Tracker List */}
      <div className="tracker-list">
        {trackersBlocked
          .filter(t => filterType === "all" || t.type === filterType)
          .map(tracker => (
            <TrackerItem key={tracker.id} tracker={tracker} />
          ))}
      </div>

      {/* Settings */}
      <div className="settings">
        <label>
          <input type="checkbox" checked={protectionEnabled} onChange={toggleProtection} />
          Enable Tracking Protection
        </label>
      </div>
    </div>
  );
}

function TrackerItem({ tracker }: { tracker: TrackerInfo }) {
  return (
    <div className="tracker-item">
      <div className="tracker-name">{tracker.name}</div>
      <div className="tracker-type">{tracker.type}</div>
      <div className="tracker-stats">
        <span>{tracker.blocked} blocked</span>
        <span>{tracker.sites} sites</span>
      </div>
      <button onClick={() => allowTracker(tracker.id)}>Allow</button>
    </div>
  );
}
```

**Responsibilities:**
- Display list of blocked trackers
- Filter by type (ads, analytics, social)
- Allow whitelist specific trackers
- Show statistics and trends

**Success Criteria:**
- [ ] List displays 100+ trackers without lag
- [ ] Filtering instant
- [ ] Whitelist changes take effect immediately

### M6.3: Cookie Management

**File:** `browser-features/privacy/cookie-manager.tsx`

```typescript
export function CookiePanel() {
  const [cookies, setCookies] = useState<CookieInfo[]>([]);
  const [sites, setSites] = useState<string[]>([]);

  return (
    <div className="cookie-panel">
      <h2>Cookies</h2>

      {/* Summary */}
      <div className="cookie-summary">
        <div>Total Cookies: {cookies.length}</div>
        <div>Persistent Cookies: {persistentCount}</div>
        <div>Session Cookies: {sessionCount}</div>
      </div>

      {/* Site List */}
      <div className="site-list">
        {sites.map(site => (
          <SiteCookies key={site} site={site} cookies={getCookiesForSite(site)} />
        ))}
      </div>

      {/* Global Controls */}
      <div className="controls">
        <button onClick={() => clearAllCookies()}>Clear All Cookies</button>
        <button onClick={() => clearThirdPartyCookies()}>Clear Third-Party Only</button>
      </div>

      {/* Settings */}
      <div className="settings">
        <label>
          <input type="checkbox" defaultChecked onChange={toggleThirdPartyCookies} />
          Block Third-Party Cookies
        </label>
      </div>
    </div>
  );
}

function SiteCookies({
  site,
  cookies,
}: {
  site: string;
  cookies: CookieInfo[];
}) {
  return (
    <div className="site-cookies">
      <div className="site-header">
        <span>{site}</span>
        <span className="cookie-count">{cookies.length} cookies</span>
        <button onClick={() => clearCookiesForSite(site)}>Clear</button>
      </div>
      <details>
        <summary>Show Details</summary>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Value</th>
              <th>Type</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            {cookies.map(cookie => (
              <tr key={cookie.name}>
                <td>{cookie.name}</td>
                <td className="truncate">{cookie.value}</td>
                <td>{cookie.isSession ? "Session" : "Persistent"}</td>
                <td>{formatDate(cookie.expiryDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
```

**Responsibilities:**
- Display all cookies grouped by site
- Block/allow third-party cookies
- Clear cookies by site or globally
- Show cookie details and expiry

**Success Criteria:**
- [ ] Lists 1000+ cookies without lag
- [ ] Filtering and clearing instant
- [ ] Details view accessible and informative

---

## Part 3: Permission Management

### M6.4: Permission Audit

**File:** `browser-features/privacy/permission-audit.tsx`

```typescript
export function PermissionAuditPanel() {
  const [permissions, setPermissions] = useState<PermissionGrant[]>([]);
  const [filterType, setFilterType] = useState<PermissionType | "all">("all");

  return (
    <div className="permission-audit">
      <h2>Site Permissions</h2>

      {/* Summary */}
      <div className="permission-summary">
        <div className="permission-stat">
          <span>Active Permissions</span>
          <strong>{permissions.length}</strong>
        </div>
        <div className="permission-stat">
          <span>Most Common</span>
          <strong>{getMostCommonPermission(permissions)}</strong>
        </div>
      </div>

      {/* Permission Type Filters */}
      <div className="permission-filters">
        {["all", "location", "camera", "microphone", "notifications", "clipboard"].map(
          type => (
            <button
              key={type}
              className={filterType === type ? "active" : ""}
              onClick={() => setFilterType(type as any)}
            >
              {type === "all" ? "All" : type}
              ({getPermissionCount(type)})
            </button>
          )
        )}
      </div>

      {/* Permission List */}
      <div className="permission-list">
        {permissions
          .filter(p => filterType === "all" || p.permission === filterType)
          .map(perm => (
            <PermissionItem
              key={`${perm.site}-${perm.permission}`}
              permission={perm}
              onRevoke={() => revokePermission(perm)}
            />
          ))}
      </div>
    </div>
  );
}

function PermissionItem({
  permission,
  onRevoke,
}: {
  permission: PermissionGrant;
  onRevoke: () => void;
}) {
  return (
    <div className="permission-item">
      <div className="permission-icon">
        <PermissionIcon type={permission.permission} />
      </div>
      <div className="permission-info">
        <div className="site">{permission.site}</div>
        <div className="permission-type">
          {permission.permission.charAt(0).toUpperCase() + permission.permission.slice(1)}
        </div>
        <div className="dates">
          <span>Granted: {formatDate(permission.granted)}</span>
          {permission.lastUsed && <span>Last used: {formatDate(permission.lastUsed)}</span>}
        </div>
      </div>
      <button onClick={onRevoke} className="revoke-button">
        Revoke
      </button>
    </div>
  );
}
```

**Responsibilities:**
- List all site permissions
- Filter by permission type
- Show usage history
- Enable permission revocation

**Success Criteria:**
- [ ] Lists all permissions accurately
- [ ] Revocation takes effect immediately
- [ ] Usage tracking works

### M6.5: Unused Permission Detection

**File:** `browser-features/privacy/unused-permissions.ts`

```typescript
class UnusedPermissionDetector {
  /**
   * Identify permissions not used in specified time period
   * Default: 30 days
   */
  async detectUnusedPermissions(days: number = 30): Promise<PermissionGrant[]> {
    const allPermissions = await getGrantedPermissions();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return allPermissions.filter(p => {
      if (!p.lastUsed) return true; // Never used
      return new Date(p.lastUsed) < cutoffDate;
    });
  }

  /**
   * Generate recommendation to revoke unused
   */
  async recommendRevocations(): Promise<PermissionGrant[]> {
    return this.detectUnusedPermissions(30);
  }

  /**
   * Auto-revoke unused permissions (with notification)
   */
  async autoRevokeUnused(days: number = 60): Promise<number> {
    const unused = await this.detectUnusedPermissions(days);
    let revokedCount = 0;

    for (const perm of unused) {
      await perm.revokeAction();
      revokedCount++;
      notifyUser(`Revoked ${perm.permission} for ${perm.site} (unused for ${days} days)`);
    }

    return revokedCount;
  }
}
```

**Responsibilities:**
- Detect permissions not used recently
- Notify user about unused permissions
- Auto-revoke with user consent

**Success Criteria:**
- [ ] Detection accurate
- [ ] Notifications helpful
- [ ] Auto-revoke prevents breakage

---

## Part 4: Privacy Policy Aggregation

### M6.6: Privacy Policy Parser

**File:** `browser-features/privacy/policy-parser.ts`

```typescript
class PrivacyPolicyParser {
  /**
   * Fetch and parse privacy policy for site
   * Extract:
   * - Data collected
   * - Third parties
   * - Retention period
   * - User rights
   */
  async parsePolicy(siteUrl: string): Promise<PrivacyPolicy> {
    const policyUrl = await findPolicyUrl(siteUrl);
    const policyText = await fetchPolicyText(policyUrl);

    return {
      site: new URL(siteUrl).hostname,
      url: policyUrl,
      lastUpdated: extractUpdateDate(policyText),
      dataCollected: extractDataTypes(policyText),
      thirdParties: extractThirdParties(policyText),
      retentionPeriod: extractRetention(policyText),
      userRights: extractUserRights(policyText),
    };
  }

  /**
   * Find privacy policy URL
   * Check: /privacy, /privacy-policy, footer links
   */
  private async findPolicyUrl(siteUrl: string): Promise<string> {
    const commonPaths = ["/privacy", "/privacy-policy", "/policies", "/legal"];
    const domain = new URL(siteUrl).origin;

    for (const path of commonPaths) {
      const response = await fetch(domain + path);
      if (response.ok) return domain + path;
    }

    // Check footer for policy link
    const html = await fetch(siteUrl).then(r => r.text());
    const policyLink = extractPolicyLink(html);
    return policyLink || null;
  }

  /**
   * Extract data types collected
   * Keywords: "collect", "gathering", "information", "data"
   */
  private extractDataTypes(text: string): string[] {
    const dataKeywords = [
      "email",
      "name",
      "address",
      "phone",
      "browsing history",
      "cookies",
      "IP address",
      "device information",
      "location",
    ];
    return dataKeywords.filter(kw => text.toLowerCase().includes(kw));
  }
}
```

**Responsibilities:**
- Fetch and parse privacy policies
- Extract key information (data collected, retention, etc.)
- Update policies regularly

**Success Criteria:**
- [ ] Parses 100+ popular sites
- [ ] Extraction accurate 80%+
- [ ] Updates daily

### M6.7: Policy Display & Comparison

**File:** `browser-features/privacy/policy-viewer.tsx`

```typescript
export function PolicyViewer({ siteUrl }: { siteUrl: string }) {
  const [policy, setPolicy] = useState<PrivacyPolicy | null>(null);
  const [score, setScore] = useState<number>(0);

  useEffect(() => {
    parsePolicy(siteUrl).then(p => {
      setPolicy(p);
      setScore(calculatePolicyScore(p));
    });
  }, [siteUrl]);

  return (
    <div className="policy-viewer">
      <h2>Privacy Policy</h2>

      {policy ? (
        <>
          {/* Policy Score */}
          <div className="policy-score">
            <div className="score-gauge">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" className={`score-${score}`} />
                <text x="50" y="55" textAnchor="middle">
                  {score}%
                </text>
              </svg>
            </div>
            <div className="score-text">
              {score > 75 ? "Good Privacy" : score > 50 ? "Fair Privacy" : "Poor Privacy"}
            </div>
          </div>

          {/* Data Collected */}
          <div className="policy-section">
            <h3>Data Collected</h3>
            <ul>
              {policy.dataCollected.map(data => (
                <li key={data}>{data}</li>
              ))}
            </ul>
          </div>

          {/* Third Parties */}
          <div className="policy-section">
            <h3>Third Parties</h3>
            <div className="third-parties">
              {policy.thirdParties.map(party => (
                <span key={party} className="party-tag">
                  {party}
                </span>
              ))}
            </div>
          </div>

          {/* Retention */}
          <div className="policy-section">
            <h3>Data Retention</h3>
            <p>{policy.retentionPeriod}</p>
          </div>

          {/* Full Policy */}
          <a href={policy.url} target="_blank" rel="noreferrer">
            Read Full Policy →
          </a>
        </>
      ) : (
        <div className="loading">Fetching policy...</div>
      )}
    </div>
  );
}
```

**Responsibilities:**
- Display parsed privacy policy
- Score policy for user privacy
- Show data collection and third parties
- Link to full policy

**Success Criteria:**
- [ ] Display loads <2s
- [ ] Scoring accurate
- [ ] UI clear and understandable

---

## Part 5: Integration & Settings

### M6.8: Privacy Settings Integration

**File:** `browser-features/chrome/common/preferences/privacy-settings.ts`

```typescript
// New privacy-related preferences
const PRIVACY_PREFS = {
  "privacy.trackingProtection.enabled": true,
  "privacy.thirdPartyCookies.blocked": true,
  "privacy.autoRevokePermissions.enabled": true,
  "privacy.autoRevokePermissions.days": 60,
  "privacy.dataCollection.telemetry": false,
  "privacy.dataCollection.analytics": false,
  "privacy.httpsOnly.enabled": true,
  "privacy.fingerprintingProtection.enabled": true,
  "privacy.dnsOverHttps.enabled": true,
};

// Integration with existing config system
class PrivacySettingsManager {
  async getSettings(): Promise<PrivacySettings> {
    return {
      trackingProtection: Services.prefs.getBoolPref("privacy.trackingProtection.enabled"),
      thirdPartyCookiesBlocked: Services.prefs.getBoolPref(
        "privacy.thirdPartyCookies.blocked"
      ),
      autoRevokePermissions: Services.prefs.getBoolPref(
        "privacy.autoRevokePermissions.enabled"
      ),
      httpsOnly: Services.prefs.getBoolPref("privacy.httpsOnly.enabled"),
    };
  }

  async updateSettings(settings: Partial<PrivacySettings>): Promise<void> {
    if ("trackingProtection" in settings) {
      Services.prefs.setBoolPref(
        "privacy.trackingProtection.enabled",
        settings.trackingProtection
      );
    }
    // ... other settings
  }
}
```

**Responsibilities:**
- Store privacy settings in preferences
- Integrate with M3 design system settings
- Provide reactive updates

**Success Criteria:**
- [ ] Settings persist across sessions
- [ ] Changes take effect immediately
- [ ] Settings match UI state

---

## Timeline & Milestones

### Week 1: Foundation
- M6.1-6.3: Privacy score, tracking, cookies
- Basic UI implementation

### Week 2: Permissions & Policies
- M6.4-6.7: Permission management, policy parsing
- Data aggregation

### Week 3: Integration
- M6.8: Settings integration
- Testing and polish
- Go/No-Go decision

---

## Success Criteria & Sign-Off

- [ ] Privacy dashboard fully functional
- [ ] Tracking protection works reliably
- [ ] Cookie management comprehensive
- [ ] Permission auditing accurate
- [ ] Policy parsing 80%+ accurate
- [ ] Settings persist and sync
- [ ] UI responsive and intuitive
- [ ] Ready for M7 work

---

**Document Status:** Ready for M6 Planning Review  
**Created:** 2026-08-09
