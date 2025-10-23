export type MAPPINGS = {
  [key: string]: {
    field: string | null;
    default: string | number | boolean | null;
  };
};

export const INVENTORY_ITEM_MAPPINGS: MAPPINGS = {
  externalid: {
    field: 'ProductCode',
    default: null,
  },
  name: {
    field: 'ProductCode',
    default: null,
  },
  displayname: {
    field: 'Name',
    default: null,
  },
  barcode: {
    field: 'String Barcode',
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
    field: 'LastSuppliedBy',
    default: null,
  },
  countryofmanufacture: {
    field: null,
    default: 'United States',
  },
  salesdescription: {
    field: 'Description',
    default: null,
  },
  weight: {
    field: 'Weight',
    default: null,
  },
  weightunit: {
    field: 'WeightUnits',
    default: null,
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

// get pricing from inventory list
// get components from assembly bom list

export const ASSEMBLY_ITEM_MAPPINGS: MAPPINGS = {
  externalid: {
    field: 'ProductSKU',
    default: null,
  },
  name: {
    field: 'ProductSKU',
    default: null,
  },
  displayname: {
    field: 'Name',
    default: null,
  },
  barcode: {
    field: 'String Barcode',
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
  purchasedescription: {
    field: null,
    default: '',
  },
  stockdescription: {
    field: null,
    default: '',
  },
  usebins: {
    field: null,
    default: true,
  },
  atpmethod: {
    field: null,
    default: 'Cumulative ATP with Look Ahead',
  },
  effectivebomcontrol: {
    field: null,
    default: 'Effective Date',
  },
  manufacturer: {
    field: 'LastSuppliedBy',
    default: null,
  },
  countryofmanufacture: {
    field: null,
    default: 'United States',
  },
  component: {
    field: 'ComponentSKU',
    default: null,
  },
  componentquantity: {
    field: 'Quantity',
    default: null,
  },
  component1item: {
    // components might just be dynamic based on file structure
    field: null,
    default: '',
  },
  component1quantity: {
    field: null,
    default: '',
  },
  component2item: {
    field: null,
    default: '',
  },
  component2quantity: {
    field: null,
    default: '',
  },
  description: {
    field: 'Description',
    default: null,
  },
  salesdescription: {
    field: 'Description',
    default: null,
  },
  weight: {
    field: 'Weight',
    default: null,
  },
  weightunit: {
    field: 'WeightUnits',
    default: null,
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
};

export const MATRIX_INVENTORY_ITEM_MAPPINGS: MAPPINGS = {
  externalid: {
    field: 'ProductCode',
    default: null,
  },
  name: {
    field: 'ProductCode',
    default: null,
  },
  displayname: {
    field: 'Name',
    default: null,
  },
  barcode: {
    field: 'Barcode',
    default: null,
  },
  subsidiary: {
    field: null,
    default: '1',
  },
  matrixtype: {
    field: null,
    default: '',
  },
  subitemof: {
    field: null,
    default: '',
  },
  itemoption: {
    field: null,
    default: '',
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
    field: 'LastSuppliedBy',
    default: null,
  },
  countryofmanufacture: {
    field: null,
    default: 'United States',
  },
  salesdescription: {
    field: 'Description',
    default: null,
  },
  weight: {
    field: 'Weight',
    default: null,
  },
  weightunit: {
    field: 'WeightUnits',
    default: null,
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
