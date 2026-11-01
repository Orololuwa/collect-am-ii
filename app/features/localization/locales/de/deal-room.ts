export default {
  pageTitle: "{{title}} · {{organization}}",
  preparedFor: "Erstellt für {{name}}",
  current: {
    awaitingTitle: "Bitte prüfe dein Dokument: {{type}}",
    awaitingDescription:
      "Nimm es an, schlage Änderungen vor oder lehne es ab. {{organization}} wird sofort benachrichtigt.",
    sentTitle: "Dein Dokument: {{type}}",
    sentDescription:
      "Gerade ist nichts zu tun. Unten kannst du eine Kopie herunterladen.",
    acceptedTitle: "Du hast dieses Dokument angenommen ({{type}})",
    acceptedDescription: "Angenommen von {{name}} am {{date}}.",
    declinedTitle: "Du hast dieses Dokument abgelehnt ({{type}})",
    declinedDescription:
      "{{organization}} schickt dir vielleicht eine neue Version. Du kannst auch eine Nachricht senden.",
    preparingTitle: "{{organization}} bereitet dein nächstes Dokument vor",
    preparingDescription: "Du bekommst eine E-Mail, sobald es fertig ist.",
    paymentTitle: "Zahlung fällig",
    paymentDescription:
      "Bezahle {{organization}} wie vereinbart. Sobald die Zahlung da ist, wird sie hier bestätigt und deine Quittung folgt.",
    wonTitle: "Alles erledigt",
    wonDescription: "Vielen Dank! Alle Dokumente dieses Deals stehen unten.",
    closedTitle: "Dieser Deal ist geschlossen",
    closedDescription: "Wende dich bei Fragen an {{organization}}.",
    validUntil: "Gültig bis {{date}}",
    dueOn: "Fällig am {{date}}",
    total: "Gesamt",
    preview: "Vorschau",
    downloadPdf: "PDF herunterladen",
    documentFrame: "{{type}} {{number}}",
  },
  payment: {
    onlineDescription:
      "Bezahle {{organization}} sicher online. Deine Quittung kommt, sobald die Zahlung durch ist.",
    payWithPaystack: "Mit Paystack bezahlen",
    payWithStripe: "Mit Stripe bezahlen",
    redirecting: "Du wirst zur sicheren Zahlungsseite weitergeleitet …",
    processing:
      "Danke! Wir bestätigen deine Zahlung. Diese Seite aktualisiert sich von selbst.",
    secureNote:
      "Du schließt die Zahlung auf der sicheren Seite des Anbieters ab und kommst dann hierher zurück.",
    errors: {
      notPayable: "Gerade ist nichts zu bezahlen. Lade die Seite neu.",
      providerUnavailable:
        "Diese Zahlungsart ist für diesen Deal nicht verfügbar.",
      providerFailed:
        "Die Zahlung konnte nicht gestartet werden. Versuche es gleich noch einmal.",
    },
  },
  accept: {
    poFileHint: "PDF oder Bild, bis 5 MB. Optional.",
    poFileLabel: "Deine Bestellung als Datei",
    poFileTooLarge: "Die Datei darf höchstens 5 MB groß sein.",
    poFileType: "Hänge eine PDF-, PNG- oder JPG-Datei an.",
    poNumberHint: "{{organization}} setzt sie auf die folgenden Dokumente.",
    poNumberLabel: "Deine Bestellnummer",
    poNumberRequired: "Gib deine Bestellnummer ein.",
    tab: "Annehmen",
    nameLabel: "Dein vollständiger Name",
    nameRequired: "Gib deinen vollständigen Namen ein, um anzunehmen.",
    agree:
      "Ich nehme dieses Dokument ({{type}}) mit einer Summe von {{total}} an.",
    agreeRequired: "Setze das Häkchen zur Bestätigung.",
    submit: "Annehmen",
    submitting: "Wird angenommen…",
  },
  changes: {
    tab: "Änderungen vorschlagen",
    description:
      "Ändere Mengen, Preise, Steuersätze oder Rabatte, entferne Positionen oder füge Artikel aus dem Katalog hinzu. {{organization}} sieht genau, was du geändert hast, und schickt eine aktualisierte Version.",
    item: "Position",
    quantity: "Menge",
    unitPrice: "Einzelpreis",
    taxRate: "Steuer %",
    discount: "Rabatt %",
    amount: "Betrag",
    subtotal: "Zwischensumme",
    discountTotal: "Rabatt",
    taxTotal: "Steuer",
    remove: "Entfernen",
    removed: "Entfernt",
    undo: "Rückgängig",
    addProduct: "Artikel hinzufügen",
    addProductPlaceholder: "Aus dem Katalog hinzufügen…",
    perUnit: "pro {{unit}}",
    noteLabel: "Sonst noch etwas? (optional)",
    estimatedTotal: "Neue Summe (geschätzt)",
    submit: "Vorschlag senden",
    submitting: "Wird gesendet…",
    noChanges:
      "Ändere zuerst einen Wert, entferne eine Position oder füge einen Artikel hinzu.",
    invalid:
      "Prüfe die markierten Positionen: Mengen und Preise müssen Zahlen sein, Steuer und Rabatt zwischen 0 und 100.",
  },
  decline: {
    tab: "Ablehnen",
    reasonLabel: "Warum lehnst du ab? (optional)",
    submit: "Ablehnen",
    submitting: "Wird abgelehnt…",
  },
  proposal: {
    title: "Du hast Änderungen vorgeschlagen",
    description:
      "Gesendet {{date}}. {{organization}} antwortet mit einer aktualisierten Version. Neue Summe: {{total}}.",
  },
  items: {
    item: "Position",
    quantity: "Menge",
    unitPrice: "Einzelpreis",
    tax: "Steuer",
    discount: "Rabatt",
    amount: "Betrag",
    subtotal: "Zwischensumme",
    discountTotal: "Rabatt",
    taxTotal: "Steuer",
    total: "Gesamt",
  },
  documents: {
    title: "Deine Dokumente",
    empty: "Dokumente erscheinen hier, sobald sie dir gesendet wurden.",
  },
  messages: {
    title: "Nachrichten",
    description: "Fragen? Schreib {{organization}} hier.",
    empty: "Noch keine Nachrichten.",
    placeholder: "Nachricht schreiben…",
    send: "Senden",
    you: "Du",
  },
  timeline: {
    cautionSettlementSent:
      "{{organization}} hat deine Kautionsabrechnung gesendet",
    refundAccountGiven: "Du hast dein Erstattungskonto angegeben",
    cautionRefunded: "{{organization}} hat deine Kautionsrückzahlung gesendet",
    purchaseOrderReceived: "Du hast die Bestellung {{number}} geschickt",
    title: "Verlauf",
    documentSent: "{{document}} an dich gesendet",
    documentAccepted: "Du hast {{document}} angenommen",
    documentDeclined: "Du hast {{document}} abgelehnt",
    changesProposed: "Du hast Änderungen an {{document}} vorgeschlagen",
    proposalApproved:
      "{{organization}} hat deine Änderungen an {{document}} übernommen",
    proposalRejected: "{{organization}} hat {{document}} unverändert gelassen",
    paymentRecorded:
      "{{organization}} hat deine Zahlung über {{amount}} erhalten",
    dealWon: "Alle Schritte erledigt",
  },
  refund: {
    evidenceFor: "Fotos und Videos zu {{reason}}",
    accountGiven:
      "Danke. {{organization}} überweist deine Erstattung an {{account}}. Du bekommst eine E-Mail, sobald sie unterwegs ist.",
    accountNameLabel: "Kontoinhaber",
    accountNameRequired: "Gib den Namen auf dem Konto ein.",
    accountNumberInvalid: "Gib die Kontonummer ein, nur Ziffern.",
    accountNumberLabel: "Kontonummer",
    accountPrivacy:
      "Nur {{organization}} sieht diese Angaben, um dir die Erstattung zu senden. Diese Seite zeigt immer nur die letzten vier Ziffern.",
    askAccount:
      "{{organization}} erstattet {{amount}}. Sag ihnen, auf welches Konto.",
    bankLabel: "Bank",
    bankPlaceholder: "z. B. Sparkasse",
    bankRequired: "Gib den Namen deiner Bank ein.",
    cautionDescription:
      "Erstattbar. {{organization}} behält sie ein und erstattet sie nach deiner Buchung, abzüglich begründeter Einbehalte.",
    cautionTitle: "Kaution (erstattbar)",
    changeAccount: "Anderes Konto verwenden",
    held: "Gezahlte Kaution",
    heldDescription:
      "{{organization}} behält sie ein und rechnet sie nach deiner Buchung ab.",
    heldTitle: "Deine Kaution von {{amount}} wird einbehalten",
    heldUntil:
      "{{organization}} behält sie ein und rechnet sie nach dem {{date}} ab. Du bekommst dann eine E-Mail.",
    keptFor: "Einbehalten für {{reason}}",
    reference: "Überweisungsreferenz: {{reference}}",
    refunded: "Erstattet",
    refundedDescription: "Am {{date}} an {{account}} gesendet.",
    refundedTitle: "Deine Kautionsrückzahlung von {{amount}} wurde gesendet",
    settledDescription: "Am {{date}} abgerechnet.",
    submit: "Kontodaten senden",
    toRefund: "Zu erstatten",
  },
  toasts: {
    accountSaved: "Danke. Dein Erstattungskonto wurde gesendet",
    accepted: "Angenommen. Vielen Dank!",
    declined: "Deine Antwort wurde gesendet",
    changesSent: "Dein Vorschlag wurde gesendet",
    messageSent: "Nachricht gesendet",
  },
  errors: {
    changesNotAllowed:
      "Dieses Dokument kann nicht geändert werden. Nimm es an oder lehne es ab.",
    purchaseOrderRequired: "Gib deine Bestellnummer ein.",
    generic:
      "Etwas ist schiefgelaufen. Lade die Seite neu und versuche es erneut.",
    dealClosed: "Dieser Deal ist geschlossen.",
    alreadyAnswered:
      "Auf dieses Dokument wurde bereits geantwortet. Lade die Seite neu.",
    versionChanged:
      "Dieses Dokument wurde gerade aktualisiert. Prüfe die neue Version, bevor du annimmst.",
    noItems: "Behalte mindestens eine Position.",
    rateLimited:
      "Zu viele Anfragen. Warte ein paar Minuten und versuche es erneut.",
  },
  poweredBy: "Gesendet mit {{appName}}",
} satisfies typeof import("../en/deal-room").default;
