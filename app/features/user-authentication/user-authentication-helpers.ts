/**
 * Checks whether an auth action response means a sign-in code was emailed and
 * the user should now enter it.
 *
 * @param data - The action data of the login or register route.
 * @returns `true` if the response carries the email the code was sent to.
 */
export function getIsAwaitingEmailConfirmation(
  data: unknown,
): data is { email: string } {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  return "email" in data && typeof data.email === "string";
}
