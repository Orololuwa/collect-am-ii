export default {
  layout: {
    backgroundPathsTitle: "Animierte Hintergrundpfade",
    home: "Startseite",
    quote:
      "Dieses Authentifizierungssystem hat verändert, wie wir Benutzer-Logins handhaben. Die Anmeldung per E-Mail-Code ist nahtlos und unsere Benutzer lieben es.",
    quoteAuthor: "Alex Chen, Lead Developer",
  },
  login: {
    emailLabel: "E-Mail",
    emailPlaceholder: "du@beispiel.de",
    errors: {
      invalidEmail: "Bitte gib eine gültige E-Mail-Adresse ein.",
    },
    form: {
      joinOrganization: "Melde dich an, um {{organizationName}} beizutreten",
      joinOrganizationDescription:
        "{{creatorName}} hat dich eingeladen, {{organizationName}} beizutreten.",
      loginFailed: "Anmeldung fehlgeschlagen. Bitte versuche es erneut.",
      userDoesntExist:
        "Benutzer mit der angegebenen E-Mail existiert nicht. Wolltest du stattdessen ein neues Konto erstellen?",
    },
    googleButton: "Mit Google fortfahren",
    code: {
      alertDescription: "Denk daran, auch deinen Spam-Ordner zu überprüfen.",
      cardDescription:
        "Wir haben einen 6-stelligen Anmeldecode an <1>{{email}}</1> gesendet. Gib ihn unten ein, um auf dein Konto zuzugreifen.",
      cardTitle: "Überprüfe deine E-Mails",
      codeLabel: "Anmeldecode",
      codeRateLimited:
        "Zu viele Versuche. Bitte warte einen Moment und fordere einen neuen Code an.",
      countdownMessage_one:
        "Wenn du die E-Mail nicht innerhalb von {{count}} Sekunde erhalten hast, kannst du einen weiteren Code anfordern.",
      countdownMessage_other:
        "Wenn du die E-Mail nicht innerhalb von {{count}} Sekunden erhalten hast, kannst du einen weiteren Code anfordern.",
      countdownMessage_zero:
        "Wenn du die E-Mail nicht erhalten hast, kannst du jetzt einen neuen Code anfordern.",
      invalidCode:
        "Dieser Code ist ungültig oder abgelaufen. Bitte versuche es erneut.",
      resendButton: "Neuen Code anfordern",
      resendButtonLoading: "Wird gesendet...",
      verifyButton: "Anmelden",
      verifyButtonLoading: "Wird überprüft...",
    },
    pageTitle: "Anmelden",
    separator: "Oder",
    signupCta: "Noch kein Konto? <signup>Registrieren</signup>",
    submitButton: "Mit E-Mail anmelden",
    submitButtonSubmitting: "Wird angemeldet...",
    subtitle: "Gib deine E-Mail unten ein, um dich bei deinem Konto anzumelden",
    title: "Willkommen zurück",
  },
  register: {
    emailLabel: "E-Mail",
    emailPlaceholder: "du@beispiel.de",
    errors: {
      invalidEmail: "Bitte gib eine gültige E-Mail-Adresse ein.",
    },
    form: {
      joinOrganization: "Registriere dich, um {{organizationName}} beizutreten",
      joinOrganizationDescription:
        "{{creatorName}} hat dich eingeladen, {{organizationName}} beizutreten.",
      registrationFailed:
        "Registrierung fehlgeschlagen. Bitte versuche es erneut.",
      termsAndPrivacy:
        "Durch das Erstellen eines Kontos stimmst du unseren <1>Nutzungsbedingungen</1> und <2>Datenschutzrichtlinien</2> zu.",
      userAlreadyExists:
        "Benutzer mit der angegebenen E-Mail existiert bereits. Wolltest du dich stattdessen anmelden?",
    },
    googleButton: "Mit Google fortfahren",
    legal:
      "Durch Klicken auf Fortfahren stimmst du unseren <tos>Nutzungsbedingungen</tos> und <pp>Datenschutzrichtlinien</pp> zu.",
    loginCta: "Hast du bereits ein Konto? <login>Anmelden</login>",
    code: {
      alertDescription: "Denk daran, auch deinen Spam-Ordner zu überprüfen.",
      cardDescription:
        "Wir haben einen 6-stelligen Verifizierungscode an <1>{{email}}</1> gesendet. Gib ihn unten ein, um deine Registrierung abzuschließen.",
      cardTitle: "Verifiziere deine E-Mail",
      codeLabel: "Verifizierungscode",
      codeRateLimited:
        "Zu viele Versuche. Bitte warte einen Moment und fordere einen neuen Code an.",
      countdownMessage_one:
        "Wenn du die E-Mail nicht innerhalb von {{count}} Sekunde erhalten hast, kannst du einen weiteren Verifizierungscode anfordern.",
      countdownMessage_other:
        "Wenn du die E-Mail nicht innerhalb von {{count}} Sekunden erhalten hast, kannst du einen weiteren Verifizierungscode anfordern.",
      countdownMessage_zero:
        "Wenn du die E-Mail nicht erhalten hast, kannst du jetzt einen neuen Verifizierungscode anfordern.",
      invalidCode:
        "Dieser Code ist ungültig oder abgelaufen. Bitte versuche es erneut.",
      resendButton: "Neuen Code anfordern",
      resendButtonLoading: "Wird gesendet...",
      verifyButton: "Bestätigen und fortfahren",
      verifyButtonLoading: "Wird überprüft...",
    },
    pageTitle: "Registrieren",
    separator: "Oder",
    submitButton: "Konto erstellen",
    submitButtonSubmitting: "Konto wird erstellt...",
    subtitle: "Gib deine E-Mail unten ein, um dein Konto zu erstellen",
    title: "Erstelle ein Konto",
  },
} satisfies typeof import("../en/user-authentication").default;
