import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['convex/menuCatalog.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { applyLunchBoxFocus } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const context = {window:{}};
vm.runInNewContext(fs.readFileSync('data.js','utf8'),context);
const preview = context.window.LunchBoxData.fallbackMenu;
function database() {
  const tables = {
    menuItems: [
      {_id:'chicken',name:'Jerk Chicken Lunch Box',category:'Lunch Boxes',price:1800,sizes:[{name:'Large',price:2200}],isAvailable:true,optionGroupIds:['paid-side'],addOns:[]},
      {_id:'vegetarian',name:'Vegetarian Meal',category:'Mains',price:1500,isAvailable:true},
      {_id:'main',name:'Jerk Pork',category:'Mains',isAvailable:true},
      {_id:'build',name:'Build Your Lunch Box',category:'Build Your Own',isAvailable:true},
      {_id:'old-callaloo',name:'Callaloo',category:'Sides',isAvailable:true},
      {_id:'soup',name:'Soup',category:'Starters',price:500,sizes:[{name:'Small',price:500},{name:'Large',price:1000}],isAvailable:true},
      {_id:'tray',name:'Special Catering Tray',category:'Catering Trays',price:9000,isAvailable:true},
    ],
    optionGroups: [{_id:'paid-side',name:'Would you like a side?',options:[]}],
    menuCategories: [{_id:'mains',name:'Mains',kind:'menu',isAvailable:true},{_id:'boxes',name:'Lunch Boxes',kind:'menu',isAvailable:true}],
  };
  let next=1;
  return { tables, ctx: { db: {
    query: table => ({collect:async()=>structuredClone(tables[table])}),
    insert:async(table,value)=>{const _id=`new-${next++}`;tables[table].push({...value,_id});return _id;},
    patch:async(id,value)=>Object.assign(Object.values(tables).flat().find(row=>row._id===id),value),
  } } };
}
test('migration replaces paid size/side choices, retires mains, preserves soup sizes and catering',async()=>{
  const {tables,ctx}=database(); await applyLunchBoxFocus(ctx);
  const chicken=tables.menuItems.find(i=>i._id==='chicken');
  assert.equal(chicken.price,1500);assert.deepEqual(chicken.sizes,[]);
  const group=tables.optionGroups.find(g=>g._id===chicken.optionGroupIds[0]);
  assert.equal(group.minSelections,1);assert.equal(group.maxSelections,1);
  assert.deepEqual(group.options.map(o=>[o.name,o.price]),[['Cabbage',0],['Fried plantain',0]]);
  for(const id of ['main','build','old-callaloo']) assert.equal(tables.menuItems.find(i=>i._id===id).isAvailable,false);
  assert.deepEqual(tables.menuItems.find(i=>i._id==='soup').sizes,[{name:'Small',price:500},{name:'Large',price:1000}]);
  assert.equal(tables.menuItems.find(i=>i._id==='tray').price,9000);
  const vegetarian=tables.menuItems.find(i=>i._id==='vegetarian');
  assert.equal(vegetarian.name,'Vegetarian Lunchbox');
  assert.equal(vegetarian.category,'Lunch Boxes');
  assert.equal(vegetarian.isAvailable,true);
  assert.deepEqual(vegetarian.optionGroupIds,[]);
  const callaloo=tables.menuItems.find(i=>i.name==='Callaloo Lunch Box');
  assert.equal(callaloo.isComingSoon,false);assert.equal(callaloo.isAvailable,false);
  for(const item of tables.menuItems.filter(i=>i.category==='Lunch Boxes')){
    assert.equal(item.price,1500);
    const local=preview.find(i=>i.name===item.name);
    assert.equal(item.price,local.price);assert.equal(item.description,local.description);
  }
  const counts=Object.values(tables).map(rows=>rows.length);
  await applyLunchBoxFocus(ctx);
  assert.deepEqual(Object.values(tables).map(rows=>rows.length),counts);
});

test('preview has no standalone mains and vegetarian meals have fixed included sides',()=>{
 assert.equal(preview.some(i=>['Mains','Build Your Own'].includes(i.category)),false);
 for(const name of ['Vegetarian Lunchbox','Callaloo Lunch Box','Cabbage & Festival Meal']){
  const item=preview.find(i=>i.name===name);assert.equal(item.price,name==='Cabbage & Festival Meal'?1000:1500);
  assert.equal(item.optionGroups.length,0);assert.equal(item.sizes.length,0);
 }
});

const checkoutBundle = await build({ entryPoints: ['convex/square.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { validatePickup } = await import(`data:text/javascript;base64,${Buffer.from(checkoutBundle.outputFiles[0].text).toString('base64')}`);
test('checkout rejects non-service days and allows Friday pickup in New York time', t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-09-06T16:00:00Z'));
 assert.throws(()=>validatePickup({pickupTiming:'asap'},null),/Fridays and Saturdays/);
 assert.throws(()=>validatePickup({pickupTiming:'scheduled',scheduledFor:'2026-09-07T17:00:00Z'},null),/Fridays and Saturdays/);
 assert.doesNotThrow(()=>validatePickup({pickupTiming:'scheduled',scheduledFor:'2026-09-11T17:00:00Z'},null));
});
