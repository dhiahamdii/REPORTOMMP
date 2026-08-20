// API client for communicating with the FastAPI backend
// Point this to your backend URL - for development it's localhost:8000

import type { ApiPort } from '@/lib/portMappers';

/**
 * - Dev direct : http://localhost:8000
 * - Prod (Elastic IP, un seul port 80) : laisser vide → appels relatifs /api/* (rewrite Next → backend)
 */
function resolveApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') return '';
  return 'http://127.0.0.1:8000';
}

const API_BASE = resolveApiBase();

function fastApiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const b = body as { detail?: unknown; error?: string };
  if (typeof b.error === 'string' && b.error) return b.error;
  const d = b.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d))
    return d.map((x: { msg?: string }) => x?.msg || JSON.stringify(x)).join('; ') || fallback;
  return fallback;
}

export interface Client {
  id: number;
  name: string;
  location?: string;
  contact_person?: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id?: number;
  description: string;
  completed: boolean;
}

export interface Report {
  id?: number;
  report_id: string;
  client_id?: number;
  date: string;
  technician_name: string;
  location: string;
  notes?: string;
  signature?: string;
  created_at?: string;
  updated_at?: string;
  tasks: Task[];
  client?: Client;
}

// ============================================================================
// Client API Functions
// ============================================================================

export async function getClients(): Promise<Client[]> {
  try {
    const response = await fetch(`${API_BASE}/api/clients`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    throw error;
  }
}

export async function createClient(name: string, location?: string): Promise<Client> {
  try {
    const response = await fetch(`${API_BASE}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, location }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to create client:', error);
    throw error;
  }
}

export async function getClient(clientId: number): Promise<Client> {
  try {
    const response = await fetch(`${API_BASE}/api/clients/${clientId}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch client:', error);
    throw error;
  }
}

export async function updateClient(
  clientId: number,
  updates: Partial<Client>
): Promise<Client> {
  try {
    const response = await fetch(`${API_BASE}/api/clients/${clientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to update client:', error);
    throw error;
  }
}

export async function deleteClient(clientId: number): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/clients/${clientId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  } catch (error) {
    console.error('Failed to delete client:', error);
    throw error;
  }
}

// ============================================================================
// Report API Functions
// ============================================================================

export async function getReports(): Promise<Report[]> {
  try {
    const response = await fetch(`${API_BASE}/api/reports`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch reports:', error);
    throw error;
  }
}

export async function createReport(reportData: {
  client_name: string;
  location: string;
  date: string;
  technician_name: string;
  notes?: string;
  signature?: string;
  tasks: Task[];
}): Promise<Report> {
  try {
    const response = await fetch(`${API_BASE}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to create report:', error);
    throw error;
  }
}

export async function getReport(reportId: string): Promise<Report> {
  try {
    const response = await fetch(`${API_BASE}/api/reports/${reportId}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch report:', error);
    throw error;
  }
}

export async function updateReport(
  reportId: string,
  updates: Partial<Report>
): Promise<Report> {
  try {
    const response = await fetch(`${API_BASE}/api/reports/${reportId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to update report:', error);
    throw error;
  }
}

export async function deleteReport(reportId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/reports/${reportId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  } catch (error) {
    console.error('Failed to delete report:', error);
    throw error;
  }
}

// ============================================================================
// AI Parsing Functions
// ============================================================================

export async function parseMaintenanceText(text: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/api/parse-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        fastApiErrorMessage(error, `HTTP error! status: ${response.status}`)
      );
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to parse text:', error);
    throw error;
  }
}

export type RefineFrenchField = 'task' | 'recommendation' | 'finding' | 'objectif';

export type RefineFrenchResult = {
  text: string;
  /** true si OPENAI_API_KEY manque : le serveur renvoie le texte tel quel */
  fallback?: boolean;
};

/** Reformulation professionnelle (français technique OMMP) à partir de notes technicien. */
export async function refineFrenchText(
  text: string,
  field: RefineFrenchField = 'task',
): Promise<RefineFrenchResult> {
  const response = await fetch(`${API_BASE}/api/refine-french`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, field }),
  });
  let j: { text?: string; error?: string; fallback?: boolean } = {};
  try {
    j = (await response.json()) as typeof j;
  } catch {
    throw new Error('Réponse IA invalide (non JSON).');
  }
  if (!response.ok) throw new Error(fastApiErrorMessage(j, 'Correction IA indisponible'));
  const out = typeof j.text === 'string' ? j.text : text;
  return { text: out, fallback: Boolean(j.fallback) };
}

/** Aperçu ou consommation d’un numéro PREV_MMM_YYYY_NN (allocate=true à la soumission). */
export async function fetchNextPrevRef(dateIso: string, allocate: boolean): Promise<string> {
  const response = await fetch(`${API_BASE}/api/next-prev-ref`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: dateIso, allocate }),
  });
  const j = (await response.json()) as { reference?: string; error?: string };
  if (!response.ok) throw new Error(fastApiErrorMessage(j, 'Numéro d’intervention indisponible'));
  return String(j.reference ?? '');
}

// ============================================================================
// Port directory API
// ============================================================================

export type PortCreatePayload = {
  label: string;
  port_name: string;
  intervention_location: string;
  client_name: string;
  contract_ref?: string;
  slug?: string;
  site_contacts?: string[];
  intervention_contacts?: string[];
};

export type PortUpdatePayload = Partial<PortCreatePayload>;

export async function fetchPorts(): Promise<ApiPort[]> {
  const response = await fetch(`${API_BASE}/api/ports`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

export async function fetchPort(slug: string): Promise<ApiPort> {
  const response = await fetch(`${API_BASE}/api/ports/${encodeURIComponent(slug)}`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

export async function createPort(payload: PortCreatePayload): Promise<ApiPort> {
  const response = await fetch(`${API_BASE}/api/ports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(fastApiErrorMessage(err, `HTTP error! status: ${response.status}`));
  }
  return await response.json();
}

export async function updatePort(slug: string, payload: PortUpdatePayload): Promise<ApiPort> {
  const response = await fetch(`${API_BASE}/api/ports/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(fastApiErrorMessage(err, `HTTP error! status: ${response.status}`));
  }
  return await response.json();
}

export async function deletePort(slug: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/ports/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
}

export async function deletePortContact(slug: string, contactId: number): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/ports/${encodeURIComponent(slug)}/contacts/${contactId}`,
    { method: 'DELETE' },
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(fastApiErrorMessage(err, `HTTP error! status: ${response.status}`));
  }
}

// ============================================================================
// Statistics Functions
// ============================================================================

export async function getStats(): Promise<{
  total_reports: number;
  completed_tasks: number;
  pending_tasks: number;
  total_clients: number;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/stats`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    throw error;
  }
}
