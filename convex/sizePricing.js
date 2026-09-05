export function validateSizes(sizes) {
  if (sizes === undefined) return;
  if (!Array.isArray(sizes) || sizes.length > 3) throw new Error("Choose up to three sizes.");
  const seen = new Set();
  for (const size of sizes) {
    if (!["Small", "Medium", "Large"].includes(size.name) || seen.has(size.name)) throw new Error("Each size must be unique: Small, Medium or Large.");
    if (!Number.isInteger(size.price) || size.price < 0 || size.price > 100_000) throw new Error(`Invalid price for ${size.name}.`);
    seen.add(size.name);
  }
}

export function sizePrice(item, selectedSize) {
  validateSizes(item.sizes);
  if (!item.sizes?.length) {
    if (selectedSize) throw new Error("This item no longer offers that size.");
    return item.price;
  }
  const size = item.sizes.find((entry) => entry.name === selectedSize);
  if (!size) throw new Error(`Please choose an available size for ${item.name}.`);
  return size.price;
}
