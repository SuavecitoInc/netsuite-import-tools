import { initializeCSV, parseCSV, barcodeStringToNumber } from '../lib/utils';

import { INVENTORY_ITEM_MAPPINGS } from '../lib/configs/shopify';
import type { ShopifyItemRow } from '../lib/types/shopify';
import {
  getHandlesWithMultipleVariants,
  getDescriptionByHandle,
  getNameByHandle,
} from './helpers';

const INPUT_FILENAME = 'GUNTHERS_PRODUCT_EXPORT'; // SHOPIFY-ITEMS-EXPORT

// local script constants
const DEBUG = false;
const EXCLUDE_MATRIX_ITEMS = true;

async function main() {
  try {
    console.log('Getting Shopify Items...');
    // load shopify retail items to filter inventory items
    const shopifyExportFilePath = `input/${INPUT_FILENAME}`;
    const shopifyItemRows = await parseCSV<ShopifyItemRow>(
      shopifyExportFilePath,
    );

    // get items that have more than 1 variant (i.e. multiple rows with the same handle) to exclude them from the inventory item import since they will be imported as matrix items instead
    const itemHandlesWithMultipleVariants =
      getHandlesWithMultipleVariants(shopifyItemRows);

    console.log(
      'There are',
      itemHandlesWithMultipleVariants.length,
      'item handles with multiple variants.',
    );

    // filter out items that have more than 1 variant since those will be imported as matrix items instead

    const filteredShopifyItemRows = shopifyItemRows.filter(
      (item) =>
        item['Variant SKU'] !== '' &&
        (!EXCLUDE_MATRIX_ITEMS ||
          !itemHandlesWithMultipleVariants.includes(item.Handle)),
    );

    console.log(
      'There are',
      filteredShopifyItemRows.length,
      'Shopify item rows.',
    );

    // create object for NetSuite import
    const netSuiteImportItems = filteredShopifyItemRows.map((item) => {
      // get description by handle if it does not already exist
      const itemDescription = item[INVENTORY_ITEM_MAPPINGS.description.field];
      let descriptionHtml = itemDescription;
      if (!itemDescription || itemDescription === '') {
        const descriptionFromHandle = getDescriptionByHandle(
          item.Handle,
          filteredShopifyItemRows,
          DEBUG,
        );
        if (descriptionFromHandle) {
          descriptionHtml = descriptionFromHandle;
        } else {
          descriptionHtml = INVENTORY_ITEM_MAPPINGS.displayname.field;
        }
      }
      // get name by handle if it does not already exist
      const itemName = item[INVENTORY_ITEM_MAPPINGS.displayname.field];
      let name = itemName;
      if (!itemName || itemName === '') {
        const nameFromHandle = getNameByHandle(
          item.Handle,
          item['Option1 Value'],
          filteredShopifyItemRows,
          DEBUG,
        );
        if (nameFromHandle) {
          name = nameFromHandle;
        } else {
          name = INVENTORY_ITEM_MAPPINGS.displayname.field;
        }
      }

      return {
        externalid: item[INVENTORY_ITEM_MAPPINGS.externalid.field],
        name: item[INVENTORY_ITEM_MAPPINGS.name.field],
        displayname: name,
        barcode: barcodeStringToNumber(
          item[INVENTORY_ITEM_MAPPINGS.barcode.field],
        ),
        subsidiary: INVENTORY_ITEM_MAPPINGS.subsidiary.default,
        class: INVENTORY_ITEM_MAPPINGS.class.default,
        costingmethod: INVENTORY_ITEM_MAPPINGS.costingmethod.default,
        usebins: INVENTORY_ITEM_MAPPINGS.usebins.default,
        atpmethod: INVENTORY_ITEM_MAPPINGS.atpmethod.default,
        manufacturer: INVENTORY_ITEM_MAPPINGS.manufacturer.field
          ? item[INVENTORY_ITEM_MAPPINGS.manufacturer.field]
          : INVENTORY_ITEM_MAPPINGS.manufacturer.default,
        countryofmanufacture:
          INVENTORY_ITEM_MAPPINGS.countryofmanufacture.default,
        description: descriptionHtml,
        salesdescription: name,
        weight: item[INVENTORY_ITEM_MAPPINGS.weight.field],
        weightunit: INVENTORY_ITEM_MAPPINGS.weightunit.default,
        salesprice: item[INVENTORY_ITEM_MAPPINGS.salesprice.field],
        pricelevel1: INVENTORY_ITEM_MAPPINGS.pricelevel1.default,
        pricelevel1price: item[INVENTORY_ITEM_MAPPINGS.pricelevel1price.field],
        pricelevel1currency:
          INVENTORY_ITEM_MAPPINGS.pricelevel1currency.default,
        // pricelevel2: INVENTORY_ITEM_MAPPINGS.pricelevel2.default,
        // pricelevel2price: item[INVENTORY_ITEM_MAPPINGS.pricelevel2price.field],
        // pricelevel2currency:
        //   INVENTORY_ITEM_MAPPINGS.pricelevel2currency.default,
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
    const outputFilename = 'Shopify_to_NetSuite_Inventory_Items';

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

    await csvWriter.writeRecords(netSuiteImportItems);
    console.log('NetSuite inventory items CSV written to', outputFilename);
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
