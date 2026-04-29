// Pure validators for the swatch request form. Framework-free so the
// Server Action and client form share identical rules — field names and
// error copy cannot drift.

export type SwatchItem = {
  _id: string;
  swatchName: string;
  colorFamily?: string;
  colorHex?: string;
  imageUrl?: string;
};

export type SwatchContactInfo = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
};

export type SwatchRequestData = {
  swatchIds: string[];
  contactInfo: SwatchContactInfo;
  productSlug?: string;
};

export type SwatchContactErrors = Partial<Record<keyof SwatchContactInfo, string>>;

export type SwatchRequestErrors = {
  swatchIds?: string;
  contact?: SwatchContactErrors;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP_RE = /^\d{5}$/;
const MAX_SWATCH_COUNT = 5;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function coerceSwatchContactInfo(
  obj: Record<string, unknown>,
): SwatchContactInfo {
  return {
    firstName: str(obj.firstName),
    lastName: str(obj.lastName),
    email: str(obj.email).toLowerCase(),
    phone: str(obj.phone) || undefined,
    address1: str(obj.address1),
    address2: str(obj.address2) || undefined,
    city: str(obj.city),
    state: str(obj.state),
    zip: str(obj.zip),
  };
}

export function validateSwatchContactInfo(
  c: SwatchContactInfo,
): SwatchContactErrors {
  const errors: SwatchContactErrors = {};

  if (!c.firstName) errors.firstName = "First name is required.";
  if (!c.lastName) errors.lastName = "Last name is required.";

  if (!c.email) errors.email = "Email address is required.";
  else if (!EMAIL_RE.test(c.email)) errors.email = "That email doesn't look right.";

  if (!c.address1) errors.address1 = "Street address is required.";
  if (!c.city) errors.city = "City is required.";
  if (!c.state) errors.state = "State is required.";
  if (!c.zip) errors.zip = "ZIP code is required.";
  else if (!ZIP_RE.test(c.zip)) errors.zip = "ZIP code must be 5 digits.";

  return errors;
}

export function validateSwatchIds(ids: string[]): string | null {
  if (!Array.isArray(ids) || ids.length === 0)
    return "Please select at least one swatch.";
  if (ids.length > MAX_SWATCH_COUNT)
    return `You may request up to ${MAX_SWATCH_COUNT} swatches at once.`;
  return null;
}

export function hasSwatchContactErrors(e: SwatchContactErrors): boolean {
  return Object.keys(e).length > 0;
}
