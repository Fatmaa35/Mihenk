import{a as l,j as a}from"./query-BJ-ER_du.js";import{c as h,I as f}from"./index-YhpcZBif.js";/**
 * @license lucide-react v1.49.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const t={name:"x",size:24,node:[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]};t.node;const x=h(t);function j({open:s,title:r,onClose:i,children:n,footer:c,size:m="md"}){const o=l.useRef(null),d=l.useId();return l.useEffect(()=>{const e=o.current;e&&(s&&!e.open&&e.showModal(),!s&&e.open&&e.close())},[s]),a.jsx("dialog",{ref:o,className:`mh-dialog mh-dialog--${m}`,"aria-labelledby":d,onClose:i,onClick:e=>{e.target===o.current&&i()},children:s&&a.jsxs("div",{className:"mh-dialog__panel",children:[a.jsxs("header",{className:"mh-dialog__header",children:[a.jsx("h2",{id:d,children:r}),a.jsx(f,{label:"Kapat",icon:a.jsx(x,{size:20}),onClick:i})]}),a.jsx("div",{className:"mh-dialog__body",children:n}),c&&a.jsx("footer",{className:"mh-dialog__footer",children:c})]})})}export{j as D,x as X};
