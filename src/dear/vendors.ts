import {
  initializeCSV,
  parseCSV,
  createProgressLogger,
  formatDurationMs,
  handleize,
} from '../lib/utils';

import type {
  DearSupplierRow,
  DearSupplierAddressRow,
  DearSupplierContactRow,
} from '../lib/types/dear';

// local script constants
const DEBUG = false;

const DEFAULTS = {
  subsidiary: 1,
  individual: false,
};

const FILE_NAMES = {
  SUPPLIERS: 'Suppliers',
  SUPPLIER_ADDRESSES: 'SupplierAddresses',
  SUPPLIER_CONTACTS: 'SupplierContacts',
};

const splitFullName = (
  fullName: string,
): { firstName: string; lastName: string } => {
  const parts = fullName.trim().split(' ');
  const firstName = parts.shift() || '';
  const lastName = parts.join(' ');
  return { firstName, lastName };
};

async function generateSuppliers() {
  const startedAt = Date.now();
  console.log('Getting Dear / Cin7 Suppliers...');
  // load suppliers from Dear / Cin7 export
  const supplierExportFilePath = `input/${FILE_NAMES.SUPPLIERS}`;
  const supplierRows = await parseCSV<DearSupplierRow>(supplierExportFilePath, {
    showProgress: true,
    progressLabel: 'Suppliers CSV Load',
    progressIntervalPercent: 10,
  });
  const csvLoadedAt = Date.now();

  console.log('There are', supplierRows.length, 'Dear / Cin7 supplier rows.');

  const logProgress = createProgressLogger(
    supplierRows.length,
    'Suppliers Transform',
    100,
  );

  // create object for NetSuite import
  const netSuiteImportSuppliers = supplierRows.map((item, index) => {
    logProgress(index + 1);
    return {
      externalid: handleize(item.Name),
      name: item.Name,
      email: item.Email,
      taxnumber: item.TaxNumber,
      fax: item.Fax,
      mobilephone: item.MobilePhone,
      phone: item.Phone,
      comments: item.Comments,
      subsidiary: DEFAULTS.subsidiary,
      individual: DEFAULTS.individual,
    };
  });
  const transformDoneAt = Date.now();

  console.log(
    'Generated',
    netSuiteImportSuppliers.length,
    'NetSuite Suppliers for import.',
  );

  // export file name
  const outputFilename = 'Dear_Suppliers_to_NetSuite_Vendors';

  const headers = [
    { id: 'externalid', title: 'externalid' },
    { id: 'name', title: 'name' },
    { id: 'email', title: 'email' },
    { id: 'taxnumber', title: 'taxnumber' },
    { id: 'fax', title: 'fax' },
    { id: 'mobilephone', title: 'mobilephone' },
    { id: 'phone', title: 'phone' },
    { id: 'comments', title: 'comments' },
    { id: 'subsidiary', title: 'subsidiary' },
    { id: 'individual', title: 'individual' },
  ];
  const csvWriter = initializeCSV(outputFilename, headers);

  const writeStartedAt = Date.now();
  await csvWriter.writeRecords(netSuiteImportSuppliers);
  const completedAt = Date.now();
  console.log('NetSuite Vendors CSV written to', outputFilename);

  console.log('Timing Summary (Suppliers):');
  console.log('- CSV load:', formatDurationMs(csvLoadedAt - startedAt));
  console.log('- Transform:', formatDurationMs(transformDoneAt - csvLoadedAt));
  console.log('- CSV write:', formatDurationMs(completedAt - writeStartedAt));
  console.log('- Total:', formatDurationMs(completedAt - startedAt));
}

async function generateSupplierAddresses() {
  const startedAt = Date.now();
  console.log('Getting Dear / Cin7 Supplier Addresses...');
  // load suppliers from Dear / Cin7 export
  const supplierAddressExportFilePath = `input/${FILE_NAMES.SUPPLIER_ADDRESSES}`;
  const addressRows = await parseCSV<DearSupplierAddressRow>(
    supplierAddressExportFilePath,
    {
      showProgress: true,
      progressLabel: 'Supplier Addresses CSV Load',
      progressIntervalPercent: 10,
    },
  );
  const csvLoadedAt = Date.now();

  console.log(
    'There are',
    addressRows.length,
    'Dear / Cin7 supplier address rows.',
  );

  const logProgress = createProgressLogger(
    addressRows.length,
    'Supplier Addresses Transform',
    100,
  );

  // create object for NetSuite import
  const netSuiteImportSupplierAddresses = addressRows.map((item, index) => {
    logProgress(index + 1);
    return {
      externalid: handleize(item.Name),
      addressline1: item.AddressLine1,
      addressline2: item.AddressLine2,
      city: item.City,
      state: item.State,
      postalcode: item.PostCode,
      country: item.Country,
      addressee: item.Name,
    };
  });
  const transformDoneAt = Date.now();

  console.log(
    'Generated',
    netSuiteImportSupplierAddresses.length,
    'NetSuite Supplier Addresses for import.',
  );

  // export file name
  const outputFilename = 'Dear_Supplier_Addresses_to_NetSuite_Vendor_Addresses';

  const headers = [
    { id: 'externalid', title: 'externalid' },
    { id: 'addressline1', title: 'addressline1' },
    { id: 'addressline2', title: 'addressline2' },
    { id: 'city', title: 'city' },
    { id: 'state', title: 'state' },
    { id: 'postalcode', title: 'postalcode' },
    { id: 'country', title: 'country' },
    { id: 'addressee', title: 'addressee' },
  ];
  const csvWriter = initializeCSV(outputFilename, headers);

  const writeStartedAt = Date.now();
  await csvWriter.writeRecords(netSuiteImportSupplierAddresses);
  const completedAt = Date.now();
  console.log('NetSuite Vendor Addresses CSV written to', outputFilename);

  console.log('Timing Summary (Supplier Addresses):');
  console.log('- CSV load:', formatDurationMs(csvLoadedAt - startedAt));
  console.log('- Transform:', formatDurationMs(transformDoneAt - csvLoadedAt));
  console.log('- CSV write:', formatDurationMs(completedAt - writeStartedAt));
  console.log('- Total:', formatDurationMs(completedAt - startedAt));
}

async function generateSupplierContacts() {
  const startedAt = Date.now();
  console.log('Getting Dear / Cin7 Supplier Contacts...');
  // load suppliers from Dear / Cin7 export
  const supplierContactExportFilePath = `input/${FILE_NAMES.SUPPLIER_CONTACTS}`;
  const contactRows = await parseCSV<DearSupplierContactRow>(
    supplierContactExportFilePath,
    {
      showProgress: true,
      progressLabel: 'Supplier Contacts CSV Load',
      progressIntervalPercent: 10,
    },
  );
  const csvLoadedAt = Date.now();

  console.log(
    'There are',
    contactRows.length,
    'Dear / Cin7 supplier contact rows.',
  );

  const logProgress = createProgressLogger(
    contactRows.length,
    'Supplier Contacts Transform',
    100,
  );

  // create object for NetSuite import
  const netSuiteImportSupplierContacts = contactRows.map((item, index) => {
    logProgress(index + 1);
    const { firstName, lastName } = splitFullName(item.Contact);
    return {
      externalid: handleize(item.Supplier) + '_' + handleize(item.Contact),
      vendor: handleize(item.Supplier),
      contact: item.Contact,
      phone: item.Phone,
      mobilephone: item.MobilePhone,
      fax: item.Fax,
      email: item.Email,
      jobtitle: item.JobTitle,
      firstName,
      lastName,
    };
  });
  const transformDoneAt = Date.now();

  console.log(
    'Generated',
    netSuiteImportSupplierContacts.length,
    'NetSuite Supplier Contacts for import.',
  );

  // export file name
  const outputFilename = 'Dear_Supplier_Contacts_to_NetSuite_Vendor_Contacts';

  const headers = [
    { id: 'externalid', title: 'externalid' },
    { id: 'vendor', title: 'vendor' },
    { id: 'contact', title: 'contact' },
    { id: 'phone', title: 'phone' },
    { id: 'mobilephone', title: 'mobilephone' },
    { id: 'fax', title: 'fax' },
    { id: 'email', title: 'email' },
    { id: 'jobtitle', title: 'jobtitle' },
    { id: 'firstName', title: 'firstName' },
    { id: 'lastName', title: 'lastName' },
  ];
  const csvWriter = initializeCSV(outputFilename, headers);

  const writeStartedAt = Date.now();
  await csvWriter.writeRecords(netSuiteImportSupplierContacts);
  const completedAt = Date.now();
  console.log('NetSuite Vendor Contacts CSV written to', outputFilename);

  console.log('Timing Summary (Supplier Contacts):');
  console.log('- CSV load:', formatDurationMs(csvLoadedAt - startedAt));
  console.log('- Transform:', formatDurationMs(transformDoneAt - csvLoadedAt));
  console.log('- CSV write:', formatDurationMs(completedAt - writeStartedAt));
  console.log('- Total:', formatDurationMs(completedAt - startedAt));
}

async function main() {
  try {
    await generateSuppliers();
    await generateSupplierAddresses();
    await generateSupplierContacts();
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
