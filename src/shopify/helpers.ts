import type { ShopifyItemRow } from '../lib/types/shopify';

// get items that have more than 1 variant (i.e. multiple rows with the same handle) to exclude them from the inventory item import since they will be imported as matrix items instead

export const getHandlesWithMultipleVariants = (
  rows: ShopifyItemRow[],
): string[] => {
  return rows.reduce((acc: string[], item) => {
    if (rows.filter((i) => i.Handle === item.Handle).length > 1) {
      if (!acc.includes(item.Handle)) {
        acc.push(item.Handle);
      }
    }
    return acc;
  }, []);
};

export const getDescriptionByHandle = (
  handle: string,
  rows: ShopifyItemRow[],
  DEBUG: boolean = false,
): string | false => {
  DEBUG && console.log('Getting description for handle', handle);
  const matchingItems = rows.filter((item) => item.Handle === handle);
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
    console.warn('No description found for handle', handle);
    return false;
  }

  return description;
};

export const getNameByHandle = (
  handle: string,
  option: string,
  rows: ShopifyItemRow[],
  DEBUG: boolean = false,
): string | false => {
  DEBUG && console.log('Getting name for handle', handle);
  const matchingItems = rows.filter((item) => item.Handle === handle);
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
    if (item.Title !== '') {
      DEBUG && console.log('Found name for handle', handle, ':', item.Title);
      name = `${item.Title} - ${option}`;
      emptyName = false;
    }
  });

  if (emptyName) {
    console.warn('No name found for handle', handle);
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
  const matchingItems = rows.filter((item) => item.Handle === handle);
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
    console.warn('No value found for handle', handle);
    return false;
  }

  return value;
};
