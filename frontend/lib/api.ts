export type Candidate = {
  id: number;
  name: string;
  email: string;
  phone: string;
  created_at: string;
};
export type Message = {
  id: number;
  candidate_id: number;
  body: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  provider_id: string | null;
  error_code: string | null;
  error_message: string | null;
  retryable: boolean;
  attempts: number;
  created_at: string;
  updated_at: string;
  candidate?: Candidate;
};
export type Template = {
  id: number;
  name: string;
  body: string;
  created_at: string;
  updated_at: string;
};
// Placeholders the backend substitutes for each recipient.
export const PLACEHOLDERS = ["name", "first_name", "email", "phone"] as const;

export function previewBody(body: string, candidate?: Candidate) {
  if (!candidate) return body;
  const values: Record<string, string> = {
    name: candidate.name,
    first_name: candidate.name.split(" ")[0],
    email: candidate.email,
    phone: candidate.phone,
  };
  return PLACEHOLDERS.reduce(
    (text, key) => text.split(`{{${key}}}`).join(values[key]),
    body,
  );
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    let text = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      text =
        typeof data.detail === "string"
          ? data.detail
          : data.detail?.message || text;
    } catch {}
    throw new Error(text);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
export const api = {
  candidates: (q = "") =>
    request<Candidate[]>(`/api/candidates?search=${encodeURIComponent(q)}`),
  candidate: (id: number) => request<Candidate>(`/api/candidates/${id}`),
  createCandidate: (data: { name: string; email: string; phone: string }) =>
    request<Candidate>("/api/candidates", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  messages: () => request<Message[]>("/api/messages"),
  history: (id: number) => request<Message[]>(`/api/candidates/${id}/messages`),
  send: (candidate_ids: number[], body: string) =>
    request<Message[]>("/api/messages", {
      method: "POST",
      body: JSON.stringify({ candidate_ids, body }),
    }),
  retry: (id: number) =>
    request<Message>(`/api/messages/${id}/retry`, { method: "POST" }),
  templates: () => request<Template[]>("/api/templates"),
  createTemplate: (data: { name: string; body: string }) =>
    request<Template>("/api/templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTemplate: (id: number, data: { name: string; body: string }) =>
    request<Template>(`/api/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteTemplate: (id: number) =>
    request<void>(`/api/templates/${id}`, { method: "DELETE" }),
  health: () =>
    request<{
      operational: boolean;
      total: number;
      delivered: number;
      failed: number;
    }>("/api/provider-health"),
};
