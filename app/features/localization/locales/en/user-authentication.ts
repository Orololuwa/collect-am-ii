export default {
  layout: {
    backgroundPathsTitle: "Animated background paths",
    home: "Home",
    quote:
      "This authentication system has transformed how we handle user logins. The email code flow is seamless and our users love it.",
    quoteAuthor: "Alex Chen, Lead Developer",
  },
  login: {
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    errors: {
      invalidEmail: "Please enter a valid email address.",
    },
    form: {
      joinOrganization: "Log in to join {{organizationName}}",
      joinOrganizationDescription:
        "{{creatorName}} has invited you to join {{organizationName}}.",
      loginFailed: "Login failed. Please try again.",
      userDoesntExist:
        "User with given email doesn't exist. Did you mean to create a new account instead?",
    },
    googleButton: "Continue with Google",
    code: {
      alertDescription: "Remember to check your spam folder.",
      cardDescription:
        "We've sent a 6-digit sign-in code to <1>{{email}}</1>. Enter it below to access your account.",
      cardTitle: "Check your email",
      codeLabel: "Sign-in code",
      codeRateLimited:
        "Too many attempts. Please wait a moment and request a new code.",
      countdownMessage_one:
        "If you haven't received the email within {{count}} second, you may request another code.",
      countdownMessage_other:
        "If you haven't received the email within {{count}} seconds, you may request another code.",
      countdownMessage_zero:
        "If you haven't received the email, you may request another code now.",
      invalidCode: "That code is invalid or has expired. Please try again.",
      resendButton: "Request new code",
      resendButtonLoading: "Sending...",
      verifyButton: "Sign in",
      verifyButtonLoading: "Verifying...",
    },
    pageTitle: "Login",
    separator: "Or",
    signupCta: "Don't have an account? <signup>Sign up</signup>",
    submitButton: "Sign in with Email",
    submitButtonSubmitting: "Signing in...",
    subtitle: "Enter your email below to sign in to your account",
    title: "Welcome back",
  },
  register: {
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    errors: {
      invalidEmail: "Please enter a valid email address.",
    },
    form: {
      joinOrganization: "Register to join {{organizationName}}",
      joinOrganizationDescription:
        "{{creatorName}} has invited you to join {{organizationName}}.",
      registrationFailed: "Registration failed. Please try again.",
      termsAndPrivacy:
        "By creating an account, you agree to our <1>Terms of Service</1> and <2>Privacy Policy</2>.",
      userAlreadyExists:
        "User with given email already exists. Did you mean to log in instead?",
    },
    googleButton: "Continue with Google",
    legal:
      "By clicking continue, you agree to our <tos>Terms of Service</tos> and <pp>Privacy Policy</pp>.",
    loginCta: "Already have an account? <login>Sign in</login>",
    code: {
      alertDescription: "Remember to check your spam folder.",
      cardDescription:
        "We've sent a 6-digit verification code to <1>{{email}}</1>. Enter it below to complete your registration.",
      cardTitle: "Verify your email",
      codeLabel: "Verification code",
      codeRateLimited:
        "Too many attempts. Please wait a moment and request a new code.",
      countdownMessage_one:
        "If you haven't received the email within {{count}} second, you may request another verification code.",
      countdownMessage_other:
        "If you haven't received the email within {{count}} seconds, you may request another verification code.",
      countdownMessage_zero:
        "If you haven't received the email, you may request another verification code now.",
      invalidCode: "That code is invalid or has expired. Please try again.",
      resendButton: "Request new code",
      resendButtonLoading: "Sending...",
      verifyButton: "Verify and continue",
      verifyButtonLoading: "Verifying...",
    },
    pageTitle: "Register",
    separator: "Or",
    submitButton: "Create Account",
    submitButtonSubmitting: "Creating account...",
    subtitle: "Enter your email below to create your account",
    title: "Create an account",
  },
};
