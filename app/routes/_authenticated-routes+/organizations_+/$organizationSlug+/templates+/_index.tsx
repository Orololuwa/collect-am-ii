import { PlusIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { data, Form, href, Link, useSearchParams } from "react-router";

import type { Route } from "./+types/_index";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { NewTemplateDialog } from "~/features/templates/library/new-template-dialog";
import type { TemplateSummary } from "~/features/templates/library/template-card";
import { TemplateCard } from "~/features/templates/library/template-card";
import { templatesLibraryAction } from "~/features/templates/library/templates-library-action.server";
import type { TemplateTypeInfo } from "~/features/templates/shared/template-types";
import {
  isListedTemplateType,
  TEMPLATE_TYPES,
} from "~/features/templates/shared/template-types";
import {
  getStarterTemplates,
  retrieveTemplateSummariesFromDatabase,
  retrieveTemplateUsageFromDatabase,
} from "~/features/templates/shared/templates-library.server";
import type { TemplateType } from "~/features/templates/shared/types";
import { cn } from "~/lib/utils";
import { getPageTitle } from "~/utils/get-page-title.server";

type SortOrder = "recent" | "name";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);
  const searchParams = new URL(request.url).searchParams;
  const typeParam = searchParams.get("type") ?? "";
  const type = isListedTemplateType(typeParam) ? typeParam : null;
  const search = searchParams.get("q")?.trim().slice(0, 100) || "";
  const sort: SortOrder =
    searchParams.get("sort") === "name" ? "name" : "recent";

  const [allTemplates, usage] = await Promise.all([
    retrieveTemplateSummariesFromDatabase({ organizationId: organization.id }),
    retrieveTemplateUsageFromDatabase(organization.id),
  ]);
  const templateCounts: Record<string, number> = {};
  for (const template of allTemplates) {
    templateCounts[template.type] = (templateCounts[template.type] ?? 0) + 1;
  }
  const query = search.toLowerCase();
  const templates = allTemplates
    .filter((template) => !query || template.name.toLowerCase().includes(query))
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : b.updatedAt.getTime() - a.updatedAt.getTime(),
    );

  return data(
    {
      breadcrumb: {
        title: i18n.t("organizations:templates.breadcrumb"),
        to: href("/organizations/:organizationSlug/templates", {
          organizationSlug: params.organizationSlug,
        }),
      },
      newTemplate: {
        starters: Object.fromEntries(
          TEMPLATE_TYPES.map((info) => [
            info.value,
            getStarterTemplates(info.value),
          ]),
        ),
        templateCounts,
        typesWithDefault: allTemplates
          .filter((template) => template.isDefault)
          .map((template) => template.type),
        workflowsByType: usage.workflowsByType,
      },
      pageTitle: getPageTitle(
        i18n.t.bind(i18n),
        "organizations:templates.pageTitle",
      ),
      search,
      sort,
      templateCounts,
      templates,
      total: allTemplates.length,
      type,
      workflowsByTemplate: usage.workflowsByTemplate,
    },
    { headers },
  );
}

export async function action(args: Route.ActionArgs) {
  return await templatesLibraryAction(args);
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.pageTitle },
];

function TypeSection({
  info,
  templates,
  workflowCount,
  workflowsByTemplate,
  organizationSlug,
  onCreate,
}: {
  info: TemplateTypeInfo;
  templates: TemplateSummary[];
  /** How many active workflows have a step of this type. */
  workflowCount: number;
  workflowsByTemplate: Record<string, number>;
  organizationSlug: string;
  onCreate: () => void;
}) {
  const headingId = `templates-${info.value}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <h2
          className="flex items-center gap-2 font-semibold text-[15px]"
          id={headingId}
        >
          <info.icon
            aria-hidden="true"
            className="size-[18px] text-muted-foreground"
          />
          {info.plural}
          <span className="font-medium text-muted-foreground">
            {templates.length}
          </span>
        </h2>
        {templates.length > 0 ? (
          <Button onClick={onCreate} size="sm" variant="ghost">
            <PlusIcon aria-hidden="true" />
            New {info.label.toLowerCase()}
          </Button>
        ) : null}
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5">
          <div className="flex max-w-2xl flex-col gap-1">
            <span className="font-semibold">
              No {info.label.toLowerCase()} template yet
            </span>
            <span className="text-muted-foreground text-sm">
              {info.usedInDeals
                ? `Your deals send ${info.plural.toLowerCase()} in CollectAm's built-in design until you make one.${
                    workflowCount > 0
                      ? ` ${workflowCount === 1 ? "One of your workflows has" : `${workflowCount} of your workflows have`} a step that sends one.`
                      : ""
                  }`
                : `Make one to send ${info.plural.toLowerCase()} from the template builder.`}
            </span>
          </div>
          <Button onClick={onCreate} variant="outline">
            Create {info.label.toLowerCase()} template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              organizationSlug={organizationSlug}
              template={template}
              workflowCount={workflowsByTemplate[template.id] ?? 0}
            />
          ))}
          <button
            className="flex min-h-[248px] flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed p-4 text-center text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            onClick={onCreate}
            type="button"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-muted">
              <PlusIcon aria-hidden="true" className="size-[18px]" />
            </span>
            <span className="font-semibold text-foreground text-sm">
              New {info.label.toLowerCase()}
            </span>
            <span className="max-w-44 text-xs">
              Start from a ready-made design or a blank page
            </span>
          </button>
        </div>
      )}
    </section>
  );
}

export default function TemplatesRoute({
  loaderData,
  params,
}: Route.ComponentProps) {
  const {
    templates,
    templateCounts,
    total,
    type,
    search,
    sort,
    workflowsByTemplate,
    newTemplate,
  } = loaderData;
  const organizationSlug = params.organizationSlug;
  const [searchParams] = useSearchParams();
  // `?new=invoice` opens the picker on that type, for links from elsewhere.
  const [creatingType, setCreatingType] = useState<TemplateType | null>(() => {
    const requested = searchParams.get("new") ?? "";
    return isListedTemplateType(requested) ? requested : null;
  });
  const listUrl = href("/organizations/:organizationSlug/templates", {
    organizationSlug,
  });
  const urlWith = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const query = next.toString();
    return query ? `${listUrl}?${query}` : listUrl;
  };

  // With "All", show every type that has templates or that a workflow sends,
  // so missing deal documents are easy to spot.
  const visibleTypes = TEMPLATE_TYPES.filter((info) =>
    type
      ? info.value === type
      : templates.some((template) => template.type === info.value) ||
        (!search && (newTemplate.workflowsByType[info.value] ?? 0) > 0),
  );

  const chip = (value: string | null, label: string, count: number) => {
    const selected = (type ?? null) === value;
    return (
      <Link
        aria-current={selected ? "page" : undefined}
        className={cn(
          "inline-flex h-[34px] items-center gap-1.5 rounded-full border px-3 font-medium text-sm transition-colors",
          selected
            ? "border-foreground bg-foreground text-background"
            : "bg-card hover:bg-accent",
        )}
        key={value ?? "all"}
        preventScrollReset
        to={urlWith({ type: value })}
      >
        {label}
        <span
          className={cn(
            "text-xs",
            selected ? "text-background/70" : "text-muted-foreground",
          )}
        >
          {count}
        </span>
      </Link>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-7 px-4 py-6 lg:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-1.5">
          <h1
            className="font-semibold text-2xl tracking-tight"
            data-testid="template-builder-heading"
          >
            Templates
          </h1>
          <p className="text-muted-foreground">
            How your documents look when deals send them. A workflow step uses
            the template you pick for it, or your default for that type.
          </p>
        </div>
        <Button
          data-testid="create-new-template-button"
          onClick={() => setCreatingType(type ?? "quote")}
        >
          <PlusIcon aria-hidden="true" />
          New template
        </Button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Document type" className="flex flex-wrap gap-1.5">
          {chip(null, "All", total)}
          {TEMPLATE_TYPES.map((info) =>
            chip(info.value, info.plural, templateCounts[info.value] ?? 0),
          )}
        </nav>
        <div className="flex items-center gap-2">
          <Form action={listUrl} method="GET" role="search">
            {type ? <input name="type" type="hidden" value={type} /> : null}
            {sort === "name" ? (
              <input name="sort" type="hidden" value="name" />
            ) : null}
            <div className="relative">
              <SearchIcon
                aria-hidden="true"
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search templates"
                className="w-56 pl-9"
                defaultValue={search}
                name="q"
                placeholder="Search templates"
                type="search"
              />
            </div>
          </Form>
          <Button asChild variant="outline">
            <Link
              preventScrollReset
              to={urlWith({ sort: sort === "name" ? null : "name" })}
            >
              {sort === "name" ? "Name A–Z" : "Recently edited"}
            </Link>
          </Button>
        </div>
      </div>

      {visibleTypes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
          <p className="font-medium">
            {search ? `No templates match "${search}"` : "No templates yet"}
          </p>
          {search ? null : (
            <>
              <p className="max-w-sm text-muted-foreground text-sm">
                Templates set how your quotes, invoices and receipts look when
                deals send them.
              </p>
              <Button onClick={() => setCreatingType("quote")}>
                <PlusIcon aria-hidden="true" />
                New template
              </Button>
            </>
          )}
        </div>
      ) : (
        visibleTypes.map((info) => (
          <TypeSection
            info={info}
            key={info.value}
            onCreate={() => setCreatingType(info.value)}
            organizationSlug={organizationSlug}
            templates={templates.filter(
              (template) => template.type === info.value,
            )}
            workflowCount={newTemplate.workflowsByType[info.value] ?? 0}
            workflowsByTemplate={workflowsByTemplate}
          />
        ))
      )}

      <NewTemplateDialog
        initialType={creatingType ?? "quote"}
        onOpenChange={(open) => {
          if (!open) setCreatingType(null);
        }}
        open={creatingType !== null}
        options={newTemplate}
        organizationSlug={organizationSlug}
      />
    </div>
  );
}
