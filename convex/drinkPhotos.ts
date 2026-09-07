import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
const drinkNames = ['Strawberry Pineapple','To The World','Beetroot','Irish Moss','Cucumber','Carrot','Other Natural Drink'];
export const uploadUrl = internalMutation({args:{},handler:async(ctx)=>ctx.storage.generateUploadUrl()});
export const attach = internalMutation({
 args:{name:v.string(),storageId:v.id('_storage')},
 handler:async(ctx,{name,storageId})=>{
  if(!drinkNames.includes(name)) throw new Error('Unknown drink');
  const item=(await ctx.db.query('menuItems').collect()).find(row=>row.name===name && row.category==='Natural Drinks');
  if(!item) throw new Error('Drink not found');
  const imageUrl=await ctx.storage.getUrl(storageId);
  if(!imageUrl) throw new Error('Image not found');
  await ctx.db.patch(item._id,{imageStorageId:storageId,imageUrl,updatedAt:Date.now()});
  return {name,imageUrl};
 }
});
