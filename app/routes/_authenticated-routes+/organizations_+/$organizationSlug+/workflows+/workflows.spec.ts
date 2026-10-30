import { describe, expect, test } from "vitest";

import { action as editAction, loader as editLoader } from "./$workflowId";
import { action as newAction } from "./new";
import type { WorkflowStepInput } from "~/features/workflows/workflow-steps";
import {
  BLANK_WORKFLOW_KEY,
  CREATE_WORKFLOW_INTENT,
  SAVE_WORKFLOW_INTENT,
} from "~/features/workflows/workflows-constants";
import {
  retrieveWorkflowFromDatabaseById,
  saveWorkflowWithStepsToDatabase,
} from "~/features/workflows/workflows-model.server";
import type { UserAccount } from "~/generated/client";
import { auth0Handlers } from "~/test/mocks/handlers/auth0";
import { setupMockServerLifecycle } from "~/test/msw-test-utils";
import { setupUserWithOrgAndAddAsMember } from "~/test/server-test-utils";
import {
  createAuthenticatedRequest,
  createOrganizationMembershipTestContextProvider,
} from "~/test/test-utils";
import { prisma } from "~/utils/database.server";
import { toFormData } from "~/utils/to-form-data";

setupMockServerLifecycle(...auth0Handlers);

const baseUrl = (slug: string) =>
  `http://localhost:3000/organizations/${slug}/workflows`;

async function callRoute<T>({
  handler,
  pattern,
  params,
  url,
  user,
  formData,
}: {
  handler: (args: never) => Promise<T>;
  pattern: string;
  params: Record<string, string>;
  url: string;
  user: UserAccount;
  formData?: FormData;
}) {
  const request = await createAuthenticatedRequest({
    formData,
    method: formData ? "POST" : "GET",
    url,
    user,
  });
  return await handler({
    context: await createOrganizationMembershipTestContextProvider({
      params,
      pattern,
      request,
    }),
    params,
    request,
    unstable_pattern: pattern,
  } as never);
}

const step = (overrides: Partial<WorkflowStepInput>): WorkflowStepInput => ({
  advanceMode: "manual",
  carryForward: "items",
  depositPercentBps: null,
  documentType: null,
  kind: "document",
  name: "Step",
  paymentTermsDays: null,
  requiresAcceptance: false,
  templateId: null,
  validityDays: null,
  ...overrides,
});

const quote = step({
  documentType: "quote",
  name: "Quote",
  requiresAcceptance: true,
  validityDays: 30,
});
const payment = step({ kind: "payment", name: "Payment" });
const receipt = step({
  advanceMode: "automatic",
  kind: "receipt",
  name: "Receipt",
});

async function createWorkflow(organizationId: string) {
  return await saveWorkflowWithStepsToDatabase({
    description: "",
    name: "Simple",
    organizationId,
    sampleKey: null,
    steps: [quote],
  });
}

function saveForm(steps: WorkflowStepInput[], name = "Renamed") {
  return toFormData({
    description: "For small jobs",
    intent: SAVE_WORKFLOW_INTENT,
    name,
    steps: JSON.stringify(steps),
  });
}

describe("workflows routes", () => {
  test("given: a sample, should: create a workflow with its steps in English and open it", async () => {
    const { user, organization } = await setupUserWithOrgAndAddAsMember();

    const response = (await callRoute({
      formData: toFormData({
        intent: CREATE_WORKFLOW_INTENT,
        sampleKey: "servicesDeposit",
      }),
      handler: newAction,
      params: { organizationSlug: organization.slug },
      pattern: "/organizations/:organizationSlug/workflows/new",
      url: `${baseUrl(organization.slug)}/new`,
      user,
    })) as Response;

    const workflow = await prisma.workflow.findFirstOrThrow({
      include: { steps: { orderBy: { position: "asc" } } },
      where: { organizationId: organization.id },
    });
    expect(response.status).toEqual(302);
    expect(response.headers.get("Location")).toEqual(
      `/organizations/${organization.slug}/workflows/${workflow.id}`,
    );
    expect(workflow).toMatchObject({
      name: "Services with deposit",
      sampleKey: "servicesDeposit",
    });
    expect(
      workflow.steps.map((step) => [step.kind, step.name, step.carryForward]),
    ).toEqual([
      ["document", "Estimate", "items"],
      ["document", "Deposit invoice", "deposit"],
      ["payment", "Deposit payment", "items"],
      ["receipt", "Receipt", "items"],
      ["document", "Final invoice", "balance"],
      ["payment", "Final payment", "items"],
      ["receipt", "Receipt", "items"],
    ]);
    expect(workflow.steps[1]?.depositPercentBps).toEqual(5000);
  });

  test("given: the blank option, should: create a workflow with one quote step", async () => {
    const { user, organization } = await setupUserWithOrgAndAddAsMember();

    await callRoute({
      formData: toFormData({
        intent: CREATE_WORKFLOW_INTENT,
        sampleKey: BLANK_WORKFLOW_KEY,
      }),
      handler: newAction,
      params: { organizationSlug: organization.slug },
      pattern: "/organizations/:organizationSlug/workflows/new",
      url: `${baseUrl(organization.slug)}/new`,
      user,
    });

    const workflow = await prisma.workflow.findFirstOrThrow({
      include: { steps: true },
      where: { organizationId: organization.id },
    });
    expect(workflow.name).toEqual("New workflow");
    expect(workflow.steps).toHaveLength(1);
    expect(workflow.steps[0]).toMatchObject({
      documentType: "quote",
      kind: "document",
    });
  });

  test("given: valid steps, should: replace the workflow's steps", async () => {
    const { user, organization } = await setupUserWithOrgAndAddAsMember();
    const workflow = await createWorkflow(organization.id);

    const response = await callRoute({
      formData: saveForm([
        quote,
        step({
          documentType: "invoice",
          name: "Invoice",
          paymentTermsDays: 14,
        }),
        payment,
        receipt,
      ]),
      handler: editAction,
      params: { organizationSlug: organization.slug, workflowId: workflow.id },
      pattern: "/organizations/:organizationSlug/workflows/:workflowId",
      url: `${baseUrl(organization.slug)}/${workflow.id}`,
      user,
    });

    expect(response).toMatchObject({ data: { issues: [] } });
    const saved = await retrieveWorkflowFromDatabaseById({
      organizationId: organization.id,
      workflowId: workflow.id,
    });
    expect(saved?.name).toEqual("Renamed");
    expect(saved?.steps.map((step) => step.name)).toEqual([
      "Quote",
      "Invoice",
      "Payment",
      "Receipt",
    ]);
  });

  test("given: a receipt that doesn't follow a payment, should: return the issue and keep the old steps", async () => {
    const { user, organization } = await setupUserWithOrgAndAddAsMember();
    const workflow = await createWorkflow(organization.id);

    const response = await callRoute({
      formData: saveForm([quote, receipt]),
      handler: editAction,
      params: { organizationSlug: organization.slug, workflowId: workflow.id },
      pattern: "/organizations/:organizationSlug/workflows/:workflowId",
      url: `${baseUrl(organization.slug)}/${workflow.id}`,
      user,
    });

    expect(response).toMatchObject({
      data: { issues: [{ code: "receiptMustFollowPayment", stepIndex: 1 }] },
      init: { status: 400 },
    });
    const unchanged = await retrieveWorkflowFromDatabaseById({
      organizationId: organization.id,
      workflowId: workflow.id,
    });
    expect(unchanged?.steps).toHaveLength(1);
  });

  test("given: another organization's template, should: reject the step", async () => {
    const { user, organization } = await setupUserWithOrgAndAddAsMember();
    const { organization: otherOrganization } =
      await setupUserWithOrgAndAddAsMember();
    const workflow = await createWorkflow(organization.id);
    const otherTemplate = await prisma.template.create({
      data: {
        globalStyles: {},
        name: "Their quote",
        organizationId: otherOrganization.id,
        sections: [],
        type: "quote",
      },
    });

    const response = await callRoute({
      formData: saveForm([{ ...quote, templateId: otherTemplate.id }]),
      handler: editAction,
      params: { organizationSlug: organization.slug, workflowId: workflow.id },
      pattern: "/organizations/:organizationSlug/workflows/:workflowId",
      url: `${baseUrl(organization.slug)}/${workflow.id}`,
      user,
    });

    expect(response).toMatchObject({
      data: { issues: [{ code: "templateNotFound", stepIndex: 0 }] },
      init: { status: 400 },
    });
  });

  test("given: another organization's workflow, should: throw a 404", async () => {
    expect.assertions(1);
    const { user, organization } = await setupUserWithOrgAndAddAsMember();
    const { organization: otherOrganization } =
      await setupUserWithOrgAndAddAsMember();
    const otherWorkflow = await createWorkflow(otherOrganization.id);

    try {
      await callRoute({
        handler: editLoader,
        params: {
          organizationSlug: organization.slug,
          workflowId: otherWorkflow.id,
        },
        pattern: "/organizations/:organizationSlug/workflows/:workflowId",
        url: `${baseUrl(organization.slug)}/${otherWorkflow.id}`,
        user,
      });
    } catch (error) {
      expect(error).toMatchObject({ init: { status: 404 } });
    }
  });
});
