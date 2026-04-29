export const company = {
  name: process.env.COMPANY_NAME ?? 'Active Services Team SA',
  address: process.env.COMPANY_ADDRESS ?? 'Via Al Dosso 11',
  city: process.env.COMPANY_CITY ?? '6807 Taverne',
  website: process.env.COMPANY_WEBSITE ?? 'www.astsa.ch',
  email: process.env.COMPANY_EMAIL ?? 'info@astsa.ch',
  vatNumber: process.env.COMPANY_VAT ?? 'CHE-114.327.152 IVA',
  iban: process.env.COMPANY_IBAN ?? 'CH84 3000 0001 6577 0392 4',
  ibanRaw: process.env.COMPANY_IBAN_RAW ?? 'CH8430000001657703924',
};
