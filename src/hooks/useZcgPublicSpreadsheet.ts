import { useQuery } from "@tanstack/react-query";
import type { PublicSpreadsheetPayload } from "@/lib/zcgSpreadsheetPayload";

async function fetchPublicSpreadsheet(): Promise<PublicSpreadsheetPayload> {
  const res = await fetch("/api/zcg/public-spreadsheet");
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<PublicSpreadsheetPayload>;
}

/** Official ZCG + Coinholder dashboard figures from the public Google Sheet. */
export function useZcgPublicSpreadsheet() {
  return useQuery<PublicSpreadsheetPayload, Error>({
    queryKey: ["zcg-public-spreadsheet"],
    queryFn: fetchPublicSpreadsheet,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
