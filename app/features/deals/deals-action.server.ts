import { report } from "@conform-to/react/future";
import { createId } from "@paralleldrive/cuid2";
import type { RouterContextProvider } from "react-router";
import { data, href } from "react-router";

import {
  cautionEvidenceFolder,
  EVIDENCE_IMAGE_TYPES,
  EVIDENCE_VIDEO_TYPES,
  MAX_EVIDENCE_IMAGE_SIZE,
  MAX_EVIDENCE_VIDEO_SIZE,
} from "./deal-caution";
import { deliverDealEffects } from "./deal-emails.server";
import type { Actor, DealEffects } from "./deal-engine.server";
import {
  acceptDealDocument,
  approveDealProposal,
  closeDeal,
  DealTransitionError,
  declineDealDocument,
  markCautionRefunded,
  postDealMessage,
  recordDealPayment,
  rejectDealProposal,
  resendDealDocument,
  resetDealShareLink,
  reviseDealDocument,
  sendCautionSettlement,
  sendDealDocument,
  startDeal,
} from "./deal-engine.server";
import type { DealLineItem } from "./deal-items";
import {
  ACCEPT_DOCUMENT_INTENT,
  APPROVE_PROPOSAL_INTENT,
  CLOSE_DEAL_INTENT,
  DECLINE_DOCUMENT_INTENT,
  ERROR_KEYS,
  MARK_CAUTION_REFUNDED_INTENT,
  POST_MESSAGE_INTENT,
  RECORD_PAYMENT_INTENT,
  REJECT_PROPOSAL_INTENT,
  RESEND_DOCUMENT_INTENT,
  RESET_SHARE_LINK_INTENT,
  REVISE_DOCUMENT_INTENT,
  SEND_CAUTION_SETTLEMENT_INTENT,
  SEND_DOCUMENT_INTENT,
  UPLOAD_CAUTION_EVIDENCE_INTENT,
} from "./deals-constants";
import {
  acceptDocumentFormSchema,
  cautionSettlementFormSchema,
  closeDealFormSchema,
  declineDocumentFormSchema,
  documentIdFormSchema,
  markCautionRefundedFormSchema,
  postMessageFormSchema,
  proposalFormSchema,
  recordPaymentFormSchema,
  resetShareLinkFormSchema,
  reviseDocumentFormSchema,
  startDealFormSchema,
  uploadCautionEvidenceFormSchema,
} from "./deals-schemas";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { combineHeaders } from "~/utils/combine-headers.server";
import { prisma } from "~/utils/database.server";
import { badRequest, conflict } from "~/utils/http-responses.server";
import { getEvidenceUrl, uploadEvidenceFile } from "~/utils/storage.server";
import { createToastHeaders, redirectWithToast } from "~/utils/toast.server";
import { validateFormData } from "~/utils/validate-form-data.server";

type ActionArgs = {
  request: Request;
  context: Readonly<RouterContextProvider>;
  params: { organizationSlug: string };
};

/** Drops product links that point outside the organization. */
async function keepOwnProductIds(
  organizationId: string,
  items: DealLineItem[],
) {
  const ids = [
    ...new Set(
      items.flatMap((item) => (item.productId ? [item.productId] : [])),
    ),
  ];
  if (ids.length === 0) {
    return items;
  }
  const own = new Set(
    (
      await prisma.product.findMany({
        select: { id: true },
        where: { id: { in: ids }, organizationId },
      })
    ).map((product) => product.id),
  );
  return items.map((item) =>
    item.productId && !own.has(item.productId)
      ? { ...item, productId: null }
      : item,
  );
}

async function sendEmails(
  context: Readonly<RouterContextProvider>,
  effects: DealEffects,
  replyTo: string,
) {
  // Caution notices go by email too, with no document attached.
  if (effects.emails.length === 0 && effects.notices.length === 0) {
    return 0;
  }
  return await deliverDealEffects(effects, {
    appName: getInstance(context).t("translation:appName"),
    replyTo,
  });
}

/** Starts a deal from a workflow and opens it. */
export async function startDealAction({
  request,
  context,
  params,
}: ActionArgs) {
  const { organization, user, headers } = context.get(
    organizationMembershipContext,
  );
  const i18n = getInstance(context);

  const result = await validateFormData(request, startDealFormSchema);
  if (!result.success) {
    return result.response;
  }

  try {
    const { result: deal } = await startDeal({
      actor: { party: "business", userId: user.id },
      currency: result.data.currency,
      customerId: result.data.customerId,
      cautionSettleAfter: result.data.cautionSettleAfter
        ? new Date(`${result.data.cautionSettleAfter}T12:00:00Z`)
        : null,
      items: await keepOwnProductIds(organization.id, result.data.items),
      organizationId: organization.id,
      title: result.data.title,
      workflowId: result.data.workflowId,
    });
    return redirectWithToast(
      href("/organizations/:organizationSlug/deals/:dealId", {
        dealId: deal.id,
        organizationSlug: params.organizationSlug,
      }),
      {
        title: i18n.t("toasts.started", { ns: "deals", title: deal.title }),
        type: "success",
      },
      { headers },
    );
  } catch (error) {
    if (
      error instanceof DealTransitionError &&
      (error.code === "workflowNotFound" || error.code === "customerNotFound")
    ) {
      const field =
        error.code === "workflowNotFound" ? "workflowId" : "customerId";
      return badRequest(
        {
          result: report(result.submission, {
            error: {
              fieldErrors: { [field]: [`deals:${ERROR_KEYS[error.code]}`] },
              formErrors: [],
            },
          }),
        },
        { headers },
      );
    }
    throw error;
  }
}

const SUCCESS_KEYS = {
  [ACCEPT_DOCUMENT_INTENT]: "toasts.accepted",
  [APPROVE_PROPOSAL_INTENT]: "toasts.proposalApproved",
  [REJECT_PROPOSAL_INTENT]: "toasts.proposalRejected",
  [RESET_SHARE_LINK_INTENT]: "toasts.linkReset",
  [CLOSE_DEAL_INTENT]: "toasts.closed",
  [DECLINE_DOCUMENT_INTENT]: "toasts.declined",
  [POST_MESSAGE_INTENT]: "toasts.messagePosted",
  [RECORD_PAYMENT_INTENT]: "toasts.paymentRecorded",
  [RESEND_DOCUMENT_INTENT]: "toasts.resent",
  [REVISE_DOCUMENT_INTENT]: "toasts.revised",
  [SEND_DOCUMENT_INTENT]: "toasts.sent",
  [SEND_CAUTION_SETTLEMENT_INTENT]: "toasts.settlementSent",
  [MARK_CAUTION_REFUNDED_INTENT]: "toasts.refundMarked",
} as const;

type DetailIntent = keyof typeof SUCCESS_KEYS;

/**
 * Stores photos or videos backing up a caution deduction and hands back their
 * ids and links. They're attached when the settlement is sent.
 */
async function uploadCautionEvidence({
  request,
  dealId,
  target,
  headers,
}: {
  request: Request;
  dealId: string;
  target: { organizationId: string };
  headers: Headers;
}) {
  const result = await validateFormData(
    request,
    uploadCautionEvidenceFormSchema,
    { maxFileSize: MAX_EVIDENCE_VIDEO_SIZE },
  );
  if (!result.success) return result.response;
  const step = await prisma.dealStep.findFirst({
    select: { cautionSettlement: { select: { sentAt: true } }, id: true },
    where: {
      deal: { id: dealId, organizationId: target.organizationId },
      id: result.data.stepId,
      kind: "cautionRefund",
      status: "active",
    },
  });
  if (!step || step.cautionSettlement?.sentAt) {
    return data(
      { error: "notCautionRefundStep", evidence: [] },
      { headers, status: 400 },
    );
  }
  const files = result.data.files.map((file) => {
    const kind = (EVIDENCE_IMAGE_TYPES as readonly string[]).includes(file.type)
      ? ("image" as const)
      : (EVIDENCE_VIDEO_TYPES as readonly string[]).includes(file.type)
        ? ("video" as const)
        : null;
    const tooBig =
      kind === "image"
        ? file.size > MAX_EVIDENCE_IMAGE_SIZE
        : file.size > MAX_EVIDENCE_VIDEO_SIZE;
    return { file, kind, ok: kind !== null && !tooBig };
  });
  if (files.some((entry) => !entry.ok)) {
    return data(
      { error: "evidenceFile", evidence: [] },
      { headers, status: 400 },
    );
  }
  const evidence = await Promise.all(
    files.map(async ({ file, kind }) => {
      const media = kind ?? "image";
      const id = await uploadEvidenceFile({
        file,
        folder: cautionEvidenceFolder(target.organizationId, dealId),
        kind: media,
        publicId: `${step.id}-${createId()}`,
      });
      return {
        id,
        kind: media,
        name: file.name.slice(0, 200),
        url: getEvidenceUrl(id, media),
      };
    }),
  );
  return data({ error: null, evidence }, { headers });
}

/** Runs one of the deal page's actions and reports back with a toast. */
export async function dealDetailAction(
  { request, context }: ActionArgs,
  dealId: string,
) {
  const { organization, user, headers } = context.get(
    organizationMembershipContext,
  );
  const i18n = getInstance(context);
  const actor: Actor = { party: "business", userId: user.id };
  const target = { dealId, organizationId: organization.id };
  const intent = String(
    (await request.clone().formData()).get("intent"),
  ) as DetailIntent;

  if (String(intent) === UPLOAD_CAUTION_EVIDENCE_INTENT) {
    return await uploadCautionEvidence({ dealId, headers, request, target });
  }

  async function run() {
    switch (intent) {
      case REVISE_DOCUMENT_INTENT: {
        const result = await validateFormData(
          request,
          reviseDocumentFormSchema,
        );
        if (!result.success) return { invalid: result.response };
        return (
          await reviseDealDocument({
            ...target,
            actor,
            documentId: result.data.documentId,
            items: await keepOwnProductIds(organization.id, result.data.items),
            note: result.data.note,
          })
        ).effects;
      }
      case SEND_DOCUMENT_INTENT:
      case RESEND_DOCUMENT_INTENT: {
        const result = await validateFormData(request, documentIdFormSchema);
        if (!result.success) return { invalid: result.response };
        const transition =
          result.data.intent === SEND_DOCUMENT_INTENT
            ? sendDealDocument
            : resendDealDocument;
        return (
          await transition({
            ...target,
            actor,
            documentId: result.data.documentId,
          })
        ).effects;
      }
      case ACCEPT_DOCUMENT_INTENT: {
        const result = await validateFormData(
          request,
          acceptDocumentFormSchema,
        );
        if (!result.success) return { invalid: result.response };
        return (
          await acceptDealDocument({
            ...target,
            acceptedByName: result.data.acceptedByName,
            actor,
            documentId: result.data.documentId,
            purchaseOrder: result.data.purchaseOrderNumber
              ? {
                  fileId: null,
                  fileName: "",
                  number: result.data.purchaseOrderNumber,
                }
              : undefined,
          })
        ).effects;
      }
      case DECLINE_DOCUMENT_INTENT: {
        const result = await validateFormData(
          request,
          declineDocumentFormSchema,
        );
        if (!result.success) return { invalid: result.response };
        return (
          await declineDealDocument({
            ...target,
            actor,
            documentId: result.data.documentId,
            reason: result.data.reason,
          })
        ).effects;
      }
      case RECORD_PAYMENT_INTENT: {
        const result = await validateFormData(request, recordPaymentFormSchema);
        if (!result.success) return { invalid: result.response };
        return (
          await recordDealPayment({
            ...target,
            actor,
            method: result.data.method,
            reference: result.data.reference,
            stepId: result.data.stepId,
          })
        ).effects;
      }
      case POST_MESSAGE_INTENT: {
        const result = await validateFormData(request, postMessageFormSchema);
        if (!result.success) return { invalid: result.response };
        return (
          await postDealMessage({ ...target, actor, body: result.data.body })
        ).effects;
      }
      case SEND_CAUTION_SETTLEMENT_INTENT: {
        const result = await validateFormData(
          request,
          cautionSettlementFormSchema,
        );
        if (!result.success) return { invalid: result.response };
        return (
          await sendCautionSettlement({
            ...target,
            actor,
            deductions: result.data.deductions,
            heldMinor: result.data.heldMinor,
            stepId: result.data.stepId,
          })
        ).effects;
      }
      case MARK_CAUTION_REFUNDED_INTENT: {
        const result = await validateFormData(
          request,
          markCautionRefundedFormSchema,
        );
        if (!result.success) return { invalid: result.response };
        return (
          await markCautionRefunded({
            ...target,
            actor,
            reference: result.data.reference,
            stepId: result.data.stepId,
          })
        ).effects;
      }
      case APPROVE_PROPOSAL_INTENT:
      case REJECT_PROPOSAL_INTENT: {
        const result = await validateFormData(request, proposalFormSchema);
        if (!result.success) return { invalid: result.response };
        const transition =
          result.data.intent === APPROVE_PROPOSAL_INTENT
            ? approveDealProposal
            : rejectDealProposal;
        return (
          await transition({
            ...target,
            actor,
            versionId: result.data.versionId,
          })
        ).effects;
      }
      case RESET_SHARE_LINK_INTENT: {
        const result = await validateFormData(
          request,
          resetShareLinkFormSchema,
        );
        if (!result.success) return { invalid: result.response };
        return (await resetDealShareLink({ ...target, actor })).effects;
      }
      case CLOSE_DEAL_INTENT: {
        const result = await validateFormData(request, closeDealFormSchema);
        if (!result.success) return { invalid: result.response };
        return (
          await closeDeal({ ...target, actor, status: result.data.status })
        ).effects;
      }
      default:
        return {
          invalid: badRequest({ error: "Unknown intent" }, { headers }),
        };
    }
  }

  let outcome: Awaited<ReturnType<typeof run>>;
  try {
    outcome = await run();
  } catch (error) {
    if (!(error instanceof DealTransitionError)) {
      throw error;
    }
    return conflict(
      { error: error.code },
      {
        headers: combineHeaders(
          headers,
          await createToastHeaders({
            title: i18n.t(ERROR_KEYS[error.code], { ns: "deals" }),
            type: "error",
          }),
        ),
      },
    );
  }
  if ("invalid" in outcome) {
    return outcome.invalid;
  }

  const failedEmails = await sendEmails(context, outcome, user.email);
  return data(
    { ok: true },
    {
      headers: combineHeaders(
        headers,
        await createToastHeaders(
          failedEmails > 0
            ? {
                description: i18n.t("toasts.emailFailedDescription", {
                  ns: "deals",
                }),
                title: i18n.t("toasts.emailFailed", { ns: "deals" }),
                type: "error",
              }
            : {
                title: i18n.t(SUCCESS_KEYS[intent], { ns: "deals" }),
                type: "success",
              },
        ),
      ),
    },
  );
}
