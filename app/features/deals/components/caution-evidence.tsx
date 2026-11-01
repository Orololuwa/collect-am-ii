import { ImagePlusIcon, XIcon } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useFetcher } from "react-router";

import {
  EVIDENCE_IMAGE_TYPES,
  EVIDENCE_VIDEO_TYPES,
  MAX_EVIDENCE_PER_DEDUCTION,
} from "../deal-caution";
import { UPLOAD_CAUTION_EVIDENCE_INTENT } from "../deals-constants";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";

export type EvidenceItem = {
  kind: "image" | "video";
  name: string;
  url: string;
};

/** An uploaded item the business can still remove before sending. */
export type UploadedEvidence = EvidenceItem & { id: string };

/** Photos and videos backing up a deduction, as small tiles. */
export function EvidenceGallery({
  items,
  label,
  onRemove,
  removeLabel,
}: {
  items: EvidenceItem[];
  /** Says what the evidence is for, for screen readers. */
  label: string;
  onRemove?: (index: number) => void;
  /** The remove button's label for an item; needed with `onRemove`. */
  removeLabel?: (name: string) => string;
}) {
  if (items.length === 0) return null;
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <li className="relative" key={item.url}>
          {item.kind === "image" ? (
            <a
              className="block overflow-hidden rounded-md border bg-muted"
              href={item.url}
              rel="noopener"
              target="_blank"
              title={item.name}
            >
              <img
                alt={item.name}
                className="size-24 object-cover"
                loading="lazy"
                src={item.url}
              />
            </a>
          ) : (
            // biome-ignore lint/a11y/useMediaCaption: evidence clips are the business's own footage, with no speech to caption
            <video
              className="h-24 w-40 rounded-md border bg-black object-cover"
              controls
              preload="metadata"
              src={item.url}
              title={item.name}
            />
          )}
          {onRemove ? (
            <Button
              aria-label={removeLabel?.(item.name) ?? item.name}
              className="absolute -top-2 -right-2 size-6 rounded-full shadow-sm"
              onClick={() => onRemove(index)}
              size="icon"
              type="button"
              variant="secondary"
            >
              <XIcon aria-hidden="true" className="size-3.5" />
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Lets the business attach photos or videos to one deduction. Each pick is
 * uploaded straight away; the ids go with the settlement when it's sent.
 */
export function EvidenceUploader({
  stepId,
  label,
  value,
  onChange,
}: {
  stepId: string;
  /** Says which deduction this is for. */
  label: string;
  value: UploadedEvidence[];
  onChange: (next: UploadedEvidence[]) => void;
}) {
  const { t } = useTranslation("deals", { keyPrefix: "detail.caution" });
  const fetcher = useFetcher<{
    error: string | null;
    evidence: UploadedEvidence[];
  }>();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploading = fetcher.state !== "idle";
  const handled = useRef<unknown>(null);
  const room = MAX_EVIDENCE_PER_DEDUCTION - value.length;

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (handled.current === fetcher.data) return;
    handled.current = fetcher.data;
    if (fetcher.data.evidence.length > 0) {
      onChange(
        [...value, ...fetcher.data.evidence].slice(
          0,
          MAX_EVIDENCE_PER_DEDUCTION,
        ),
      );
    }
  }, [fetcher.state, fetcher.data, onChange, value]);

  return (
    <div className="space-y-2">
      <EvidenceGallery
        items={value}
        label={label}
        onRemove={(index) =>
          onChange(value.filter((_, position) => position !== index))
        }
        removeLabel={(name) => t("removeEvidence", { name })}
      />
      {room > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            accept={[...EVIDENCE_IMAGE_TYPES, ...EVIDENCE_VIDEO_TYPES].join(
              ",",
            )}
            className="sr-only"
            disabled={uploading}
            id={`${id}-files`}
            multiple
            onChange={(event) => {
              const files = [...(event.target.files ?? [])].slice(0, room);
              event.target.value = "";
              if (files.length === 0) return;
              const formData = new FormData();
              formData.set("intent", UPLOAD_CAUTION_EVIDENCE_INTENT);
              formData.set("stepId", stepId);
              for (const file of files) formData.append("files", file);
              fetcher.submit(formData, {
                encType: "multipart/form-data",
                method: "POST",
              });
            }}
            ref={inputRef}
            type="file"
          />
          <Button
            aria-describedby={`${id}-hint`}
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            size="sm"
            type="button"
            variant="ghost"
          >
            {uploading ? <Spinner /> : <ImagePlusIcon aria-hidden="true" />}
            {uploading ? t("uploading") : t("addEvidence")}
          </Button>
          <span
            className={cn(
              "text-xs",
              fetcher.data?.error && !uploading
                ? "text-destructive"
                : "text-muted-foreground",
            )}
            id={`${id}-hint`}
            role={fetcher.data?.error && !uploading ? "alert" : undefined}
          >
            {fetcher.data?.error && !uploading
              ? t("evidenceError")
              : t("evidenceHint")}
          </span>
        </div>
      ) : null}
    </div>
  );
}
