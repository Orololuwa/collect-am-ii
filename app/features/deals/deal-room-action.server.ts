import { createId } from "@paralleldrive/cuid2";
import type { RouterContextProvider } from "react-router";
import { data } from "react-router";

import { deliverDealEffects } from "./deal-emails.server";
import type { Actor, DealEffects } from "./deal-engine.server";
import {
  acceptDealDocument,
  DealTransitionError,
  declineDealDocument,
  postDealMessage,
  proposeDealChanges,
} from "./deal-engine.server";
import {
  documentName,
  notifyDealMembers,
  retrieveDealForShareToken,
} from "./deal-room.server";
import {
  ACCEPT_DOCUMENT_INTENT,
  DECLINE_DOCUMENT_INTENT,
  POST_MESSAGE_INTENT,
  PROPOSE_CHANGES_INTENT,
  PURCHASE_ORDER_MAX_FILE_SIZE,
} from "./deals-constants";
import {
  customerAcceptFormSchema,
  declineDocumentFormSchema,
  postMessageFormSchema,
  proposeChangesFormSchema,
} from "./deals-schemas";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { combineHeaders } from "~/utils/combine-headers.server";
import { prisma } from "~/utils/database.server";
import { checkHoneypot } from "~/utils/honeypot.server";
import {
  badRequest,
  conflict,
  notFound,
  tooManyRequests,
} from "~/utils/http-responses.server";
import { consumeRateLimit, getClientIp } from "~/utils/rate-limit.server";
import { uploadPrivateFile } from "~/utils/storage.server";
import { createToastHeaders } from "~/utils/toast.server";
import { validateFormData } from "~/utils/validate-form-data.server";

/** Customer actions per deal and address in each 10 minute window. */
export const DEAL_ROOM_ACTION_LIMIT = 30;

const ERROR_KEYS = {
  customerNotFound: "errors.generic",
  dealClosed: "errors.dealClosed",
  dealNotFound: "errors.generic",
  documentAccepted: "errors.alreadyAnswered",
  documentNotAwaitingAnswer: "errors.alreadyAnswered",
  documentNotDraft: "errors.generic",
  documentNotSent: "errors.generic",
  noItems: "errors.noItems",
  notCurrentStep: "errors.alreadyAnswered",
  notPaymentStep: "errors.generic",
  proposalNotFound: "errors.generic",
  purchaseOrderRequired: "errors.purchaseOrderRequired",
  changesNotAllowed: "errors.changesNotAllowed",
  versionChanged: "errors.versionChanged",
  workflowNotFound: "errors.generic",
} as const;

const SUCCESS_KEYS = {
  [ACCEPT_DOCUMENT_INTENT]: "toasts.accepted",
  [DECLINE_DOCUMENT_INTENT]: "toasts.declined",
  [POST_MESSAGE_INTENT]: "toasts.messageSent",
  [PROPOSE_CHANGES_INTENT]: "toasts.changesSent",
} as const;

type RoomIntent = keyof typeof SUCCESS_KEYS;

/**
 * Handles what a customer does on a deal's share link: accept, decline,
 * suggest changes or send a message. Anyone with the link can do these, so
 * every request is checked against the link, a honeypot and a rate limit.
 */
export async function dealRoomAction({
  request,
  context,
  params,
}: {
  request: Request;
  context: Readonly<RouterContextProvider>;
  params: { token: string };
}) {
  const i18n = getInstance(context);
  const deal = await retrieveDealForShareToken(params.token);
  if (!deal) {
    throw notFound();
  }

  const ip = getClientIp(request);
  if (
    !consumeRateLimit({
      key: `deal-room:${deal.id}:${ip}`,
      limit: DEAL_ROOM_ACTION_LIMIT,
      windowMs: 10 * 60 * 1000,
    })
  ) {
    return tooManyRequests(
      { error: "rateLimited" },
      {
        headers: await createToastHeaders({
          title: i18n.t("errors.rateLimited", { ns: "dealRoom" }),
          type: "error",
        }),
      },
    );
  }

  const formData = await request.clone().formData();
  await checkHoneypot(Object.fromEntries(formData));
  const intent = String(formData.get("intent")) as RoomIntent;

  const actor: Actor = {
    ip,
    party: "customer",
    userAgent: request.headers.get("user-agent") ?? "",
    userId: null,
  };
  const target = { dealId: deal.id, organizationId: deal.organizationId };
  const customer = await prisma.deal.findUnique({
    select: {
      customer: { select: { name: true } },
      steps: {
        select: {
          document: { select: { id: true, number: true, type: true } },
        },
      },
    },
    where: { id: deal.id },
  });
  const customerName = customer?.customer.name ?? "Your customer";
  const nameOf = (documentId: string) => {
    const document = customer?.steps.find(
      (step) => step.document?.id === documentId,
    )?.document;
    return document ? documentName(document) : "a document";
  };

  async function run() {
    switch (intent) {
      case ACCEPT_DOCUMENT_INTENT: {
        const result = await validateFormData(
          request,
          customerAcceptFormSchema,
          { maxFileSize: PURCHASE_ORDER_MAX_FILE_SIZE },
        );
        if (!result.success) return { invalid: result.response };
        const { purchaseOrderFile, purchaseOrderNumber } = result.data;
        // Stored privately: only the organization can download it, by a
        // short-lived link.
        const fileId =
          purchaseOrderFile && purchaseOrderNumber
            ? await uploadPrivateFile({
                file: purchaseOrderFile,
                folder: `CollectAm/purchase-orders/${target.organizationId}`,
                publicId: `${target.dealId}-${createId()}`,
              })
            : null;
        const { effects } = await acceptDealDocument({
          ...target,
          acceptedByName: result.data.acceptedByName,
          actor,
          documentId: result.data.documentId,
          expectedVersionId: result.data.versionId,
          purchaseOrder: purchaseOrderNumber
            ? {
                fileId,
                fileName: fileId ? (purchaseOrderFile?.name ?? "") : "",
                number: purchaseOrderNumber,
              }
            : undefined,
        });
        return {
          effects,
          notification: `${customerName} accepted ${nameOf(result.data.documentId)}`,
        };
      }
      case DECLINE_DOCUMENT_INTENT: {
        const result = await validateFormData(
          request,
          declineDocumentFormSchema,
        );
        if (!result.success) return { invalid: result.response };
        const { effects } = await declineDealDocument({
          ...target,
          actor,
          documentId: result.data.documentId,
          reason: result.data.reason,
        });
        return {
          effects,
          notification: `${customerName} declined ${nameOf(result.data.documentId)}`,
        };
      }
      case PROPOSE_CHANGES_INTENT: {
        const result = await validateFormData(
          request,
          proposeChangesFormSchema,
        );
        if (!result.success) return { invalid: result.response };
        const { effects } = await proposeDealChanges({
          ...target,
          actor,
          changes: {
            additions: result.data.changes.additions,
            lines: Object.fromEntries(
              Object.entries(result.data.changes.lines).map(
                ([index, figures]) => [Number(index), figures],
              ),
            ),
          },
          documentId: result.data.documentId,
          note: result.data.note,
        });
        return {
          effects,
          notification: `${customerName} suggested changes to ${nameOf(result.data.documentId)}`,
        };
      }
      case POST_MESSAGE_INTENT: {
        const result = await validateFormData(request, postMessageFormSchema);
        if (!result.success) return { invalid: result.response };
        const { effects } = await postDealMessage({
          ...target,
          actor,
          body: result.data.body,
        });
        const preview =
          result.data.body.length > 80
            ? `${result.data.body.slice(0, 80)}…`
            : result.data.body;
        return {
          effects,
          notification: `${customerName}: ${preview}`,
        };
      }
      default:
        return { invalid: badRequest({ error: "Unknown intent" }) };
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
        headers: await createToastHeaders({
          title: i18n.t(ERROR_KEYS[error.code], { ns: "dealRoom" }),
          type: "error",
        }),
      },
    );
  }
  if ("invalid" in outcome) {
    return outcome.invalid;
  }

  await notifyDealMembers({ ...target, text: outcome.notification });
  const failed = await deliverEffects(context, outcome.effects);
  if (failed > 0) {
    console.error(`Deal ${deal.id}: ${failed} document email(s) failed`);
  }

  return data(
    { ok: true },
    {
      headers: combineHeaders(
        await createToastHeaders({
          title: i18n.t(SUCCESS_KEYS[intent], { ns: "dealRoom" }),
          type: "success",
        }),
      ),
    },
  );
}

async function deliverEffects(
  context: Readonly<RouterContextProvider>,
  effects: DealEffects,
) {
  if (effects.emails.length === 0) {
    return 0;
  }
  return await deliverDealEffects(effects, {
    appName: getInstance(context).t("translation:appName"),
  });
}
