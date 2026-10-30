export default {
  blankName: "New workflow",
  breadcrumb: "Workflows",
  documentTypes: {
    estimate: "Estimate",
    invoice: "Invoice",
    orderConfirmation: "Order confirmation",
    purchaseOrder: "Purchase order",
    quote: "Quote",
    salesOrder: "Sales order",
  },
  editor: {
    addDocument: "Add document",
    addPayment: "Add payment",
    addReceipt: "Add receipt",
    advance: "When it's this step's turn",
    advanceAutomatic: "Send it automatically",
    advanceAutomaticReceipt: "Issue it automatically",
    advanceManual: "Let me review it first",
    carryBalance: "The balance still owed",
    carryDeposit: "A deposit",
    carryItems: "The items agreed so far",
    carryItemsFirst: "Products you pick for the deal",
    defaultTemplate: "Your default template",
    depositPercent: "Deposit (%)",
    description: "Description",
    descriptionPlaceholder: "When to use this workflow",
    documentType: "Document",
    issuesTitle: "Fix these before saving:",
    lines: "Lines on this document",
    moveDown: "Move {{name}} down",
    moveUp: "Move {{name}} up",
    name: "Workflow name",
    nameRequired: "Enter a name for the workflow.",
    nameTooLong: "Keep the name under 120 characters.",
    paymentDescription:
      "The customer pays the latest document from the deal page, by card or bank transfer.",
    paymentTermsDays: "Payment due in (days)",
    receiptDescription:
      "A receipt for the payment above, emailed to the customer.",
    remove: "Remove {{name}}",
    requiresAcceptance: "The customer must accept it",
    requiresAcceptanceHint:
      "They can accept, decline or ask for changes from the deal page.",
    runningDealsNote:
      "Changes apply to new deals. Deals already running keep their steps.",
    save: "Save workflow",
    saved: "Saved",
    stepLabel: "Step {{number}}",
    stepName: "Step name",
    steps: "Steps",
    stepsHint:
      "A deal moves through these in order. Payments collect the document before them.",
    template: "Template",
    unsaved: "Unsaved changes",
    validityDays: "Valid for (days)",
  },
  gallery: {
    blankDescription: "Start with a single quote and build the steps yourself.",
    blankTitle: "Start from scratch",
    description:
      "Pick the flow closest to how you sell. You can change every step afterwards.",
    title: "New workflow",
    use: "Use this",
  },
  issues: {
    depositNeedsEarlierDocument:
      "Deposits and balances need an itemised document before them.",
    depositPercentOutOfRange: "Enter a deposit between 1% and 100%.",
    documentTypeRequired: "Choose which document to send.",
    firstStepMustBeDocument: "The first step must be a document.",
    nameRequired: "Give the step a name.",
    nameTooLong: "Keep the step name under 80 characters.",
    paymentNeedsDocument:
      "A payment needs a priced document before it (since the last payment).",
    receiptMustFollowPayment: "A receipt must come right after a payment.",
    templateNotFound: "That template isn't available any more. Pick another.",
    tooFewSteps: "Add at least one step.",
    tooManySteps: "A workflow can have at most 15 steps.",
  },
  kinds: {
    document: "Document",
    payment: "Payment",
    receipt: "Receipt",
  },
  list: {
    active: "Active",
    archive: "Archive",
    archived: "Archived",
    description:
      "The documents and payments a deal moves through, from first quote to receipt.",
    empty: "No workflows yet",
    emptyDescription:
      "Start from a real-life sample, like quote to invoice or deposit and balance.",
    newWorkflow: "New workflow",
    noArchived: "No archived workflows",
    open: "Open",
    restore: "Restore",
    statusLabel: "Show",
    steps_one: "{{count}} step",
    steps_other: "{{count}} steps",
    title: "Workflows",
  },
  newBreadcrumb: "New workflow",
  newPageTitle: "New workflow",
  pageTitle: "Workflows",
  samples: {
    b2bWholesale: {
      description:
        "For selling to businesses on credit: quote, order confirmation, then an invoice with payment terms.",
      name: "B2B wholesale",
    },
    madeToOrder: {
      description:
        "For custom work with long lead times: quote, sales order, a 30% deposit, then the balance on delivery.",
      name: "Made to order",
    },
    quoteToCash: {
      description:
        "The simplest flow: the customer accepts a quote, gets the invoice, pays and gets a receipt.",
      name: "Quote to cash",
    },
    retailPrepaid: {
      description:
        "For orders paid upfront: the customer confirms the order, pays and gets a receipt.",
      name: "Retail prepaid",
    },
    servicesDeposit: {
      description:
        "For agencies and contractors: an estimate, a 50% deposit to start, then the balance when the work is done.",
      name: "Services with deposit",
    },
  },
  stepNames: {
    depositInvoice: "Deposit invoice",
    depositPayment: "Deposit payment",
    estimate: "Estimate",
    finalInvoice: "Final invoice",
    finalPayment: "Final payment",
    invoice: "Invoice",
    orderConfirmation: "Order confirmation",
    payment: "Payment",
    quote: "Quote",
    receipt: "Receipt",
    salesOrder: "Sales order",
  },
  toasts: {
    archived: "Workflow archived",
    created: "{{name}} created",
    restored: "Workflow restored",
    saved: "{{name}} saved",
  },
};
