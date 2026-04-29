import type { VatCode } from '@prisma/client';

/** Swiss rounding: nearest 5 centimes */
export function roundSwiss(cents: number): number {
  return Math.round(cents / 5) * 5;
}

export function getVatRate(vatCode: VatCode): number {
  switch (vatCode) {
    case 'STANDARD':
      return 0.081;
    case 'RIDOTTA':
      return 0.026;
    case 'ALLOGGIO':
      return 0.038;
    case 'ESENTE':
      return 0;
  }
}

export interface LineAmounts {
  netAmountCents: number;
  vatAmountCents: number;
  totalAmountCents: number;
}

/**
 * Calculates line amounts with Swiss rounding.
 * @param quantity    - decimal quantity
 * @param unitPriceCents - unit price in centimes
 * @param discountCents  - discount in centimes (applied to gross before VAT)
 * @param vatCode        - VAT code
 */
export function calculateLineAmounts(
  quantity: number,
  unitPriceCents: number,
  discountCents: number,
  vatCode: VatCode,
): LineAmounts {
  const grossCents = Math.round(quantity * unitPriceCents);
  const netAmountCents = roundSwiss(grossCents - discountCents);
  const vatRate = getVatRate(vatCode);
  const vatAmountCents = roundSwiss(netAmountCents * vatRate);
  const totalAmountCents = netAmountCents + vatAmountCents;
  return { netAmountCents, vatAmountCents, totalAmountCents };
}
