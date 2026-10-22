import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Droplet,
  FileBarChart2,
  HeartPulse,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  X,
} from "lucide-react";
import { api, ApiRequestError, demoAuth } from "./api";
import type {
  BloodGroup,
  BloodRequest,
  DashboardSummary,
  DonationDrive,
  Donor,
  RequestStatus,
  User,
} from "./types";

type Page = "overview" | "donors" | "requests" | "drives" | "reports";
type Notice = { kind: "success" | "error"; message: string };

const bloodGroups: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const pageDetails: Record<Page, { title: string; description: string }> = {
  overview: {
    title: "Blood supply overview",
    description: "Monitor active requests, donor availability, and blood group coverage across your network.",
  },
  donors: {
    title: "Donor directory",
    description: "Find eligible, screened donors by blood group and area.",
  },
  requests: {
    title: "Blood requests",
    description: "Track hospital requests, donor matches, and SMS responses from one place.",
  },
  drives: {
    title: "Donation drives",
    description: "Review scheduled drives and donor registrations from your network.",
  },
  reports: {
    title: "Reports",
    description: "Review donor eligibility and blood group coverage using live records.",
  },
};

function formatDate(value: string | null): string {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function App() {
  const [user, setUser] = useState<User | null>(() => demoAuth.getSession());
  const [authLoading, setAuthLoading] = useState(api.hasToken());
  const [page, setPage] = useState<Page>("overview");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [requestCreateTrigger, setRequestCreateTrigger] = useState(0);
  const [donorCreateTrigger, setDonorCreateTrigger] = useState(0);

  useEffect(() => {
    if (!api.hasToken()) return;
    api.me()
      .then(setUser)
      .catch((error: unknown) => {
        if (error instanceof ApiRequestError && error.status === 401) api.logout();
        if (error instanceof Error) setNotice({ kind: "error", message: error.message });
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const showNotice = useCallback((value: Notice) => {
    setNotice(value);
    window.setTimeout(() => setNotice(null), 6000);
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setAuthLoading(true);
    try {
      const signedIn = await api.login(email, password);
      setUser(signedIn);
      setNotice(null);
    } catch (error) {
      showNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to sign in.",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setPage("overview");
  };

  if (authLoading) {
    return <FullPageLoading />;
  }

  if (!user) {
    return (
      <LoginScreen
        notice={notice}
        onLogin={handleLogin}
        loading={authLoading}
      />
    );
  }

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}
      <Sidebar
        activePage={page}
        onNavigate={(nextPage) => {
          setPage(nextPage);
          setSidebarOpen(false);
        }}
        user={user}
        onLogout={handleLogout}
        mobileOpen={sidebarOpen}
      />
      <main className="main-area">
        <Topbar
          user={user}
          search={globalSearch}
          onSearch={setGlobalSearch}
          onMenu={() => setSidebarOpen(true)}
        />
        {user.demoMode && (
          <div className="demo-banner" role="status">
            <strong>Development demo mode</strong>
            <span>Live records, donor matching, and SMS need a backend connection.</span>
          </div>
        )}
        <section className="page-content">
          <PageHeader
            page={page}
            canRegisterDonor={user.role === "admin" || user.role === "drive_staff"}
          onCreateRequest={() => {
            setPage("requests");
            setRequestCreateTrigger((value) => value + 1);
          }}
          onCreateDonor={() => {
            setPage("donors");
            setDonorCreateTrigger((value) => value + 1);
          }}
          />
          <PageContent
            page={page}
            search={globalSearch}
            user={user}
            onNotice={showNotice}
            requestCreateTrigger={requestCreateTrigger}
            donorCreateTrigger={donorCreateTrigger}
          />
        </section>
      </main>
      {notice && <Toast notice={notice} onClose={() => setNotice(null)} />}
    </div>
  );
}

function FullPageLoading() {
  return (
    <div className="full-page-loading">
      <LoaderCircle className="spin" size={28} />
      <span>Connecting to DamuLink…</span>
    </div>
  );
}

function LoginScreen({
  notice,
  loading,
  onLogin,
}: {
  notice: Notice | null;
  loading: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onLogin(email.trim(), password);
  };

  return (
    <div className="login-page">
      <div className="login-visual">
        <Brand light />
        <div className="login-visual-copy">
          <span className="eyebrow eyebrow-light"><span className="pulse-dot" /> CONNECTING CARE</span>
          <h1>Every connection<br />can save a life.</h1>
          <p>Find eligible donors, respond to urgent requests, and keep every step accountable.</p>
        </div>
        <div className="login-visual-footer"><ShieldCheck size={17} /> Secure access for authorised teams</div>
      </div>
      <div className="login-form-side">
        <div className="login-form-wrap">
          <div className="mobile-brand"><Brand /></div>
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to DamuLink</h2>
          <p className="muted login-subtitle">
            {demoAuth.enabled
              ? "Sign in with a backend account or use one of the local demo accounts."
              : "Use your authorised organisation account to continue."}
          </p>
          {notice && <InlineNotice notice={notice} />}
          <form className="form-stack" onSubmit={submit}>
            <label className="field-label" htmlFor="email">Email address</label>
            <input
              id="email"
              className="text-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@hospital.org"
              required
            />
            <div className="password-label-row">
              <label className="field-label" htmlFor="password">Password</label>
            </div>
            <div className="password-field">
              <input
                id="password"
                className="text-input"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
              <button className="text-button show-password" type="button" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <button className="button button-primary login-submit" disabled={loading} type="submit">
              {loading ? <LoaderCircle className="spin" size={17} /> : null}
              Sign in
            </button>
          </form>
          {demoAuth.enabled && (
            <section className="demo-accounts" aria-label="Development demo accounts">
              <div className="demo-accounts-heading">
                <span>DEVELOPMENT-ONLY DEMO ACCOUNTS</span>
                <p>These work locally when the API is offline. They do not create donor or request records.</p>
              </div>
              {demoAuth.accounts.map((account) => (
                <div className="demo-account" key={account.email}>
                  <div className="demo-account-info">
                    <strong>{account.user.role.replace(/_/g, " ")}</strong>
                    <code>{account.email}</code>
                    <code>{account.password}</code>
                  </div>
                  <button
                    className="button button-quiet demo-use-button"
                    type="button"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                    }}
                  >
                    Use
                  </button>
                </div>
              ))}
            </section>
          )}
          <div className="login-privacy">
            <ShieldCheck size={16} />
            {demoAuth.enabled
              ? "Demo sign-ins are local and are not production accounts."
              : "Your access is protected and activity is logged."}
          </div>
        </div>
      </div>
    </div>
  );
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? "brand-light" : ""}`}>
      <span className="brand-mark"><Droplet size={19} fill="currentColor" strokeWidth={1.8} /></span>
      <span className="brand-copy"><strong>DamuLink</strong><small>BLOOD CONNECTS US</small></span>
    </div>
  );
}

function Sidebar({
  activePage,
  onNavigate,
  user,
  onLogout,
  mobileOpen,
}: {
  activePage: Page;
  onNavigate: (page: Page) => void;
  user: User;
  onLogout: () => void;
  mobileOpen: boolean;
}) {
  const navItems: { key: Page; label: string; icon: typeof LayoutDashboard }[] = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "donors", label: "Donors", icon: UsersRound },
    { key: "requests", label: "Blood requests", icon: FileBarChart2 },
    { key: "drives", label: "Donation drives", icon: CalendarDays },
    { key: "reports", label: "Reports", icon: Activity },
  ];

  return (
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <Brand light />
      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navItems.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`nav-item ${activePage === key ? "nav-item-active" : ""}`}
            onClick={() => onNavigate(key)}
          >
            <Icon size={19} strokeWidth={1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="security-card">
        <div className="security-icon"><ShieldCheck size={17} /></div>
        <strong>{user.demoMode ? "Demo session" : "Data protected"}</strong>
        <p>
          {user.demoMode
            ? "No live donor data or audit records are connected in this local demo."
            : "Access is logged and handled under the Kenya Data Protection Act."}
        </p>
      </div>
      <div className="sidebar-profile">
        <div className="avatar avatar-gold">{initials(user.name)}</div>
        <div className="profile-copy">
          <strong>{user.name}</strong>
          <span>{user.organization}</span>
        </div>
        <button className="icon-button profile-menu" title="Sign out" onClick={onLogout}><LogOut size={17} /></button>
      </div>
    </aside>
  );
}

function Topbar({
  user,
  search,
  onSearch,
  onMenu,
}: {
  user: User;
  search: string;
  onSearch: (value: string) => void;
  onMenu: () => void;
}) {
  const today = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <header className="topbar">
      <button className="mobile-menu-button icon-button" aria-label="Open menu" onClick={onMenu}><Menu size={20} /></button>
      <div className="greeting"><strong>Good morning, {user.name.split(" ")[0]}</strong><span>{today}</span></div>
      <label className="global-search">
        <Search size={17} />
        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search donors, requests…" aria-label="Search current records" />
        {search && <button className="icon-button search-clear" onClick={() => onSearch("")} aria-label="Clear search"><X size={15} /></button>}
      </label>
      <button className="icon-button topbar-icon" aria-label="Notifications"><Bell size={19} /><span className="notification-dot" /></button>
      <button className="icon-button topbar-icon help-button" aria-label="Help"><CircleHelp size={19} /></button>
    </header>
  );
}

function PageHeader({
  page,
  canRegisterDonor,
  onCreateRequest,
  onCreateDonor,
}: {
  page: Page;
  canRegisterDonor: boolean;
  onCreateRequest: () => void;
  onCreateDonor: () => void;
}) {
  const details = pageDetails[page];
  const action = page === "overview" || page === "requests"
    ? { label: "Create blood request", click: onCreateRequest }
    : page === "donors" && canRegisterDonor
      ? { label: "Register donor", click: onCreateDonor }
      : null;

  return (
    <div className="page-heading-row">
      <div>
        <div className="eyebrow page-kicker"><span className="pulse-dot" /> {page === "overview" ? "LIVE OPERATIONS" : "DAMULINK WORKSPACE"}</div>
        <h1>{details.title}</h1>
        <p>{details.description}</p>
      </div>
      {action && (
        <button className="button button-primary page-primary-action" onClick={action.click}>
          <Plus size={19} /> {action.label}
        </button>
      )}
    </div>
  );
}

function PageContent({
  page,
  search,
  user,
  onNotice,
  requestCreateTrigger,
  donorCreateTrigger,
}: {
  page: Page;
  search: string;
  user: User;
  onNotice: (notice: Notice) => void;
  requestCreateTrigger: number;
  donorCreateTrigger: number;
}) {
  if (page === "overview") return <Overview search={search} />;
  if (page === "donors") return <DonorsPage search={search} user={user} onNotice={onNotice} createTrigger={donorCreateTrigger} />;
  if (page === "requests") return <RequestsPage search={search} onNotice={onNotice} createTrigger={requestCreateTrigger} />;
  if (page === "drives") return <DrivesPage search={search} />;
  return <ReportsPage />;
}

function Overview({ search }: { search: string }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.dashboard()
      .then((data) => {
        setSummary(data);
        setError("");
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Dashboard data could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  if (loading) return <ContentLoading />;
  if (error || !summary) return <LoadError message={error} onRetry={load} />;

  const metrics = [
    { label: "Registered donors", value: summary.registeredDonors, icon: UsersRound, tone: "red", hint: "Screened and registered" },
    { label: "Eligible now", value: summary.eligibleDonors, icon: HeartPulse, tone: "green", hint: "Available to be contacted" },
    { label: "Active requests", value: summary.activeRequests, icon: FileBarChart2, tone: "amber", hint: "Awaiting fulfilment" },
    { label: "Lives supported", value: summary.livesSupported, icon: Droplet, tone: "blue", hint: "Recorded fulfilled units" },
  ];
  const visibleRequests = summary.recentRequests.filter((request) => matches(`${request.reference} ${request.hospitalName} ${request.area} ${request.bloodGroup}`, search));

  return (
    <>
      <div className="metric-grid">
        {metrics.map(({ label, value, icon: Icon, tone, hint }) => (
          <article className="metric-card" key={label}>
            <div className={`metric-icon metric-${tone}`}><Icon size={19} /></div>
            <span className="metric-value">{value.toLocaleString()}</span>
            <strong>{label}</strong>
            <span className="metric-hint">{hint}</span>
          </article>
        ))}
      </div>
      <div className="overview-grid">
        <section className="panel blood-group-panel">
          <PanelHeading title="Donor availability" subtitle="Registered donors by blood group" />
          <div className="blood-group-grid">
            {bloodGroups.map((group) => (
              <div className="blood-group-item" key={group}>
                <span className="blood-group-badge">{group}</span>
                <strong>{(summary.donorsByBloodGroup[group] ?? 0).toLocaleString()}</strong>
              </div>
            ))}
          </div>
          <div className="panel-footnote"><Activity size={15} /> Counts update from the donor register</div>
        </section>
        <section className="panel operations-panel">
          <PanelHeading title="Response workflow" subtitle="Keep urgent requests moving" />
          <div className="workflow-step"><span className="workflow-number">01</span><div><strong>Request received</strong><p>Hospital shares group, units, area, and urgency.</p></div><CheckCircle2 size={18} /></div>
          <div className="workflow-step"><span className="workflow-number">02</span><div><strong>Eligible donors matched</strong><p>Only compatible, eligible, opted-in donors are included.</p></div><CheckCircle2 size={18} /></div>
          <div className="workflow-step"><span className="workflow-number workflow-number-active">03</span><div><strong>SMS sent and responses tracked</strong><p>Donors reply YES, NO, or STOP to the alert.</p></div><Clock3 size={18} /></div>
          <div className="sms-note"><Bell size={16} /><span>SMS alerts are sent through the configured backend provider when a request is dispatched.</span></div>
        </section>
      </div>
      <section className="panel recent-panel">
        <PanelHeading title="Recent requests" subtitle="Latest activity across your network" />
        {visibleRequests.length ? <RequestTable requests={visibleRequests} compact /> : <EmptyState title="No recent requests" description={search ? "No requests match your search." : "New hospital requests will appear here when they are created."} />}
      </section>
    </>
  );
}

function DonorsPage({ search, user, onNotice, createTrigger }: { search: string; user: User; onNotice: (notice: Notice) => void; createTrigger: number }) {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bloodFilter, setBloodFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const canRegister = user.role === "admin" || user.role === "drive_staff";

  const load = useCallback(() => {
    setLoading(true);
    api.donors({ search, bloodGroup: bloodFilter, area: areaFilter })
      .then((result) => {
        setDonors(result.results);
        setCount(result.count);
        setError("");
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Donors could not be loaded."))
      .finally(() => setLoading(false));
  }, [search, bloodFilter, areaFilter]);

  useEffect(load, [load]);

  useEffect(() => {
    if (createTrigger > 0 && canRegister) setRegisterOpen(true);
  }, [createTrigger, canRegister]);

  const createDonor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const lastDonation = String(form.get("lastDonationDate") || "");
    try {
      await api.createDonor({
        fullName: String(form.get("fullName")),
        phoneNumber: String(form.get("phoneNumber")),
        nationalId: String(form.get("nationalId")),
        location: String(form.get("location")),
        bloodGroup: String(form.get("bloodGroup")) as BloodGroup,
        lastDonationDate: lastDonation ? new Date(`${lastDonation}T00:00:00`).toISOString() : null,
        consentToSms: form.get("consentToSms") === "on",
        screeningStatus: "clear",
      });
      setRegisterOpen(false);
      onNotice({ kind: "success", message: "Screened donor registered." });
      load();
    } catch (reason) {
      onNotice({ kind: "error", message: reason instanceof Error ? reason.message : "Donor could not be registered." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="panel directory-panel">
        <div className="directory-toolbar">
          <div><h2>Donor register</h2><p>{count.toLocaleString()} records from the live donor register</p></div>
          <div className="filter-controls">
            <label className="select-wrap"><SlidersHorizontal size={15} /><select aria-label="Filter by blood group" value={bloodFilter} onChange={(event) => setBloodFilter(event.target.value)}><option value="">All blood groups</option>{bloodGroups.map((group) => <option key={group}>{group}</option>)}</select><ChevronDown size={14} /></label>
            <label className="area-filter"><MapPin size={15} /><input value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} placeholder="Area" /></label>
            {canRegister && <button className="button button-dark" onClick={() => setRegisterOpen(true)}><Plus size={17} /> Register donor</button>}
          </div>
        </div>
        {loading ? <ContentLoading /> : error ? <LoadError message={error} onRetry={load} /> : donors.length ? (
          <div className="table-scroll"><table className="data-table"><thead><tr><th>Donor</th><th>Blood group</th><th>Location</th><th>Last donation</th><th>Eligibility</th><th>SMS consent</th></tr></thead><tbody>
            {donors.map((donor) => <tr key={donor.id}><td><div className="table-person"><div className="avatar avatar-soft">{initials(donor.fullName)}</div><div><strong>{donor.fullName}</strong><span>{donor.phoneNumber}</span></div></div></td><td><span className="blood-group-badge">{donor.bloodGroup}</span></td><td>{donor.location}</td><td>{formatDate(donor.lastDonationDate)}</td><td><StatusPill tone={donor.eligible ? "green" : "gray"}>{donor.eligible ? "Eligible" : "Not eligible"}</StatusPill></td><td><StatusPill tone={donor.consentToSms && !donor.optedOut ? "green" : "gray"}>{donor.consentToSms && !donor.optedOut ? "Opted in" : "No alerts"}</StatusPill></td></tr>)}
          </tbody></table></div>
        ) : <EmptyState title="No donors found" description={search || bloodFilter || areaFilter ? "Try changing your search or filters." : "Donors will appear here after a clear screening result is recorded."} />}
      </section>
      {registerOpen && <Modal title="Register a screened donor" description="Only add a donor after their blood has passed facility screening." onClose={() => setRegisterOpen(false)}>
        <form className="modal-form" onSubmit={createDonor}>
          <div className="form-grid">
            <Field label="Full name" required><input name="fullName" autoComplete="name" required placeholder="Donor's full name" /></Field>
            <Field label="Phone number" hint="Include country code, e.g. +254…" required><input name="phoneNumber" type="tel" required placeholder="+254 7XX XXX XXX" /></Field>
            <Field label="National ID" required><input name="nationalId" required placeholder="Identification number" /></Field>
            <Field label="Location / area" required><input name="location" required placeholder="Town or neighbourhood" /></Field>
            <Field label="Blood group" required><select name="bloodGroup" required defaultValue=""><option value="" disabled>Select group</option>{bloodGroups.map((group) => <option key={group}>{group}</option>)}</select></Field>
            <Field label="Last donation date" hint="Leave blank if no previous donation"><input name="lastDonationDate" type="date" /></Field>
          </div>
          <label className="check-row"><input type="checkbox" name="consentToSms" required /><span>The donor has consented to receive SMS donation alerts and understands they can reply STOP to opt out.</span></label>
          <div className="screening-callout"><ShieldCheck size={17} /><span>Screening result is clear. Screening itself is completed by the health facility, not DamuLink.</span></div>
          <div className="modal-actions"><button className="button button-quiet" type="button" onClick={() => setRegisterOpen(false)}>Cancel</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Register donor</button></div>
        </form>
      </Modal>}
    </>
  );
}

function RequestsPage({ search, onNotice, createTrigger }: { search: string; onNotice: (notice: Notice) => void; createTrigger: number }) {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<BloodRequest | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.requests({ search, status: statusFilter })
      .then((result) => {
        setRequests(result.results);
        setError("");
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Requests could not be loaded."))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(load, [load]);

  useEffect(() => {
    if (createTrigger > 0) setCreateOpen(true);
  }, [createTrigger]);

  const createRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const created = await api.createRequest({
        hospitalName: String(form.get("hospitalName")),
        contactName: String(form.get("contactName")),
        contactPhone: String(form.get("contactPhone")),
        bloodGroup: String(form.get("bloodGroup")) as BloodGroup,
        unitsNeeded: Number(form.get("unitsNeeded")),
        area: String(form.get("area")),
        urgency: String(form.get("urgency")) as BloodRequest["urgency"],
        neededBy: new Date(String(form.get("neededBy"))).toISOString(),
        notes: String(form.get("notes") || ""),
      });
      setCreateOpen(false);
      setSelected(created);
      onNotice({ kind: "success", message: `${created.reference} created. Review matched donors before sending SMS alerts.` });
      load();
    } catch (reason) {
      onNotice({ kind: "error", message: reason instanceof Error ? reason.message : "The request could not be created." });
    } finally {
      setSaving(false);
    }
  };

  const dispatch = async (request: BloodRequest) => {
    setSaving(true);
    try {
      const updated = await api.dispatchAlerts(request.id);
      setSelected(updated);
      onNotice({ kind: "success", message: `SMS alerts queued for matched donors on ${request.reference}.` });
      load();
    } catch (reason) {
      onNotice({ kind: "error", message: reason instanceof Error ? reason.message : "SMS alerts could not be sent." });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (request: BloodRequest, status: RequestStatus) => {
    try {
      const updated = await api.updateRequestStatus(request.id, status);
      setSelected(updated);
      onNotice({ kind: "success", message: `Request marked ${status.replace(/_/g, " ")}.` });
      load();
    } catch (reason) {
      onNotice({ kind: "error", message: reason instanceof Error ? reason.message : "Status could not be updated." });
    }
  };

  return (
    <>
      <section className="panel directory-panel">
        <div className="directory-toolbar">
          <div><h2>Request register</h2><p>Review matches, SMS delivery, and donor replies</p></div>
          <div className="filter-controls">
            <label className="select-wrap"><SlidersHorizontal size={15} /><select aria-label="Filter requests by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option><option value="open">Open</option><option value="notified">Notified</option><option value="partially_fulfilled">Partially fulfilled</option><option value="fulfilled">Fulfilled</option><option value="cancelled">Cancelled</option></select><ChevronDown size={14} /></label>
            <button className="button button-dark" onClick={() => setCreateOpen(true)}><Plus size={17} /> New request</button>
          </div>
        </div>
        {loading ? <ContentLoading /> : error ? <LoadError message={error} onRetry={load} /> : requests.length ? <RequestTable requests={requests} onSelect={setSelected} /> : <EmptyState title="No blood requests" description={search || statusFilter ? "No requests match the selected search or status." : "Create a request to find compatible, eligible donors and notify them by SMS."} />}
      </section>
      {createOpen && <Modal title="Create a blood request" description="DamuLink will match eligible, compatible donors in the requested area." onClose={() => setCreateOpen(false)}>
        <form className="modal-form" onSubmit={createRequest}>
          <div className="form-grid">
            <Field label="Hospital / facility" required><input name="hospitalName" required placeholder="Facility name" /></Field>
            <Field label="Request contact" required><input name="contactName" required placeholder="Contact person's name" /></Field>
            <Field label="Contact phone" required><input name="contactPhone" type="tel" required placeholder="+254 7XX XXX XXX" /></Field>
            <Field label="Blood group needed" required><select name="bloodGroup" required defaultValue=""><option value="" disabled>Select group</option>{bloodGroups.map((group) => <option key={group}>{group}</option>)}</select></Field>
            <Field label="Units needed" required><input name="unitsNeeded" type="number" min="1" step="1" required placeholder="e.g. 2" /></Field>
            <Field label="Area" required><input name="area" required placeholder="Town or neighbourhood" /></Field>
            <Field label="Urgency" required><select name="urgency" defaultValue="urgent"><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="critical">Critical</option></select></Field>
            <Field label="Needed by" required><input name="neededBy" type="datetime-local" required /></Field>
            <Field label="Additional notes"><textarea name="notes" rows={3} placeholder="Optional details for the care team" /></Field>
          </div>
          <div className="sms-note modal-sms-note"><Bell size={16} /><span>Creating the request finds compatible donors. SMS is sent only when you review the match list and select “Send SMS alerts”.</span></div>
          <div className="modal-actions"><button className="button button-quiet" type="button" onClick={() => setCreateOpen(false)}>Cancel</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />} Create request</button></div>
        </form>
      </Modal>}
      {selected && <Modal title={`${selected.reference} · ${selected.bloodGroup}`} description={`${selected.hospitalName} · ${selected.area} · ${selected.unitsNeeded} unit${selected.unitsNeeded === 1 ? "" : "s"} needed`} onClose={() => setSelected(null)} wide>
        <RequestDetail request={selected} saving={saving} onDispatch={() => void dispatch(selected)} onStatus={(status) => void updateStatus(selected, status)} />
      </Modal>}
    </>
  );
}

function RequestTable({
  requests,
  compact = false,
  onSelect,
}: {
  requests: BloodRequest[];
  compact?: boolean;
  onSelect?: (request: BloodRequest) => void;
}) {
  return (
    <div className="table-scroll"><table className="data-table requests-table"><thead><tr><th>Request</th><th>Blood group</th><th>Units</th><th>Urgency</th><th>Matched</th><th>Status</th><th>Needed by</th>{!compact && <th>SMS / responses</th>}<th /></tr></thead><tbody>
      {requests.map((request) => {
        const responses = request.matchedDonors.reduce((total, donor) => total + (donor.response === "yes" ? 1 : 0), 0);
        return <tr key={request.id}>
          <td><button className="table-link" onClick={() => onSelect?.(request)}><strong>{request.reference}</strong><span>{request.hospitalName}</span></button></td>
          <td><span className="blood-group-badge">{request.bloodGroup}</span></td>
          <td>{request.unitsFulfilled}/{request.unitsNeeded}</td>
          <td><UrgencyPill urgency={request.urgency} /></td>
          <td>{request.matchedDonors.length}</td>
          <td><RequestStatusPill status={request.status} /></td>
          <td>{formatDate(request.neededBy)}</td>
          {!compact && <td><span className="response-count">{request.matchedDonors.filter((donor) => donor.smsStatus === "sent" || donor.smsStatus === "delivered").length} sent · {responses} yes</span></td>}
          {!compact && <td><button className="button button-small button-outline" onClick={() => onSelect?.(request)}>Review matches</button></td>}
        </tr>;
      })}
    </tbody></table></div>
  );
}

function RequestDetail({
  request,
  saving,
  onDispatch,
  onStatus,
}: {
  request: BloodRequest;
  saving: boolean;
  onDispatch: () => void;
  onStatus: (status: RequestStatus) => void;
}) {
  const yesCount = request.matchedDonors.filter((donor) => donor.response === "yes").length;
  return (
    <div className="request-detail">
      <div className="request-summary-strip">
        <div><span className="detail-label">Status</span><RequestStatusPill status={request.status} /></div>
        <div><span className="detail-label">Urgency</span><UrgencyPill urgency={request.urgency} /></div>
        <div><span className="detail-label">Needed by</span><strong>{formatDate(request.neededBy)}</strong></div>
        <div><span className="detail-label">Donor responses</span><strong>{yesCount} yes · {request.matchedDonors.filter((donor) => donor.response === "no").length} no</strong></div>
      </div>
      <div className="match-header"><div><h3>Matched donors</h3><p>{request.matchedDonors.length} eligible donor{request.matchedDonors.length === 1 ? "" : "s"} matched by compatibility and area</p></div>
        {!request.smsDispatchedAt && <button className="button button-primary" disabled={saving || request.matchedDonors.length === 0} onClick={onDispatch}>{saving ? <LoaderCircle className="spin" size={16} /> : <Bell size={16} />} Send SMS alerts</button>}
        {request.smsDispatchedAt && <StatusPill tone="green">SMS sent {formatDate(request.smsDispatchedAt)}</StatusPill>}
      </div>
      {request.matchedDonors.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Donor</th><th>Group</th><th>Area</th><th>SMS delivery</th><th>Response</th></tr></thead><tbody>{request.matchedDonors.map((donor) => <tr key={donor.donorId}><td><div className="table-person"><div className="avatar avatar-soft">{initials(donor.fullName)}</div><div><strong>{donor.fullName}</strong><span>{donor.phoneNumberMasked}</span></div></div></td><td><span className="blood-group-badge">{donor.bloodGroup}</span></td><td>{donor.location}</td><td><SmsStatus status={donor.smsStatus} /></td><td><ResponsePill response={donor.response} /></td></tr>)}</tbody></table></div> : <EmptyState title="No eligible donors matched" description="Check the blood group and area. DamuLink excludes ineligible, opted-out, and non-consenting donors." />}
      <div className="request-detail-footer">
        <span>YES / NO responses and STOP opt-outs are updated from incoming SMS replies.</span>
        <label className="status-update">Update status <select value={request.status} onChange={(event) => onStatus(event.target.value as RequestStatus)}><option value="open">Open</option><option value="notified">Notified</option><option value="partially_fulfilled">Partially fulfilled</option><option value="fulfilled" disabled={!request.smsDispatchedAt}>Fulfilled</option><option value="cancelled">Cancelled</option></select></label>
      </div>
    </div>
  );
}

function DrivesPage({ search }: { search: string }) {
  const [drives, setDrives] = useState<DonationDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.drives({ search, status })
      .then((result) => {
        setDrives(result.results);
        setError("");
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Donation drives could not be loaded."))
      .finally(() => setLoading(false));
  }, [search, status]);

  useEffect(load, [load]);

  return (
    <section className="panel directory-panel">
      <div className="directory-toolbar"><div><h2>Donation drives</h2><p>Drive schedules and registrations from the live network</p></div><label className="select-wrap"><SlidersHorizontal size={15} /><select aria-label="Filter drives by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All drives</option><option value="scheduled">Scheduled</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><ChevronDown size={14} /></label></div>
      {loading ? <ContentLoading /> : error ? <LoadError message={error} onRetry={load} /> : drives.length ? <div className="drive-grid">{drives.map((drive) => <article className="drive-card" key={drive.id}><div className="drive-card-top"><span className="drive-icon"><CalendarDays size={19} /></span><DriveStatus status={drive.status} /></div><h3>{drive.name}</h3><p className="drive-venue"><MapPin size={15} /> {drive.venue}, {drive.area}</p><div className="drive-card-bottom"><span><CalendarDays size={15} /> {formatDate(drive.startsAt)}</span><span><UsersRound size={15} /> {drive.registeredDonors} registered</span></div></article>)}</div> : <EmptyState title="No donation drives" description={search || status ? "No drives match your search or filter." : "Donation drive schedules will appear here when connected to the drive register."} />}
    </section>
  );
}

function ReportsPage() {
  const [report, setReport] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.reports({ from, to })
      .then((data) => {
        setReport(data);
        setError("");
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Reports could not be loaded."))
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(load, [load]);

  const rows = useMemo(() => bloodGroups.map((group) => ({ group, count: report?.donorsByBloodGroup[group] ?? 0 })), [report]);

  return (
    <>
      <section className="panel report-filter-panel"><div><h2>Reporting period</h2><p>Choose a date range for the live network summary.</p></div><div className="filter-controls"><label className="date-filter">From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="date-filter">To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><button className="button button-dark" onClick={load}><Activity size={16} /> Apply range</button></div></section>
      {loading ? <ContentLoading /> : error || !report ? <LoadError message={error} onRetry={load} /> : <div className="report-layout">
        <section className="panel report-metrics"><PanelHeading title="Network summary" subtitle="Current totals from the API" /><div className="report-metric-grid"><ReportMetric label="Registered donors" value={report.registeredDonors} icon={<UsersRound size={18} />} /><ReportMetric label="Eligible donors" value={report.eligibleDonors} icon={<HeartPulse size={18} />} /><ReportMetric label="Active requests" value={report.activeRequests} icon={<FileBarChart2 size={18} />} /><ReportMetric label="Lives supported" value={report.livesSupported} icon={<Droplet size={18} />} /></div></section>
        <section className="panel report-blood-groups"><PanelHeading title="Blood group coverage" subtitle="Registered donors by group" />{rows.map(({ group, count }) => { const max = Math.max(1, ...rows.map((item) => item.count)); return <div className="bar-row" key={group}><span className="bar-label">{group}</span><div className="bar-track"><span style={{ width: `${Math.round((count / max) * 100)}%` }} /></div><strong>{count.toLocaleString()}</strong></div>; })}</section>
      </div>}
    </>
  );
}

function ReportMetric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return <div className="report-metric"><span>{icon}</span><div><strong>{value.toLocaleString()}</strong><small>{label}</small></div></div>;
}

function ContentLoading() {
  return <div className="content-loading"><LoaderCircle className="spin" size={23} /><span>Loading live records…</span></div>;
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const backendOffline = message.startsWith("Cannot reach the DamuLink API");

  return (
    <div className={`load-error ${backendOffline ? "load-error-offline" : ""}`}>
      <AlertCircle size={19} />
      <div>
        <strong>{backendOffline ? "Backend not connected" : "Could not load data"}</strong>
        <p>
          {backendOffline
            ? "Dashboard records come from the Django API. Start the backend at the configured URL to load live data; this demo does not generate donor or request records."
            : message}
        </p>
        <button className="text-button" onClick={onRetry}>
          {backendOffline ? "Retry connection" : "Try again"}
        </button>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><span className="empty-icon"><Droplet size={20} /></span><strong>{title}</strong><p>{description}</p></div>;
}

function PanelHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button panel-more" aria-label="Panel information"><CircleHelp size={17} /></button></div>;
}

function StatusPill({ children, tone }: { children: ReactNode; tone: "green" | "gray" | "red" | "amber" }) {
  return <span className={`status-pill status-${tone}`}><span />{children}</span>;
}

function RequestStatusPill({ status }: { status: RequestStatus }) {
  const map: Record<RequestStatus, { label: string; tone: "green" | "gray" | "red" | "amber" }> = {
    open: { label: "Open", tone: "amber" },
    notified: { label: "Notified", tone: "red" },
    partially_fulfilled: { label: "Partially fulfilled", tone: "amber" },
    fulfilled: { label: "Fulfilled", tone: "green" },
    cancelled: { label: "Cancelled", tone: "gray" },
  };
  return <StatusPill tone={map[status].tone}>{map[status].label}</StatusPill>;
}

function UrgencyPill({ urgency }: { urgency: BloodRequest["urgency"] }) {
  return <span className={`urgency-pill urgency-${urgency}`}>{urgency}</span>;
}

function SmsStatus({ status }: { status: Donor["screeningStatus"] | string }) {
  const tone = status === "sent" || status === "delivered" ? "green" : status === "failed" ? "red" : status === "queued" ? "amber" : "gray";
  return <StatusPill tone={tone}>{status.replace(/_/g, " ")}</StatusPill>;
}

function ResponsePill({ response }: { response: string }) {
  const tone = response === "yes" ? "green" : response === "no" || response === "opted_out" ? "red" : response === "failed" ? "amber" : "gray";
  return <StatusPill tone={tone}>{response.replace(/_/g, " ")}</StatusPill>;
}

function DriveStatus({ status }: { status: DonationDrive["status"] }) {
  const tone = status === "active" ? "green" : status === "scheduled" ? "amber" : "gray";
  return <StatusPill tone={tone}>{status}</StatusPill>;
}

function Field({ children, label, hint, required = false }: { children: ReactNode; label: string; hint?: string; required?: boolean }) {
  return <label className="field-group"><span className="field-label">{label}{required && <span className="required-mark"> *</span>}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function Modal({
  title,
  description,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><h2 id="modal-title">{title}</h2><p>{description}</p></div><button className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button></div>{children}</section></div>;
}

function InlineNotice({ notice }: { notice: Notice }) {
  const Icon = notice.kind === "error" ? AlertCircle : CheckCircle2;
  return <div className={`inline-notice notice-${notice.kind}`}><Icon size={17} /><span>{notice.message}</span></div>;
}

function Toast({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  return <div className={`toast toast-${notice.kind}`} role="status"><InlineNotice notice={notice} /><button className="icon-button" aria-label="Dismiss notification" onClick={onClose}><X size={16} /></button></div>;
}

function matches(value: string, search: string): boolean {
  return value.toLowerCase().includes(search.trim().toLowerCase());
}

export default App;
