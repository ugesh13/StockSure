/**
 * Formats a numeric value into Indian Rupees (₹) with proper Indian numbering system (e.g. ₹250, ₹1,500, ₹12,500).
 * Displays "N/A" if the value is missing or not available.
 */
export function formatINR(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
    return 'N/A';
  }
  const num = Number(value);
  return `₹${num.toLocaleString('en-IN')}`;
}
