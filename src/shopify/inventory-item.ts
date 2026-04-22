import {
  initializeCSV,
  parseCSV,
  barcodeStringToNumber,
  createProgressLogger,
  formatDurationMs,
} from '../lib/utils';

import { INVENTORY_ITEM_MAPPINGS } from '../lib/configs/shopify';
import type { ShopifyItemRow } from '../lib/types/shopify';
import {
  getHandlesWithMultipleVariants,
  getDescriptionByHandle,
  getNameByHandle,
  getFieldValueByHandle,
  gramsToPounds,
} from './helpers';

const DEFAULT_INPUT_FILENAME = 'GUNTHERS_PRODUCT_EXPORT'; // SHOPIFY-ITEMS-EXPORT

// local script constants
const DEBUG = false;
const EXCLUDE_MATRIX_ITEMS = false;
const CONVERT_WEIGHT_TO_POUNDS = true;
const MAX_ITEMS_PER_FILE = 20000;

async function main() {
  try {
    const runStartedAt = Date.now();

    const inputFilenameArg = process.argv[2]?.trim();
    const inputFilename =
      inputFilenameArg && inputFilenameArg !== ''
        ? inputFilenameArg.replace(/\.csv$/i, '')
        : DEFAULT_INPUT_FILENAME;

    console.log('Getting Shopify Items...');
    console.log('Using input file:', `${inputFilename}.csv`);

    // load shopify retail items to filter inventory items
    const shopifyExportFilePath = `input/${inputFilename}`;
    const shopifyItemRows = await parseCSV<ShopifyItemRow>(
      shopifyExportFilePath,
      {
        showProgress: true,
        progressLabel: 'Shopify CSV Load',
        progressIntervalPercent: 10,
      },
    );
    const csvLoadedAt = Date.now();

    console.log('Building variant handle index...');

    // get items that have more than 1 variant (i.e. multiple rows with the same handle) to exclude them from the inventory item import since they will be imported as matrix items instead
    const itemHandlesWithMultipleVariants =
      getHandlesWithMultipleVariants(shopifyItemRows);
    const multiVariantHandleSet = new Set(itemHandlesWithMultipleVariants);
    const indexingDoneAt = Date.now();

    console.log(
      'There are',
      itemHandlesWithMultipleVariants.length,
      'item handles with multiple variants.',
    );

    // filter out items that have more than 1 variant since those will be imported as matrix items instead

    const filteredShopifyItemRows = shopifyItemRows.filter(
      (item) =>
        item['Variant SKU'] !== '' &&
        (!EXCLUDE_MATRIX_ITEMS || !multiVariantHandleSet.has(item.Handle)),
    );
    const filteringDoneAt = Date.now();

    console.log(
      'There are',
      filteredShopifyItemRows.length,
      'Shopify item rows.',
    );

    const logConversionProgress = createProgressLogger(
      filteredShopifyItemRows.length,
      'Shopify Inventory Conversion',
      500,
    );

    // create object for NetSuite import
    const netSuiteImportItems = filteredShopifyItemRows.map((item, index) => {
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
      let name =
        !EXCLUDE_MATRIX_ITEMS &&
        item['Option1 Value'] &&
        item['Option1 Value'] !== 'Default Title'
          ? `${itemName} - ${item['Option1 Value']}`
          : itemName;
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

      // get manufacturer by handle if it does not already exist
      const manufacturer =
        INVENTORY_ITEM_MAPPINGS.manufacturer.field &&
        item[INVENTORY_ITEM_MAPPINGS.manufacturer.field]
          ? item[INVENTORY_ITEM_MAPPINGS.manufacturer.field]
          : getFieldValueByHandle(
              item.Handle,
              INVENTORY_ITEM_MAPPINGS.manufacturer.field,
              filteredShopifyItemRows,
              DEBUG,
            );

      logConversionProgress(index + 1);

      // weight
      const itemWeight = item[INVENTORY_ITEM_MAPPINGS.weight.field];
      const weightInPounds = itemWeight
        ? gramsToPounds(Number(itemWeight))
        : '';
      const weight = CONVERT_WEIGHT_TO_POUNDS ? weightInPounds : itemWeight;
      const weightUnit = CONVERT_WEIGHT_TO_POUNDS
        ? 'lb'
        : INVENTORY_ITEM_MAPPINGS.weightunit.default;

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
        manufacturer: manufacturer
          ? manufacturer
          : INVENTORY_ITEM_MAPPINGS.manufacturer.default,
        countryofmanufacture:
          INVENTORY_ITEM_MAPPINGS.countryofmanufacture.default,
        description: descriptionHtml,
        salesdescription: name,
        weight: weight,
        weightunit: weightUnit,

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
    const transformDoneAt = Date.now();

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

    const writeStartedAt = Date.now();
    const totalChunks = Math.max(
      1,
      Math.ceil(netSuiteImportItems.length / MAX_ITEMS_PER_FILE),
    );

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const chunkStart = chunkIndex * MAX_ITEMS_PER_FILE;
      const chunkEnd = chunkStart + MAX_ITEMS_PER_FILE;
      const chunkRows = netSuiteImportItems.slice(chunkStart, chunkEnd);
      const chunkOutputFilename =
        totalChunks === 1
          ? outputFilename
          : `${outputFilename}_part_${String(chunkIndex + 1).padStart(2, '0')}`;
      const csvWriter = initializeCSV(chunkOutputFilename, headers);

      await csvWriter.writeRecords(chunkRows);
      console.log(
        'NetSuite inventory items CSV written to',
        `${chunkOutputFilename}.csv`,
        `(${chunkRows.length} rows)`,
      );
    }
    const completedAt = Date.now();

    console.log(
      'Generated',
      totalChunks,
      'file(s) with up to',
      MAX_ITEMS_PER_FILE,
      'items each.',
    );

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
      '- Transform:',
      formatDurationMs(transformDoneAt - filteringDoneAt),
    );
    console.log('- CSV write:', formatDurationMs(completedAt - writeStartedAt));
    console.log('- Total:', formatDurationMs(completedAt - runStartedAt));
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
