export default {
  acceptEmailInvite: {
    acceptInvite: "Accept invite",
    acceptInviteInstructions:
      "Click the button below to sign up. By using this email invite you will automatically join the correct organization.",
    acceptingInvite: "Accepting invite ...",
    alreadyMemberToastDescription:
      "You are already a member of {{organizationName}}",
    alreadyMemberToastTitle: "Already a member",
    inviteEmailInvalidToastDescription:
      "The email invite is invalid or has expired",
    inviteEmailInvalidToastTitle: "Failed to accept invite",
    inviteEmailValidToastDescription:
      "Please register or log in to accept the invitation.",
    inviteEmailValidToastTitle: "Success",
    inviteYouToJoin: "{{inviterName}} invites you to join {{organizationName}}",
    joinSuccessToastDescription: "You are now a member of {{organizationName}}",
    joinSuccessToastTitle: "Successfully joined organization",
    organizationFullToastDescription:
      "The organization has reached its member limit",
    organizationFullToastTitle: "Organization is full",
    pageTitle: "Invitation",
    welcomeToAppName: "Welcome to {{appName}}",
  },
  acceptInviteLink: {
    acceptInvite: "Accept invite",
    acceptInviteInstructions:
      "Click the button below to sign up. By using this link you will automatically join the correct organization.",
    acceptingInvite: "Accepting invite ...",
    alreadyMemberToastDescription:
      "You are already a member of {{organizationName}}",
    alreadyMemberToastTitle: "Already a member",
    inviteLinkInvalidToastDescription:
      "The invite link is invalid or has expired",
    inviteLinkInvalidToastTitle: "Failed to accept invite",
    inviteLinkValidToastDescription:
      "Please register or log in to accept the invitation",
    inviteLinkValidToastTitle: "Success",
    inviteYouToJoin: "{{inviterName}} invites you to join {{organizationName}}",
    joinSuccessToastDescription: "You are now a member of {{organizationName}}",
    joinSuccessToastTitle: "Successfully joined organization",
    organizationFullToastDescription:
      "The organization has reached its member limit",
    organizationFullToastTitle: "Organization is full",
    pageTitle: "Invitation",
    welcomeToAppName: "Welcome to {{appName}}",
  },
  analytics: {
    breadcrumb: "Analytics",
    pageTitle: "Analytics",
  },
  templates: {
    breadcrumb: "Templates",
    pageTitle: "Templates",
  },
  dashboard: {
    activity: {
      checkoutPageCreated: "Checkout page {{name}} was created",
      empty: "Nothing has happened in the last 30 days.",
      invite: "Invite",
      memberJoined: "{{member}} joined the organization",
      payment: "{{customer}} paid {{amount}} on {{page}}",
      templateCreated: "Template {{name}} was created",
      title: "Recent activity",
    },
    attention: {
      dealDeclined: "{{customer}} declined a document in {{deal}}",
      dealDeclinedDetail: "Revise it and send it again, or close the deal",
      dealMessage: "{{customer}} sent a message about {{deal}}",
      dealMessageDetail: "Nobody has replied yet",
      dealProposal: "{{customer}} suggested changes to {{deal}}",
      dealProposalDetail:
        "Approve them, turn them down or make a counter-offer",
      allClear: "Nothing needs your attention.",
      expiring: "{{name}} closes {{when}}",
      expiringDetail: "The checkout page stops taking payments then",
      failed_one: "{{count}} failed payment",
      failed_other: "{{count}} failed payments",
      failedDetail: "In the last 7 days",
      noReceipt: "{{name}} has no receipt template",
      noReceiptDetail: "Payments there get the default receipt",
      open: "Open",
      review: "Review",
      title: "Needs attention",
      unsent_one: "{{count}} receipt not sent",
      unsent_other: "{{count}} receipts not sent",
      unsentDetail: "Paid in the last 30 days, no receipt emailed",
    },
    breadcrumb: "Dashboard",
    chart: {
      current_one: "Last {{count}} day",
      current_other: "Last {{count}} days",
      description: "Successful payments, refunds excluded",
      empty: "No payments in this period yet.",
      previous_one: "Previous {{count}} day",
      previous_other: "Previous {{count}} days",
      summary_one:
        "Amount collected per day over the last {{count}} day. Highest: {{amount}} on {{date}}.",
      summary_other:
        "Amount collected per day over the last {{count}} days. Highest: {{amount}} on {{date}}.",
      title: "Collected per day",
    },
    header: {
      currencyLabel: "Currency",
      greeting: "Welcome back, {{name}}",
      greetingNoName: "Welcome back",
      newDeal: "New deal",
      newWorkflow: "New workflow",
      periodLabel: "Period",
      periodOption_one: "{{count}} day",
      periodOption_other: "{{count}} days",
      summary_one:
        "Here's what {{organizationName}} collected in the last {{count}} day.",
      summary_other:
        "Here's what {{organizationName}} collected in the last {{count}} days.",
    },
    kpis: {
      average: {
        note: "Per successful payment",
        title: "Average payment",
      },
      collected: {
        noPrevious_one: "Nothing collected in the previous {{count}} day",
        noPrevious_other: "Nothing collected in the previous {{count}} days",
        note_one: "vs {{amount}} in the previous {{count}} day",
        note_other: "vs {{amount}} in the previous {{count}} days",
        title: "Collected",
      },
      label: "Key numbers",
      payments: {
        note: "{{failed}} failed, {{refunded}} refunded",
        title: "Successful payments",
      },
      receipts: {
        allSent: "Every customer has their receipt",
        none: "No payments in this period yet",
        title: "Receipts sent",
        unsent_one: "{{count}} waiting to be emailed",
        unsent_other: "{{count}} waiting to be emailed",
        value: "{{sent}} of {{total}}",
      },
    },
    pageTitle: "Dashboard",
    recentPayments: {
      columns: {
        amount: "Amount",
        customer: "Customer",
        page: "Checkout page",
        status: "Status",
        when: "When",
      },
      empty: "No payments yet. They show up here as soon as customers pay.",
      statuses: {
        canceled: "Canceled",
        failed: "Failed",
        partially_refunded: "Partly refunded",
        pending: "Pending",
        processing: "Processing",
        refunded: "Refunded",
        succeeded: "Succeeded",
      },
      title: "Recent payments",
    },
    setup: {
      done: "Done",
      intro:
        "{{organizationName}} is ready. The other steps are optional: do them now, or skip straight to your dashboard.",
      preview: {
        average: {
          label: "Average payment",
          note: "What a customer pays on average",
        },
        collected: {
          label: "Collected",
          note: "Money from successful payments, refunds excluded",
        },
        receipts: {
          label: "Receipts sent",
          note: "Emailed to customers automatically after they pay",
        },
        title: "Once payments come in",
      },
      progress: "{{done}} of {{total}} done",
      skip: "Skip setup",
      steps: {
        checkoutPage: {
          action: "Create page",
          detail: "A link you share for a product, a deposit or an invoice.",
          title: "Publish your first checkout page",
        },
        organization: {
          action: "Open settings",
          detail: "Your organization is set up and ready.",
          title: "Create your organization",
        },
        payment: {
          action: "Open checkout pages",
          detail: "Share your checkout page link with a customer.",
          title: "Take your first payment",
        },
        team: {
          action: "Invite",
          detail: "Let teammates manage payments and documents with you.",
          title: "Invite your team",
        },
        template: {
          action: "Choose template",
          detail:
            "Customers get it by email after they pay. Start from one of ours.",
          title: "Pick a receipt template",
        },
      },
      title: "Get set up",
      welcome: "Welcome to {{appName}}, {{name}}",
      welcomeNoName: "Welcome to {{appName}}",
    },
    templates: {
      edited: "edited {{when}}",
      empty: "No templates yet.",
      open: "Open templates",
      summary_one: "{{count}} template · {{thisMonth}} added this month",
      summary_other: "{{count}} templates · {{thisMonth}} added this month",
      title: "Document templates",
      types: {
        certificate_one: "Certificate",
        certificate_other: "Certificates",
        contract_one: "Contract",
        contract_other: "Contracts",
        deliveryNote_one: "Delivery note",
        deliveryNote_other: "Delivery notes",
        estimate_one: "Estimate",
        estimate_other: "Estimates",
        form_one: "Form",
        form_other: "Forms",
        invoice_one: "Invoice",
        invoice_other: "Invoices",
        label_one: "Label",
        label_other: "Labels",
        letter_one: "Letter",
        letter_other: "Letters",
        orderConfirmation_one: "Order confirmation",
        orderConfirmation_other: "Order confirmations",
        packingSlip_one: "Packing slip",
        packingSlip_other: "Packing slips",
        proposal_one: "Proposal",
        proposal_other: "Proposals",
        purchaseOrder_one: "Purchase order",
        purchaseOrder_other: "Purchase orders",
        quote_one: "Quote",
        quote_other: "Quotes",
        receipt_one: "Receipt",
        receipt_other: "Receipts",
        reportCards_one: "Report card",
        reportCards_other: "Report cards",
        resume_one: "Resume",
        resume_other: "Resumes",
        salesOrder_one: "Sales order",
        salesOrder_other: "Sales orders",
        statement_one: "Statement",
        statement_other: "Statements",
      },
    },
    topPages: {
      empty: "No payments on any checkout page in this period.",
      lastPayment: "last {{when}}",
      payments_one: "{{count}} payment",
      payments_other: "{{count}} payments",
      title: "Top checkout pages",
      viewAll: "View all",
    },
  },
  getHelp: {
    breadcrumb: "Get Help",
    pageTitle: "Get Help",
  },
  jobsAndClients: {
    breadcrumb: "Jobs and Clients",
    pageTitle: "Jobs and Clients",
  },
  layout: {
    appSidebar: {
      nav: {
        app: {
          customers: "Customers",
          products: "Products",
          workflows: "Workflows",
          deals: "Deals",
          analytics: "Analytics",
          templates: "Templates",
          dashboard: "Dashboard",
          jobsAndClients: "Jobs and Clients",
          projects: {
            active: "Active",
            all: "All",
            title: "Projects",
          },
          title: "App",
        },
        settings: {
          getHelp: "Get Help",
          organizationSettings: "Organization Settings",
          title: "Settings",
        },
        sidebar: "Sidebar",
      },
    },
    navUser: {
      account: "Account",
      logOut: "Log out",
      userMenuButtonLabel: "Open user menu",
    },
    organizationSwitcher: {
      newOrganization: "New organization",
      organizations: "Organizations",
    },
  },
  new: {
    backButtonLabel: "Back",
    form: {
      cardDescription:
        "Tell us about your organization. You'll still remain a member of your current organization, with the ability to switch between them anytime.",
      cardTitle: "Create a new organization",
      logoInvalid: "Logo must be valid.",
      logoLabel: "Logo",
      logoMustBeUrl: "Logo must be a valid URL.",
      nameLabel: "Organization name",
      nameMaxLength: "Organization name must be less than 255 characters long.",
      nameMinLength: "Organization name must be at least 3 characters long.",
      namePlaceholder: "Organization name ...",
      nameRequired: "Organization name is required.",
      save: "Save",
      saving: "Saving ...",
      submitButton: "Create organization",
      termsAndPrivacy:
        "By creating an organization, you agree to our <1>Terms of Service</1> and <2>Privacy Policy</2>.",
    },
    pageTitle: "New organization",
  },
  organizationsList: {
    cardDescription:
      "This is a list of all the organizations you're a member of. Pick one to enter and visit its dashboard.",
    cardTitle: "Your organizations",
    pageTitle: "Organization List",
    roles: {
      admin: "Admin",
      member: "Member",
      owner: "Owner",
    },
    title: "Organization List",
  },
  projects: {
    breadcrumb: "All Projects",
    pageTitle: "All Projects",
  },
  projectsActive: {
    breadcrumb: "Active Projects",
    pageTitle: "Active Projects",
  },
  settings: {
    breadcrumb: "Settings",
    general: {
      breadcrumb: "General",
      dangerZone: {
        cancelButton: "Cancel",
        confirmationLabel:
          'To confirm, type "{{organizationName}}" in the box below',
        confirmationPlaceholder: "Enter organization name...",
        deleteButton: "Delete this organization",
        deleteButtonSubmitting: "Deleting organization...",
        deleteDescription:
          "Once deleted, it will be gone forever. Please be certain.",
        deleteTitle: "Delete this organization",
        dialogDescription:
          "Are you sure you want to delete this organization? This action cannot be undone.",
        dialogTitle: "Delete Organization",
        errors: {
          confirmationMismatch:
            "The confirmation text doesn't match the organization name.",
          confirmationRequired:
            "Please enter the organization name to confirm.",
        },
        title: "Danger Zone",
        triggerButton: "Delete organization",
      },
      description: "General settings for this organization.",
      errors: {
        invalidFileType:
          "Invalid file type. Only PNG, JPG, JPEG, GIF, and WebP images are allowed.",
        logoTooLarge: "Logo must be less than 1MB.",
        nameMax: "Organization name must be at most 255 characters long.",
        nameMin: "Organization name must be at least 3 characters long.",
      },
      form: {
        logoDescription:
          "Your organization's logo will be shown across the application.",
        logoFormats: "PNG, JPG, GIF, or WebP (max. 1MB)",
        logoLabel: "Organization logo",
        logoPreviewAlt: "Organization logo preview",
        nameDescription:
          "Your organization's public display name. <bold>Warning:</bold> Changing the name will <warning>break all existing links</warning> to your organization.",
        nameLabel: "Organization name",
        namePlaceholder: "Organization name ...",
        nameWarningContent:
          "When you change your organization's name, the URL slug will change. This means any bookmarked links or shared URLs will no longer work. Make sure to update any references to the old URL.",
        save: "Save changes",
        saving: "Saving changes ...",
      },
      organizationInfo: {
        logoAlt: "Organization logo",
        logoDescription: "The logo that represents your organization.",
        logoTitle: "Organization Logo",
        nameDescription:
          "The name of your organization as it appears to others.",
        nameTitle: "Organization Name",
      },
      pageTitle: "General",
      toast: {
        organizationDeleted: "Organization has been deleted",
        organizationProfileUpdated: "Organization has been updated",
      },
    },
    layout: {
      apiKeys: "API Keys",
      billing: "Billing",
      general: "General",
      settingsNav: "Settings navigation",
      teamMembers: "Team Members",
    },
    meta: {
      title: "Settings",
    },
    teamMembers: {
      breadcrumb: "Team Members",
      description: "Manage your team members and their permissions.",
      descriptionMember: "View who is a member of your organization.",
      inviteByEmail: {
        cardDescription:
          "Enter your colleagues' email addresses, and we'll send them a personalized invitation to join your organization. You can also choose the role they'll join with.",
        cardTitle: "Invite by Email",
        form: {
          email: "Email",
          emailAlreadyMember: "{{email}} is already a member",
          emailInvalid: "A valid email consists of characters, '@' and '.'.",
          emailPlaceholder: "Your colleague's email ...",
          emailRequired: "Please enter a valid email (required).",
          inviting: "Sending email invitation ...",
          organizationFull:
            "You have reached the maximum number of seats for your subscription.",
          role: "Role",
          roleAdmin: "Admin",
          roleMember: "Member",
          roleOwner: "Owner",
          rolePlaceholder: "Select a role ...",
          submitButton: "Send email invitation",
        },
        inviteEmail: {
          buttonText: "Join {{organizationName}}",
          callToAction: "Join now to collaborate with your colleagues!",
          description:
            "{{inviterName}} has invited you to join {{organizationName}} in {{appName}}. This invite expires in 48 hours.",
          subject: "{{inviteName}} invited you to {{appName}}",
          title: "You've Been Invited to {{appName}}!",
        },
        organizationFullToastDescription:
          "You've used up all your available seats.",
        organizationFullToastTitle: "Organization is full",
        successToastTitle: "Email invitation sent",
      },
      inviteLink: {
        cardDescription:
          'After generating the link, it will be valid for 48 hours. Copy and share it with anyone you\'d like to join with the role of "Member".',
        cardTitle: "Share an Invite Link",
        copied: "Copied!",
        copyInviteLink: "Copy invite link to clipboard",
        createNewInviteLink: "Create new invite link",
        creating: "Creating ...",
        deactivateLink: "Deactivate link",
        deactivating: "Deactivating ...",
        goToLink: "Go to the invite link's page",
        inviteLinkCopied: "Invite link copied to clipboard",
        linkValidUntil: "Your link is valid until {{date}}.",
        newLinkDeactivatesOld:
          "Generating a new link automatically deactivates the old one.",
        regenerateLink: "Regenerate link",
        regenerating: "Regenerating ...",
      },
      organizationIsFullAlert: {
        button: "Go to billing",
        description:
          "Switch to a higher-tier plan or contact sales to invite new members.",
        title: "No seats remaining",
      },
      pageTitle: "Team Members",
      table: {
        avatarHeader: "Avatar",
        emailHeader: "Email",
        nameHeader: "Name",
        noResults: "No members found.",
        pagination: {
          goToFirst: "Go to first page",
          goToLast: "Go to last page",
          goToNext: "Go to next page",
          goToPrevious: "Go to previous page",
          pageInfo: "Page {{current}} of {{total}}",
          rowsPerPage: "Rows per page",
        },
        roleHeader: "Role",
        roleSwitcher: {
          admin: "Admin",
          adminDescription: "Can edit the organization and manage billing.",
          commandLabel: "Select new role",
          deactivated: "Deactivated",
          deactivatedDescription: "Access revoked to everything.",
          member: "Member",
          memberDescription: "Access to standard features.",
          noRolesFound: "No roles found.",
          owner: "Owner",
          ownerDescription: "Can assign roles and delete the organization.",
          rolesPlaceholder: "Select new role ...",
        },
        status: {
          createdTheOrganization: "Joined",
          emailInvitePending: "Pending",
          joinedViaEmailInvite: "Joined",
          joinedViaLink: "Joined",
        },
        statusHeader: "Status",
      },
    },
    apiKeys: {
      breadcrumb: "API Keys",
      pageTitle: "API Keys",
      description:
        "Manage your organization's API keys for programmatic access.",
      apiKeyLabel: "API Key",
      copy: "Copy",
      copied: "Copied!",
      regenerate: "Regenerate API Key",
      keyPrefixNote:
        "Only the prefix is shown. The full key is only displayed immediately after generation.",
      keyFullNote:
        "Save this key securely. You won't be able to view it again after leaving this page.",
      unauthorized: "You don't have permission to view API keys",
    },
  },
};
