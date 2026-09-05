import test from 'node:test';
import assert from 'node:assert/strict';
import { sizePrice, validateSizes } from '../convex/sizePricing.js';
const soup = { name: 'Soup', price: 500, sizes: [{name:'Small', price:500}, {name:'Large', price:1000}] };
test('soup uses the selected full price and requires an offered size', () => {
  assert.equal(sizePrice(soup, 'Small'), 500);
  assert.equal(sizePrice(soup, 'Large'), 1000);
  assert.throws(() => sizePrice(soup));
  assert.throws(() => sizePrice(soup, 'Medium'));
});
test('standard items retain their price and reject stale size selections', () => {
  assert.equal(sizePrice({price:1800}), 1800);
  assert.throws(() => sizePrice({price:1800}, 'Large'));
});
test('admin prices reject duplicate sizes and invalid money', () => {
  for (const price of [-1, 1.5, NaN, Infinity, 100001]) assert.throws(() => validateSizes([{name:'Small',price}]));
  assert.throws(() => validateSizes([{name:'Small',price:500},{name:'Small',price:1000}]));
  validateSizes([{name:'Small',price:500},{name:'Medium',price:750},{name:'Large',price:1000}]);
});
