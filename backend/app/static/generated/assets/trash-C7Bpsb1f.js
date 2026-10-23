import{a as v,j as a}from"./query-BJ-ER_du.js";import{c as n}from"./index-C02EC46R.js";const s=["#B23A2E","#3F3A7A","#2F5D4A","#9A5B1E","#1E3A5F","#6A3164","#2C5F6E","#7A4A2A"];function u(r){let e=0;for(const o of r)e=e*31+o.charCodeAt(0)>>>0;return s[e%s.length]}function k({id:r,title:e,author:o,coverUrl:t,size:h="md",showText:i=!0}){const[l,m]=v.useState(!1),p=!!t&&!l;return a.jsx("div",{className:`mh-cover mh-cover--${h}`,style:{background:u(r||e)},children:p?a.jsx("img",{src:t??void 0,alt:`${e} kapağı`,loading:"lazy",referrerPolicy:"no-referrer",onError:()=>m(!0)}):i?a.jsxs("div",{className:"mh-cover__text","aria-hidden":"true",children:[a.jsx("span",{className:"mh-cover__title",children:e}),o&&a.jsx("span",{className:"mh-cover__author",children:o})]}):null})}/**
 * @license lucide-react v1.49.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c={name:"bell-ring",size:24,node:[["path",{d:"M10.268 21a2 2 0 0 0 3.464 0",key:"vwvbt9"}],["path",{d:"M22 8c0-2.3-.8-4.3-2-6",key:"5bb3ad"}],["path",{d:"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",key:"11g9vi"}],["path",{d:"M4 2C2.8 3.7 2 5.7 2 8",key:"tap9e0"}]]};c.node;const _=n(c);/**
 * @license lucide-react v1.49.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d={name:"trash",size:24,node:[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],aliases:["trash-2"]};d.node;const f=n(d);export{k as B,f as T,_ as a};
