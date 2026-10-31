import { cn } from "~/lib/utils";

/** An A4 page at 96 dpi, the size the document HTML is laid out for. */
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

/**
 * A miniature of the real document: the template's own HTML, scaled down in
 * a frame that loads only when it scrolls into view.
 */
export function TemplateThumbnail({
  src,
  width = 140,
  className,
}: {
  /** The template's preview URL. */
  src: string;
  /** How wide the miniature page is drawn, in px. */
  width?: number;
  className?: string;
}) {
  const scale = width / PAGE_WIDTH;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-44 justify-center overflow-hidden bg-muted px-4 pt-4",
        className,
      )}
    >
      <div
        className="relative shrink-0 overflow-hidden rounded-t-[3px] bg-white shadow-sm ring-1 ring-black/5"
        style={{ height: PAGE_HEIGHT * scale, width }}
      >
        <iframe
          className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
          loading="lazy"
          // Same-origin so the login cookie goes along; scripts stay off.
          sandbox="allow-same-origin"
          src={src}
          style={{
            height: PAGE_HEIGHT,
            transform: `scale(${scale})`,
            width: PAGE_WIDTH,
          }}
          tabIndex={-1}
          title="Template preview"
        />
      </div>
    </div>
  );
}
