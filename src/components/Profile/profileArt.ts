export const familyCrests = ['Compass','Heart of the team','Trophy','Green valley','Shooting star','Lightning','Helping hands','Stargazer','Growing leaf','Family circle'].map((name,i)=>({
    name,url:'/assets/profile-art/crest/crest'+(i+1)+'.webp'
}));
export const profileBanners = ['Mountain lookout','Cloud parade','Garden friends','Game day','Color splash','Rainbow skies'].map((name,i)=>({
    name,url:'/assets/profile-art/banner/banner'+(i+1)+'.webp',thumb:'/assets/profile-art/banner/banner'+(i+1)+'-thumb.webp',
    position:i===0?'left center':'center'
}));
export const bannerPosition = (url?:string) => profileBanners.find(b=>b.url===url)?.position ?? 'center';
export const crestFit = (url?:string) => familyCrests.some(c=>c.url===url)?'object-contain p-1':'object-cover';
