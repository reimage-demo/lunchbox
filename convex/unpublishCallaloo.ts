import { internalMutation } from './_generated/server';
export const run = internalMutation({args:{},handler:async(ctx)=>{
 const rows=await ctx.db.query('menuItems').collect();
 const matches=rows.filter(row=>['callaloo','callaloo lunch box'].includes(row.name.trim().toLowerCase()));
 for(const row of matches) await ctx.db.patch(row._id,{isAvailable:false,isComingSoon:undefined,updatedAt:Date.now()});
 return {unpublished:matches.map(row=>row.name)};
}});
