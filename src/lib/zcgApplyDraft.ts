const STORAGE_KEY = "zcash_grants_hub_zcg_apply_draft_v1";
const VERSION = 1 as const;

export type ZcgApplyFormData = Record<string, string>;

export interface ZcgApplyDraftPayload {
  version: typeof VERSION;
  savedAt: string;
  step: number;
  termsAccepted: boolean[];
  formData: ZcgApplyFormData;
  teamMembers: { name: string; role: string; bg: string; resp: string }[];
  milestones: {
    amount: string;
    date: string;
    stories: string[];
    deliverables: string[];
    criteria: string;
  }[];
  documents: { name: string; url: string; desc: string }[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function loadZcgApplyDraft(): ZcgApplyDraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return null;
    if (parsed.version !== VERSION) return null;
    if (typeof parsed.step !== "number" || !Array.isArray(parsed.termsAccepted)) return null;
    if (!isRecord(parsed.formData)) return null;
    if (!Array.isArray(parsed.teamMembers) || !Array.isArray(parsed.milestones) || !Array.isArray(parsed.documents)) {
      return null;
    }
    return parsed as unknown as ZcgApplyDraftPayload;
  } catch {
    return null;
  }
}

export function saveZcgApplyDraft(payload: Omit<ZcgApplyDraftPayload, "version" | "savedAt">): void {
  if (typeof window === "undefined") return;
  const full: ZcgApplyDraftPayload = {
    ...payload,
    version: VERSION,
    savedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
}

export function clearZcgApplyDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
