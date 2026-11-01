import {
  CircleAlertIcon,
  FlagIcon,
  MaximizeIcon,
  MinusIcon,
  PlayIcon,
  PlusIcon,
  UserCheckIcon,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { EditorStep, StepLane } from "./workflow-step-meta";
import {
  gateText,
  hasCustomerGate,
  isAutomaticStep,
  KIND_ICONS,
  KIND_KEYS,
  KIND_TILE_CLASSES,
  stepLane,
  stepSummary,
} from "./workflow-step-meta";
import { AutoBadge } from "./workflow-steps-list";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { WorkflowStepKind } from "~/generated/browser";
import { cn } from "~/lib/utils";

// The diagram is laid out on a fixed grid, then scaled by the zoom.
const WIDTH = 760;
const LANE_X: Record<StepLane, number> = { customer: 560, you: 200 };
const LANE_WIDTH = 320;
const NODE_WIDTH = 264;
const NODE_HEIGHT = 72;
const PILL_WIDTH = 180;
const PILL_HEIGHT = 36;
const START_TOP = 56;
const FIRST_ROW_TOP = 120;
const ROW = 100;
const ZOOM_LEVELS = [0.5, 0.6, 0.75, 0.9, 1, 1.1, 1.25];
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.5;

const clampZoom = (zoom: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom * 100) / 100));

/** Safari's trackpad pinch event, which has no standard type. */
type GestureEvent = UIEvent & {
  scale: number;
  clientX: number;
  clientY: number;
};
const DRAG_TYPE = "application/x-collectam-step";
const KINDS = [
  "document",
  "payment",
  "receipt",
  "caution",
  "cautionRefund",
] as const;

type Row = { kind: "step" | "gate"; stepIndex: number; lane: StepLane };
type Point = { lane: StepLane; bottom: number };
type Connector = {
  from: Point;
  to: { lane: StepLane; top: number };
  /** Where a step dropped here goes; null where nothing may go between. */
  insertAt: number | null;
  label: string;
};

function buildRows(steps: EditorStep[]): Row[] {
  return steps.flatMap((step, stepIndex): Row[] => [
    { kind: "step", lane: stepLane(step), stepIndex },
    ...(hasCustomerGate(step)
      ? [{ kind: "gate" as const, lane: "customer" as const, stepIndex }]
      : []),
  ]);
}

const rowTop = (row: number) => FIRST_ROW_TOP + row * ROW;

/** The segments of an elbow line between two lanes, ending in an arrow. */
function connectorSegments({ from, to }: Connector) {
  const x1 = LANE_X[from.lane];
  const x2 = LANE_X[to.lane];
  const y1 = from.bottom;
  const y2 = to.top;
  const segments: React.CSSProperties[] = [];
  if (x1 === x2) {
    segments.push({ height: y2 - y1 - 7, left: x1 - 1, top: y1, width: 2 });
  } else {
    segments.push({ height: 12, left: x1 - 1, top: y1, width: 2 });
    segments.push({
      height: 2,
      left: Math.min(x1, x2) - 1,
      top: y1 + 11,
      width: Math.abs(x2 - x1) + 2,
    });
    segments.push({
      height: y2 - y1 - 19,
      left: x2 - 1,
      top: y1 + 12,
      width: 2,
    });
  }
  return { arrow: { left: x2 - 5, top: y2 - 7 }, segments };
}

function insertPoint({ from, to }: Connector) {
  const x1 = LANE_X[from.lane];
  const x2 = LANE_X[to.lane];
  return x1 === x2
    ? { left: x1, top: (from.bottom + to.top) / 2 }
    : { left: (x1 + x2) / 2, top: from.bottom + 12 };
}

/** The canvas view: who acts at each step, from the deal's start to its end. */
export function WorkflowCanvas({
  steps,
  selectedKey,
  stepsWithIssues,
  onSelect,
  onInsert,
}: {
  steps: EditorStep[];
  selectedKey: string | null;
  stepsWithIssues: ReadonlySet<number>;
  onSelect: (key: string) => void;
  onInsert: (kind: WorkflowStepKind, index: number) => void;
}) {
  const { t } = useTranslation("workflows");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  // The diagram point under the pointer, kept there while zooming.
  const anchorRef = useRef<{
    point: { x: number; y: number };
    client: { x: number; y: number };
  } | null>(null);
  const panRef = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const [panning, setPanning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const rows = buildRows(steps);
  const endTop = rowTop(rows.length);
  const height = endTop + PILL_HEIGHT + 40;

  const stepName = (index: number) =>
    steps[index]?.name || t("editor.untitledStep");
  const connectors: Connector[] = [];
  const startPoint: Point = { bottom: START_TOP + PILL_HEIGHT, lane: "you" };
  rows.forEach((row, index) => {
    const previous = rows[index - 1];
    const from: Point = previous
      ? { bottom: rowTop(index - 1) + NODE_HEIGHT, lane: previous.lane }
      : startPoint;
    connectors.push({
      from,
      insertAt: row.kind === "gate" ? null : row.stepIndex,
      label:
        index === 0
          ? t("editor.canvas.insertFirst")
          : t("editor.canvas.insertBefore", { name: stepName(row.stepIndex) }),
      to: { lane: row.lane, top: rowTop(index) },
    });
  });
  const lastRow = rows.at(-1);
  connectors.push({
    from: lastRow
      ? { bottom: rowTop(rows.length - 1) + NODE_HEIGHT, lane: lastRow.lane }
      : startPoint,
    insertAt: steps.length,
    label: t("editor.canvas.insertLast"),
    to: { lane: "you", top: endTop },
  });

  /** Zooms keeping the point under the pointer (or the centre) in place. */
  const zoomTo = (next: number, client?: { x: number; y: number }) => {
    const scroller = scrollerRef.current;
    const diagram = diagramRef.current;
    const target = clampZoom(next);
    if (scroller && diagram && target !== zoomRef.current) {
      const box = scroller.getBoundingClientRect();
      const at = client ?? {
        x: box.left + box.width / 2,
        y: box.top + box.height / 2,
      };
      const rect = diagram.getBoundingClientRect();
      anchorRef.current = {
        client: at,
        point: {
          x: (at.x - rect.left) / zoomRef.current,
          y: (at.y - rect.top) / zoomRef.current,
        },
      };
    }
    setZoom(target);
  };

  // After a zoom renders, scroll so the anchored point is back under the pointer.
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const scroller = scrollerRef.current;
    const diagram = diagramRef.current;
    anchorRef.current = null;
    if (!anchor || !scroller || !diagram) return;
    const rect = diagram.getBoundingClientRect();
    scroller.scrollLeft += rect.left + anchor.point.x * zoom - anchor.client.x;
    scroller.scrollTop += rect.top + anchor.point.y * zoom - anchor.client.y;
  }, [zoom]);

  // Ctrl/⌘ + scroll and trackpad pinches zoom; React's wheel handler is
  // passive, so these are attached by hand to be able to stop page zoom.
  // biome-ignore lint/correctness/useExhaustiveDependencies: zoomTo reads refs
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const delta = Math.max(-50, Math.min(50, event.deltaY));
      // About 20% per mouse-wheel notch; trackpads send small steps.
      zoomTo(zoomRef.current * Math.exp(-delta * 0.004), {
        x: event.clientX,
        y: event.clientY,
      });
    };
    let gestureStart = 1;
    const onGestureStart = (event: Event) => {
      event.preventDefault();
      gestureStart = zoomRef.current;
    };
    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const gesture = event as GestureEvent;
      zoomTo(gestureStart * gesture.scale, {
        x: gesture.clientX,
        y: gesture.clientY,
      });
    };
    scroller.addEventListener("wheel", onWheel, { passive: false });
    scroller.addEventListener("gesturestart", onGestureStart);
    scroller.addEventListener("gesturechange", onGestureChange);
    return () => {
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("gesturestart", onGestureStart);
      scroller.removeEventListener("gesturechange", onGestureChange);
    };
  }, []);

  // Dragging the empty canvas pans it.
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    const target = event.target as HTMLElement;
    if (
      !scroller ||
      event.button !== 0 ||
      // React bubbles events from portals (the add-step menu) up here too.
      !scroller.contains(target) ||
      target.closest("button, a, input, select")
    ) {
      return;
    }
    panRef.current = {
      left: scroller.scrollLeft,
      top: scroller.scrollTop,
      x: event.clientX,
      y: event.clientY,
    };
    scroller.setPointerCapture(event.pointerId);
    setPanning(true);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    const scroller = scrollerRef.current;
    if (!pan || !scroller) return;
    scroller.scrollLeft = pan.left - (event.clientX - pan.x);
    scroller.scrollTop = pan.top - (event.clientY - pan.y);
  };
  const endPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panRef.current) return;
    panRef.current = null;
    scrollerRef.current?.releasePointerCapture(event.pointerId);
    setPanning(false);
  };

  const fit = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const scale = Math.min(
      1,
      // The left padding keeps the diagram clear of the add-step panel.
      (scroller.clientWidth - 240) / WIDTH,
      (scroller.clientHeight - 56) / height,
    );
    setZoom(clampZoom(scale));
  };

  const stepAt = (row: Row) => steps[row.stepIndex];

  return (
    <div
      className="relative h-full min-h-[480px]"
      data-testid="workflow-canvas"
    >
      <div
        className={cn(
          "absolute inset-0 touch-pan-x touch-pan-y overflow-auto bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-muted/50 pr-4 pl-52 [background-size:20px_20px]",
          panning ? "cursor-grabbing select-none" : "cursor-grab",
        )}
        onPointerCancel={endPan}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        ref={scrollerRef}
      >
        <div
          className="relative mx-auto my-6"
          ref={diagramRef}
          style={{ height, width: WIDTH, zoom: zoom === 1 ? undefined : zoom }}
        >
          <div
            aria-hidden="true"
            className="absolute top-0 rounded-2xl border bg-background/60"
            style={{
              height,
              left: LANE_X.you - LANE_WIDTH / 2,
              width: LANE_WIDTH,
            }}
          />
          <div
            aria-hidden="true"
            className="absolute top-0 rounded-2xl border border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/25"
            style={{
              height,
              left: LANE_X.customer - LANE_WIDTH / 2,
              width: LANE_WIDTH,
            }}
          />
          {(["you", "customer"] as const).map((lane) => (
            <div
              className="absolute top-3.5 text-center"
              key={lane}
              style={{ left: LANE_X[lane] - LANE_WIDTH / 2, width: LANE_WIDTH }}
            >
              <div
                className={cn(
                  "font-bold text-xs uppercase tracking-wider",
                  lane === "you"
                    ? "text-foreground/80"
                    : "text-sky-800 dark:text-sky-300",
                )}
              >
                {t(
                  lane === "you" ? "editor.lanes.you" : "editor.lanes.customer",
                )}
              </div>
              <div className="text-muted-foreground text-xs">
                {t(
                  lane === "you"
                    ? "editor.lanes.youHint"
                    : "editor.lanes.customerHint",
                )}
              </div>
            </div>
          ))}

          {connectors.map((connector) => {
            const { segments, arrow } = connectorSegments(connector);
            const key = `${connector.from.bottom}-${connector.to.top}`;
            return (
              <div aria-hidden="true" key={key}>
                {segments.map((style) => (
                  <div
                    className="absolute bg-muted-foreground/40"
                    key={`${style.left}-${style.top}`}
                    style={style}
                  />
                ))}
                <div
                  className="absolute size-0 border-x-[5px] border-x-transparent border-t-[7px] border-t-muted-foreground/40"
                  style={arrow}
                />
              </div>
            );
          })}

          <div
            className="absolute flex items-center justify-center gap-2 rounded-full bg-foreground font-semibold text-background text-sm"
            style={{
              height: PILL_HEIGHT,
              left: LANE_X.you - PILL_WIDTH / 2,
              top: START_TOP,
              width: PILL_WIDTH,
            }}
          >
            <PlayIcon aria-hidden="true" className="size-3 fill-current" />
            {t("editor.canvas.start")}
          </div>

          {rows.map((row, index) => {
            const step = stepAt(row);
            if (!step) return null;
            const selected = step.key === selectedKey;
            const style = {
              height: NODE_HEIGHT,
              left: LANE_X[row.lane] - NODE_WIDTH / 2,
              top: rowTop(index),
              width: NODE_WIDTH,
            };
            if (row.kind === "gate") {
              return (
                <button
                  className={cn(
                    "absolute flex items-center gap-3 rounded-xl border-dashed bg-sky-50 px-3.5 text-left dark:bg-sky-950/40",
                    selected
                      ? "border-2 border-primary"
                      : "border-[1.5px] border-sky-300 dark:border-sky-800",
                  )}
                  key={`${step.key}-gate`}
                  onClick={() => onSelect(step.key)}
                  style={style}
                  type="button"
                >
                  <span className="flex size-[34px] shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-background text-sky-800 dark:border-sky-800 dark:text-sky-300">
                    <UserCheckIcon aria-hidden="true" className="size-[18px]" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-semibold text-sm">
                      {t(gateText(step).title)}
                    </span>
                    <span className="truncate text-muted-foreground text-xs">
                      {t(gateText(step).description)}
                    </span>
                  </span>
                </button>
              );
            }
            const Icon = KIND_ICONS[step.kind];
            const hasIssue = stepsWithIssues.has(row.stepIndex);
            return (
              <button
                aria-label={`${row.stepIndex + 1}. ${step.name || t("editor.untitledStep")}, ${t(KIND_KEYS[step.kind])}`}
                aria-pressed={selected}
                className={cn(
                  "absolute flex items-center gap-3 rounded-xl border bg-card px-3.5 text-left shadow-xs transition-shadow",
                  selected
                    ? "border-2 border-primary ring-4 ring-primary/15"
                    : "hover:shadow-md",
                  hasIssue && !selected && "border-destructive",
                )}
                data-testid={`workflow-node-${row.stepIndex}`}
                key={step.key}
                onClick={() => onSelect(step.key)}
                style={style}
                type="button"
              >
                <span
                  className={cn(
                    "flex size-[34px] shrink-0 items-center justify-center rounded-lg",
                    KIND_TILE_CLASSES[step.kind],
                  )}
                >
                  <Icon aria-hidden="true" className="size-[18px]" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate font-semibold text-sm">
                      {step.name || t("editor.untitledStep")}
                    </span>
                    {isAutomaticStep(step, row.stepIndex) ? (
                      <AutoBadge />
                    ) : null}
                  </span>
                  <span className="truncate text-muted-foreground text-xs">
                    {stepSummary(t, step)}
                  </span>
                </span>
                {hasIssue ? (
                  <CircleAlertIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-destructive"
                  />
                ) : null}
              </button>
            );
          })}

          {connectors.map((connector) => {
            const { insertAt } = connector;
            if (insertAt === null) return null;
            const point = insertPoint(connector);
            const active = dropTarget === insertAt;
            return (
              <div
                className="group absolute flex items-center justify-center"
                key={`insert-${connector.from.bottom}`}
                onDragLeave={() => setDropTarget(null)}
                onDragOver={(event) => {
                  if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                  setDropTarget(insertAt);
                }}
                onDrop={(event) => {
                  const kind = event.dataTransfer.getData(DRAG_TYPE);
                  event.preventDefault();
                  setDropTarget(null);
                  setDragging(false);
                  if (KINDS.includes(kind as WorkflowStepKind)) {
                    onInsert(kind as WorkflowStepKind, insertAt);
                  }
                }}
                style={{
                  height: 28,
                  left: point.left - 60,
                  top: point.top - 14,
                  width: 120,
                }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label={connector.label}
                      className={cn(
                        "flex items-center justify-center rounded-full border border-primary bg-background text-primary shadow-sm transition-all focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:opacity-100",
                        active
                          ? "size-7 bg-primary text-primary-foreground"
                          : "size-6",
                        dragging || active
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100",
                      )}
                      type="button"
                    >
                      <PlusIcon aria-hidden="true" className="size-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-44">
                    <DropdownMenuLabel>
                      {t("editor.canvas.addHere")}
                    </DropdownMenuLabel>
                    {KINDS.map((kind) => {
                      const Icon = KIND_ICONS[kind];
                      return (
                        <DropdownMenuItem
                          key={kind}
                          onSelect={() => onInsert(kind, insertAt)}
                        >
                          <Icon aria-hidden="true" />
                          {t(KIND_KEYS[kind])}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}

          <div
            className="absolute flex items-center justify-center gap-2 rounded-full border border-green-300 bg-green-100 font-semibold text-green-900 text-sm dark:border-green-800 dark:bg-green-950 dark:text-green-200"
            style={{
              height: PILL_HEIGHT,
              left: LANE_X.you - PILL_WIDTH / 2,
              top: endTop,
              width: PILL_WIDTH,
            }}
          >
            <FlagIcon aria-hidden="true" className="size-3.5" />
            {t("editor.canvas.end")}
          </div>
        </div>
      </div>

      <div className="absolute top-4 left-4 flex w-44 flex-col gap-1.5 rounded-xl border bg-card p-2.5 shadow-md">
        <span className="px-1 pb-0.5 font-semibold text-muted-foreground text-xs">
          {t("editor.canvas.addStep")}
        </span>
        {KINDS.map((kind) => {
          const Icon = KIND_ICONS[kind];
          return (
            <button
              className="flex h-9 cursor-grab items-center gap-2 rounded-lg border bg-background px-2 font-medium text-sm hover:bg-accent active:cursor-grabbing"
              draggable
              key={kind}
              onClick={() => onInsert(kind, steps.length)}
              onDragEnd={() => {
                setDragging(false);
                setDropTarget(null);
              }}
              onDragStart={(event) => {
                event.dataTransfer.setData(DRAG_TYPE, kind);
                event.dataTransfer.effectAllowed = "copy";
                setDragging(true);
              }}
              type="button"
            >
              <span
                className={cn(
                  "flex size-[22px] items-center justify-center rounded-md",
                  KIND_TILE_CLASSES[kind],
                )}
              >
                <Icon aria-hidden="true" className="size-3.5" />
              </span>
              {t(KIND_KEYS[kind])}
            </button>
          );
        })}
        <span className="px-1 pt-0.5 text-[11px] text-muted-foreground leading-snug">
          {t("editor.canvas.addStepHint")}
        </span>
      </div>

      <div className="absolute bottom-4 left-4 flex items-center gap-0.5 rounded-lg border bg-card p-1 shadow-sm">
        <Button
          aria-label={t("editor.canvas.zoomOut")}
          disabled={zoom <= MIN_ZOOM}
          onClick={() =>
            zoomTo(ZOOM_LEVELS.findLast((level) => level < zoom) ?? MIN_ZOOM)
          }
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <MinusIcon aria-hidden="true" />
        </Button>
        <button
          className="w-12 text-center font-semibold text-xs tabular-nums"
          onClick={() => zoomTo(1)}
          title={t("editor.canvas.zoomHint")}
          type="button"
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button
          aria-label={t("editor.canvas.zoomIn")}
          disabled={zoom >= MAX_ZOOM}
          onClick={() =>
            zoomTo(ZOOM_LEVELS.find((level) => level > zoom) ?? MAX_ZOOM)
          }
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <PlusIcon aria-hidden="true" />
        </Button>
        <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border" />
        <Button onClick={fit} size="sm" type="button" variant="ghost">
          <MaximizeIcon aria-hidden="true" />
          {t("editor.canvas.fit")}
        </Button>
      </div>
    </div>
  );
}
