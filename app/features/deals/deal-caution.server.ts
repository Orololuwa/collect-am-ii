import type { CautionDeduction } from "./deal-caution";
import { parseCautionDeductions } from "./deal-caution";
import { getEvidenceUrl } from "~/utils/storage.server";

/** A deduction as pages show it: each piece of evidence with its signed link. */
export type CautionDeductionView = Omit<CautionDeduction, "evidence"> & {
  evidence: Array<{ kind: "image" | "video"; name: string; url: string }>;
};

/** Reads stored deductions and signs a link for each photo or video. */
export function toCautionDeductionViews(
  value: unknown,
): CautionDeductionView[] {
  return parseCautionDeductions(value).map((deduction) => ({
    amountMinor: deduction.amountMinor,
    evidence: (deduction.evidence ?? []).map((item) => ({
      kind: item.kind,
      name: item.name,
      url: getEvidenceUrl(item.id, item.kind),
    })),
    reason: deduction.reason,
  }));
}
