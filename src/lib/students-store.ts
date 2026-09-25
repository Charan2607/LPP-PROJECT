export type Student = {
  id: string;
  name: string;
  email: string;
  grade: string;
  attendance: number; // 0-100
  studyHours: number; // 0-40 per week
  previousScore: number; // 0-100
  assignments: number; // 0-100 completion %
  participation: number; // 0-10
  sleepHours: number; // 0-12
  createdAt: number;
};

type AuthResponse = {
  success: boolean;
  token: string;
  email: string;
  name: string;
  message?: string;
};

const AUTH_KEY = "lumen.auth.v1";
const TOKEN_KEY = "lumen.token.v1";

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      const payload = JSON.parse(body) as { detail?: string; message?: string };
      message = payload.detail || payload.message || body;
    } catch {
      // Keep the raw response for non-JSON backend errors.
    }
    throw new Error(message || `API request failed: ${response.status}`);
  }
  return response.json();
}

// Authentication functions
export async function apiLogin(
  email: string,
  password: string,
): Promise<{ token: string; email: string; name: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await fetchJson<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: normalizedEmail, password }),
  });
  if (result.success) {
    storeAuthToken(result.token);
    localStorage.setItem(AUTH_KEY, "1");
    localStorage.setItem(AUTH_KEY + ".email", normalizedEmail);
    localStorage.setItem(AUTH_KEY + ".name", result.name || "");
    return result;
  }
  throw new Error(result.message || "Login failed");
}

export async function apiSignup(
  email: string,
  password: string,
  name: string,
): Promise<{ token: string; email: string; name: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await fetchJson<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email: normalizedEmail, password, name }),
  });
  if (result.success) {
    storeAuthToken(result.token);
    localStorage.setItem(AUTH_KEY, "1");
    localStorage.setItem(AUTH_KEY + ".email", normalizedEmail);
    localStorage.setItem(AUTH_KEY + ".name", name);
    return result;
  }
  throw new Error(result.message || "Signup failed");
}

function storeAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export async function loadStudents(): Promise<Student[]> {
  return fetchJson<Student[]>("/api/students");
}

export async function addStudent(s: Omit<Student, "id" | "createdAt">): Promise<Student> {
  return fetchJson<Student>("/api/students", {
    method: "POST",
    body: JSON.stringify(s),
  });
}

export async function deleteStudent(id: string): Promise<void> {
  const response = await fetch(`/api/students/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
  if (!response.ok && response.status !== 204) {
    const body = await response.text();
    throw new Error(`Delete failed: ${response.status} ${body}`);
  }
}

export async function getPrediction(
  s: Pick<
    Student,
    "attendance" | "studyHours" | "previousScore" | "assignments" | "participation" | "sleepHours"
  >,
) {
  return fetchJson<{
    prediction: number;
    model: string;
    score: number;
    grade: string;
    risk: string;
    factors: Array<{ label: string; value: number; weight: number }>;
    suggestions: string[];
  }>("/api/predict", {
    method: "POST",
    body: JSON.stringify(s),
  });
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTH_KEY) === "1" && !!getAuthToken();
}

export function login(email: string) {
  localStorage.setItem(AUTH_KEY, "1");
  localStorage.setItem(AUTH_KEY + ".email", email);
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_KEY + ".email");
  localStorage.removeItem(AUTH_KEY + ".name");
  localStorage.removeItem(TOKEN_KEY);
}

export function currentEmail(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(AUTH_KEY + ".email") || "";
}

export function currentName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(AUTH_KEY + ".name") || "";
}
