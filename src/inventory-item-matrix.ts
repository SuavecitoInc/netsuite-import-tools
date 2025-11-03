import {
  initializeCSV,
  parseCSV,
  barcodeStringToNumber,
  handleToTitleCase,
} from './lib/utils';

import { INVENTORY_ITEM_MAPPINGS } from './lib/configs/dear';
import type { DearInventoryItemRow } from './lib/types/dear';

// local script constants
const DEBUG = false;
const PRODUCT_CODE = 'ProductCode';
const FAMILY_SKU = 'ProductFamilySKU';

// Types
interface NetSuiteMatrixItem {
  externalid: string;
  name: string;
  displayname: string;
  barcode: string | number;
  size: string;
  matrixtype: 'Parent Matrix Item' | 'Child Matrix Item';
  subitemof: string;
  subsidiary: string | number | boolean | null;
  class: string | number | boolean | null;
  costingmethod: string | number | boolean | null;
  usebins: string | number | boolean | null;
  atpmethod: string | number | boolean | null;
  manufacturer: string;
  countryofmanufacture: string | number | boolean | null;
  salesdescription: string;
  weight: string;
  weightunit: string;
  salesprice: string;
  pricelevel1: string | number | boolean | null;
  pricelevel1price: string;
  pricelevel1currency: string | number | boolean | null;
  pricelevel2: string | number | boolean | null;
  pricelevel2price: string;
  pricelevel2currency: string | number | boolean | null;
  istaxable: string | number | boolean | null;
  taxschedule: string | number | boolean | null;
}

// Helper functions
function groupByFamily(
  items: DearInventoryItemRow[],
): Record<string, DearInventoryItemRow[]> {
  return items.reduce(
    (acc, item) => {
      const familySKU = item[FAMILY_SKU];
      if (!familySKU) {
        console.warn(`Item ${item[PRODUCT_CODE]} has no family SKU, skipping`);
        return acc;
      }
      if (!acc[familySKU]) {
        acc[familySKU] = [];
      }
      acc[familySKU].push(item);
      return acc;
    },
    {} as Record<string, DearInventoryItemRow[]>,
  );
}

function getBaseItemProperties(item: DearInventoryItemRow) {
  return {
    subsidiary: INVENTORY_ITEM_MAPPINGS.subsidiary.default,
    class: INVENTORY_ITEM_MAPPINGS.class.default,
    costingmethod: INVENTORY_ITEM_MAPPINGS.costingmethod.default,
    usebins: INVENTORY_ITEM_MAPPINGS.usebins.default,
    atpmethod: INVENTORY_ITEM_MAPPINGS.atpmethod.default,
    countryofmanufacture: INVENTORY_ITEM_MAPPINGS.countryofmanufacture.default,
    istaxable: INVENTORY_ITEM_MAPPINGS.istaxable.default,
    taxschedule: INVENTORY_ITEM_MAPPINGS.taxschedule.default,
    manufacturer: item[INVENTORY_ITEM_MAPPINGS.manufacturer.field],
  };
}

function createParentItem(
  familySKU: string,
  defaultItem: DearInventoryItemRow,
): NetSuiteMatrixItem {
  return {
    externalid: familySKU,
    name: familySKU,
    displayname: handleToTitleCase(familySKU),
    barcode: '',
    size: '',
    matrixtype: 'Parent Matrix Item',
    subitemof: '',
    ...getBaseItemProperties(defaultItem),
    salesdescription: familySKU,
    weight: '',
    weightunit: '',
    salesprice: '',
    pricelevel1: '',
    pricelevel1price: '',
    pricelevel1currency: '',
    pricelevel2: '',
    pricelevel2price: '',
    pricelevel2currency: '',
  };
}

function createChildItem(
  item: DearInventoryItemRow,
  familySKU: string,
): NetSuiteMatrixItem {
  return {
    externalid: item[INVENTORY_ITEM_MAPPINGS.externalid.field],
    name: item[INVENTORY_ITEM_MAPPINGS.name.field],
    displayname: item[INVENTORY_ITEM_MAPPINGS.displayname.field],
    barcode: barcodeStringToNumber(item[INVENTORY_ITEM_MAPPINGS.barcode.field]),
    size: item['ProductFamilyOption1Value'],
    matrixtype: 'Child Matrix Item',
    subitemof: familySKU,
    ...getBaseItemProperties(item),
    salesdescription: item[INVENTORY_ITEM_MAPPINGS.salesdescription.field],
    weight: item[INVENTORY_ITEM_MAPPINGS.weight.field],
    weightunit: item[INVENTORY_ITEM_MAPPINGS.weightunit.field],
    salesprice: item[INVENTORY_ITEM_MAPPINGS.salesprice.field],
    pricelevel1: INVENTORY_ITEM_MAPPINGS.pricelevel1.default,
    pricelevel1price: item[INVENTORY_ITEM_MAPPINGS.pricelevel1price.field],
    pricelevel1currency: INVENTORY_ITEM_MAPPINGS.pricelevel1currency.default,
    pricelevel2: INVENTORY_ITEM_MAPPINGS.pricelevel2.default,
    pricelevel2price: item[INVENTORY_ITEM_MAPPINGS.pricelevel2price.field],
    pricelevel2currency: INVENTORY_ITEM_MAPPINGS.pricelevel2currency.default,
  };
}

function generateNetSuiteItems(
  matrixItems: Record<string, DearInventoryItemRow[]>,
): NetSuiteMatrixItem[] {
  return Object.entries(matrixItems).flatMap(([familySKU, childItems]) => {
    if (!childItems.length) {
      console.warn(`Family ${familySKU} has no items, skipping`);
      return [];
    }

    const parentItem = createParentItem(familySKU, childItems[0]);
    const childImportItems = childItems.map((item) =>
      createChildItem(item, familySKU),
    );

    return [parentItem, ...childImportItems];
  });
}

async function main() {
  try {
    console.log('Getting Matrix Items...');

    const inventoryItemFilePath = 'input/Inventory_Matrix_List';
    const inventoryItemRows = await parseCSV<DearInventoryItemRow>(
      inventoryItemFilePath,
    );

    console.log(
      'There are',
      inventoryItemRows.length,
      'matrix inventory item rows.',
    );

    const matrixItems = groupByFamily(inventoryItemRows);
    const familyCount = Object.keys(matrixItems).length;

    console.log('There are', familyCount, 'families');

    if (DEBUG) {
      Object.entries(matrixItems).forEach(([family, items]) => {
        console.log(
          'Family SKU:',
          family,
          'has items:',
          JSON.stringify(
            items.map((item) => item[PRODUCT_CODE]),
            null,
            2,
          ),
        );
      });
    }

    const netSuiteImportItems = generateNetSuiteItems(matrixItems);

    console.log(
      'Generated',
      netSuiteImportItems.length,
      'NetSuite inventory items for import.',
    );

    if (DEBUG) {
      netSuiteImportItems.forEach((item) => {
        console.log('Import Item:', JSON.stringify(item, null, 2));
      });
    }

    const outputFilename = 'NetSuite_Inventory_Items_Matrix';

    const headers = [
      { id: 'externalid', title: 'externalid' },
      { id: 'name', title: 'name' },
      { id: 'displayname', title: 'displayname' },
      { id: 'barcode', title: 'barcode' },
      { id: 'size', title: 'size' },
      { id: 'matrixtype', title: 'matrixtype' },
      { id: 'subitemof', title: 'subitemof' },
      { id: 'subsidiary', title: 'subsidiary' },
      { id: 'class', title: 'class' },
      { id: 'costingmethod', title: 'costingmethod' },
      { id: 'usebins', title: 'usebins' },
      { id: 'atpmethod', title: 'atpmethod' },
      { id: 'manufacturer', title: 'manufacturer' },
      { id: 'countryofmanufacture', title: 'countryofmanufacture' },
      { id: 'salesdescription', title: 'salesdescription' },
      { id: 'weight', title: 'weight' },
      { id: 'weightunit', title: 'weightunit' },
      { id: 'salesprice', title: 'salesprice' },
      { id: 'pricelevel1', title: 'pricelevel1' },
      { id: 'pricelevel1price', title: 'pricelevel1price' },
      { id: 'pricelevel1currency', title: 'pricelevel1currency' },
      { id: 'pricelevel2', title: 'pricelevel2' },
      { id: 'pricelevel2price', title: 'pricelevel2price' },
      { id: 'pricelevel2currency', title: 'pricelevel2currency' },
      { id: 'istaxable', title: 'istaxable' },
      { id: 'taxschedule', title: 'taxschedule' },
    ];

    const csvWriter = initializeCSV(outputFilename, headers);
    await csvWriter.writeRecords(netSuiteImportItems);
    console.log('NetSuite inventory items CSV written to', outputFilename);
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
