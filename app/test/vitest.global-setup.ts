import { config } from "dotenv";

import { ensureStripeProductsAndPricesExist } from "./test-utils";

// Load environment variables from .env file.
config();

export default function setupVitest() {
  void ensureStripeProductsAndPricesExist().catch((error) => {
    console.error("✨ Failed to seed Stripe pricing:", error);
    process.exit(1);
  });
}
