import { describe, expect, test } from "vitest";

import { resolveWorkflowView } from "./workflow-view.server";

const url = "http://localhost:3000/organizations/acme/workflows/wf_1";

describe("resolveWorkflowView()", () => {
  test("given: no choice yet, should: use the organization's default", async () => {
    const result = await resolveWorkflowView({
      organization: { workflowView: "canvas", workflowViewSwitchable: true },
      request: new Request(url),
    });

    expect(result).toMatchObject({ canSwitch: true, view: "canvas" });
    expect(result.headers.get("Set-Cookie")).toBeNull();
  });

  test("given: a view in the URL, should: use it and remember it", async () => {
    const first = await resolveWorkflowView({
      organization: { workflowView: "steps", workflowViewSwitchable: true },
      request: new Request(`${url}?view=canvas`),
    });
    expect(first.view).toEqual("canvas");

    const cookie = first.headers.get("Set-Cookie")?.split(";")[0] ?? "";
    const next = await resolveWorkflowView({
      organization: { workflowView: "steps", workflowViewSwitchable: true },
      request: new Request(url, { headers: { Cookie: cookie } }),
    });
    expect(next.view).toEqual("canvas");
  });

  test("given: switching turned off, should: always use the organization's view", async () => {
    const result = await resolveWorkflowView({
      organization: { workflowView: "steps", workflowViewSwitchable: false },
      request: new Request(`${url}?view=canvas`),
    });

    expect(result).toMatchObject({ canSwitch: false, view: "steps" });
    expect(result.headers.get("Set-Cookie")).toBeNull();
  });

  test("given: an unknown view, should: ignore it", async () => {
    const result = await resolveWorkflowView({
      organization: { workflowView: "steps", workflowViewSwitchable: true },
      request: new Request(`${url}?view=kanban`),
    });

    expect(result.view).toEqual("steps");
  });
});
