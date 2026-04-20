export type MAPPINGS = {
  [key: string]: {
    field: string | null;
    default: string | number | boolean | null;
  };
};

export const PRIMARY_KEY = {
  shopify: 'Variant SKU',
  netsuite: 'Item SKU',
};

/*
 * Required Fields:
 * External ID
 * Display Name
 * Brand
 * Item name / Number (SKU)
 * UPC Code
 * Description
 * Subsidiary
 * Class
 * Tax Schedule
 * Item Weight
 * Weight Unit
 * Price: Currency
 * Price: Level
 * Price: Amount
 * Use Bins
 * Manufacturer Country
 */

// Add more as necessary Look at the Shopify types for reference
export const SHOPIFY_FIELDS = {
  Name: 'Title',
  Brand: 'Vendor',
  Sku: 'Variant SKU',
  Weight: 'Variant Grams', // default to grams
  Price: 'Variant Price',
  Barcode: 'Variant Barcode',
  Description: 'Body (HTML)',
};

export const NETSUITE_FIELDS = {
  ExternalId: 'External ID',
  Name: 'Display Name',
  Brand: 'Brand',
  Sku: 'Item SKU',
  Weight: 'Weight',
  Price: 'Price',
  Barcode: 'Upc Code',
  Description: 'Description',
};

export const INVENTORY_ITEM_MAPPINGS: MAPPINGS = {
  externalid: {
    field: SHOPIFY_FIELDS.Sku,
    default: null,
  },
  name: {
    field: SHOPIFY_FIELDS.Sku,
    default: null,
  },
  displayname: {
    field: SHOPIFY_FIELDS.Name,
    default: null,
  },
  barcode: {
    field: SHOPIFY_FIELDS.Barcode,
    default: null,
  },
  subsidiary: {
    field: null,
    default: '1',
  },
  class: {
    field: null,
    default: '53',
  },
  costingmethod: {
    field: null,
    default: 'FIFO',
  },
  usebins: {
    field: null,
    default: true,
  },
  atpmethod: {
    field: null,
    default: 'Cumulative ATP with Look Ahead',
  },
  manufacturer: {
    field: SHOPIFY_FIELDS.Brand,
    default: null,
  },
  countryofmanufacture: {
    field: null,
    default: 'United States',
  },
  description: {
    field: SHOPIFY_FIELDS.Description,
    default: null,
  },
  weight: {
    field: SHOPIFY_FIELDS.Weight,
    default: null,
  },
  weightunit: {
    field: 'WeightUnits',
    default: 'GRAMS',
  },
  salesprice: {
    field: 'PriceTier1',
    default: null,
  },
  pricelevel1: {
    field: null,
    default: 'Retail',
  },
  pricelevel1price: {
    field: 'PriceTier1',
    default: null,
  },
  pricelevel1currency: {
    field: null,
    default: 'USD',
  },
  pricelevel2: {
    field: null,
    default: 'Wholesale',
  },
  pricelevel2price: {
    field: 'PriceTier2',
    default: null,
  },
  pricelevel2currency: {
    field: null,
    default: 'USD',
  },
  istaxable: {
    field: null,
    default: true,
  },
  taxschedule: {
    field: null,
    default: 'Taxable',
  },
  purchasetaxcode: {
    field: null,
    default: 'Taxable',
  },
};
