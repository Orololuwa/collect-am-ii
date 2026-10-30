import billing from "./billing";
import colorScheme from "./color-scheme";
import customers from "./customers";
import deals from "./deals";
import docs from "./docs";
import dragAndDrop from "./drag-and-drop";
import landing from "./landing";
import notifications from "./notifications";
import onboarding from "./onboarding";
import organizations from "./organizations";
import products from "./products";
import settings from "./settings";
import translation from "./translation";
import userAuthentication from "./user-authentication";
import workflows from "./workflows";

export default {
  billing,
  colorScheme,
  customers,
  deals,
  docs,
  dragAndDrop,
  landing,
  notifications,
  onboarding,
  organizations,
  products,
  settings,
  translation,
  userAuthentication,
  workflows,
} satisfies typeof import("../en/index").default;
