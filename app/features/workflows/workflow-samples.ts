import type { WorkflowStepInput } from "./workflow-steps";

/** Step names in the samples; translated when a workflow is created. */
export const SAMPLE_STEP_NAMES = [
  "quote",
  "estimate",
  "orderConfirmation",
  "salesOrder",
  "invoice",
  "depositInvoice",
  "finalInvoice",
  "payment",
  "depositPayment",
  "finalPayment",
  "receipt",
] as const;
export type SampleStepName = (typeof SAMPLE_STEP_NAMES)[number];

export type SampleStep = Omit<WorkflowStepInput, "name" | "templateId"> & {
  stepName: SampleStepName;
};

export const WORKFLOW_SAMPLE_KEYS = [
  "quoteToCash",
  "servicesDeposit",
  "b2bWholesale",
  "retailPrepaid",
  "madeToOrder",
] as const;
export type WorkflowSampleKey = (typeof WORKFLOW_SAMPLE_KEYS)[number];

const step = (
  stepName: SampleStepName,
  settings: Partial<Omit<SampleStep, "stepName">> & Pick<SampleStep, "kind">,
): SampleStep => ({
  advanceMode: "manual",
  carryForward: "items",
  depositPercentBps: null,
  documentType: null,
  paymentTermsDays: null,
  requiresAcceptance: false,
  stepName,
  validityDays: null,
  ...settings,
});

const payment = (stepName: SampleStepName = "payment") =>
  step(stepName, { kind: "payment" });
const receipt = () =>
  step("receipt", { advanceMode: "automatic", kind: "receipt" });

/**
 * Real-life document flows to start a workflow from. Each one is valid
 * (see `validateWorkflowSteps`).
 */
export const WORKFLOW_SAMPLES: Record<WorkflowSampleKey, SampleStep[]> = {
  b2bWholesale: [
    step("quote", {
      documentType: "quote",
      kind: "document",
      requiresAcceptance: true,
      validityDays: 30,
    }),
    step("orderConfirmation", {
      documentType: "orderConfirmation",
      kind: "document",
    }),
    step("invoice", {
      documentType: "invoice",
      kind: "document",
      paymentTermsDays: 30,
    }),
    payment(),
    receipt(),
  ],
  madeToOrder: [
    step("quote", {
      documentType: "quote",
      kind: "document",
      requiresAcceptance: true,
      validityDays: 30,
    }),
    step("salesOrder", {
      advanceMode: "automatic",
      documentType: "salesOrder",
      kind: "document",
      requiresAcceptance: true,
    }),
    step("depositInvoice", {
      advanceMode: "automatic",
      carryForward: "deposit",
      depositPercentBps: 3000,
      documentType: "invoice",
      kind: "document",
      paymentTermsDays: 7,
    }),
    payment("depositPayment"),
    receipt(),
    step("finalInvoice", {
      carryForward: "balance",
      documentType: "invoice",
      kind: "document",
      paymentTermsDays: 14,
    }),
    payment("finalPayment"),
    receipt(),
  ],
  quoteToCash: [
    step("quote", {
      documentType: "quote",
      kind: "document",
      requiresAcceptance: true,
      validityDays: 30,
    }),
    step("invoice", {
      advanceMode: "automatic",
      documentType: "invoice",
      kind: "document",
      paymentTermsDays: 14,
    }),
    payment(),
    receipt(),
  ],
  retailPrepaid: [
    step("orderConfirmation", {
      documentType: "orderConfirmation",
      kind: "document",
      requiresAcceptance: true,
    }),
    payment(),
    receipt(),
  ],
  servicesDeposit: [
    step("estimate", {
      documentType: "estimate",
      kind: "document",
      requiresAcceptance: true,
      validityDays: 14,
    }),
    step("depositInvoice", {
      advanceMode: "automatic",
      carryForward: "deposit",
      depositPercentBps: 5000,
      documentType: "invoice",
      kind: "document",
      paymentTermsDays: 7,
    }),
    payment("depositPayment"),
    receipt(),
    step("finalInvoice", {
      carryForward: "balance",
      documentType: "invoice",
      kind: "document",
      paymentTermsDays: 14,
    }),
    payment("finalPayment"),
    receipt(),
  ],
};

/** The steps of a brand-new workflow started without a sample. */
export const BLANK_WORKFLOW_STEPS: SampleStep[] = [
  step("quote", {
    documentType: "quote",
    kind: "document",
    requiresAcceptance: true,
    validityDays: 30,
  }),
];
