import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { getDb } from "./lib/mongo";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

const seedStudents = () => [
  {
    id: crypto.randomUUID(),
    name: "Aarav Sharma",
    email: "aarav@lumen.edu",
    grade: "10",
    attendance: 92,
    studyHours: 22,
    previousScore: 88,
    assignments: 95,
    participation: 8,
    sleepHours: 7.5,
    createdAt: Date.now(),
  },
  {
    id: crypto.randomUUID(),
    name: "Isabella Rossi",
    email: "isabella@lumen.edu",
    grade: "11",
    attendance: 76,
    studyHours: 12,
    previousScore: 68,
    assignments: 70,
    participation: 6,
    sleepHours: 6,
    createdAt: Date.now() - 1000,
  },
  {
    id: crypto.randomUUID(),
    name: "Kenji Watanabe",
    email: "kenji@lumen.edu",
    grade: "12",
    attendance: 98,
    studyHours: 30,
    previousScore: 94,
    assignments: 98,
    participation: 9,
    sleepHours: 8,
    createdAt: Date.now() - 2000,
  },
  {
    id: crypto.randomUUID(),
    name: "Maya Okafor",
    email: "maya@lumen.edu",
    grade: "9",
    attendance: 60,
    studyHours: 8,
    previousScore: 55,
    assignments: 50,
    participation: 4,
    sleepHours: 5,
    createdAt: Date.now() - 3000,
  },
  {
    id: crypto.randomUUID(),
    name: "Daniela Cruz",
    email: "daniela@lumen.edu",
    grade: "11",
    attendance: 85,
    studyHours: 18,
    previousScore: 81,
    assignments: 88,
    participation: 7,
    sleepHours: 7,
    createdAt: Date.now() - 4000,
  },
  {
    id: crypto.randomUUID(),
    name: "Noah Kim",
    email: "noah@lumen.edu",
    grade: "12",
    attendance: 89,
    studyHours: 25,
    previousScore: 91,
    assignments: 94,
    participation: 8,
    sleepHours: 8.5,
    createdAt: Date.now() - 5000,
  },
  {
    id: crypto.randomUUID(),
    name: "Priya Patel",
    email: "priya@lumen.edu",
    grade: "10",
    attendance: 72,
    studyHours: 14,
    previousScore: 65,
    assignments: 75,
    participation: 6,
    sleepHours: 6.5,
    createdAt: Date.now() - 6000,
  },
  {
    id: crypto.randomUUID(),
    name: "Samuel Mbatha",
    email: "samuel@lumen.edu",
    grade: "9",
    attendance: 68,
    studyHours: 10,
    previousScore: 59,
    assignments: 62,
    participation: 5,
    sleepHours: 6.5,
    createdAt: Date.now() - 7000,
  },
];

async function ensureSeeded() {
  const db = await getDb();
  const collection = db.collection("students");
  const count = await collection.countDocuments();
  if (count === 0) {
    await collection.insertMany(seedStudents());
  }
}

async function handleApi(request: Request): Promise<Response | null> {
  const url = new URL(request.url);

  // Intercept and proxy predictions, model metadata, and auth API endpoints to FastAPI
  if (
    url.pathname === "/api/predict" ||
    url.pathname === "/api/predictions" ||
    url.pathname === "/api/model-info" ||
    url.pathname.startsWith("/api/auth")
  ) {
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
    const fastapiUrl = new URL(`${url.pathname.substring(4)}${url.search}`, backendUrl);
    const method = request.method;
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("content-length");

    let body: ArrayBuffer | null = null;
    if (method !== "GET" && method !== "HEAD") {
      body = await request.arrayBuffer();
    }

    try {
      const res = await fetch(fastapiUrl, {
        method,
        headers,
        body,
      });
      const resHeaders = new Headers(res.headers);
      return new Response(res.body, {
        status: res.status,
        headers: resHeaders,
      });
    } catch (error) {
      console.error("Error proxying to FastAPI:", error);
      return new Response(JSON.stringify({ error: "Backend service unavailable" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    }
  }

  if (!url.pathname.startsWith("/api/students")) {
    return null;
  }

  const db = await getDb();
  const collection = db.collection("students");
  await ensureSeeded();

  if (request.method === "GET" && url.pathname === "/api/students") {
    const students = await collection.find().sort({ createdAt: -1 }).toArray();
    return new Response(JSON.stringify(students), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  if (request.method === "POST" && url.pathname === "/api/students") {
    const body = await request.json();
    const student = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      ...body,
    };
    await collection.insertOne(student);
    return new Response(JSON.stringify(student), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  }

  if (request.method === "DELETE" && url.pathname.startsWith("/api/students/")) {
    const id = url.pathname.split("/").pop();
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing student id" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    const result = await collection.deleteOne({ id });
    if (result.deletedCount === 0) {
      return new Response(JSON.stringify({ error: "Student not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(null, { status: 204 });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "content-type": "application/json" },
  });
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const apiResponse = await handleApi(request);
      if (apiResponse) {
        return apiResponse;
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
