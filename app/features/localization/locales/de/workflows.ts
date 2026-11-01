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
    addCaution: "Kaution hinzufügen",
    addCautionRefund: "Kautionsrückzahlung hinzufügen",
    cautionDescription:
      "Eine erstattbare Kaution, die die Kundschaft auf der Deal-Seite bezahlt. Du legst den Betrag bei jedem Deal fest, und sie zählt nicht als Einnahme.",
    cautionRefundDescription:
      "Nach dem Abrechnungsdatum trägst du ein, was du einbehältst und warum. Die Kundschaft wird nach dem Konto für den Rest gefragt; dann überweist du ihn von deiner Bank und markierst ihn als gesendet.",
    cautionRefundGate: {
      description: "Dann überweist du sie von deiner Bank",
      title: "Kundschaft gibt ihr Erstattungskonto an",
    },
    advanceReceipt: "Wenn die Zahlung eingeht",
    auto: "Auto",
    back: "Workflows",
    canvas: {
      addHere: "Hier einen Schritt hinzufügen",
      addStep: "Schritt hinzufügen",
      addStepHint:
        "Auf eine Linie ziehen zum Einfügen, oder klicken, um ihn ans Ende zu setzen.",
      end: "Deal gewonnen",
      fit: "Einpassen",
      insertBefore: "Schritt vor {{name}} hinzufügen",
      insertFirst: "Schritt am Anfang hinzufügen",
      insertLast: "Schritt am Ende hinzufügen",
      start: "Deal startet",
      zoomIn: "Vergrößern",
      zoomHint:
        "Auf 100 % zurücksetzen. Zum Zoomen Strg oder ⌘ halten und scrollen, oder mit zwei Fingern ziehen.",
      zoomOut: "Verkleinern",
    },
    carryBalanceHint:
      "Eine Zeile: der Gesamtbetrag abzüglich bisheriger Zahlungen",
    carryDepositHint: "Eine Zeile: ein Anteil am vereinbarten Gesamtbetrag",
    carryItemsHint: "Aus dem zuletzt angenommenen Dokument übernommen",
    gate: {
      description: "Oder lehnt ab oder bittet um Änderungen",
      descriptionWithPo: "Mit ihrer Bestellnummer. Kann Änderungen vorschlagen",
      title: "Kundschaft nimmt an",
      titleWithPo: "Kundschaft nimmt an und schickt ihre Bestellung",
      descriptionFixed: "Oder lehnt ab",
      descriptionWithPoFixed: "Mit ihrer Bestellnummer",
    },
    hasProblem: "Hat ein Problem, das behoben werden muss",
    lanes: {
      customer: "Kundschaft",
      customerHint: "Über den Freigabelink des Deals",
      you: "Du",
      youHint: "Dein Team",
    },
    moveDownShort: "Nach unten",
    moveUpShort: "Nach oben",
    noOpenDeals: "Kein offener Deal nutzt ihn",
    openDeals_one: "Von {{count}} offenen Deal genutzt",
    openDeals_other: "Von {{count}} offenen Deals genutzt",
    problems_one: "{{count}} Problem zu beheben",
    problems_other: "{{count}} Probleme zu beheben",
    ready: "Einsatzbereit",
    removeShort: "Schritt entfernen",
    selectStep: "Wähle einen Schritt aus, um ihn zu bearbeiten.",
    stepCount_one: "{{count}} Schritt",
    stepCount_other: "{{count}} Schritte",
    stepOf: "Schritt {{number}} von {{total}}",
    stepSettings: "Schritteinstellungen",
    summary: {
      caution: "Erstattbar, über den Freigabelink bezahlt",
      cautionRefund: "Abzüge, dann Erstattung auf ihr Konto",
      balance: "Der Restbetrag",
      deposit: "{{percent}} % Anzahlung",
      payment: "Online über den Freigabelink bezahlt",
      receipt: "Per E-Mail, sobald die Zahlung eingeht",
      terms_one: "Fällig in {{count}} Tag",
      terms_other: "Fällig in {{count}} Tagen",
      validity_one: "{{count}} Tag gültig",
      validity_other: "{{count}} Tage gültig",
    },
    untitledStep: "Unbenannter Schritt",
    view: "Ansicht",
    views: {
      canvas: "Canvas",
      steps: "Schritte",
    },
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
    negotiable: "Verhandeln erlauben",
    negotiableHint:
      "Die Kundschaft kann eigene Mengen, Preise, Steuern und Rabatte vorschlagen. Du nimmst die Vorschläge an oder lehnst sie ab.",
    requestsPurchaseOrder: "Nach ihrer Bestellung fragen",
    requestsPurchaseOrderHint:
      "Beim Annehmen gibt die Kundschaft ihre Bestellnummer an und kann ihre Bestellung als Datei anhängen. Spätere Dokumente zeigen die Nummer.",
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
    categories: {
      bookings: "Buchungen und Vermietung",
      goods: "Warenverkauf",
      projects: "Projekte und Einzelanfertigungen",
      services: "Dienstleistungen",
    },
    highlights: {
      caution: "Erstattbare Kaution",
      deposit: "{{percent}} % im Voraus",
      paidUpfront: "Bezahlt vor Lieferung",
      purchaseOrder: "Fragt nach ihrer Bestellung",
      terms_one: "Rechnung fällig in {{count}} Tag",
      terms_other: "Rechnung fällig in {{count}} Tagen",
      validity_one: "{{type}} {{count}} Tag gültig",
      validity_other: "{{type}} {{count}} Tage gültig",
    },
    blankDescription:
      "Beginne mit einem einzelnen Angebot und baue die Schritte selbst auf.",
    blankTitle: "Ohne Vorlage beginnen",
    description:
      "Wähle den Ablauf, der am besten zu deinem Verkauf passt. Jeden Schritt kannst du danach ändern.",
    title: "Neuer Workflow",
    use: "Verwenden",
  },
  issues: {
    cautionOnlyOnce:
      "Ein Workflow kann eine Kaution nehmen und sie einmal erstatten.",
    cautionRefundNeedsCaution:
      "Eine Kautionsrückzahlung braucht vorher eine Kaution.",
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
    caution: "Kaution",
    cautionRefund: "Kautionsrückzahlung",
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
    eventCentreBooking: {
      description:
        "Für Säle und Eventlocations: ein Angebot, die Buchungsrechnung, dann eine erstattbare Kaution, die du nach der Veranstaltung abrechnest und bei Schäden teilweise einbehältst.",
      name: "Buchung einer Eventlocation",
    },
    shortLetStay: {
      description:
        "Für Ferienwohnungen und Airbnb-Gastgeber: die Buchungsrechnung, eine erstattbare Kaution, dann die Rückzahlung nach dem Check-out.",
      name: "Aufenthalt in einer Ferienwohnung",
    },
    agencyProject: {
      description:
        "Ein Kostenvoranschlag, den der Kunde freigibt, die Hälfte zum Start und der Rest bei Lieferung. Für Websites, Branding und Kampagnen.",
      name: "Agentur- oder Designprojekt",
    },
    constructionProject: {
      description:
        "Ein Kostenvoranschlag, 40 % Anzahlung für das Material und eine Schlussrechnung, wenn die Arbeit fertig ist.",
      name: "Bau, Renovierung oder Installation",
    },
    eventCatering: {
      description:
        "Menü anbieten, Auftrag bestätigen, 70 % vor dem Einkauf und den Rest am Tag vor der Veranstaltung kassieren.",
      name: "Catering und Eventbedarf",
    },
    freelanceJob: {
      description:
        "Angebot senden, nach der Annahme sofort abrechnen und innerhalb einer Woche bezahlt werden. Für Einzelaufträge wie ein Logo, ein Audit oder ein paar Beratungstage.",
      name: "Freelance- oder Beratungsauftrag",
    },
    madeToOrder: {
      description:
        "Für Möbel, Schneiderei, Druck und andere Einzelanfertigungen: Angebot, ein Kundenauftrag zur Freigabe, 60 % zum Start und der Rest vor der Lieferung.",
      name: "Auftragsfertigung",
    },
    photographyBooking: {
      description:
        "Ein Angebot, um den Termin zu reservieren, 30 % Buchungsanzahlung und der Rest kurz vor dem Shooting oder Event.",
      name: "Fotografie- oder Eventbuchung",
    },
    purchaseOrderSupply: {
      description:
        "Für Lieferanten von Unternehmen: Sie nehmen dein Angebot mit ihrer Bestellnummer an, du bestätigst den Auftrag und stellst eine Rechnung mit 30 Tagen Zahlungsziel, die ihre Bestellnummer nennt.",
      name: "Unternehmen mit Bestellungen beliefern",
    },
    retailOrder: {
      description:
        "Der Kunde bestätigt seinen Einkauf, zahlt im Voraus und bekommt eine Quittung. Für Bestellungen im Laden, über WhatsApp oder Instagram.",
      name: "Laden- oder Onlinebestellung",
    },
    wholesaleOnCredit: {
      description:
        "Für Händler, die Läden und Firmen beliefern: Angebot, Kundenauftrag und eine Rechnung mit 30 Tagen Zahlungsziel.",
      name: "Großhandel auf Rechnung",
    },
  },
  stepNames: {
    bookingInvoice: "Buchungsrechnung",
    bookingPayment: "Buchungszahlung",
    caution: "Kaution",
    cautionReceipt: "Kautionsquittung",
    cautionRefund: "Kautionsrückzahlung",
    balanceInvoice: "Restrechnung",
    balancePayment: "Restzahlung",
    bookingDeposit: "Buchungsanzahlung",
    bookingDepositInvoice: "Rechnung Buchungsanzahlung",
    completionInvoice: "Schlussrechnung",
    completionPayment: "Schlusszahlung",
    depositInvoice: "Anzahlungsrechnung",
    depositPayment: "Anzahlung",
    estimate: "Kostenvoranschlag",
    finalInvoice: "Schlussrechnung",
    finalPayment: "Schlusszahlung",
    invoice: "Rechnung",
    kickoffInvoice: "Startrechnung",
    kickoffPayment: "Startzahlung",
    mobilisationInvoice: "Materialanzahlung (Rechnung)",
    mobilisationPayment: "Materialanzahlung",
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
