import { faker } from "@faker-js/faker";
import { createId } from "@paralleldrive/cuid2";

import type { Customer } from "~/generated/client";
import type { Factory } from "~/utils/types";

/**
 * Creates a customer with populated values.
 *
 * @param customerParams - Customer params to create the customer with.
 * @returns A populated customer with given params.
 */
export const createPopulatedCustomer: Factory<Customer> = ({
  id = createId(),
  organizationId = createId(),
  updatedAt = faker.date.recent({ days: 10 }),
  createdAt = faker.date.past({ refDate: updatedAt, years: 1 }),
  name = faker.person.fullName(),
  email = faker.internet.email().toLowerCase(),
  phone = faker.phone.number(),
  companyName = faker.company.name(),
  billingAddress = faker.location.streetAddress({ useFullAddress: true }),
  shippingAddress = "",
  notes = "",
  archivedAt = null,
} = {}) => ({
  archivedAt,
  billingAddress,
  companyName,
  createdAt,
  email,
  id,
  name,
  notes,
  organizationId,
  phone,
  shippingAddress,
  updatedAt,
});
