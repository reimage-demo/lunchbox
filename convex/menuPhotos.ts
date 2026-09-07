import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
export const uploadUrl = internalMutation({args:{},handler:async(ctx)=>ctx.storage.generateUploadUrl()});
export const attach = internalMutation({args:{itemId:v.id('menuItems'),storageId:v.id('_storage')},handler:async(ctx,{itemId,storageId})=>{
 const item=await ctx.db.get(itemId);
 if(!item) throw new Error('Menu item not found');
 const imageUrl=await ctx.storage.getUrl(storageId);
 if(!imageUrl) throw new Error('Image not found');
 await ctx.db.patch(itemId,{imageStorageId:storageId,imageUrl,updatedAt:Date.now()});
 return {name:item.name,imageUrl};
}});
