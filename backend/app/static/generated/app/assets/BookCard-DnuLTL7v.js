import{c as s}from"./index-DHV_mx0T.js";import{j as a}from"./query-BVM-L1YW.js";import{a as d,S as h}from"./BookDetailDialog-CZrkX80o.js";/**
 * @license lucide-react v1.49.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l={name:"plus",size:24,node:[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]};l.node;const m=s(l);/**
 * @license lucide-react v1.49.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i={name:"search",size:24,node:[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]]};i.node;const j=s(i);/**
 * @license lucide-react v1.49.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o={name:"sparkles",size:24,node:[["path",{d:"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",key:"1s2grr"}],["path",{d:"M20 2v4",key:"1rf3ol"}],["path",{d:"M22 4h-4",key:"gwowj6"}],["circle",{cx:"4",cy:"20",r:"2",key:"6kqj1y"}]],aliases:["stars"]};o.node;const k=s(o);function x({book:e,reason:c,shelf:r,onOpen:n,onQuickAdd:t}){return a.jsxs("article",{className:"book-card",children:[a.jsx("button",{type:"button",className:"book-card__open",onClick:()=>n(e.id),"aria-label":`${e.title} ayrıntılarını aç`,children:a.jsx(d,{id:e.id,title:e.title,author:e.author,coverUrl:e.cover_url,size:"fill"})}),a.jsxs("div",{className:"book-card__meta",children:[a.jsx("h3",{className:"book-card__title",children:e.title}),a.jsx("p",{className:"book-card__author",children:e.author}),c&&a.jsx("p",{className:"mh-chip book-card__reason",children:c})]}),a.jsx("div",{className:"book-card__footer",children:r?a.jsx("span",{className:"mh-chip mh-chip--muted",children:h[r]}):t?a.jsxs("button",{type:"button",className:"book-card__quick",onClick:()=>t(e.id),children:[a.jsx(m,{size:16,"aria-hidden":"true"})," Okuyacağım"]}):null})]})}export{x as B,j as S,k as a};
