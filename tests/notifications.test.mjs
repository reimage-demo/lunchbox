import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { getFunctionName } from 'convex/server';
async function load(path) {
 const result = await build({entryPoints:[path],bundle:true,platform:'node',format:'esm',write:false});
 return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const notifications=await load('convex/notifications.ts');
const square=await load('convex/square.ts');
const order={_id:'order-1',orderNumber:'LB-TEST-001',paid:true,customerName:'Test Customer',phone:'+12025550123',notes:'No hot sauce',items:[{name:'Jerk Chicken Lunch Box',unitPrice:1500,quantity:1,selectedAddOns:[{name:'Fried plantain',price:0}]}],subtotal:1500,discount:0,tip:0,total:1500,pickupTiming:'scheduled',scheduledFor:'2026-09-11T17:00:00Z',pickupLocationName:'Lunch Box',pickupAddress:'Test pickup location'};
function setCredentials(t){
 const before={...process.env};
 process.env.PUSHOVER_API_TOKEN='test-app-token';process.env.PUSHOVER_USER_KEY='test-client-key';process.env.PUSHOVER_DEVICE='test-phone';
 t.after(()=>{for(const key of ['PUSHOVER_API_TOKEN','PUSHOVER_USER_KEY','PUSHOVER_DEVICE']){if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key];}});
}
test('only paid orders can be read by the notification action',async()=>{
 assert.equal(await notifications.getOrderDetails._handler({db:{get:async()=>({...order,paid:false})}},{orderId:'order-1'}),null);
 assert.equal(await notifications.getOrderDetails._handler({db:{get:async()=>null}},{orderId:'missing'}),null);
 const result=await notifications.getOrderDetails._handler({db:{get:async()=>order}},{orderId:'order-1'});
 assert.equal(result.pickupAddress,order.pickupAddress);
});
test('paid notification targets configured Pushover phone and includes pickup and selected sides',async t=>{
 setCredentials(t);let request;
 t.mock.method(globalThis,'fetch',async(url,options)=>{request={url,body:options.body};return new Response(JSON.stringify({status:1}),{status:200});});
 const result=await notifications.sendOrder._handler({runQuery:async()=>order},{orderId:'order-1'});
 assert.deepEqual(result,{sent:true});
 assert.equal(request.url,'https://api.pushover.net/1/messages.json');
 assert.equal(request.body.get('user'),'test-client-key');assert.equal(request.body.get('device'),'test-phone');
 assert.match(request.body.get('title'),/Paid Order/);assert.match(request.body.get('message'),/Paid: \$15.00/);
 assert.match(request.body.get('message'),/Fried plantain/);assert.match(request.body.get('message'),/Sep 11, 1:00 PM EDT/);
});
test('demo and complimentary orders are clearly labeled and Unicode messages fit provider limits',()=>{
 const demo={...order,total:0,subtotal:0,items:[{...order.items[0],name:'Demo order (training only)',unitPrice:0}]};
 const notification=notifications.formatOrderNotification(demo);
 assert.match(notification.title,/Demo Order/);assert.match(notification.message,/no payment collected/);
 assert.match(notifications.formatOrderNotification({...order,total:0}).title,/Complimentary Order/);
 const long=notifications.formatOrderNotification({...order,notes:'🍱'.repeat(2000)});
 assert.equal(Array.from(long.message).length,1024);assert.ok(long.message.endsWith('…'));
});
test('unpaid, missing credentials, and provider rejection never report notification success',async t=>{
 setCredentials(t);let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response(JSON.stringify({status:0}),{status:200});});
 assert.equal((await notifications.sendOrder._handler({runQuery:async()=>null},{orderId:'missing'})).sent,false);
 assert.equal(calls,0);
 delete process.env.PUSHOVER_API_TOKEN;
 assert.equal((await notifications.sendOrder._handler({runQuery:async()=>order},{orderId:'order-1'})).reason,'not-configured');assert.equal(calls,0);
 process.env.PUSHOVER_API_TOKEN='test-app-token';
 assert.equal((await notifications.sendOrder._handler({runQuery:async()=>order},{orderId:'order-1'})).reason,'provider-rejected');
});
test('paid Square webhook schedules one alert; duplicate webhook does not schedule another',async t=>{
 const previous=process.env.SQUARE_LOCATION_ID;process.env.SQUARE_LOCATION_ID='test-square-location';
 t.after(()=>{if(previous===undefined)delete process.env.SQUARE_LOCATION_ID;else process.env.SQUARE_LOCATION_ID=previous;});
 const stored={...order,paid:false};const scheduled=[];
 const ctx={db:{query:()=>({withIndex:()=>({unique:async()=>stored})}),patch:async(id,value)=>Object.assign(stored,value)},scheduler:{runAfter:async(delay,fn,args)=>scheduled.push({fn:getFunctionName(fn),args})}};
 const payment={squareOrderId:'square-order',squarePaymentId:'square-payment',status:'COMPLETED',locationId:'test-square-location',currency:'USD',amount:1500};
 await square.applyPaymentWebhook._handler(ctx,payment);await square.applyPaymentWebhook._handler(ctx,payment);
 assert.equal(scheduled.length,1);assert.equal(scheduled[0].fn,'notifications:sendOrder');assert.equal(stored.paid,true);
});
test('zero-dollar demo checkout schedules the same alert without a Square payment',async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-09-11T16:00:00Z'));
 const scheduled=[];let saved;
 const ctx={db:{query:()=>({withIndex:()=>({unique:async()=>null})}),get:async()=>({_id:'demo-item',name:'Demo order (training only)',price:0,isAvailable:true,optionGroupIds:[]}),insert:async(table,value)=>{saved=value;return 'demo-order';}},scheduler:{runAfter:async(delay,fn,args)=>scheduled.push({fn:getFunctionName(fn),args})}};
 const result=await square.prepareCheckout._handler(ctx,{clientRequestId:'demo-checkout-test-001',customerName:'Test Customer',phone:'+12025550123',email:'test@example.com',notes:'Notification test',items:[{menuItemId:'demo-item',quantity:1,selectedOptions:[]}],tip:0,fulfillmentType:'pickup',pickupTiming:'asap'});
 assert.equal(result.paid,true);assert.equal(saved.total,0);assert.equal(scheduled.length,1);assert.equal(scheduled[0].fn,'notifications:sendOrder');assert.deepEqual(scheduled[0].args,{orderId:'demo-order'});
});
