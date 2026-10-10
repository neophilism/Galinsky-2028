import {origin} from './validation.mjs';

// Preview releases never advertise their URLs to search engines. Production
// indexing requires an explicit, verified HTTPS canonical origin.
export function publicRelease(site, env=process.env) {
  const mode=env.G28_PUBLIC_MODE || site.mode;
  if (!['preview','production'].includes(mode)) throw new Error('Invalid public release mode');
  const canonicalValue=env.CANONICAL_ORIGIN || site.canonicalOrigin;
  const canonical=canonicalValue?origin(canonicalValue):null;
  if (mode==='production' && !canonical) throw new Error('Production publication requires CANONICAL_ORIGIN');
  return {mode,canonical};
}

export function indexingDocuments(site,pages,env={}) {
  const {mode,canonical}=publicRelease(site,env);
  if(mode==='preview') return {
    robots:'User-agent: *\nDisallow: /\n',
    sitemap:null,
  };
  if(!Array.isArray(pages)||!pages.length) throw new Error('Cannot publish an empty sitemap');
  const urls=new Set();
  for(const p of pages) {
    if(typeof p.path!=='string'|| !/^\/(?:[a-z0-9-]+\/)*$/.test(p.path)) throw new Error('Invalid route in sitemap');
    urls.add(canonical+p.path);
  }
  const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n'+
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
    [...urls].map(url=>'  <url><loc>'+url.replace(/&/g,'&amp;')+'</loc></url>').join('\n')+
    '\n</urlset>\n';
  return {
    robots:'User-agent: *\nAllow: /\nSitemap: '+canonical+'/sitemap.xml\n',
    sitemap,
  };
}
