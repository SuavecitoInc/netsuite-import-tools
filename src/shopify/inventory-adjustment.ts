import {
  initializeCSV,
  parseCSV,
  createProgressLogger,
  formatDurationMs,
} from '../lib/utils';
import type {
  ShopifyItemRow,
  ShopifyInventoryItemRow,
} from '../lib/types/shopify';

// files
const SHOPIFY_ITEMS = 'GUNTHERS_PRODUCT_EXPORT';
const SHOPIFY_INVENTORY = 'GUNTHERS_HQ_INVENTORY_EXPORT';

// local script constants
const REMOVE_NEGATIVE_QUANTITY = true; // set to true to remove negative quantities, false to keep them (NetSuite will reject negative quantities on inventory adjustments)
const EXTERNAL_ID = 'TN-SHOPIFY-TEST-INV-ADJ-42926'; // external id for NetSuite inventory adjustment record, can be used for upsert operations in NetSuite or just for reference
const MEMO = 'TN-SHOPIFY-TEST-INV-ADJ-42926';
const MAX_ROWS_PER_FILE = 1000;

const CONFIG = {
  subsidiary: 4, // map to NetSuite subsidiary internal id
  location: 51, // map to NetSuite location internal id
  status: 1, // good
  date: '4/20/2026',
  bin: 4314,
};

async function main() {
  try {
    const runStartedAt = Date.now();

    console.log('Getting Shopify Inventory Items...');
    // load shopify inventory items
    const shopifyInventoryExportFilePath = `input/${SHOPIFY_INVENTORY}`;
    const shopifyInventoryItemRows = await parseCSV<ShopifyInventoryItemRow>(
      shopifyInventoryExportFilePath,
      {
        showProgress: true,
        progressLabel: 'Shopify Inventory CSV Load',
        progressIntervalPercent: 10,
      },
    );

    console.log(
      'There are',
      shopifyInventoryItemRows.length,
      'Shopify inventory list item rows.',
    );

    // load shopify items
    const shopifyItemsExportFilePath = `input/${SHOPIFY_ITEMS}`;
    const shopifyItemRows = await parseCSV<ShopifyItemRow>(
      shopifyItemsExportFilePath,
      {
        showProgress: true,
        progressLabel: 'Shopify Items CSV Load',
        progressIntervalPercent: 10,
      },
    );

    console.log('There are', shopifyItemRows.length, 'Shopify item rows.');

    console.log('Building Shopify item index by Variant SKU...');
    const shopifyItemsBySku = new Map<string, ShopifyItemRow>();
    shopifyItemRows.forEach((row) => {
      const sku = row['Variant SKU'];
      if (sku && !shopifyItemsBySku.has(sku)) {
        shopifyItemsBySku.set(sku, row);
      }
    });

    const logConversionProgress = createProgressLogger(
      shopifyInventoryItemRows.length,
      'Shopify Inventory Adjustment Conversion',
      500,
    );

    const netSuiteImportItems = shopifyInventoryItemRows
      .map((item, index) => {
        logConversionProgress(index + 1);

        const shopifyItemRow = shopifyItemsBySku.get(item.SKU);

        if (shopifyItemRow === undefined) {
          console.warn(`No Shopify item found for SKU: ${item.SKU}`);
          return null;
        }

        // check if "On hand (current)" quantity exists and is a valid number
        if (
          item['On hand (current)'] === undefined ||
          isNaN(item['On hand (current)'])
        ) {
          console.warn(
            `Invalid or missing "On hand (current)" quantity for SKU: ${item.SKU}`,
          );
          return null;
        }

        if (REMOVE_NEGATIVE_QUANTITY) {
          console.warn(
            `REMOVE_NEGATIVE_QUANTITY is enabled for SKU: ${item.SKU}`,
          );
          // Available (not editable)
          if (item['On hand (current)'] <= 0) {
            console.warn(`Negative inventory for SKU: ${item.SKU} removed`);
            return null;
          }
        }

        return {
          externalid: EXTERNAL_ID,
          memo: MEMO,
          subsidiary: CONFIG.subsidiary,
          location: CONFIG.location,
          bin: CONFIG.bin,
          status: CONFIG.status,
          date: CONFIG.date,
          item: item.SKU,
          available: item['On hand (current)'], // Available (not editable)
          averagecost: shopifyItemRow['Cost per item'],
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // export file name
    const outputFilename = 'Shopify_to_NetSuite_Inventory_Adjustment';

    const headers = [
      { id: 'externalid', title: 'externalid' },
      { id: 'memo', title: 'memo' },
      { id: 'subsidiary', title: 'subsidiary' },
      { id: 'location', title: 'location' },
      { id: 'bin', title: 'bin' },
      { id: 'status', title: 'status' },
      { id: 'date', title: 'date' },
      { id: 'item', title: 'item' },
      { id: 'available', title: 'available' },
      { id: 'averagecost', title: 'averagecost' },
    ];
    const totalChunks = Math.max(
      1,
      Math.ceil(netSuiteImportItems.length / MAX_ROWS_PER_FILE),
    );

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const chunkStart = chunkIndex * MAX_ROWS_PER_FILE;
      const chunkEnd = chunkStart + MAX_ROWS_PER_FILE;
      const chunkPart = `part_${String(chunkIndex + 1).padStart(2, '0')}`;
      const chunkRows = netSuiteImportItems
        .slice(chunkStart, chunkEnd)
        .map((row) => ({
          ...row,
          externalid: `${EXTERNAL_ID}_${chunkPart}`,
          memo: `${MEMO}_${chunkPart}`,
        }));
      const chunkOutputFilename =
        totalChunks === 1
          ? outputFilename
          : `${outputFilename}_part_${String(chunkIndex + 1).padStart(2, '0')}`;
      const csvWriter = initializeCSV(chunkOutputFilename, headers);

      await csvWriter.writeRecords(chunkRows);
      console.log(
        'NetSuite inventory adjustment CSV written to',
        `${chunkOutputFilename}.csv`,
        `(${chunkRows.length} rows)`,
      );
    }

    console.log(
      'Generated',
      totalChunks,
      'file(s) with up to',
      MAX_ROWS_PER_FILE,
      'rows each.',
    );
    console.log(
      'Shopify inventory adjustment completed in',
      formatDurationMs(Date.now() - runStartedAt),
    );
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
