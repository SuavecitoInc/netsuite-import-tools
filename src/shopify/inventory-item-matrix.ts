import {
  initializeCSV,
  parseCSV,
  barcodeStringToNumber,
  handleToTitleCase,
  createProgressLogger,
} from '../lib/utils';

import { INVENTORY_ITEM_MAPPINGS } from '../lib/configs/shopify';
import type { ShopifyItemRow } from '../lib/types/shopify';
import {
  getHandlesWithMultipleVariants,
  getDescriptionByHandle,
  getNameByHandle,
} from './helpers';

const DEFAULT_INPUT_FILENAME = 'GUNTHERS_PRODUCT_EXPORT'; // SHOPIFY-ITEMS-EXPORT

// local script constants
const DEBUG = false;
const PRODUCT_CODE = 'Variant SKU';
const FAMILY_SKU = 'Handle';

const formatDurationMs = (durationMs: number): string =>
  `${(durationMs / 1000).toFixed(2)}s`;

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
  description: string;
  salesdescription: string;
  weight: string;
  weightunit: string;
  salesprice: string;
  pricelevel1: string | number | boolean | null;
  pricelevel1price: string;
  pricelevel1currency: string | number | boolean | null;
  // pricelevel2: string | number | boolean | null;
  // pricelevel2price: string;
  // pricelevel2currency: string | number | boolean | null;
  istaxable: string | number | boolean | null;
  taxschedule: string | number | boolean | null;
}

// Helper functions
function groupByFamily(
  items: ShopifyItemRow[],
): Record<string, ShopifyItemRow[]> {
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
    {} as Record<string, ShopifyItemRow[]>,
  );
}

function getBaseItemProperties(item: ShopifyItemRow) {
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
  defaultItem: ShopifyItemRow,
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
    description: defaultItem[INVENTORY_ITEM_MAPPINGS.description.field],
    salesdescription: familySKU,
    weight: '',
    weightunit: '',
    salesprice: '',
    pricelevel1: '',
    pricelevel1price: '',
    pricelevel1currency: '',
    // pricelevel2: '',
    // pricelevel2price: '',
    // pricelevel2currency: '',
  };
}

function createChildItem(
  rows: ShopifyItemRow[],
  item: ShopifyItemRow,
  familySKU: string,
): NetSuiteMatrixItem {
  const externalId = item[INVENTORY_ITEM_MAPPINGS.externalid.field];

  // get description by handle if it does not already exist
  const itemDescription = item[INVENTORY_ITEM_MAPPINGS.description.field];
  let descriptionHtml = itemDescription;
  if (!itemDescription || itemDescription === '') {
    const descriptionFromHandle = getDescriptionByHandle(
      item.Handle,
      rows,
      DEBUG,
    );
    if (descriptionFromHandle) {
      descriptionHtml = descriptionFromHandle;
    } else {
      descriptionHtml = item[INVENTORY_ITEM_MAPPINGS.displayname.field];
    }
  }
  // get name by handle if it does not already exist
  const itemName = item[INVENTORY_ITEM_MAPPINGS.displayname.field];
  let name = itemName;
  if (!itemName || itemName === '') {
    const nameFromHandle = getNameByHandle(
      item.Handle,
      item['Option1 Value'],
      rows,
      DEBUG,
    );
    if (nameFromHandle) {
      name = nameFromHandle;
    } else {
      name = item[INVENTORY_ITEM_MAPPINGS.displayname.field];
    }
  }

  return {
    externalid: externalId,
    name: item[INVENTORY_ITEM_MAPPINGS.name.field],
    displayname: name,
    barcode: barcodeStringToNumber(item[INVENTORY_ITEM_MAPPINGS.barcode.field]),
    size: item['ProductFamilyOption1Value'],
    matrixtype: 'Child Matrix Item',
    subitemof: familySKU,
    ...getBaseItemProperties(item),
    description: descriptionHtml,
    salesdescription: name,
    weight: item[INVENTORY_ITEM_MAPPINGS.weight.field],
    weightunit: item[INVENTORY_ITEM_MAPPINGS.weightunit.field],
    salesprice: item[INVENTORY_ITEM_MAPPINGS.salesprice.field],
    pricelevel1: INVENTORY_ITEM_MAPPINGS.pricelevel1.default,
    pricelevel1price: item[INVENTORY_ITEM_MAPPINGS.pricelevel1price.field],
    pricelevel1currency: INVENTORY_ITEM_MAPPINGS.pricelevel1currency.default,
    // pricelevel2: INVENTORY_ITEM_MAPPINGS.pricelevel2.default,
    // pricelevel2price: item[INVENTORY_ITEM_MAPPINGS.pricelevel2price.field],
    // pricelevel2currency: INVENTORY_ITEM_MAPPINGS.pricelevel2currency.default,
  };
}

function generateNetSuiteItems(
  matrixItems: Record<string, ShopifyItemRow[]>,
  onFamilyProcessed?: (processedCount: number) => void,
): NetSuiteMatrixItem[] {
  return Object.entries(matrixItems).flatMap(
    ([familySKU, childItems], familyIndex) => {
      onFamilyProcessed?.(familyIndex + 1);

      if (!childItems.length) {
        console.warn(`Family ${familySKU} has no items, skipping`);
        return [];
      }

      const parentItem = createParentItem(familySKU, childItems[0]);
      const childImportItems = childItems.map((item) =>
        createChildItem(childItems, item, familySKU),
      );

      return [parentItem, ...childImportItems];
    },
  );
}

async function main() {
  try {
    const runStartedAt = Date.now();

    const inputFilenameArg = process.argv[2]?.trim();
    const inputFilename =
      inputFilenameArg && inputFilenameArg !== ''
        ? inputFilenameArg.replace(/\.csv$/i, '')
        : DEFAULT_INPUT_FILENAME;

    console.log('Using input file:', `${inputFilename}.csv`);

    const inventoryItemFilePath = `input/${inputFilename}`;
    const inventoryItemRows = await parseCSV<ShopifyItemRow>(
      inventoryItemFilePath,
      {
        showProgress: true,
        progressLabel: 'Shopify CSV Load',
        progressIntervalPercent: 10,
      },
    );
    const csvLoadedAt = Date.now();
    console.log('Getting Matrix Items...');
    console.log('Building variant handle index...');

    // get items that have more than 1 variant (i.e. multiple rows with the same handle) to exclude items with only 1 variant since those should be imported as inventory items instead of matrix items
    const itemHandlesWithMultipleVariants =
      getHandlesWithMultipleVariants(inventoryItemRows);
    const multiVariantHandleSet = new Set(itemHandlesWithMultipleVariants);
    const indexingDoneAt = Date.now();

    const filteredInventoryItemRows = inventoryItemRows.filter((item) =>
      multiVariantHandleSet.has(item.Handle),
    );
    const filteringDoneAt = Date.now();

    console.log(
      'There are',
      filteredInventoryItemRows.length,
      'matrix inventory item rows.',
    );

    const matrixItems = groupByFamily(filteredInventoryItemRows);
    const familyCount = Object.keys(matrixItems).length;
    const groupingDoneAt = Date.now();

    console.log('There are', familyCount, 'families');

    const logFamilyProgress = createProgressLogger(
      familyCount,
      'Shopify Matrix Family Conversion',
      100,
    );

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

    const netSuiteImportItems = generateNetSuiteItems(
      matrixItems,
      logFamilyProgress,
    );
    const transformDoneAt = Date.now();

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

    const outputFilename = 'Shopify_to_NetSuite_Inventory_Items_Matrix';

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
      { id: 'description', title: 'description' },
      { id: 'salesdescription', title: 'salesdescription' },
      { id: 'weight', title: 'weight' },
      { id: 'weightunit', title: 'weightunit' },
      { id: 'salesprice', title: 'salesprice' },
      { id: 'pricelevel1', title: 'pricelevel1' },
      { id: 'pricelevel1price', title: 'pricelevel1price' },
      { id: 'pricelevel1currency', title: 'pricelevel1currency' },
      // { id: 'pricelevel2', title: 'pricelevel2' },
      // { id: 'pricelevel2price', title: 'pricelevel2price' },
      // { id: 'pricelevel2currency', title: 'pricelevel2currency' },
      { id: 'istaxable', title: 'istaxable' },
      { id: 'taxschedule', title: 'taxschedule' },
    ];

    const csvWriter = initializeCSV(outputFilename, headers);
    const writeStartedAt = Date.now();
    await csvWriter.writeRecords(netSuiteImportItems);
    const completedAt = Date.now();
    console.log('NetSuite inventory items CSV written to', outputFilename);

    console.log('Timing Summary:');
    console.log('- CSV load:', formatDurationMs(csvLoadedAt - runStartedAt));
    console.log(
      '- Variant index:',
      formatDurationMs(indexingDoneAt - csvLoadedAt),
    );
    console.log(
      '- Filtering:',
      formatDurationMs(filteringDoneAt - indexingDoneAt),
    );
    console.log(
      '- Group by family:',
      formatDurationMs(groupingDoneAt - filteringDoneAt),
    );
    console.log(
      '- Transform:',
      formatDurationMs(transformDoneAt - groupingDoneAt),
    );
    console.log('- CSV write:', formatDurationMs(completedAt - writeStartedAt));
    console.log('- Total:', formatDurationMs(completedAt - runStartedAt));
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
