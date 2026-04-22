import type { ShopifyItemRow } from '../lib/types/shopify';

// get items that have more than 1 variant (i.e. multiple rows with the same handle) to exclude them from the inventory item import since they will be imported as matrix items instead

const rowsByHandleCache = new WeakMap<
  ShopifyItemRow[],
  Map<string, ShopifyItemRow[]>
>();

const getRowsByHandle = (
  rows: ShopifyItemRow[],
): Map<string, ShopifyItemRow[]> => {
  const cached = rowsByHandleCache.get(rows);
  if (cached) {
    return cached;
  }

  const handleMap = new Map<string, ShopifyItemRow[]>();
  rows.forEach((item) => {
    const existing = handleMap.get(item.Handle);
    if (existing) {
      existing.push(item);
      return;
    }
    handleMap.set(item.Handle, [item]);
  });

  rowsByHandleCache.set(rows, handleMap);
  return handleMap;
};

export const getHandlesWithMultipleVariants = (
  rows: ShopifyItemRow[],
): string[] => {
  const rowsByHandle = getRowsByHandle(rows);

  return Array.from(rowsByHandle.entries())
    .filter(([, groupedRows]) => groupedRows.length > 1)
    .map(([handle]) => handle);
};

export const getDescriptionByHandle = (
  handle: string,
  rows: ShopifyItemRow[],
  DEBUG: boolean = false,
): string | false => {
  DEBUG && console.log('Getting description for handle', handle);
  const matchingItems = getRowsByHandle(rows).get(handle) ?? [];
  DEBUG &&
    console.log(
      'Found',
      matchingItems.length,
      'matching items for handle',
      handle,
    );
  let description = '';
  let emptyDescription = true;
  matchingItems.forEach((item) => {
    if (item['Body (HTML)'] !== '') {
      DEBUG &&
        console.log(
          'Found description for handle',
          handle,
          ':',
          item['Body (HTML)'],
        );
      description = item['Body (HTML)'];
      emptyDescription = false;
    }
  });

  if (emptyDescription) {
    DEBUG && console.warn('No description found for handle', handle);
    return false;
  }

  return description;
};

const excludedOptionValuesForName = new Set(['Default Title', '']);

export const getNameByHandle = (
  handle: string,
  option: string,
  rows: ShopifyItemRow[],
  DEBUG: boolean = false,
): string | false => {
  DEBUG && console.log('Getting name for handle', handle);
  const matchingItems = getRowsByHandle(rows).get(handle) ?? [];
  DEBUG &&
    console.log(
      'Found',
      matchingItems.length,
      'matching items for handle',
      handle,
    );
  let name = '';
  let emptyName = true;
  matchingItems.forEach((item) => {
    if (item.Title !== '' && !excludedOptionValuesForName.has(option)) {
      DEBUG && console.log('Found name for handle', handle, ':', item.Title);
      name = `${item.Title} - ${option}`;
      emptyName = false;
    }
  });

  if (emptyName) {
    DEBUG && console.warn('No name found for handle', handle);
    return false;
  }

  return name;
};

export const getFieldValueByHandle = (
  handle: string,
  field: string,
  rows: ShopifyItemRow[],
  DEBUG: boolean = false,
): string | false => {
  DEBUG && console.log('Getting field', field, 'for handle', handle);
  const matchingItems = getRowsByHandle(rows).get(handle) ?? [];
  DEBUG &&
    console.log(
      'Found',
      matchingItems.length,
      'matching items for handle',
      handle,
    );
  let value = '';
  let emptyValue = true;
  matchingItems.forEach((item) => {
    if (item[field as keyof ShopifyItemRow] !== '') {
      DEBUG &&
        console.log(
          'Found value for handle',
          handle,
          ':',
          item[field as keyof ShopifyItemRow],
        );
      value = item[field as keyof ShopifyItemRow] as string;
      emptyValue = false;
    }
  });

  if (emptyValue) {
    DEBUG && console.warn('No value found for handle', handle);
    return false;
  }

  return value;
};

export const gramsToPounds = (grams: number): number => {
  return grams * 0.00220462;
};
