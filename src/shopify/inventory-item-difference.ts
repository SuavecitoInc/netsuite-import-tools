import { formatDurationMs, initializeCSV, parseCSV } from '../lib/utils';
import type { ShopifyItemRow } from '../lib/types/shopify';

const DEFAULT_SHOPIFY_PRODUCTS_EXPORT_FILENAME = 'GUNTHERS_PRODUCT_EXPORT'; // SHOPIFY-ITEMS-EXPORT
const DEFAULT_NETSUITE_INVENTORY_ITEM_EXPORT_FILENAME =
  'NETSUITE_GUNTHERS_PRODUCTS_EXPORT';

async function loadItemsFromCSV<T>(filename: string): Promise<T[]> {
  console.log('Using input file:', `${filename}.csv`);
  const filePath = `input/${filename}`;
  return await parseCSV<T>(filePath, {
    showProgress: true,
    progressLabel: `Loading ${filename}`,
    progressIntervalPercent: 10,
  });
}

async function main() {
  try {
    const runStartedAt = Date.now();

    const shopifyInputFiles = [DEFAULT_SHOPIFY_PRODUCTS_EXPORT_FILENAME];

    console.log('Getting Shopify Items...');
    const shopifyItemRows: ShopifyItemRow[] = [];
    for (const filename of shopifyInputFiles) {
      const items = await loadItemsFromCSV<ShopifyItemRow>(filename);
      shopifyItemRows.push(...items);
    }
    const shopifyCsvLoadedAt = Date.now();

    const netsuiteInputFilename =
      DEFAULT_NETSUITE_INVENTORY_ITEM_EXPORT_FILENAME;
    console.log('Getting NetSuite Inventory Items...');
    console.log('Using input file:', `${netsuiteInputFilename}.csv`);
    const netsuiteInventoryItemsFilePath = `input/${netsuiteInputFilename}`;
    const netsuiteInventoryItemRows = await parseCSV(
      netsuiteInventoryItemsFilePath,
      {
        showProgress: true,
        progressLabel: 'NetSuite Inventory Items CSV Load',
        progressIntervalPercent: 10,
      },
    );
    const netsuiteCsvLoadedAt = Date.now();

    // create maps of netsuite item skus for easy lookup
    const netsuiteItemSkuMap = new Map<string, any>();
    for (const row of netsuiteInventoryItemRows) {
      const sku = row['Item SKU']?.trim();
      if (sku) {
        netsuiteItemSkuMap.set(sku, row);
      }
    }
    const indexingDoneAt = Date.now();

    // compare shopify item skus to netsuite inventory item skus log missing shopify skus
    const missingShopifySkus: {
      Handle: string;
      SKU: string;
    }[] = [];
    for (const shopifyItem of shopifyItemRows) {
      const shopifySku = shopifyItem['Variant SKU']?.trim();
      if (shopifySku && !netsuiteItemSkuMap.has(shopifySku)) {
        missingShopifySkus.push({
          Handle: shopifyItem.Handle,
          SKU: shopifySku,
        });
      }
    }
    const missingSkusDoneAt = Date.now();

    console.log(
      `There are ${missingShopifySkus.length} missing Shopify SKUs that are not in the NetSuite inventory item export.`,
    );

    // save missing sku to csv file
    const missingSkusOutputFilePath = `missing_shopify_skus`;
    const headers = [
      { id: 'Handle', title: 'Handle' },
      { id: 'SKU', title: 'SKU' },
    ];
    const missingSkuCsvWriter = initializeCSV(
      missingSkusOutputFilePath,
      headers,
    );
    await missingSkuCsvWriter.writeRecords(
      missingShopifySkus.map((item) => ({
        Handle: item.Handle,
        SKU: item.SKU,
      })),
    );

    console.log('Missing Shopify SKUs saved to:', missingSkusOutputFilePath);

    // get all shopify rows that match the handles of the missing skus
    const missingSkusHandles = new Set(
      missingShopifySkus.map((item) => item.Handle),
    );
    const missingSkusShopifyRows = shopifyItemRows.filter((item) =>
      missingSkusHandles.has(item.Handle),
    );
    const missingSkusShopifyRowsOutputFilePath = `MISSING_SKUS_SHOPIFY_ROWS`;
    const missingSkusShopifyRowsHeaders = Object.keys(
      missingSkusShopifyRows[0] || {},
    ).map((key) => ({ id: key, title: key }));
    const missingSkusShopifyRowsCsvWriter = initializeCSV(
      missingSkusShopifyRowsOutputFilePath,
      missingSkusShopifyRowsHeaders,
    );
    await missingSkusShopifyRowsCsvWriter.writeRecords(missingSkusShopifyRows);

    console.log(
      'Missing Shopify SKUs Shopify rows saved to:',
      missingSkusShopifyRowsOutputFilePath,
    );

    console.log('Timing Summary:');
    console.log(
      '- Shopify CSV(s) load:',
      formatDurationMs(shopifyCsvLoadedAt - runStartedAt),
    );
    console.log(
      '- SKU index:',
      formatDurationMs(indexingDoneAt - netsuiteCsvLoadedAt),
    );
    console.log(
      '- Difference match:',
      formatDurationMs(missingSkusDoneAt - indexingDoneAt),
    );
    const writeStartedAt = Date.now();
    console.log(
      '- CSV write:',
      formatDurationMs(writeStartedAt - missingSkusDoneAt),
    );
    const completedAt = Date.now();
    console.log('- Total:', formatDurationMs(completedAt - runStartedAt));
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

main();
