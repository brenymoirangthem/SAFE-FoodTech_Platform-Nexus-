// Utility to group inventory items by center_id
export function groupInventoryByCenter(inventory) {
  const grouped = {};
  for (const item of inventory) {
    const centerId = item.center_id || 'unknown';
    if (!grouped[centerId]) grouped[centerId] = [];
    grouped[centerId].push(item);
  }
  return grouped;
}

// Utility to extract menu (unique item names) from inventory for a center
export function getMenuFromInventory(inventory) {
  const menuSet = new Set();
  for (const item of inventory) {
    if (item.name) menuSet.add(item.name);
  }
  return Array.from(menuSet);
}
