import{c as t}from"./index-BvRxrW6o.js";/**
 * @license lucide-react v1.49.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r={name:"quote",size:24,node:[["path",{d:"M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z",key:"rib7q0"}],["path",{d:"M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z",key:"1ymkrd"}]]};r.node;const o=t(r),d={reading:"Okuyorum",to_read:"Okuyacağım",read:"Okudum",abandoned:"Bıraktım"};function c(a){const n=[...a.reading_books,...a.to_read_books,...a.read_books,...a.abandoned_books];return new Map(n.map(e=>[e.id,e]))}function u(a){return typeof a.progress_percent=="number"?a.progress_percent:a.total_pages?a.current_page/a.total_pages*100:0}export{o as Q,d as S,c as l,u as p};
