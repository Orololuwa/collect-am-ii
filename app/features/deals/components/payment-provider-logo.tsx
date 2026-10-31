import type { DealPaymentProvider } from "../deal-payments.server";
import { cn } from "~/lib/utils";

/** Stripe's "S" mark (from Simple Icons, CC0) on its brand colour. */
function StripeMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-[5px] bg-[#635BFF]",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="size-3"
        fill="#fff"
        viewBox="0 0 24 24"
      >
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
      </svg>
    </span>
  );
}

/** Paystack's stacked-bars mark on its brand colour. */
function PaystackMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-5", className)}
      fill="#00C3F7"
      viewBox="0 0 20 20"
    >
      <rect height="3" rx="1.5" width="20" y="1" />
      <rect height="3" rx="1.5" width="17" y="6" />
      <rect height="3" rx="1.5" width="20" y="11" />
      <rect height="3" rx="1.5" width="12" y="16" />
    </svg>
  );
}

export function PaymentProviderLogo({
  provider,
  className,
}: {
  provider: DealPaymentProvider;
  className?: string;
}) {
  return provider === "stripe" ? (
    <StripeMark className={className} />
  ) : (
    <PaystackMark className={className} />
  );
}
