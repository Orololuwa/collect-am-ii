/** A photo or video the business attaches to show why it kept something. */
export type CautionEvidence = {
  /** The file's id in private storage. */
  id: string;
  kind: "image" | "video";
  /** The file's original name. */
  name: string;
};

/** Something the business keeps from a caution, and why. */
export type CautionDeduction = {
  reason: string;
  amountMinor: number;
  evidence?: CautionEvidence[];
};

export const MAX_CAUTION_DEDUCTIONS = 20;
export const MAX_EVIDENCE_PER_DEDUCTION = 6;
export const EVIDENCE_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;
export const EVIDENCE_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;
export const MAX_EVIDENCE_IMAGE_SIZE = 10_000_000;
export const MAX_EVIDENCE_VIDEO_SIZE = 50_000_000;

/** Where a deal's evidence is stored; ids outside it are refused. */
export function cautionEvidenceFolder(organizationId: string, dealId: string) {
  return `CollectAm/caution-evidence/${organizationId}/${dealId}`;
}

/** "0123456789" → "•••• 6789", so a share link never shows it whole. */
export function maskAccountNumber(accountNumber: string) {
  const digits = accountNumber.replace(/\D/g, "");
  return digits.length > 4 ? `•••• ${digits.slice(-4)}` : digits;
}

function parseEvidence(value: unknown): CautionEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const item = entry as Partial<CautionEvidence> | null;
    return item &&
      typeof item.id === "string" &&
      (item.kind === "image" || item.kind === "video") &&
      typeof item.name === "string"
      ? [{ id: item.id, kind: item.kind, name: item.name }]
      : [];
  });
}

/** Reads stored deductions, ignoring anything malformed. */
export function parseCautionDeductions(value: unknown): CautionDeduction[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const item = entry as Partial<CautionDeduction> | null;
    return item &&
      typeof item.reason === "string" &&
      typeof item.amountMinor === "number"
      ? [
          {
            amountMinor: item.amountMinor,
            evidence: parseEvidence(item.evidence),
            reason: item.reason,
          },
        ]
      : [];
  });
}
