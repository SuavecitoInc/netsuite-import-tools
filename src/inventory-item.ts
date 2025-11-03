import { initializeCSV, parseCSV, barcodeStringToNumber } from './lib/utils';

import { INVENTORY_ITEM_MAPPINGS } from './lib/configs/dear';
import type { ShopifyItemRow } from './lib/types/shopify';
import type {
  DearAssemblyItemRow,
  DearInventoryItemRow,
} from './lib/types/dear';

// local script constants
const DEBUG = false;
const PRODUCT_CODE = 'ProductCode'; // dear sku field - from inventory list
const PRODUCT_SKU = 'ProductSKU'; // dear sku field - from assembly bom list
const COMPONENT_SKU = 'ComponentSKU'; // dear sku field - component sku from assembly bom list
const VARIANT_SKU = 'Variant SKU'; // shopify sku field

async function main() {
  try {
    console.log('Getting Shopify Items...');
    // load shopify retail items to filter inventory items
    const shopifyExportFilePath = 'input/SHOPIFY-TN-ITEMS';
    const shopifyItemRows = await parseCSV<ShopifyItemRow>(
      shopifyExportFilePath,
    );

    console.log('There are', shopifyItemRows.length, 'Shopify item rows.');

    console.log('Generating assembly item exclusion list...');
    // load dear assembly bom list to get assembly items to exclude
    const assemblyBomFilePath = 'input/Assembly_BOM_List';
    const assemblyBomRows =
      await parseCSV<DearAssemblyItemRow>(assemblyBomFilePath);

    console.log('There are', assemblyBomRows.length, 'assembly BOM rows.');

    // create a set of ProductSKU to exclude from inventory items
    const assemblyItemSKUs = new Set(
      assemblyBomRows.map((row) => row[PRODUCT_SKU]).filter(Boolean),
    );

    const componentSKUs = new Set<string>();
    for (const row of assemblyBomRows) {
      if (row[COMPONENT_SKU]) {
        componentSKUs.add(row[COMPONENT_SKU]);
      }
    }

    console.log(
      'There are',
      assemblyItemSKUs.size,
      'unique assembly item SKUs to exclude from inventory items.',
    );

    // log all skus to exclude
    if (DEBUG) {
      console.log('Assembly Item SKUs to Exclude:');
      for (const sku of assemblyItemSKUs) {
        console.log(sku);
      }
    }

    // Further processing to generate inventory item import list would go here
    const inventoryItemFilePath = 'input/Inventory_List';
    const inventoryItemRows = await parseCSV<DearInventoryItemRow>(
      inventoryItemFilePath,
    );

    console.log('There are', inventoryItemRows.length, 'inventory item rows.');

    // Filter out non Shopify Retail items
    console.log('Removing non-Shopify retail items from inventory items...');
    const shopifyItemSKUs = new Set(
      shopifyItemRows.map((item) => item[VARIANT_SKU]),
    );

    // join with componentSKUs to include components as well
    console.log('Joining component SKUs to Shopify item SKUs...');
    const allItemSKUs = new Set([...shopifyItemSKUs, ...componentSKUs]);

    // sanity check, filtering out items not in shopifyItemSKUs
    const shopifyInventoryItems = inventoryItemRows.filter((item) =>
      allItemSKUs.has(item[PRODUCT_CODE]),
    );

    // Filter out assembly items from inventory items
    console.log(
      'Excluding assembly items from inventory items, as they are not inventory items in NetSuite, and will be handled separately...',
    );
    const filteredInventoryItems = shopifyInventoryItems.filter(
      (item) => !assemblyItemSKUs.has(item[PRODUCT_CODE]),
    );

    console.log(
      'After excluding assembly items, there are',
      filteredInventoryItems.length,
      'inventory items to import.',
    );

    // log all skus of filtered inventory items
    if (DEBUG) {
      console.log('Filtered Inventory Item SKUs:');
      for (const item of filteredInventoryItems) {
        console.log(item[PRODUCT_CODE]);
      }
    }

    // create object for NetSuite import
    const netSuiteImportItems = filteredInventoryItems.map((item) => {
      return {
        externalid: item[INVENTORY_ITEM_MAPPINGS.externalid.field],
        name: item[INVENTORY_ITEM_MAPPINGS.name.field],
        displayname: item[INVENTORY_ITEM_MAPPINGS.displayname.field],
        barcode: barcodeStringToNumber(
          item[INVENTORY_ITEM_MAPPINGS.barcode.field],
        ),
        subsidiary: INVENTORY_ITEM_MAPPINGS.subsidiary.default,
        class: INVENTORY_ITEM_MAPPINGS.class.default,
        costingmethod: INVENTORY_ITEM_MAPPINGS.costingmethod.default,
        usebins: INVENTORY_ITEM_MAPPINGS.usebins.default,
        atpmethod: INVENTORY_ITEM_MAPPINGS.atpmethod.default,
        manufacturer: INVENTORY_ITEM_MAPPINGS.manufacturer.default,
        countryofmanufacture:
          INVENTORY_ITEM_MAPPINGS.countryofmanufacture.default,
        salesdescription: item[INVENTORY_ITEM_MAPPINGS.salesdescription.field],
        weight: item[INVENTORY_ITEM_MAPPINGS.weight.field],
        weightunit: item[INVENTORY_ITEM_MAPPINGS.weightunit.field],
        salesprice: item[INVENTORY_ITEM_MAPPINGS.salesprice.field],
        pricelevel1: INVENTORY_ITEM_MAPPINGS.pricelevel1.default,
        pricelevel1price: item[INVENTORY_ITEM_MAPPINGS.pricelevel1price.field],
        pricelevel1currency:
          INVENTORY_ITEM_MAPPINGS.pricelevel1currency.default,
        pricelevel2: INVENTORY_ITEM_MAPPINGS.pricelevel2.default,
        pricelevel2price: item[INVENTORY_ITEM_MAPPINGS.pricelevel2price.field],
        pricelevel2currency:
          INVENTORY_ITEM_MAPPINGS.pricelevel2currency.default,
        istaxable: INVENTORY_ITEM_MAPPINGS.istaxable.default,
        taxschedule: INVENTORY_ITEM_MAPPINGS.taxschedule.default,
      };
    });

    console.log(
      'Generated',
      netSuiteImportItems.length,
      'NetSuite inventory items for import.',
    );

    // export file name
    const outputFilename = 'NetSuite_Inventory_Items';

    const headers = [
      { id: 'externalid', title: 'externalid' },
      { id: 'name', title: 'name' },
      { id: 'displayname', title: 'displayname' },
      { id: 'barcode', title: 'barcode' },
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
