import type {
  ApiError,
  BloodRequest,
  DashboardSummary,
  DonationDrive,
  Donor,
  PageResult,
  User,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";
const TOKEN_KEY = "damulink.accessToken";
const DEMO_SESSION_KEY = "damulink.demoUser";
const DEMO_AUTH_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH !== "false";

const demoAccounts = [
  {
    email: "admin@damulink.local",
    password: "DamuLinkAdmin!2026",
    user: {
      id: "demo-admin",
      name: "DamuLink Admin",
      email: "admin@damulink.local",
      role: "admin" as const,
      organization: "Demo workspace",
      demoMode: true,
    },
  },
  {
    email: "hospital@damulink.local",
    password: "DamuLinkHospital!2026",
    user: {
      id: "demo-hospital",
      name: "Hospital Staff",
      email: "hospital@damulink.local",
      role: "hospital_staff" as const,
      organization: "Demo hospital",
      demoMode: true,
    },
  },
  {
    email: "drive@damulink.local",
    password: "DamuLinkDrive!2026",
    user: {
      id: "demo-drive-staff",
      name: "Drive Staff",
      email: "drive@damulink.local",
      role: "drive_staff" as const,
      organization: "Demo donation drive",
      demoMode: true,
    },
  },
];

export const demoAuth = {
  enabled: DEMO_AUTH_ENABLED,
  accounts: DEMO_AUTH_ENABLED ? demoAccounts : [],

  authenticate(email: string, password: string): User | null {
    if (!DEMO_AUTH_ENABLED) return null;

    const account = demoAccounts.find(
      (entry) => entry.email === email.toLowerCase() && entry.password === password,
    );

    return account?.user ?? null;
  },

  getSession(): User | null {
    if (!DEMO_AUTH_ENABLED) return null;

    try {
      const stored = localStorage.getItem(DEMO_SESSION_KEY);
      if (!stored) return null;

      const user = JSON.parse(stored) as User;
      return user.demoMode ? user : null;
    } catch {
      return null;
    }
  },

  startSession(user: User): void {
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user));
  },

  endSession(): void {
    localStorage.removeItem(DEMO_SESSION_KEY);
  },
};

export class ApiRequestError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(status: number, error: ApiError) {
    super(error.message || "The request could not be completed.");
    this.status = status;
    this.fieldErrors = error.fieldErrors;
  }
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiRequestError(0, {
      message: `Cannot reach the DamuLink API at ${API_BASE_URL}. Check the API server and VITE_API_BASE_URL.`,
    });
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ApiError;
    throw new ApiRequestError(response.status, {
      message: error.message || `Request failed (${response.status}).`,
      fieldErrors: error.fieldErrors,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function queryString(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });

  const value = query.toString();
  return value ? `?${value}` : "";
}

export const api = {
  hasToken: () => Boolean(getToken()),

  async login(email: string, password: string): Promise<User> {
    try {
      const result = await request<{ access: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      demoAuth.endSession();
      localStorage.setItem(TOKEN_KEY, result.access);
      return result.user;
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 0 && DEMO_AUTH_ENABLED) {
        const demoUser = demoAuth.authenticate(email.trim().toLowerCase(), password);

        if (demoUser) {
          localStorage.removeItem(TOKEN_KEY);
          demoAuth.startSession(demoUser);
          return demoUser;
        }

        throw new ApiRequestError(401, {
          message: "The API is offline. Choose one of the development demo accounts below.",
        });
      }

      throw error;
    }
  },

  async me(): Promise<User> {
    return request<User>("/auth/me");
  },

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    demoAuth.endSession();
  },

  dashboard(): Promise<DashboardSummary> {
    return request<DashboardSummary>("/dashboard/summary");
  },

  donors(params: { search?: string; bloodGroup?: string; area?: string; page?: number }): Promise<PageResult<Donor>> {
    return request<PageResult<Donor>>(`/donors${queryString(params)}`);
  },

  createDonor(input: Omit<Donor, "id" | "createdAt" | "eligible" | "optedOut">): Promise<Donor> {
    return request<Donor>("/donors", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  requests(params: { search?: string; status?: string; page?: number }): Promise<PageResult<BloodRequest>> {
    return request<PageResult<BloodRequest>>(`/requests${queryString(params)}`);
  },

  createRequest(input: Omit<BloodRequest, "id" | "reference" | "unitsFulfilled" | "status" | "matchedDonors" | "smsDispatchedAt" | "createdAt">): Promise<BloodRequest> {
    return request<BloodRequest>("/requests", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  dispatchAlerts(requestId: string): Promise<BloodRequest> {
    return request<BloodRequest>(`/requests/${requestId}/alerts`, {
      method: "POST",
      body: JSON.stringify({ channel: "sms" }),
    });
  },

  updateRequestStatus(requestId: string, status: BloodRequest["status"]): Promise<BloodRequest> {
    return request<BloodRequest>(`/requests/${requestId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  drives(params: { search?: string; status?: string; page?: number }): Promise<PageResult<DonationDrive>> {
    return request<PageResult<DonationDrive>>(`/drives${queryString(params)}`);
  },

  reports(params: { from?: string; to?: string }): Promise<DashboardSummary> {
    return request<DashboardSummary>(`/reports/summary${queryString(params)}`);
  },
};
