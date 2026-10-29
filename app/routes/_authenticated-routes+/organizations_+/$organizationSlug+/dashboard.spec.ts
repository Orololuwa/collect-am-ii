import { describe, expect, test } from "vitest";

import { action } from "./dashboard";
import { DISMISS_SETUP_GUIDE_INTENT } from "~/features/organizations/dashboard/dashboard-constants";
import type { Organization, UserAccount } from "~/generated/client";
import { OrganizationMembershipRole } from "~/generated/client";
import { auth0Handlers } from "~/test/mocks/handlers/auth0";
import { setupMockServerLifecycle } from "~/test/msw-test-utils";
import { setupUserWithOrgAndAddAsMember } from "~/test/server-test-utils";
import {
  createAuthenticatedRequest,
  createOrganizationMembershipTestContextProvider,
} from "~/test/test-utils";
import { prisma } from "~/utils/database.server";
import { notFound } from "~/utils/http-responses.server";
import { toFormData } from "~/utils/to-form-data";

const createUrl = (organizationSlug: string) =>
  `http://localhost:3000/organizations/${organizationSlug}/dashboard`;

const pattern = "/organizations/:organizationSlug/dashboard";

async function sendAuthenticatedRequest({
  formData,
  organizationSlug,
  user,
}: {
  formData: FormData;
  organizationSlug: Organization["slug"];
  user: UserAccount;
}) {
  const request = await createAuthenticatedRequest({
    formData,
    method: "POST",
    url: createUrl(organizationSlug),
    user,
  });
  const params = { organizationSlug };

  return await action({
    context: await createOrganizationMembershipTestContextProvider({
      params,
      pattern,
      request,
    }),
    params,
    request,
    unstable_pattern: pattern,
  });
}

async function getSetupGuideDismissedAt(organizationId: string) {
  const organization = await prisma.organization.findUniqueOrThrow({
    select: { setupGuideDismissedAt: true },
    where: { id: organizationId },
  });
  return organization.setupGuideDismissedAt;
}

setupMockServerLifecycle(...auth0Handlers);

describe("/organizations/:organizationSlug/dashboard route action", () => {
  test("given: a member skipping the setup guide, should: remember it for the organization", async () => {
    const { user, organization } = await setupUserWithOrgAndAddAsMember({
      role: OrganizationMembershipRole.member,
    });

    const response = await sendAuthenticatedRequest({
      formData: toFormData({ intent: DISMISS_SETUP_GUIDE_INTENT }),
      organizationSlug: organization.slug,
      user,
    });

    expect(response).toMatchObject({ data: {} });
    expect(await getSetupGuideDismissedAt(organization.id)).toBeInstanceOf(
      Date,
    );
  });

  test("given: an unknown intent, should: return a 400 and change nothing", async () => {
    const { user, organization } = await setupUserWithOrgAndAddAsMember();

    const response = await sendAuthenticatedRequest({
      formData: toFormData({ intent: "somethingElse" }),
      organizationSlug: organization.slug,
      user,
    });

    expect(response).toMatchObject({ init: { status: 400 } });
    expect(await getSetupGuideDismissedAt(organization.id)).toBeNull();
  });

  test("given: a user who is not a member of the organization, should: throw a 404", async () => {
    expect.assertions(2);
    const { user } = await setupUserWithOrgAndAddAsMember();
    const { organization } = await setupUserWithOrgAndAddAsMember();

    try {
      await sendAuthenticatedRequest({
        formData: toFormData({ intent: DISMISS_SETUP_GUIDE_INTENT }),
        organizationSlug: organization.slug,
        user,
      });
    } catch (error) {
      expect(error).toEqual(notFound());
    }
    expect(await getSetupGuideDismissedAt(organization.id)).toBeNull();
  });
});
