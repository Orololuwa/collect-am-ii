import type { WorkflowStepInput } from "./workflow-steps";

/** Step names in the samples; translated when a workflow is created. */
export const SAMPLE_STEP_NAMES = [
  "quote",
  "estimate",
  "orderConfirmation",
  "salesOrder",
  "invoice",
  "depositInvoice",
  "depositPayment",
  "balanceInvoice",
  "balancePayment",
  "finalInvoice",
  "finalPayment",
  "kickoffInvoice",
  "kickoffPayment",
  "bookingDepositInvoice",
  "bookingDeposit",
  "mobilisationInvoice",
  "mobilisationPayment",
  "completionInvoice",
  "completionPayment",
  "payment",
  "receipt",
] as const;
export type SampleStepName = (typeof SAMPLE_STEP_NAMES)[number];

export type SampleStep = Omit<WorkflowStepInput, "name" | "templateId"> & {
  stepName: SampleStepName;
};

/** The gallery's sections, each listing the kinds of business it suits. */
export const WORKFLOW_SAMPLE_CATEGORIES = {
  goods: ["retailOrder", "wholesaleOnCredit"],
  projects: ["constructionProject", "madeToOrder"],
  services: [
    "freelanceJob",
    "agencyProject",
    "photographyBooking",
    "eventCatering",
  ],
} as const;
export type WorkflowSampleCategory = keyof typeof WORKFLOW_SAMPLE_CATEGORIES;
export const WORKFLOW_SAMPLE_CATEGORY_ORDER = [
  "services",
  "projects",
  "goods",
] as const satisfies readonly WorkflowSampleCategory[];

export const WORKFLOW_SAMPLE_KEYS = WORKFLOW_SAMPLE_CATEGORY_ORDER.flatMap(
  (category) => WORKFLOW_SAMPLE_CATEGORIES[category],
);
export type WorkflowSampleKey =
  (typeof WORKFLOW_SAMPLE_CATEGORIES)[WorkflowSampleCategory][number];

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

const document = (
  stepName: SampleStepName,
  documentType: NonNullable<SampleStep["documentType"]>,
  settings: Partial<
    Omit<SampleStep, "stepName" | "kind" | "documentType">
  > = {},
) => step(stepName, { documentType, kind: "document", ...settings });

/** A share of the accepted document's total, invoiced straight away. */
const depositInvoice = (
  stepName: SampleStepName,
  percent: number,
  paymentTermsDays: number,
) =>
  document(stepName, "invoice", {
    advanceMode: "automatic",
    carryForward: "deposit",
    depositPercentBps: percent * 100,
    paymentTermsDays,
  });

/** What's left after the payments so far, sent when the business is ready. */
const balanceInvoice = (stepName: SampleStepName, paymentTermsDays: number) =>
  document(stepName, "invoice", { carryForward: "balance", paymentTermsDays });

/**
 * How real businesses run a sale, from the first document to the last
 * receipt. Each one is valid (see `validateWorkflowSteps`).
 */
export const WORKFLOW_SAMPLES: Record<WorkflowSampleKey, SampleStep[]> = {
  agencyProject: [
    document("estimate", "estimate", {
      requiresAcceptance: true,
      validityDays: 30,
    }),
    depositInvoice("kickoffInvoice", 50, 7),
    payment("kickoffPayment"),
    receipt(),
    balanceInvoice("finalInvoice", 14),
    payment("finalPayment"),
    receipt(),
  ],
  constructionProject: [
    document("estimate", "estimate", {
      requiresAcceptance: true,
      validityDays: 30,
    }),
    depositInvoice("mobilisationInvoice", 40, 7),
    payment("mobilisationPayment"),
    receipt(),
    balanceInvoice("completionInvoice", 14),
    payment("completionPayment"),
    receipt(),
  ],
  eventCatering: [
    document("quote", "quote", { requiresAcceptance: true, validityDays: 7 }),
    document("orderConfirmation", "orderConfirmation", {
      advanceMode: "automatic",
    }),
    depositInvoice("depositInvoice", 70, 3),
    payment("depositPayment"),
    receipt(),
    balanceInvoice("balanceInvoice", 1),
    payment("balancePayment"),
    receipt(),
  ],
  freelanceJob: [
    document("quote", "quote", { requiresAcceptance: true, validityDays: 14 }),
    document("invoice", "invoice", {
      advanceMode: "automatic",
      paymentTermsDays: 7,
    }),
    payment(),
    receipt(),
  ],
  madeToOrder: [
    document("quote", "quote", { requiresAcceptance: true, validityDays: 14 }),
    document("salesOrder", "salesOrder", {
      advanceMode: "automatic",
      requiresAcceptance: true,
    }),
    depositInvoice("depositInvoice", 60, 3),
    payment("depositPayment"),
    receipt(),
    balanceInvoice("balanceInvoice", 3),
    payment("balancePayment"),
    receipt(),
  ],
  photographyBooking: [
    document("quote", "quote", { requiresAcceptance: true, validityDays: 7 }),
    depositInvoice("bookingDepositInvoice", 30, 3),
    payment("bookingDeposit"),
    receipt(),
    balanceInvoice("balanceInvoice", 3),
    payment("balancePayment"),
    receipt(),
  ],
  retailOrder: [
    document("orderConfirmation", "orderConfirmation", {
      requiresAcceptance: true,
    }),
    payment(),
    receipt(),
  ],
  wholesaleOnCredit: [
    document("quote", "quote", { requiresAcceptance: true, validityDays: 7 }),
    document("salesOrder", "salesOrder", { advanceMode: "automatic" }),
    document("invoice", "invoice", {
      advanceMode: "automatic",
      paymentTermsDays: 30,
    }),
    payment(),
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
