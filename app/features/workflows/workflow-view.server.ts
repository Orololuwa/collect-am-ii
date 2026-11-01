import { createCookie } from "react-router";

import type { WorkflowView } from "~/generated/client";

const WORKFLOW_VIEWS = ["steps", "canvas"] as const satisfies WorkflowView[];

const isWorkflowView = (value: unknown): value is WorkflowView =>
  WORKFLOW_VIEWS.includes(value as WorkflowView);

/** Each person's last choice of workflow editor view. */
const workflowViewCookie = createCookie("workflow_view", {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
});

/**
 * The view the workflow editor opens in: the organization's choice, or, when
 * members may switch, the one asked for in `?view=` or picked last time. A new
 * pick comes back as a `Set-Cookie` header to remember it.
 */
export async function resolveWorkflowView({
  request,
  organization,
}: {
  request: Request;
  organization: {
    workflowView: WorkflowView;
    workflowViewSwitchable: boolean;
  };
}): Promise<{ view: WorkflowView; canSwitch: boolean; headers: Headers }> {
  const headers = new Headers();
  if (!organization.workflowViewSwitchable) {
    return { canSwitch: false, headers, view: organization.workflowView };
  }
  const requested = new URL(request.url).searchParams.get("view");
  if (isWorkflowView(requested)) {
    headers.append("Set-Cookie", await workflowViewCookie.serialize(requested));
    return { canSwitch: true, headers, view: requested };
  }
  const remembered: unknown = await workflowViewCookie.parse(
    request.headers.get("Cookie"),
  );
  return {
    canSwitch: true,
    headers,
    view: isWorkflowView(remembered) ? remembered : organization.workflowView,
  };
}
