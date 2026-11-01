import { describe, expect, test } from "vitest";

import {
  BLANK_WORKFLOW_STEPS,
  WORKFLOW_SAMPLE_KEYS,
  WORKFLOW_SAMPLES,
} from "./workflow-samples";
import type { WorkflowStepInput } from "./workflow-steps";
import { normalizeWorkflowStep, validateWorkflowSteps } from "./workflow-steps";

const documentStep = (
  overrides: Partial<WorkflowStepInput> = {},
): WorkflowStepInput => ({
  advanceMode: "manual",
  carryForward: "items",
  depositPercentBps: null,
  documentType: "quote",
  kind: "document",
  name: "Quote",
  paymentTermsDays: null,
  negotiable: true,
  requestsPurchaseOrder: false,
  requiresAcceptance: true,
  templateId: null,
  validityDays: 30,
  ...overrides,
});
const paymentStep = documentStep({
  documentType: null,
  kind: "payment",
  name: "Payment",
});
const receiptStep = documentStep({
  documentType: null,
  kind: "receipt",
  name: "Receipt",
});

const codes = (steps: WorkflowStepInput[]) =>
  validateWorkflowSteps(steps).map(({ code, stepIndex }) => [code, stepIndex]);

describe("validateWorkflowSteps()", () => {
  test.each(
    WORKFLOW_SAMPLE_KEYS,
  )("given: the %s sample, should: be valid", (key) => {
    const steps = WORKFLOW_SAMPLES[key].map(({ stepName, ...settings }) => ({
      ...settings,
      name: stepName,
      templateId: null,
    }));

    expect(validateWorkflowSteps(steps)).toEqual([]);
  });

  test("given: the blank workflow, should: be valid", () => {
    expect(
      validateWorkflowSteps(
        BLANK_WORKFLOW_STEPS.map(({ stepName, ...settings }) => ({
          ...settings,
          name: stepName,
          templateId: null,
        })),
      ),
    ).toEqual([]);
  });

  test("given: no steps, should: report too few steps", () => {
    expect(codes([])).toEqual([["tooFewSteps", null]]);
  });

  test("given: more than 15 steps, should: report too many steps", () => {
    expect(codes(Array.from({ length: 16 }, () => documentStep()))).toEqual([
      ["tooManySteps", null],
    ]);
  });

  test("given: a payment first, should: require a document first and before the payment", () => {
    expect(codes([paymentStep, documentStep()])).toEqual([
      ["firstStepMustBeDocument", 0],
      ["paymentNeedsDocument", 0],
    ]);
  });

  test("given: two payments in a row, should: flag the second", () => {
    expect(codes([documentStep(), paymentStep, paymentStep])).toEqual([
      ["paymentNeedsDocument", 2],
    ]);
  });

  test("given: a receipt not right after a payment, should: flag it", () => {
    expect(codes([documentStep(), receiptStep])).toEqual([
      ["receiptMustFollowPayment", 1],
    ]);
  });

  test("given: a deposit with nothing before it, should: flag it", () => {
    expect(
      codes([
        documentStep({
          carryForward: "deposit",
          depositPercentBps: 5000,
          documentType: "invoice",
        }),
      ]),
    ).toEqual([["depositNeedsEarlierDocument", 0]]);
  });

  test("given: a deposit outside 0–100%, should: flag it", () => {
    expect(
      codes([
        documentStep(),
        documentStep({
          carryForward: "deposit",
          depositPercentBps: 0,
          documentType: "invoice",
        }),
      ]),
    ).toEqual([["depositPercentOutOfRange", 1]]);
  });

  test("given: a blank name or missing document type, should: flag them", () => {
    expect(codes([documentStep({ documentType: null, name: "  " })])).toEqual([
      ["nameRequired", 0],
      ["documentTypeRequired", 0],
    ]);
  });
});

describe("normalizeWorkflowStep()", () => {
  test("given: a payment step with document settings, should: clear them and make it manual", () => {
    expect(
      normalizeWorkflowStep(
        {
          ...paymentStep,
          advanceMode: "automatic",
          carryForward: "deposit",
          depositPercentBps: 5000,
          documentType: "invoice",
          templateId: "template-1",
          validityDays: 30,
        },
        2,
      ),
    ).toEqual({
      ...paymentStep,
      advanceMode: "manual",
      carryForward: "items",
      depositPercentBps: null,
      documentType: null,
      negotiable: false,
      requiresAcceptance: false,
      templateId: null,
      validityDays: null,
    });
  });

  test("given: the first step set to automatic, should: make it manual", () => {
    expect(
      normalizeWorkflowStep(documentStep({ advanceMode: "automatic" }), 0)
        .advanceMode,
    ).toEqual("manual");
  });

  test("given: an invoice, should: keep payment terms and drop validity days", () => {
    expect(
      normalizeWorkflowStep(
        documentStep({
          documentType: "invoice",
          paymentTermsDays: 14,
          validityDays: 30,
        }),
        1,
      ),
    ).toMatchObject({ paymentTermsDays: 14, validityDays: null });
  });

  describe("normalizeWorkflowStep() purchase orders", () => {
    test("given: a step that doesn't need acceptance, should: drop the PO request", () => {
      expect(
        normalizeWorkflowStep(
          documentStep({
            requestsPurchaseOrder: true,
            requiresAcceptance: false,
          }),
          0,
        ).requestsPurchaseOrder,
      ).toBe(false);
      expect(
        normalizeWorkflowStep(documentStep({ requestsPurchaseOrder: true }), 0)
          .requestsPurchaseOrder,
      ).toBe(true);
    });
  });

  describe("sample workflows", () => {
    test("given: any sample, should: start with negotiation off", () => {
      const negotiable = WORKFLOW_SAMPLE_KEYS.flatMap((key) =>
        WORKFLOW_SAMPLES[key].filter((step) => step.negotiable),
      );
      expect(negotiable).toEqual([]);
    });
  });
});
