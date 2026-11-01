import { Trans, useTranslation } from "react-i18next";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

type FAQItem = {
  question: string;
  answer: string;
  links?: Record<string, string>;
};

export function FAQ() {
  const { t } = useTranslation("landing", { keyPrefix: "faq" });
  const items = t("items", { returnObjects: true }) as FAQItem[];

  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="container mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_2fr]">
        <h2 className="text-3xl font-semibold tracking-tight">{t("title")}</h2>

        <Accordion collapsible type="single">
          {items.map((item, index) => (
            <AccordionItem key={item.question} value={`item-${index}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>

              <AccordionContent className="text-muted-foreground">
                {item.links ? (
                  <Trans
                    components={Object.fromEntries(
                      Object.entries(item.links).map(([_key, href], index_) => [
                        index_ + 1,
                        // biome-ignore lint/a11y/useAnchorContent: the trans component adds the anchor content
                        <a
                          className={cn(
                            buttonVariants({ variant: "link" }),
                            "px-1 py-0",
                          )}
                          href={href}
                          key={href}
                        />,
                      ]),
                    )}
                    // @ts-expect-error - dynamic key based on index
                    i18nKey={`faq.items.${index}.answer`}
                    ns="landing"
                  />
                ) : (
                  item.answer
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
