import { utils, SVG } from 'swissqrbill';
import type { Data } from 'swissqrbill/types';
import { company } from '@/lib/company';

export interface QRBillInput {
  /** Amount in Swiss centimes (will be converted to CHF for the QR bill) */
  amountCents: number;
  currency?: string;
  debtorName?: string;
  debtorAddress?: string;
  debtorZip?: string;
  debtorCity?: string;
  debtorCountry?: string;
  clientId: number;
  /** Sequence number used to build the unique QR reference */
  sequence: number;
}

/**
 * Generates a 27-digit QR reference from clientId and a sequence number.
 * Format: 15 zeros + 6-digit clientId + 5-digit sequence + 1 checksum = 27 total
 */
export function generateQRReference(clientId: number, sequence: number): string {
  const clientPart = String(clientId).padStart(6, '0');
  const seqPart = String(sequence).padStart(5, '0');
  const base26 = `000000000000000${clientPart}${seqPart}`;
  const checksum = utils.calculateQRReferenceChecksum(base26);
  return base26 + checksum;
}

/**
 * Returns the SVG string of the QR-bill.
 */
export function generateQRBillSvg(input: QRBillInput): string {
  const reference = generateQRReference(input.clientId, input.sequence);
  const amountChf = input.amountCents / 100;

  const [zip, ...cityParts] = company.city.split(' ');

  const data: Data = {
    currency: (input.currency as 'CHF' | 'EUR') ?? 'CHF',
    amount: amountChf,
    creditor: {
      name: company.name,
      address: company.address,
      zip: zip ?? '6807',
      city: cityParts.join(' ') || 'Taverne',
      country: 'CH',
      account: company.ibanRaw,
    },
    reference,
    ...(input.debtorName
      ? {
          debtor: {
            name: input.debtorName,
            address: input.debtorAddress ?? '',
            zip: input.debtorZip ?? '0000',
            city: input.debtorCity ?? '',
            country: input.debtorCountry ?? 'CH',
          },
        }
      : {}),
  };

  const svg = new SVG(data);
  return svg.toString();
}
