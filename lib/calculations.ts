import { ParsedReceipt, CustomItem, PersonTotal, Session, SessionClaims } from '@/types/receipt';

interface CalculationInput {
  receipt: ParsedReceipt;
  customItems: CustomItem[];
  priceOverrides: Record<number, number>;
  quantityOverrides: Record<number, number>;
}

// Get effective price for an item (with override)
export function getItemPrice(
  receipt: ParsedReceipt,
  priceOverrides: Record<number, number>,
  index: number
): number {
  if (priceOverrides[index] !== undefined) {
    return priceOverrides[index];
  }
  return receipt.items[index]?.price || 0;
}

// Get effective quantity for an item (with override)
export function getItemQuantity(
  receipt: ParsedReceipt,
  quantityOverrides: Record<number, number>,
  index: number
): number {
  if (quantityOverrides[index] !== undefined) {
    return quantityOverrides[index];
  }
  return receipt.items[index]?.quantity || 1;
}

// Calculate split from session claims (used by session API)
export function calculateSplitFromClaims(session: Session): PersonTotal[] {
  const { receipt, customItems, priceOverrides, quantityOverrides, claims } = session;

  const subtotal = receipt.subtotal || 0;
  const taxRate = subtotal > 0 && receipt.tax != null ? receipt.tax / subtotal : 0;
  const tipRate = subtotal > 0 && receipt.tip != null ? receipt.tip / subtotal : 0;

  // Aggregate each person's subtotal
  const personSubtotals: Record<string, number> = {};

  // Process parsed items
  receipt.items.forEach((_, index) => {
    const itemKey = String(index);
    const itemClaims = claims[itemKey] || [];
    const itemPrice = getItemPrice(receipt, priceOverrides, index);
    const itemQty = getItemQuantity(receipt, quantityOverrides, index);
    const pricePerUnit = itemQty > 0 ? itemPrice / itemQty : 0;

    itemClaims.forEach((claim) => {
      const name = claim.personName.trim();
      if (!name) return;

      const amount = pricePerUnit * claim.quantity;
      personSubtotals[name] = (personSubtotals[name] || 0) + amount;
    });
  });

  // Process custom items
  customItems.forEach((item) => {
    const itemKey = `custom_${item.id}`;
    const itemClaims = claims[itemKey] || [];
    const pricePerUnit = item.quantity > 0 ? item.price / item.quantity : 0;

    itemClaims.forEach((claim) => {
      const name = claim.personName.trim();
      if (!name) return;

      const amount = pricePerUnit * claim.quantity;
      personSubtotals[name] = (personSubtotals[name] || 0) + amount;
    });
  });

  // Calculate tax, tip, and total for each person
  const totals: PersonTotal[] = Object.entries(personSubtotals)
    .map(([name, personSubtotal]) => ({
      name,
      subtotal: personSubtotal,
      tax: personSubtotal * taxRate,
      tip: personSubtotal * tipRate,
      total: personSubtotal + personSubtotal * taxRate + personSubtotal * tipRate,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return totals;
}

// Calculate items total (for validation)
export function calculateItemsTotal(input: CalculationInput): number {
  const { receipt, customItems, priceOverrides } = input;

  const parsedItemsTotal = receipt.items.reduce(
    (sum, _, index) => sum + getItemPrice(receipt, priceOverrides, index),
    0
  );

  const customItemsTotal = customItems.reduce(
    (sum, item) => sum + item.price,
    0
  );

  return parsedItemsTotal + customItemsTotal;
}

// Check if items total matches subtotal
export function checkItemsTotalMismatch(input: CalculationInput): boolean {
  const { receipt } = input;
  const itemsTotal = calculateItemsTotal(input);

  return receipt.subtotal != null
    ? Math.abs(itemsTotal - receipt.subtotal) > 0.01
    : false;
}