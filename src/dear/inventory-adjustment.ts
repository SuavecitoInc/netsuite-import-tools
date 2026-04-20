import { initializeCSV, parseCSV } from '../lib/utils';

import type {
  DearInventoryItemRow,
  DearInventoryAvailabilityRow,
} from '../lib/types/dear';

// local script constants
const EXTERNAL_ID = 'SOME EXTERNAL ID';
const MEMO = 'SOME MEMO';

const CONFIG = {
  subsidiary: 1, // map to NetSuite subsidiary internal id
  location: 1, // map to NetSuite location internal id
  status: 1, // good
  date: '4/20/2026',
};

async function main() {
  try {
    console.log('Getting Dear Inventory Items...');
    // load dear inventory list items
    const dearInventoryListExportFilePath = 'input/Inventory_List';
    const dearInventoryListItemRows = await parseCSV<DearInventoryItemRow>(
      dearInventoryListExportFilePath,
    );

    console.log(
      'There are',
      dearInventoryListItemRows.length,
      'Dear inventory list item rows.',
    );

    // load dear inventory availability items
    const dearInventoryAvailabilityFilePath = 'input/Inventory_Availability';
    const dearInventoryAvailabilityRows =
      await parseCSV<DearInventoryAvailabilityRow>(
        dearInventoryAvailabilityFilePath,
      );
    console.log(
      'There are',
      dearInventoryAvailabilityRows.length,
      'Dear inventory availability item rows.',
    );

    // create object for NetSuite import
    const netSuiteImportItems = dearInventoryListItemRows.map((item) => {
      const dearInventoryRow = dearInventoryAvailabilityRows.find(
        (availabilityRow) => availabilityRow.SKU === item.ProductCode,
      );

      if (dearInventoryRow === undefined) {
        console.warn(
          `No inventory availability found for SKU: ${item.ProductCode}`,
        );
        return null;
      }

      if (dearInventoryRow.Available <= 0) {
        console.warn(`No available inventory for SKU: ${item.ProductCode}`);
        return null;
      }

      return {
        externalid: EXTERNAL_ID,
        memo: MEMO,
        subsidiary: CONFIG.subsidiary,
        location: CONFIG.location,
        status: CONFIG.status,
        date: CONFIG.date,
        item: item.ProductCode, // map to item external id
        available: dearInventoryRow.Available,
        averageCost: item.AverageCost,
      };
    });

    console.log(
      'Generated',
      netSuiteImportItems.length,
      'NetSuite inventory items for import.',
    );

    // export file name
    const outputFilename = 'Dear_to_NetSuite_Inventory_Adjustment';

    const headers = [
      { id: 'externalid', title: 'externalid' },
      { id: 'memo', title: 'memo' },
      { id: 'subsidiary', title: 'subsidiary' },
      { id: 'location', title: 'location' },
      { id: 'status', title: 'status' },
      { id: 'date', title: 'date' },
      { id: 'item', title: 'item' },
      { id: 'available', title: 'available' },
      { id: 'averageCost', title: 'averageCost' },
    ];
    const csvWriter = initializeCSV(outputFilename, headers);

    await csvWriter.writeRecords(netSuiteImportItems);
    console.log('NetSuite inventory adjustment CSV written to', outputFilename);
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
