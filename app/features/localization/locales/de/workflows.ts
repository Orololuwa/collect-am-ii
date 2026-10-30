export default {
  blankName: "Neuer Workflow",
  breadcrumb: "Workflows",
  documentTypes: {
    estimate: "Kostenschätzung",
    invoice: "Rechnung",
    orderConfirmation: "Auftragsbestätigung",
    purchaseOrder: "Bestellung",
    quote: "Angebot",
    salesOrder: "Kundenauftrag",
  },
  editor: {
    addDocument: "Dokument hinzufügen",
    addPayment: "Zahlung hinzufügen",
    addReceipt: "Quittung hinzufügen",
    advance: "Wenn dieser Schritt dran ist",
    advanceAutomatic: "Automatisch senden",
    advanceAutomaticReceipt: "Automatisch ausstellen",
    advanceManual: "Erst von mir prüfen lassen",
    carryBalance: "Der noch offene Restbetrag",
    carryDeposit: "Eine Anzahlung",
    carryItems: "Die bisher vereinbarten Positionen",
    carryItemsFirst: "Produkte, die du für den Deal auswählst",
    defaultTemplate: "Deine Standardvorlage",
    depositPercent: "Anzahlung (%)",
    description: "Beschreibung",
    descriptionPlaceholder: "Wann dieser Workflow passt",
    documentType: "Dokument",
    issuesTitle: "Behebe das vor dem Speichern:",
    lines: "Positionen in diesem Dokument",
    moveDown: "{{name}} nach unten verschieben",
    moveUp: "{{name}} nach oben verschieben",
    name: "Name des Workflows",
    nameRequired: "Gib einen Namen für den Workflow ein.",
    nameTooLong: "Der Name darf höchstens 120 Zeichen lang sein.",
    paymentDescription:
      "Der Kunde bezahlt das letzte Dokument auf der Deal-Seite, per Karte oder Überweisung.",
    paymentTermsDays: "Zahlbar innerhalb von (Tagen)",
    receiptDescription:
      "Eine Quittung für die Zahlung darüber, per E-Mail an den Kunden.",
    remove: "{{name}} entfernen",
    requiresAcceptance: "Der Kunde muss es annehmen",
    requiresAcceptanceHint:
      "Er kann es auf der Deal-Seite annehmen, ablehnen oder Änderungen anfragen.",
    runningDealsNote:
      "Änderungen gelten für neue Deals. Laufende Deals behalten ihre Schritte.",
    save: "Workflow speichern",
    saved: "Gespeichert",
    stepLabel: "Schritt {{number}}",
    stepName: "Name des Schritts",
    steps: "Schritte",
    stepsHint:
      "Ein Deal durchläuft diese der Reihe nach. Zahlungen beziehen sich auf das Dokument davor.",
    template: "Vorlage",
    unsaved: "Ungespeicherte Änderungen",
    validityDays: "Gültig für (Tage)",
  },
  gallery: {
    blankDescription:
      "Beginne mit einem einzelnen Angebot und baue die Schritte selbst auf.",
    blankTitle: "Ohne Vorlage beginnen",
    description:
      "Wähle den Ablauf, der am besten zu deinem Verkauf passt. Jeden Schritt kannst du danach ändern.",
    title: "Neuer Workflow",
    use: "Verwenden",
  },
  issues: {
    depositNeedsEarlierDocument:
      "Anzahlungen und Restbeträge brauchen davor ein Dokument mit Positionen.",
    depositPercentOutOfRange: "Gib eine Anzahlung zwischen 1 % und 100 % ein.",
    documentTypeRequired: "Wähle, welches Dokument gesendet wird.",
    firstStepMustBeDocument: "Der erste Schritt muss ein Dokument sein.",
    nameRequired: "Gib dem Schritt einen Namen.",
    nameTooLong: "Der Name des Schritts darf höchstens 80 Zeichen lang sein.",
    paymentNeedsDocument:
      "Eine Zahlung braucht davor ein Dokument mit Preisen (seit der letzten Zahlung).",
    receiptMustFollowPayment:
      "Eine Quittung muss direkt auf eine Zahlung folgen.",
    templateNotFound:
      "Diese Vorlage ist nicht mehr verfügbar. Wähle eine andere.",
    tooFewSteps: "Füge mindestens einen Schritt hinzu.",
    tooManySteps: "Ein Workflow kann höchstens 15 Schritte haben.",
  },
  kinds: {
    document: "Dokument",
    payment: "Zahlung",
    receipt: "Quittung",
  },
  list: {
    active: "Aktiv",
    archive: "Archivieren",
    archived: "Archiviert",
    description:
      "Die Dokumente und Zahlungen, die ein Deal durchläuft, vom ersten Angebot bis zur Quittung.",
    empty: "Noch keine Workflows",
    emptyDescription:
      "Beginne mit einem Beispiel aus der Praxis, etwa Angebot bis Rechnung oder Anzahlung und Restbetrag.",
    newWorkflow: "Neuer Workflow",
    noArchived: "Keine archivierten Workflows",
    open: "Öffnen",
    restore: "Wiederherstellen",
    statusLabel: "Anzeigen",
    steps_one: "{{count}} Schritt",
    steps_other: "{{count}} Schritte",
    title: "Workflows",
  },
  newBreadcrumb: "Neuer Workflow",
  newPageTitle: "Neuer Workflow",
  pageTitle: "Workflows",
  samples: {
    b2bWholesale: {
      description:
        "Für den Verkauf an Firmen auf Rechnung: Angebot, Auftragsbestätigung, dann eine Rechnung mit Zahlungsziel.",
      name: "B2B-Großhandel",
    },
    madeToOrder: {
      description:
        "Für Auftragsfertigung mit langer Lieferzeit: Angebot, Kundenauftrag, 30 % Anzahlung, dann der Rest bei Lieferung.",
      name: "Auftragsfertigung",
    },
    quoteToCash: {
      description:
        "Der einfachste Ablauf: Der Kunde nimmt ein Angebot an, erhält die Rechnung, bezahlt und bekommt eine Quittung.",
      name: "Angebot bis Zahlung",
    },
    retailPrepaid: {
      description:
        "Für Bestellungen mit Vorauszahlung: Der Kunde bestätigt die Bestellung, bezahlt und bekommt eine Quittung.",
      name: "Einzelhandel mit Vorkasse",
    },
    servicesDeposit: {
      description:
        "Für Agenturen und Dienstleister: eine Kostenschätzung, 50 % Anzahlung zum Start, dann der Rest nach Abschluss.",
      name: "Dienstleistung mit Anzahlung",
    },
  },
  stepNames: {
    depositInvoice: "Anzahlungsrechnung",
    depositPayment: "Anzahlung",
    estimate: "Kostenschätzung",
    finalInvoice: "Schlussrechnung",
    finalPayment: "Schlusszahlung",
    invoice: "Rechnung",
    orderConfirmation: "Auftragsbestätigung",
    payment: "Zahlung",
    quote: "Angebot",
    receipt: "Quittung",
    salesOrder: "Kundenauftrag",
  },
  toasts: {
    archived: "Workflow archiviert",
    created: "{{name}} erstellt",
    restored: "Workflow wiederhergestellt",
    saved: "{{name}} gespeichert",
  },
} satisfies typeof import("../en/workflows").default;
