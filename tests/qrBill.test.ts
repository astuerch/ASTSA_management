import { describe, it, expect } from 'vitest';
import { generateQRReference } from '@/lib/pdf/qrBill';
import { utils } from 'swissqrbill';

describe('qrBill.reference', () => {
  it('generates a 27-digit reference', () => {
    const ref = generateQRReference(1383, 1);
    expect(ref.length).toBe(27);
  });

  it('reference passes swissqrbill validation', () => {
    const ref = generateQRReference(1383, 1);
    expect(utils.isQRReferenceValid(ref)).toBe(true);
  });

  it('generates different refs for different sequences', () => {
    const ref1 = generateQRReference(1383, 1);
    const ref2 = generateQRReference(1383, 2);
    expect(ref1).not.toBe(ref2);
  });

  it('generates different refs for different clients', () => {
    const ref1 = generateQRReference(1383, 1);
    const ref2 = generateQRReference(9999, 1);
    expect(ref1).not.toBe(ref2);
  });

  it('checksum digit is correct (last digit is valid mod10)', () => {
    const ref = generateQRReference(1383, 5);
    const base = ref.slice(0, 26);
    const checksum = utils.calculateQRReferenceChecksum(base);
    expect(ref[26]).toBe(String(checksum));
  });

  it('reference starts with zeros (standard format)', () => {
    const ref = generateQRReference(1383, 1);
    // base26: 15 zeros + '001383' + '00001' = '00000000000000000138300001'
    expect(ref.startsWith('000000000000000001383')).toBe(true);
  });
});
