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
    categories: {
      goods: "Selling goods",
      projects: "Projects and custom work",
      services: "Services",
    },
    highlights: {
      deposit: "{{percent}}% upfront",
      paidUpfront: "Paid before delivery",
      terms_one: "Invoice due in {{count}} day",
      terms_other: "Invoice due in {{count}} days",
      validity_one: "{{type}} valid {{count}} day",
      validity_other: "{{type}} valid {{count}} days",
    },
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
    agencyProject: {
      description:
        "An estimate the client signs off, half upfront to kick off, and the rest when you deliver. For websites, branding and campaigns.",
      name: "Agency or design project",
    },
    constructionProject: {
      description:
        "An estimate for the job, 40% mobilisation so you can buy materials, then a completion invoice when the work is done.",
      name: "Building, renovation or installation",
    },
    eventCatering: {
      description:
        "Quote the menu, confirm the order, collect 70% before you buy ingredients and the rest the day before the event.",
      name: "Catering and event supply",
    },
    freelanceJob: {
      description:
        "Send a quote, invoice as soon as it's accepted and get paid within a week. For one-off jobs like a logo, an audit or a few days of consulting.",
      name: "Freelance or consulting job",
    },
    madeToOrder: {
      description:
        "For furniture, tailoring, printing and other custom work: quote, a sales order the customer approves, 60% to start and the balance before delivery.",
      name: "Made to order",
    },
    photographyBooking: {
      description:
        "A quote to hold the date, a 30% booking deposit, and the balance just before the shoot or event.",
      name: "Photography or event booking",
    },
    retailOrder: {
      description:
        "The customer confirms what they're buying, pays upfront and gets a receipt. For orders taken in store, on WhatsApp or on Instagram.",
      name: "Shop or online order",
    },
    wholesaleOnCredit: {
      description:
        "For distributors supplying shops and businesses: a quote, a sales order, then an invoice they pay within 30 days.",
      name: "Wholesale on credit",
    },
  },
  stepNames: {
    balanceInvoice: "Balance invoice",
    balancePayment: "Balance payment",
    bookingDeposit: "Booking deposit",
    bookingDepositInvoice: "Booking deposit invoice",
    completionInvoice: "Completion invoice",
    completionPayment: "Completion payment",
    depositInvoice: "Deposit invoice",
    depositPayment: "Deposit payment",
    estimate: "Estimate",
    finalInvoice: "Final invoice",
    finalPayment: "Final payment",
    invoice: "Invoice",
    kickoffInvoice: "Kick-off invoice",
    kickoffPayment: "Kick-off payment",
    mobilisationInvoice: "Mobilisation invoice",
    mobilisationPayment: "Mobilisation payment",
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
