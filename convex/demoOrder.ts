import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
// Explicit owner-requested demo. Never charges Square or opens customer ordering.
export const create = internalMutation({args:{requestId:v.string()},handler:async(ctx,{requestId})=>{
 const existing=await ctx.db.query('orders').filter(q=>q.eq(q.field('clientRequestId'),requestId)).first();
 if(existing) return {orderId:existing._id,orderNumber:existing.orderNumber};
 const item=(await ctx.db.query('menuItems').collect()).find(row=>row.name==='Demo Order (Training Only)' && row.price===0);
 if(!item) throw new Error('Zero-dollar demo item missing');
 const now=Date.now();
 const orderNumber='TEST-'+String(now).slice(-6);
 const orderId=await ctx.db.insert('orders',{
 orderNumber,customerName:'TEST — DO NOT PREPARE',phone:'Not applicable — test order',notes:'Owner-requested demo notification test. No customer, no payment collected. DO NOT PREPARE FOOD.',
 items:[{menuItemId:item._id,name:item.name,unitPrice:0,quantity:1,selectedAddOns:[]}],subtotal:0,total:0,tip:0,status:'received',paid:true,ageConfirmed:true,clientRequestId:requestId,fulfillmentType:'pickup',createdAt:now,updatedAt:now
 });
 return {orderId,orderNumber};
}});
