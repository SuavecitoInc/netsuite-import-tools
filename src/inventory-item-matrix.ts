import {
  initializeCSV,
  parseCSV,
  barcodeStringToNumber,
  handleToTitleCase,
} from './lib/utils';

import { INVENTORY_ITEM_MAPPINGS } from './lib/configs/dear';
import type { DearInventoryItemRow } from './lib/types/dear';

// TODO:
// generate object for families with key being the family name, then array of items in that family

// local script constants
const DEBUG = true;
const PRODUCT_CODE = 'ProductCode'; // dear sku field - from inventory list
const PRODUCT_SKU = 'ProductSKU'; // dear sku field - from assembly bom list
const COMPONENT_SKU = 'ComponentSKU'; // dear sku field - component sku from assembly bom list
const VARIANT_SKU = 'Variant SKU'; // shopify sku field
const FAMILY_SKU = 'ProductFamilySKU'; // dear sku field - family sku

async function main() {
  try {
    console.log('Getting Matrix Items...');

    // Further processing to generate inventory item import list would go here
    const inventoryItemFilePath = 'input/Inventory_Matrix_List';
    const inventoryItemRows = await parseCSV<DearInventoryItemRow>(
      inventoryItemFilePath,
    );

    console.log(
      'There are',
      inventoryItemRows.length,
      'matrix inventory item rows.',
    );

    // log all skus of filtered inventory items
    // console.log('Filtered Inventory Item SKUs:');
    // for (const item of inventoryItemRows) {
    //   console.log(item[PRODUCT_CODE]);
    // }

    // create matrix / family object for use later
    const matrixItems: { [family: string]: DearInventoryItemRow[] } = {};
    for (const item of inventoryItemRows) {
      const familySKU = item[FAMILY_SKU];
      if (!matrixItems[familySKU]) {
        matrixItems[familySKU] = [];
      }
      matrixItems[familySKU].push(item);
    }

    // log all families
    if (DEBUG) {
      console.log('There are ', Object.keys(matrixItems).length, 'families:');
      for (const family in matrixItems) {
        console.log(
          'Family SKU:',
          family,
          'has items:',
          JSON.stringify(
            matrixItems[family].map((item) => item[PRODUCT_CODE]),
            null,
            2,
          ),
        );
      }
    }

    // create NetSuite import items from matrix items
    const netSuiteImportItems = [];

    Object.keys(matrixItems).forEach((familySKU) => {
      const childItems = matrixItems[familySKU];
      const defaultItem = childItems[0];
      const parentItem = {
        externalid: familySKU,
        name: familySKU,
        displayName: handleToTitleCase(familySKU), // fix this to convert to proper name later
        barcode: '', // no barcode for family item
        size: '', // no size for family item
        matrixtype: 'Parent Matrix Item',
        subitemof: '', // no parent for family item
        subsidiary: INVENTORY_ITEM_MAPPINGS.subsidiary.default,
        class: INVENTORY_ITEM_MAPPINGS.class.default,
        costingmethod: INVENTORY_ITEM_MAPPINGS.costingmethod.default,
        usebins: INVENTORY_ITEM_MAPPINGS.usebins.default,
        atpmethod: INVENTORY_ITEM_MAPPINGS.atpmethod.default,
        manufacturer: defaultItem[INVENTORY_ITEM_MAPPINGS.manufacturer.field],
        countryofmanufacture:
          INVENTORY_ITEM_MAPPINGS.countryofmanufacture.default,
        salesdescription: familySKU, // fix this to convert to proper name later
        weight: '',
        weightunit: '',
        salesprice: '',
        pricelevel1: '',
        pricelevel1price: '',
        pricelevel1currency: '',
        pricelevel2: '',
        pricelevel2price: '',
        pricelevel2currency: '',
        istaxable: INVENTORY_ITEM_MAPPINGS.istaxable.default,
        taxschedule: INVENTORY_ITEM_MAPPINGS.taxschedule.default,
      };
      // add parent item to netsuite import items
      netSuiteImportItems.push(parentItem);

      // add child items to netsuite import items
      childItems.forEach((item) => {
        const childImportItem = {
          externalid: item[INVENTORY_ITEM_MAPPINGS.externalid.field],
          name: item[INVENTORY_ITEM_MAPPINGS.name.field],
          displayname: item[INVENTORY_ITEM_MAPPINGS.displayname.field],
          barcode: barcodeStringToNumber(
            item[INVENTORY_ITEM_MAPPINGS.barcode.field],
          ),
          size: item['ProductFamilyOption1Value'],
          matrixtype: 'Child Matrix Item',
          subitemof: familySKU,
          subsidiary: INVENTORY_ITEM_MAPPINGS.subsidiary.default,
          class: INVENTORY_ITEM_MAPPINGS.class.default,
          costingmethod: INVENTORY_ITEM_MAPPINGS.costingmethod.default,
          usebins: INVENTORY_ITEM_MAPPINGS.usebins.default,
          atpmethod: INVENTORY_ITEM_MAPPINGS.atpmethod.default,
          manufacturer: item[INVENTORY_ITEM_MAPPINGS.manufacturer.field],
          countryofmanufacture:
            INVENTORY_ITEM_MAPPINGS.countryofmanufacture.default,
          salesdescription:
            item[INVENTORY_ITEM_MAPPINGS.salesdescription.field],
          weight: item[INVENTORY_ITEM_MAPPINGS.weight.field],
          weightunit: item[INVENTORY_ITEM_MAPPINGS.weightunit.field],
          salesprice: item[INVENTORY_ITEM_MAPPINGS.salesprice.field],
          pricelevel1: INVENTORY_ITEM_MAPPINGS.pricelevel1.default,
          pricelevel1price:
            item[INVENTORY_ITEM_MAPPINGS.pricelevel1price.field],
          pricelevel1currency:
            INVENTORY_ITEM_MAPPINGS.pricelevel1currency.default,
          pricelevel2: INVENTORY_ITEM_MAPPINGS.pricelevel2.default,
          pricelevel2price:
            item[INVENTORY_ITEM_MAPPINGS.pricelevel2price.field],
          pricelevel2currency:
            INVENTORY_ITEM_MAPPINGS.pricelevel2currency.default,
          istaxable: INVENTORY_ITEM_MAPPINGS.istaxable.default,
          taxschedule: INVENTORY_ITEM_MAPPINGS.taxschedule.default,
        };
        netSuiteImportItems.push(childImportItem);
      });
    });

    console.log(
      'Generated',
      netSuiteImportItems.length,
      'NetSuite inventory items for import.',
    );

    if (DEBUG) {
      // log all netsuite import items
      for (const item of netSuiteImportItems) {
        console.log('Import Item:', JSON.stringify(item, null, 2));
      }
    }

    // export file name
    const outputFilename = 'NetSuite_Inventory_Items_Matrix.csv';

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
