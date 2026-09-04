var Vy = Object.defineProperty;
var Qy = (r, i, c) => i in r ? Vy(r, i, { enumerable: !0, configurable: !0, writable: !0, value: c }) : r[i] = c;
var ri = (r, i, c) => Qy(r, typeof i != "symbol" ? i + "" : i, c);
var Uf = { exports: {} }, Qu = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Xo;
function ky() {
  if (Xo) return Qu;
  Xo = 1;
  var r = Symbol.for("react.transitional.element"), i = Symbol.for("react.fragment");
  function c(f, o, h) {
    var A = null;
    if (h !== void 0 && (A = "" + h), o.key !== void 0 && (A = "" + o.key), "key" in o) {
      h = {};
      for (var E in o)
        E !== "key" && (h[E] = o[E]);
    } else h = o;
    return o = h.ref, {
      $$typeof: r,
      type: f,
      key: A,
      ref: o !== void 0 ? o : null,
      props: h
    };
  }
  return Qu.Fragment = i, Qu.jsx = c, Qu.jsxs = c, Qu;
}
var Vo;
function wy() {
  return Vo || (Vo = 1, Uf.exports = ky()), Uf.exports;
}
var L = wy(), Cf = { exports: {} }, W = {};
/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Qo;
function Ly() {
  if (Qo) return W;
  Qo = 1;
  var r = Symbol.for("react.transitional.element"), i = Symbol.for("react.portal"), c = Symbol.for("react.fragment"), f = Symbol.for("react.strict_mode"), o = Symbol.for("react.profiler"), h = Symbol.for("react.consumer"), A = Symbol.for("react.context"), E = Symbol.for("react.forward_ref"), R = Symbol.for("react.suspense"), p = Symbol.for("react.memo"), U = Symbol.for("react.lazy"), le = Symbol.iterator;
  function de(y) {
    return y === null || typeof y != "object" ? null : (y = le && y[le] || y["@@iterator"], typeof y == "function" ? y : null);
  }
  var ne = {
    isMounted: function() {
      return !1;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, pe = Object.assign, Je = {};
  function Ne(y, D, H) {
    this.props = y, this.context = D, this.refs = Je, this.updater = H || ne;
  }
  Ne.prototype.isReactComponent = {}, Ne.prototype.setState = function(y, D) {
    if (typeof y != "object" && typeof y != "function" && y != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, y, D, "setState");
  }, Ne.prototype.forceUpdate = function(y) {
    this.updater.enqueueForceUpdate(this, y, "forceUpdate");
  };
  function Na() {
  }
  Na.prototype = Ne.prototype;
  function Ht(y, D, H) {
    this.props = y, this.context = D, this.refs = Je, this.updater = H || ne;
  }
  var Xe = Ht.prototype = new Na();
  Xe.constructor = Ht, pe(Xe, Ne.prototype), Xe.isPureReactComponent = !0;
  var Et = Array.isArray, ie = { H: null, A: null, T: null, S: null, V: null }, et = Object.prototype.hasOwnProperty;
  function tt(y, D, H, C, X, ce) {
    return H = ce.ref, {
      $$typeof: r,
      type: y,
      key: D,
      ref: H !== void 0 ? H : null,
      props: ce
    };
  }
  function at(y, D) {
    return tt(
      y.type,
      D,
      void 0,
      void 0,
      void 0,
      y.props
    );
  }
  function Rt(y) {
    return typeof y == "object" && y !== null && y.$$typeof === r;
  }
  function el(y) {
    var D = { "=": "=0", ":": "=2" };
    return "$" + y.replace(/[=:]/g, function(H) {
      return D[H];
    });
  }
  var qt = /\/+/g;
  function Ve(y, D) {
    return typeof y == "object" && y !== null && y.key != null ? el("" + y.key) : D.toString(36);
  }
  function Ua() {
  }
  function Ca(y) {
    switch (y.status) {
      case "fulfilled":
        return y.value;
      case "rejected":
        throw y.reason;
      default:
        switch (typeof y.status == "string" ? y.then(Ua, Ua) : (y.status = "pending", y.then(
          function(D) {
            y.status === "pending" && (y.status = "fulfilled", y.value = D);
          },
          function(D) {
            y.status === "pending" && (y.status = "rejected", y.reason = D);
          }
        )), y.status) {
          case "fulfilled":
            return y.value;
          case "rejected":
            throw y.reason;
        }
    }
    throw y;
  }
  function Qe(y, D, H, C, X) {
    var ce = typeof y;
    (ce === "undefined" || ce === "boolean") && (y = null);
    var K = !1;
    if (y === null) K = !0;
    else
      switch (ce) {
        case "bigint":
        case "string":
        case "number":
          K = !0;
          break;
        case "object":
          switch (y.$$typeof) {
            case r:
            case i:
              K = !0;
              break;
            case U:
              return K = y._init, Qe(
                K(y._payload),
                D,
                H,
                C,
                X
              );
          }
      }
    if (K)
      return X = X(y), K = C === "" ? "." + Ve(y, 0) : C, Et(X) ? (H = "", K != null && (H = K.replace(qt, "$&/") + "/"), Qe(X, D, H, "", function(ea) {
        return ea;
      })) : X != null && (Rt(X) && (X = at(
        X,
        H + (X.key == null || y && y.key === X.key ? "" : ("" + X.key).replace(
          qt,
          "$&/"
        ) + "/") + K
      )), D.push(X)), 1;
    K = 0;
    var lt = C === "" ? "." : C + ":";
    if (Et(y))
      for (var Se = 0; Se < y.length; Se++)
        C = y[Se], ce = lt + Ve(C, Se), K += Qe(
          C,
          D,
          H,
          ce,
          X
        );
    else if (Se = de(y), typeof Se == "function")
      for (y = Se.call(y), Se = 0; !(C = y.next()).done; )
        C = C.value, ce = lt + Ve(C, Se++), K += Qe(
          C,
          D,
          H,
          ce,
          X
        );
    else if (ce === "object") {
      if (typeof y.then == "function")
        return Qe(
          Ca(y),
          D,
          H,
          C,
          X
        );
      throw D = String(y), Error(
        "Objects are not valid as a React child (found: " + (D === "[object Object]" ? "object with keys {" + Object.keys(y).join(", ") + "}" : D) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return K;
  }
  function O(y, D, H) {
    if (y == null) return y;
    var C = [], X = 0;
    return Qe(y, C, "", "", function(ce) {
      return D.call(H, ce, X++);
    }), C;
  }
  function j(y) {
    if (y._status === -1) {
      var D = y._result;
      D = D(), D.then(
        function(H) {
          (y._status === 0 || y._status === -1) && (y._status = 1, y._result = H);
        },
        function(H) {
          (y._status === 0 || y._status === -1) && (y._status = 2, y._result = H);
        }
      ), y._status === -1 && (y._status = 0, y._result = D);
    }
    if (y._status === 1) return y._result.default;
    throw y._result;
  }
  var k = typeof reportError == "function" ? reportError : function(y) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var D = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof y == "object" && y !== null && typeof y.message == "string" ? String(y.message) : String(y),
        error: y
      });
      if (!window.dispatchEvent(D)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", y);
      return;
    }
    console.error(y);
  };
  function ge() {
  }
  return W.Children = {
    map: O,
    forEach: function(y, D, H) {
      O(
        y,
        function() {
          D.apply(this, arguments);
        },
        H
      );
    },
    count: function(y) {
      var D = 0;
      return O(y, function() {
        D++;
      }), D;
    },
    toArray: function(y) {
      return O(y, function(D) {
        return D;
      }) || [];
    },
    only: function(y) {
      if (!Rt(y))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return y;
    }
  }, W.Component = Ne, W.Fragment = c, W.Profiler = o, W.PureComponent = Ht, W.StrictMode = f, W.Suspense = R, W.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ie, W.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(y) {
      return ie.H.useMemoCache(y);
    }
  }, W.cache = function(y) {
    return function() {
      return y.apply(null, arguments);
    };
  }, W.cloneElement = function(y, D, H) {
    if (y == null)
      throw Error(
        "The argument must be a React element, but you passed " + y + "."
      );
    var C = pe({}, y.props), X = y.key, ce = void 0;
    if (D != null)
      for (K in D.ref !== void 0 && (ce = void 0), D.key !== void 0 && (X = "" + D.key), D)
        !et.call(D, K) || K === "key" || K === "__self" || K === "__source" || K === "ref" && D.ref === void 0 || (C[K] = D[K]);
    var K = arguments.length - 2;
    if (K === 1) C.children = H;
    else if (1 < K) {
      for (var lt = Array(K), Se = 0; Se < K; Se++)
        lt[Se] = arguments[Se + 2];
      C.children = lt;
    }
    return tt(y.type, X, void 0, void 0, ce, C);
  }, W.createContext = function(y) {
    return y = {
      $$typeof: A,
      _currentValue: y,
      _currentValue2: y,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, y.Provider = y, y.Consumer = {
      $$typeof: h,
      _context: y
    }, y;
  }, W.createElement = function(y, D, H) {
    var C, X = {}, ce = null;
    if (D != null)
      for (C in D.key !== void 0 && (ce = "" + D.key), D)
        et.call(D, C) && C !== "key" && C !== "__self" && C !== "__source" && (X[C] = D[C]);
    var K = arguments.length - 2;
    if (K === 1) X.children = H;
    else if (1 < K) {
      for (var lt = Array(K), Se = 0; Se < K; Se++)
        lt[Se] = arguments[Se + 2];
      X.children = lt;
    }
    if (y && y.defaultProps)
      for (C in K = y.defaultProps, K)
        X[C] === void 0 && (X[C] = K[C]);
    return tt(y, ce, void 0, void 0, null, X);
  }, W.createRef = function() {
    return { current: null };
  }, W.forwardRef = function(y) {
    return { $$typeof: E, render: y };
  }, W.isValidElement = Rt, W.lazy = function(y) {
    return {
      $$typeof: U,
      _payload: { _status: -1, _result: y },
      _init: j
    };
  }, W.memo = function(y, D) {
    return {
      $$typeof: p,
      type: y,
      compare: D === void 0 ? null : D
    };
  }, W.startTransition = function(y) {
    var D = ie.T, H = {};
    ie.T = H;
    try {
      var C = y(), X = ie.S;
      X !== null && X(H, C), typeof C == "object" && C !== null && typeof C.then == "function" && C.then(ge, k);
    } catch (ce) {
      k(ce);
    } finally {
      ie.T = D;
    }
  }, W.unstable_useCacheRefresh = function() {
    return ie.H.useCacheRefresh();
  }, W.use = function(y) {
    return ie.H.use(y);
  }, W.useActionState = function(y, D, H) {
    return ie.H.useActionState(y, D, H);
  }, W.useCallback = function(y, D) {
    return ie.H.useCallback(y, D);
  }, W.useContext = function(y) {
    return ie.H.useContext(y);
  }, W.useDebugValue = function() {
  }, W.useDeferredValue = function(y, D) {
    return ie.H.useDeferredValue(y, D);
  }, W.useEffect = function(y, D, H) {
    var C = ie.H;
    if (typeof H == "function")
      throw Error(
        "useEffect CRUD overload is not enabled in this build of React."
      );
    return C.useEffect(y, D);
  }, W.useId = function() {
    return ie.H.useId();
  }, W.useImperativeHandle = function(y, D, H) {
    return ie.H.useImperativeHandle(y, D, H);
  }, W.useInsertionEffect = function(y, D) {
    return ie.H.useInsertionEffect(y, D);
  }, W.useLayoutEffect = function(y, D) {
    return ie.H.useLayoutEffect(y, D);
  }, W.useMemo = function(y, D) {
    return ie.H.useMemo(y, D);
  }, W.useOptimistic = function(y, D) {
    return ie.H.useOptimistic(y, D);
  }, W.useReducer = function(y, D, H) {
    return ie.H.useReducer(y, D, H);
  }, W.useRef = function(y) {
    return ie.H.useRef(y);
  }, W.useState = function(y) {
    return ie.H.useState(y);
  }, W.useSyncExternalStore = function(y, D, H) {
    return ie.H.useSyncExternalStore(
      y,
      D,
      H
    );
  }, W.useTransition = function() {
    return ie.H.useTransition();
  }, W.version = "19.1.1", W;
}
var ko;
function Lf() {
  return ko || (ko = 1, Cf.exports = Ly()), Cf.exports;
}
var xa = Lf(), jf = { exports: {} }, ku = {}, Zf = { exports: {} }, Hf = {};
/**
 * @license React
 * scheduler.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var wo;
function Ky() {
  return wo || (wo = 1, (function(r) {
    function i(O, j) {
      var k = O.length;
      O.push(j);
      e: for (; 0 < k; ) {
        var ge = k - 1 >>> 1, y = O[ge];
        if (0 < o(y, j))
          O[ge] = j, O[k] = y, k = ge;
        else break e;
      }
    }
    function c(O) {
      return O.length === 0 ? null : O[0];
    }
    function f(O) {
      if (O.length === 0) return null;
      var j = O[0], k = O.pop();
      if (k !== j) {
        O[0] = k;
        e: for (var ge = 0, y = O.length, D = y >>> 1; ge < D; ) {
          var H = 2 * (ge + 1) - 1, C = O[H], X = H + 1, ce = O[X];
          if (0 > o(C, k))
            X < y && 0 > o(ce, C) ? (O[ge] = ce, O[X] = k, ge = X) : (O[ge] = C, O[H] = k, ge = H);
          else if (X < y && 0 > o(ce, k))
            O[ge] = ce, O[X] = k, ge = X;
          else break e;
        }
      }
      return j;
    }
    function o(O, j) {
      var k = O.sortIndex - j.sortIndex;
      return k !== 0 ? k : O.id - j.id;
    }
    if (r.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
      var h = performance;
      r.unstable_now = function() {
        return h.now();
      };
    } else {
      var A = Date, E = A.now();
      r.unstable_now = function() {
        return A.now() - E;
      };
    }
    var R = [], p = [], U = 1, le = null, de = 3, ne = !1, pe = !1, Je = !1, Ne = !1, Na = typeof setTimeout == "function" ? setTimeout : null, Ht = typeof clearTimeout == "function" ? clearTimeout : null, Xe = typeof setImmediate < "u" ? setImmediate : null;
    function Et(O) {
      for (var j = c(p); j !== null; ) {
        if (j.callback === null) f(p);
        else if (j.startTime <= O)
          f(p), j.sortIndex = j.expirationTime, i(R, j);
        else break;
        j = c(p);
      }
    }
    function ie(O) {
      if (Je = !1, Et(O), !pe)
        if (c(R) !== null)
          pe = !0, et || (et = !0, Ve());
        else {
          var j = c(p);
          j !== null && Qe(ie, j.startTime - O);
        }
    }
    var et = !1, tt = -1, at = 5, Rt = -1;
    function el() {
      return Ne ? !0 : !(r.unstable_now() - Rt < at);
    }
    function qt() {
      if (Ne = !1, et) {
        var O = r.unstable_now();
        Rt = O;
        var j = !0;
        try {
          e: {
            pe = !1, Je && (Je = !1, Ht(tt), tt = -1), ne = !0;
            var k = de;
            try {
              t: {
                for (Et(O), le = c(R); le !== null && !(le.expirationTime > O && el()); ) {
                  var ge = le.callback;
                  if (typeof ge == "function") {
                    le.callback = null, de = le.priorityLevel;
                    var y = ge(
                      le.expirationTime <= O
                    );
                    if (O = r.unstable_now(), typeof y == "function") {
                      le.callback = y, Et(O), j = !0;
                      break t;
                    }
                    le === c(R) && f(R), Et(O);
                  } else f(R);
                  le = c(R);
                }
                if (le !== null) j = !0;
                else {
                  var D = c(p);
                  D !== null && Qe(
                    ie,
                    D.startTime - O
                  ), j = !1;
                }
              }
              break e;
            } finally {
              le = null, de = k, ne = !1;
            }
            j = void 0;
          }
        } finally {
          j ? Ve() : et = !1;
        }
      }
    }
    var Ve;
    if (typeof Xe == "function")
      Ve = function() {
        Xe(qt);
      };
    else if (typeof MessageChannel < "u") {
      var Ua = new MessageChannel(), Ca = Ua.port2;
      Ua.port1.onmessage = qt, Ve = function() {
        Ca.postMessage(null);
      };
    } else
      Ve = function() {
        Na(qt, 0);
      };
    function Qe(O, j) {
      tt = Na(function() {
        O(r.unstable_now());
      }, j);
    }
    r.unstable_IdlePriority = 5, r.unstable_ImmediatePriority = 1, r.unstable_LowPriority = 4, r.unstable_NormalPriority = 3, r.unstable_Profiling = null, r.unstable_UserBlockingPriority = 2, r.unstable_cancelCallback = function(O) {
      O.callback = null;
    }, r.unstable_forceFrameRate = function(O) {
      0 > O || 125 < O ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : at = 0 < O ? Math.floor(1e3 / O) : 5;
    }, r.unstable_getCurrentPriorityLevel = function() {
      return de;
    }, r.unstable_next = function(O) {
      switch (de) {
        case 1:
        case 2:
        case 3:
          var j = 3;
          break;
        default:
          j = de;
      }
      var k = de;
      de = j;
      try {
        return O();
      } finally {
        de = k;
      }
    }, r.unstable_requestPaint = function() {
      Ne = !0;
    }, r.unstable_runWithPriority = function(O, j) {
      switch (O) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          O = 3;
      }
      var k = de;
      de = O;
      try {
        return j();
      } finally {
        de = k;
      }
    }, r.unstable_scheduleCallback = function(O, j, k) {
      var ge = r.unstable_now();
      switch (typeof k == "object" && k !== null ? (k = k.delay, k = typeof k == "number" && 0 < k ? ge + k : ge) : k = ge, O) {
        case 1:
          var y = -1;
          break;
        case 2:
          y = 250;
          break;
        case 5:
          y = 1073741823;
          break;
        case 4:
          y = 1e4;
          break;
        default:
          y = 5e3;
      }
      return y = k + y, O = {
        id: U++,
        callback: j,
        priorityLevel: O,
        startTime: k,
        expirationTime: y,
        sortIndex: -1
      }, k > ge ? (O.sortIndex = k, i(p, O), c(R) === null && O === c(p) && (Je ? (Ht(tt), tt = -1) : Je = !0, Qe(ie, k - ge))) : (O.sortIndex = y, i(R, O), pe || ne || (pe = !0, et || (et = !0, Ve()))), O;
    }, r.unstable_shouldYield = el, r.unstable_wrapCallback = function(O) {
      var j = de;
      return function() {
        var k = de;
        de = j;
        try {
          return O.apply(this, arguments);
        } finally {
          de = k;
        }
      };
    };
  })(Hf)), Hf;
}
var Lo;
function Jy() {
  return Lo || (Lo = 1, Zf.exports = Ky()), Zf.exports;
}
var qf = { exports: {} }, Le = {};
/**
 * @license React
 * react-dom.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Ko;
function $y() {
  if (Ko) return Le;
  Ko = 1;
  var r = Lf();
  function i(R) {
    var p = "https://react.dev/errors/" + R;
    if (1 < arguments.length) {
      p += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var U = 2; U < arguments.length; U++)
        p += "&args[]=" + encodeURIComponent(arguments[U]);
    }
    return "Minified React error #" + R + "; visit " + p + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function c() {
  }
  var f = {
    d: {
      f: c,
      r: function() {
        throw Error(i(522));
      },
      D: c,
      C: c,
      L: c,
      m: c,
      X: c,
      S: c,
      M: c
    },
    p: 0,
    findDOMNode: null
  }, o = Symbol.for("react.portal");
  function h(R, p, U) {
    var le = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: o,
      key: le == null ? null : "" + le,
      children: R,
      containerInfo: p,
      implementation: U
    };
  }
  var A = r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function E(R, p) {
    if (R === "font") return "";
    if (typeof p == "string")
      return p === "use-credentials" ? p : "";
  }
  return Le.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = f, Le.createPortal = function(R, p) {
    var U = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!p || p.nodeType !== 1 && p.nodeType !== 9 && p.nodeType !== 11)
      throw Error(i(299));
    return h(R, p, null, U);
  }, Le.flushSync = function(R) {
    var p = A.T, U = f.p;
    try {
      if (A.T = null, f.p = 2, R) return R();
    } finally {
      A.T = p, f.p = U, f.d.f();
    }
  }, Le.preconnect = function(R, p) {
    typeof R == "string" && (p ? (p = p.crossOrigin, p = typeof p == "string" ? p === "use-credentials" ? p : "" : void 0) : p = null, f.d.C(R, p));
  }, Le.prefetchDNS = function(R) {
    typeof R == "string" && f.d.D(R);
  }, Le.preinit = function(R, p) {
    if (typeof R == "string" && p && typeof p.as == "string") {
      var U = p.as, le = E(U, p.crossOrigin), de = typeof p.integrity == "string" ? p.integrity : void 0, ne = typeof p.fetchPriority == "string" ? p.fetchPriority : void 0;
      U === "style" ? f.d.S(
        R,
        typeof p.precedence == "string" ? p.precedence : void 0,
        {
          crossOrigin: le,
          integrity: de,
          fetchPriority: ne
        }
      ) : U === "script" && f.d.X(R, {
        crossOrigin: le,
        integrity: de,
        fetchPriority: ne,
        nonce: typeof p.nonce == "string" ? p.nonce : void 0
      });
    }
  }, Le.preinitModule = function(R, p) {
    if (typeof R == "string")
      if (typeof p == "object" && p !== null) {
        if (p.as == null || p.as === "script") {
          var U = E(
            p.as,
            p.crossOrigin
          );
          f.d.M(R, {
            crossOrigin: U,
            integrity: typeof p.integrity == "string" ? p.integrity : void 0,
            nonce: typeof p.nonce == "string" ? p.nonce : void 0
          });
        }
      } else p == null && f.d.M(R);
  }, Le.preload = function(R, p) {
    if (typeof R == "string" && typeof p == "object" && p !== null && typeof p.as == "string") {
      var U = p.as, le = E(U, p.crossOrigin);
      f.d.L(R, U, {
        crossOrigin: le,
        integrity: typeof p.integrity == "string" ? p.integrity : void 0,
        nonce: typeof p.nonce == "string" ? p.nonce : void 0,
        type: typeof p.type == "string" ? p.type : void 0,
        fetchPriority: typeof p.fetchPriority == "string" ? p.fetchPriority : void 0,
        referrerPolicy: typeof p.referrerPolicy == "string" ? p.referrerPolicy : void 0,
        imageSrcSet: typeof p.imageSrcSet == "string" ? p.imageSrcSet : void 0,
        imageSizes: typeof p.imageSizes == "string" ? p.imageSizes : void 0,
        media: typeof p.media == "string" ? p.media : void 0
      });
    }
  }, Le.preloadModule = function(R, p) {
    if (typeof R == "string")
      if (p) {
        var U = E(p.as, p.crossOrigin);
        f.d.m(R, {
          as: typeof p.as == "string" && p.as !== "script" ? p.as : void 0,
          crossOrigin: U,
          integrity: typeof p.integrity == "string" ? p.integrity : void 0
        });
      } else f.d.m(R);
  }, Le.requestFormReset = function(R) {
    f.d.r(R);
  }, Le.unstable_batchedUpdates = function(R, p) {
    return R(p);
  }, Le.useFormState = function(R, p, U) {
    return A.H.useFormState(R, p, U);
  }, Le.useFormStatus = function() {
    return A.H.useHostTransitionStatus();
  }, Le.version = "19.1.1", Le;
}
var Jo;
function Wy() {
  if (Jo) return qf.exports;
  Jo = 1;
  function r() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(r);
      } catch (i) {
        console.error(i);
      }
  }
  return r(), qf.exports = $y(), qf.exports;
}
/**
 * @license React
 * react-dom-client.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var $o;
function Fy() {
  if ($o) return ku;
  $o = 1;
  var r = Jy(), i = Lf(), c = Wy();
  function f(e) {
    var t = "https://react.dev/errors/" + e;
    if (1 < arguments.length) {
      t += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var a = 2; a < arguments.length; a++)
        t += "&args[]=" + encodeURIComponent(arguments[a]);
    }
    return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function o(e) {
    return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
  }
  function h(e) {
    var t = e, a = e;
    if (e.alternate) for (; t.return; ) t = t.return;
    else {
      e = t;
      do
        t = e, (t.flags & 4098) !== 0 && (a = t.return), e = t.return;
      while (e);
    }
    return t.tag === 3 ? a : null;
  }
  function A(e) {
    if (e.tag === 13) {
      var t = e.memoizedState;
      if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function E(e) {
    if (h(e) !== e)
      throw Error(f(188));
  }
  function R(e) {
    var t = e.alternate;
    if (!t) {
      if (t = h(e), t === null) throw Error(f(188));
      return t !== e ? null : e;
    }
    for (var a = e, l = t; ; ) {
      var u = a.return;
      if (u === null) break;
      var n = u.alternate;
      if (n === null) {
        if (l = u.return, l !== null) {
          a = l;
          continue;
        }
        break;
      }
      if (u.child === n.child) {
        for (n = u.child; n; ) {
          if (n === a) return E(u), e;
          if (n === l) return E(u), t;
          n = n.sibling;
        }
        throw Error(f(188));
      }
      if (a.return !== l.return) a = u, l = n;
      else {
        for (var s = !1, d = u.child; d; ) {
          if (d === a) {
            s = !0, a = u, l = n;
            break;
          }
          if (d === l) {
            s = !0, l = u, a = n;
            break;
          }
          d = d.sibling;
        }
        if (!s) {
          for (d = n.child; d; ) {
            if (d === a) {
              s = !0, a = n, l = u;
              break;
            }
            if (d === l) {
              s = !0, l = n, a = u;
              break;
            }
            d = d.sibling;
          }
          if (!s) throw Error(f(189));
        }
      }
      if (a.alternate !== l) throw Error(f(190));
    }
    if (a.tag !== 3) throw Error(f(188));
    return a.stateNode.current === a ? e : t;
  }
  function p(e) {
    var t = e.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return e;
    for (e = e.child; e !== null; ) {
      if (t = p(e), t !== null) return t;
      e = e.sibling;
    }
    return null;
  }
  var U = Object.assign, le = Symbol.for("react.element"), de = Symbol.for("react.transitional.element"), ne = Symbol.for("react.portal"), pe = Symbol.for("react.fragment"), Je = Symbol.for("react.strict_mode"), Ne = Symbol.for("react.profiler"), Na = Symbol.for("react.provider"), Ht = Symbol.for("react.consumer"), Xe = Symbol.for("react.context"), Et = Symbol.for("react.forward_ref"), ie = Symbol.for("react.suspense"), et = Symbol.for("react.suspense_list"), tt = Symbol.for("react.memo"), at = Symbol.for("react.lazy"), Rt = Symbol.for("react.activity"), el = Symbol.for("react.memo_cache_sentinel"), qt = Symbol.iterator;
  function Ve(e) {
    return e === null || typeof e != "object" ? null : (e = qt && e[qt] || e["@@iterator"], typeof e == "function" ? e : null);
  }
  var Ua = Symbol.for("react.client.reference");
  function Ca(e) {
    if (e == null) return null;
    if (typeof e == "function")
      return e.$$typeof === Ua ? null : e.displayName || e.name || null;
    if (typeof e == "string") return e;
    switch (e) {
      case pe:
        return "Fragment";
      case Ne:
        return "Profiler";
      case Je:
        return "StrictMode";
      case ie:
        return "Suspense";
      case et:
        return "SuspenseList";
      case Rt:
        return "Activity";
    }
    if (typeof e == "object")
      switch (e.$$typeof) {
        case ne:
          return "Portal";
        case Xe:
          return (e.displayName || "Context") + ".Provider";
        case Ht:
          return (e._context.displayName || "Context") + ".Consumer";
        case Et:
          var t = e.render;
          return e = e.displayName, e || (e = t.displayName || t.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
        case tt:
          return t = e.displayName || null, t !== null ? t : Ca(e.type) || "Memo";
        case at:
          t = e._payload, e = e._init;
          try {
            return Ca(e(t));
          } catch {
          }
      }
    return null;
  }
  var Qe = Array.isArray, O = i.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, j = c.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, k = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, ge = [], y = -1;
  function D(e) {
    return { current: e };
  }
  function H(e) {
    0 > y || (e.current = ge[y], ge[y] = null, y--);
  }
  function C(e, t) {
    y++, ge[y] = e.current, e.current = t;
  }
  var X = D(null), ce = D(null), K = D(null), lt = D(null);
  function Se(e, t) {
    switch (C(K, t), C(ce, e), C(X, null), t.nodeType) {
      case 9:
      case 11:
        e = (e = t.documentElement) && (e = e.namespaceURI) ? yo(e) : 0;
        break;
      default:
        if (e = t.tagName, t = t.namespaceURI)
          t = yo(t), e = vo(t, e);
        else
          switch (e) {
            case "svg":
              e = 1;
              break;
            case "math":
              e = 2;
              break;
            default:
              e = 0;
          }
    }
    H(X), C(X, e);
  }
  function ea() {
    H(X), H(ce), H(K);
  }
  function vi(e) {
    e.memoizedState !== null && C(lt, e);
    var t = X.current, a = vo(t, e.type);
    t !== a && (C(ce, e), C(X, a));
  }
  function Ju(e) {
    ce.current === e && (H(X), H(ce)), lt.current === e && (H(lt), Bu._currentValue = k);
  }
  var gi = Object.prototype.hasOwnProperty, _i = r.unstable_scheduleCallback, pi = r.unstable_cancelCallback, bh = r.unstable_shouldYield, Sh = r.unstable_requestPaint, Mt = r.unstable_now, Th = r.unstable_getCurrentPriorityLevel, Jf = r.unstable_ImmediatePriority, $f = r.unstable_UserBlockingPriority, $u = r.unstable_NormalPriority, Ah = r.unstable_LowPriority, Wf = r.unstable_IdlePriority, Eh = r.log, xh = r.unstable_setDisableYieldValue, Ll = null, ut = null;
  function ta(e) {
    if (typeof Eh == "function" && xh(e), ut && typeof ut.setStrictMode == "function")
      try {
        ut.setStrictMode(Ll, e);
      } catch {
      }
  }
  var nt = Math.clz32 ? Math.clz32 : Rh, Oh = Math.log, zh = Math.LN2;
  function Rh(e) {
    return e >>>= 0, e === 0 ? 32 : 31 - (Oh(e) / zh | 0) | 0;
  }
  var Wu = 256, Fu = 4194304;
  function ja(e) {
    var t = e & 42;
    if (t !== 0) return t;
    switch (e & -e) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
        return 64;
      case 128:
        return 128;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return e & 4194048;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return e & 62914560;
      case 67108864:
        return 67108864;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 0;
      default:
        return e;
    }
  }
  function Iu(e, t, a) {
    var l = e.pendingLanes;
    if (l === 0) return 0;
    var u = 0, n = e.suspendedLanes, s = e.pingedLanes;
    e = e.warmLanes;
    var d = l & 134217727;
    return d !== 0 ? (l = d & ~n, l !== 0 ? u = ja(l) : (s &= d, s !== 0 ? u = ja(s) : a || (a = d & ~e, a !== 0 && (u = ja(a))))) : (d = l & ~n, d !== 0 ? u = ja(d) : s !== 0 ? u = ja(s) : a || (a = l & ~e, a !== 0 && (u = ja(a)))), u === 0 ? 0 : t !== 0 && t !== u && (t & n) === 0 && (n = u & -u, a = t & -t, n >= a || n === 32 && (a & 4194048) !== 0) ? t : u;
  }
  function Kl(e, t) {
    return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & t) === 0;
  }
  function Mh(e, t) {
    switch (e) {
      case 1:
      case 2:
      case 4:
      case 8:
      case 64:
        return t + 250;
      case 16:
      case 32:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return t + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return -1;
      case 67108864:
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function Ff() {
    var e = Wu;
    return Wu <<= 1, (Wu & 4194048) === 0 && (Wu = 256), e;
  }
  function If() {
    var e = Fu;
    return Fu <<= 1, (Fu & 62914560) === 0 && (Fu = 4194304), e;
  }
  function bi(e) {
    for (var t = [], a = 0; 31 > a; a++) t.push(e);
    return t;
  }
  function Jl(e, t) {
    e.pendingLanes |= t, t !== 268435456 && (e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0);
  }
  function Dh(e, t, a, l, u, n) {
    var s = e.pendingLanes;
    e.pendingLanes = a, e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0, e.expiredLanes &= a, e.entangledLanes &= a, e.errorRecoveryDisabledLanes &= a, e.shellSuspendCounter = 0;
    var d = e.entanglements, m = e.expirationTimes, b = e.hiddenUpdates;
    for (a = s & ~a; 0 < a; ) {
      var x = 31 - nt(a), M = 1 << x;
      d[x] = 0, m[x] = -1;
      var S = b[x];
      if (S !== null)
        for (b[x] = null, x = 0; x < S.length; x++) {
          var T = S[x];
          T !== null && (T.lane &= -536870913);
        }
      a &= ~M;
    }
    l !== 0 && Pf(e, l, 0), n !== 0 && u === 0 && e.tag !== 0 && (e.suspendedLanes |= n & ~(s & ~t));
  }
  function Pf(e, t, a) {
    e.pendingLanes |= t, e.suspendedLanes &= ~t;
    var l = 31 - nt(t);
    e.entangledLanes |= t, e.entanglements[l] = e.entanglements[l] | 1073741824 | a & 4194090;
  }
  function es(e, t) {
    var a = e.entangledLanes |= t;
    for (e = e.entanglements; a; ) {
      var l = 31 - nt(a), u = 1 << l;
      u & t | e[l] & t && (e[l] |= t), a &= ~u;
    }
  }
  function Si(e) {
    switch (e) {
      case 2:
        e = 1;
        break;
      case 8:
        e = 4;
        break;
      case 32:
        e = 16;
        break;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        e = 128;
        break;
      case 268435456:
        e = 134217728;
        break;
      default:
        e = 0;
    }
    return e;
  }
  function Ti(e) {
    return e &= -e, 2 < e ? 8 < e ? (e & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
  }
  function ts() {
    var e = j.p;
    return e !== 0 ? e : (e = window.event, e === void 0 ? 32 : Zo(e.type));
  }
  function Nh(e, t) {
    var a = j.p;
    try {
      return j.p = e, t();
    } finally {
      j.p = a;
    }
  }
  var aa = Math.random().toString(36).slice(2), ke = "__reactFiber$" + aa, $e = "__reactProps$" + aa, tl = "__reactContainer$" + aa, Ai = "__reactEvents$" + aa, Uh = "__reactListeners$" + aa, Ch = "__reactHandles$" + aa, as = "__reactResources$" + aa, $l = "__reactMarker$" + aa;
  function Ei(e) {
    delete e[ke], delete e[$e], delete e[Ai], delete e[Uh], delete e[Ch];
  }
  function al(e) {
    var t = e[ke];
    if (t) return t;
    for (var a = e.parentNode; a; ) {
      if (t = a[tl] || a[ke]) {
        if (a = t.alternate, t.child !== null || a !== null && a.child !== null)
          for (e = bo(e); e !== null; ) {
            if (a = e[ke]) return a;
            e = bo(e);
          }
        return t;
      }
      e = a, a = e.parentNode;
    }
    return null;
  }
  function ll(e) {
    if (e = e[ke] || e[tl]) {
      var t = e.tag;
      if (t === 5 || t === 6 || t === 13 || t === 26 || t === 27 || t === 3)
        return e;
    }
    return null;
  }
  function Wl(e) {
    var t = e.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return e.stateNode;
    throw Error(f(33));
  }
  function ul(e) {
    var t = e[as];
    return t || (t = e[as] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() }), t;
  }
  function je(e) {
    e[$l] = !0;
  }
  var ls = /* @__PURE__ */ new Set(), us = {};
  function Za(e, t) {
    nl(e, t), nl(e + "Capture", t);
  }
  function nl(e, t) {
    for (us[e] = t, e = 0; e < t.length; e++)
      ls.add(t[e]);
  }
  var jh = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), ns = {}, is = {};
  function Zh(e) {
    return gi.call(is, e) ? !0 : gi.call(ns, e) ? !1 : jh.test(e) ? is[e] = !0 : (ns[e] = !0, !1);
  }
  function Pu(e, t, a) {
    if (Zh(t))
      if (a === null) e.removeAttribute(t);
      else {
        switch (typeof a) {
          case "undefined":
          case "function":
          case "symbol":
            e.removeAttribute(t);
            return;
          case "boolean":
            var l = t.toLowerCase().slice(0, 5);
            if (l !== "data-" && l !== "aria-") {
              e.removeAttribute(t);
              return;
            }
        }
        e.setAttribute(t, "" + a);
      }
  }
  function en(e, t, a) {
    if (a === null) e.removeAttribute(t);
    else {
      switch (typeof a) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          e.removeAttribute(t);
          return;
      }
      e.setAttribute(t, "" + a);
    }
  }
  function Bt(e, t, a, l) {
    if (l === null) e.removeAttribute(a);
    else {
      switch (typeof l) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          e.removeAttribute(a);
          return;
      }
      e.setAttributeNS(t, a, "" + l);
    }
  }
  var xi, cs;
  function il(e) {
    if (xi === void 0)
      try {
        throw Error();
      } catch (a) {
        var t = a.stack.trim().match(/\n( *(at )?)/);
        xi = t && t[1] || "", cs = -1 < a.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < a.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + xi + e + cs;
  }
  var Oi = !1;
  function zi(e, t) {
    if (!e || Oi) return "";
    Oi = !0;
    var a = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var l = {
        DetermineComponentFrameRoot: function() {
          try {
            if (t) {
              var M = function() {
                throw Error();
              };
              if (Object.defineProperty(M.prototype, "props", {
                set: function() {
                  throw Error();
                }
              }), typeof Reflect == "object" && Reflect.construct) {
                try {
                  Reflect.construct(M, []);
                } catch (T) {
                  var S = T;
                }
                Reflect.construct(e, [], M);
              } else {
                try {
                  M.call();
                } catch (T) {
                  S = T;
                }
                e.call(M.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (T) {
                S = T;
              }
              (M = e()) && typeof M.catch == "function" && M.catch(function() {
              });
            }
          } catch (T) {
            if (T && S && typeof T.stack == "string")
              return [T.stack, S.stack];
          }
          return [null, null];
        }
      };
      l.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var u = Object.getOwnPropertyDescriptor(
        l.DetermineComponentFrameRoot,
        "name"
      );
      u && u.configurable && Object.defineProperty(
        l.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
      var n = l.DetermineComponentFrameRoot(), s = n[0], d = n[1];
      if (s && d) {
        var m = s.split(`
`), b = d.split(`
`);
        for (u = l = 0; l < m.length && !m[l].includes("DetermineComponentFrameRoot"); )
          l++;
        for (; u < b.length && !b[u].includes(
          "DetermineComponentFrameRoot"
        ); )
          u++;
        if (l === m.length || u === b.length)
          for (l = m.length - 1, u = b.length - 1; 1 <= l && 0 <= u && m[l] !== b[u]; )
            u--;
        for (; 1 <= l && 0 <= u; l--, u--)
          if (m[l] !== b[u]) {
            if (l !== 1 || u !== 1)
              do
                if (l--, u--, 0 > u || m[l] !== b[u]) {
                  var x = `
` + m[l].replace(" at new ", " at ");
                  return e.displayName && x.includes("<anonymous>") && (x = x.replace("<anonymous>", e.displayName)), x;
                }
              while (1 <= l && 0 <= u);
            break;
          }
      }
    } finally {
      Oi = !1, Error.prepareStackTrace = a;
    }
    return (a = e ? e.displayName || e.name : "") ? il(a) : "";
  }
  function Hh(e) {
    switch (e.tag) {
      case 26:
      case 27:
      case 5:
        return il(e.type);
      case 16:
        return il("Lazy");
      case 13:
        return il("Suspense");
      case 19:
        return il("SuspenseList");
      case 0:
      case 15:
        return zi(e.type, !1);
      case 11:
        return zi(e.type.render, !1);
      case 1:
        return zi(e.type, !0);
      case 31:
        return il("Activity");
      default:
        return "";
    }
  }
  function fs(e) {
    try {
      var t = "";
      do
        t += Hh(e), e = e.return;
      while (e);
      return t;
    } catch (a) {
      return `
Error generating stack: ` + a.message + `
` + a.stack;
    }
  }
  function mt(e) {
    switch (typeof e) {
      case "bigint":
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return e;
      case "object":
        return e;
      default:
        return "";
    }
  }
  function ss(e) {
    var t = e.type;
    return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
  }
  function qh(e) {
    var t = ss(e) ? "checked" : "value", a = Object.getOwnPropertyDescriptor(
      e.constructor.prototype,
      t
    ), l = "" + e[t];
    if (!e.hasOwnProperty(t) && typeof a < "u" && typeof a.get == "function" && typeof a.set == "function") {
      var u = a.get, n = a.set;
      return Object.defineProperty(e, t, {
        configurable: !0,
        get: function() {
          return u.call(this);
        },
        set: function(s) {
          l = "" + s, n.call(this, s);
        }
      }), Object.defineProperty(e, t, {
        enumerable: a.enumerable
      }), {
        getValue: function() {
          return l;
        },
        setValue: function(s) {
          l = "" + s;
        },
        stopTracking: function() {
          e._valueTracker = null, delete e[t];
        }
      };
    }
  }
  function tn(e) {
    e._valueTracker || (e._valueTracker = qh(e));
  }
  function rs(e) {
    if (!e) return !1;
    var t = e._valueTracker;
    if (!t) return !0;
    var a = t.getValue(), l = "";
    return e && (l = ss(e) ? e.checked ? "true" : "false" : e.value), e = l, e !== a ? (t.setValue(e), !0) : !1;
  }
  function an(e) {
    if (e = e || (typeof document < "u" ? document : void 0), typeof e > "u") return null;
    try {
      return e.activeElement || e.body;
    } catch {
      return e.body;
    }
  }
  var Bh = /[\n"\\]/g;
  function yt(e) {
    return e.replace(
      Bh,
      function(t) {
        return "\\" + t.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function Ri(e, t, a, l, u, n, s, d) {
    e.name = "", s != null && typeof s != "function" && typeof s != "symbol" && typeof s != "boolean" ? e.type = s : e.removeAttribute("type"), t != null ? s === "number" ? (t === 0 && e.value === "" || e.value != t) && (e.value = "" + mt(t)) : e.value !== "" + mt(t) && (e.value = "" + mt(t)) : s !== "submit" && s !== "reset" || e.removeAttribute("value"), t != null ? Mi(e, s, mt(t)) : a != null ? Mi(e, s, mt(a)) : l != null && e.removeAttribute("value"), u == null && n != null && (e.defaultChecked = !!n), u != null && (e.checked = u && typeof u != "function" && typeof u != "symbol"), d != null && typeof d != "function" && typeof d != "symbol" && typeof d != "boolean" ? e.name = "" + mt(d) : e.removeAttribute("name");
  }
  function ds(e, t, a, l, u, n, s, d) {
    if (n != null && typeof n != "function" && typeof n != "symbol" && typeof n != "boolean" && (e.type = n), t != null || a != null) {
      if (!(n !== "submit" && n !== "reset" || t != null))
        return;
      a = a != null ? "" + mt(a) : "", t = t != null ? "" + mt(t) : a, d || t === e.value || (e.value = t), e.defaultValue = t;
    }
    l = l ?? u, l = typeof l != "function" && typeof l != "symbol" && !!l, e.checked = d ? e.checked : !!l, e.defaultChecked = !!l, s != null && typeof s != "function" && typeof s != "symbol" && typeof s != "boolean" && (e.name = s);
  }
  function Mi(e, t, a) {
    t === "number" && an(e.ownerDocument) === e || e.defaultValue === "" + a || (e.defaultValue = "" + a);
  }
  function cl(e, t, a, l) {
    if (e = e.options, t) {
      t = {};
      for (var u = 0; u < a.length; u++)
        t["$" + a[u]] = !0;
      for (a = 0; a < e.length; a++)
        u = t.hasOwnProperty("$" + e[a].value), e[a].selected !== u && (e[a].selected = u), u && l && (e[a].defaultSelected = !0);
    } else {
      for (a = "" + mt(a), t = null, u = 0; u < e.length; u++) {
        if (e[u].value === a) {
          e[u].selected = !0, l && (e[u].defaultSelected = !0);
          return;
        }
        t !== null || e[u].disabled || (t = e[u]);
      }
      t !== null && (t.selected = !0);
    }
  }
  function os(e, t, a) {
    if (t != null && (t = "" + mt(t), t !== e.value && (e.value = t), a == null)) {
      e.defaultValue !== t && (e.defaultValue = t);
      return;
    }
    e.defaultValue = a != null ? "" + mt(a) : "";
  }
  function hs(e, t, a, l) {
    if (t == null) {
      if (l != null) {
        if (a != null) throw Error(f(92));
        if (Qe(l)) {
          if (1 < l.length) throw Error(f(93));
          l = l[0];
        }
        a = l;
      }
      a == null && (a = ""), t = a;
    }
    a = mt(t), e.defaultValue = a, l = e.textContent, l === a && l !== "" && l !== null && (e.value = l);
  }
  function fl(e, t) {
    if (t) {
      var a = e.firstChild;
      if (a && a === e.lastChild && a.nodeType === 3) {
        a.nodeValue = t;
        return;
      }
    }
    e.textContent = t;
  }
  var Yh = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function ms(e, t, a) {
    var l = t.indexOf("--") === 0;
    a == null || typeof a == "boolean" || a === "" ? l ? e.setProperty(t, "") : t === "float" ? e.cssFloat = "" : e[t] = "" : l ? e.setProperty(t, a) : typeof a != "number" || a === 0 || Yh.has(t) ? t === "float" ? e.cssFloat = a : e[t] = ("" + a).trim() : e[t] = a + "px";
  }
  function ys(e, t, a) {
    if (t != null && typeof t != "object")
      throw Error(f(62));
    if (e = e.style, a != null) {
      for (var l in a)
        !a.hasOwnProperty(l) || t != null && t.hasOwnProperty(l) || (l.indexOf("--") === 0 ? e.setProperty(l, "") : l === "float" ? e.cssFloat = "" : e[l] = "");
      for (var u in t)
        l = t[u], t.hasOwnProperty(u) && a[u] !== l && ms(e, u, l);
    } else
      for (var n in t)
        t.hasOwnProperty(n) && ms(e, n, t[n]);
  }
  function Di(e) {
    if (e.indexOf("-") === -1) return !1;
    switch (e) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return !1;
      default:
        return !0;
    }
  }
  var Gh = /* @__PURE__ */ new Map([
    ["acceptCharset", "accept-charset"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
    ["crossOrigin", "crossorigin"],
    ["accentHeight", "accent-height"],
    ["alignmentBaseline", "alignment-baseline"],
    ["arabicForm", "arabic-form"],
    ["baselineShift", "baseline-shift"],
    ["capHeight", "cap-height"],
    ["clipPath", "clip-path"],
    ["clipRule", "clip-rule"],
    ["colorInterpolation", "color-interpolation"],
    ["colorInterpolationFilters", "color-interpolation-filters"],
    ["colorProfile", "color-profile"],
    ["colorRendering", "color-rendering"],
    ["dominantBaseline", "dominant-baseline"],
    ["enableBackground", "enable-background"],
    ["fillOpacity", "fill-opacity"],
    ["fillRule", "fill-rule"],
    ["floodColor", "flood-color"],
    ["floodOpacity", "flood-opacity"],
    ["fontFamily", "font-family"],
    ["fontSize", "font-size"],
    ["fontSizeAdjust", "font-size-adjust"],
    ["fontStretch", "font-stretch"],
    ["fontStyle", "font-style"],
    ["fontVariant", "font-variant"],
    ["fontWeight", "font-weight"],
    ["glyphName", "glyph-name"],
    ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
    ["glyphOrientationVertical", "glyph-orientation-vertical"],
    ["horizAdvX", "horiz-adv-x"],
    ["horizOriginX", "horiz-origin-x"],
    ["imageRendering", "image-rendering"],
    ["letterSpacing", "letter-spacing"],
    ["lightingColor", "lighting-color"],
    ["markerEnd", "marker-end"],
    ["markerMid", "marker-mid"],
    ["markerStart", "marker-start"],
    ["overlinePosition", "overline-position"],
    ["overlineThickness", "overline-thickness"],
    ["paintOrder", "paint-order"],
    ["panose-1", "panose-1"],
    ["pointerEvents", "pointer-events"],
    ["renderingIntent", "rendering-intent"],
    ["shapeRendering", "shape-rendering"],
    ["stopColor", "stop-color"],
    ["stopOpacity", "stop-opacity"],
    ["strikethroughPosition", "strikethrough-position"],
    ["strikethroughThickness", "strikethrough-thickness"],
    ["strokeDasharray", "stroke-dasharray"],
    ["strokeDashoffset", "stroke-dashoffset"],
    ["strokeLinecap", "stroke-linecap"],
    ["strokeLinejoin", "stroke-linejoin"],
    ["strokeMiterlimit", "stroke-miterlimit"],
    ["strokeOpacity", "stroke-opacity"],
    ["strokeWidth", "stroke-width"],
    ["textAnchor", "text-anchor"],
    ["textDecoration", "text-decoration"],
    ["textRendering", "text-rendering"],
    ["transformOrigin", "transform-origin"],
    ["underlinePosition", "underline-position"],
    ["underlineThickness", "underline-thickness"],
    ["unicodeBidi", "unicode-bidi"],
    ["unicodeRange", "unicode-range"],
    ["unitsPerEm", "units-per-em"],
    ["vAlphabetic", "v-alphabetic"],
    ["vHanging", "v-hanging"],
    ["vIdeographic", "v-ideographic"],
    ["vMathematical", "v-mathematical"],
    ["vectorEffect", "vector-effect"],
    ["vertAdvY", "vert-adv-y"],
    ["vertOriginX", "vert-origin-x"],
    ["vertOriginY", "vert-origin-y"],
    ["wordSpacing", "word-spacing"],
    ["writingMode", "writing-mode"],
    ["xmlnsXlink", "xmlns:xlink"],
    ["xHeight", "x-height"]
  ]), Xh = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function ln(e) {
    return Xh.test("" + e) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : e;
  }
  var Ni = null;
  function Ui(e) {
    return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
  }
  var sl = null, rl = null;
  function vs(e) {
    var t = ll(e);
    if (t && (e = t.stateNode)) {
      var a = e[$e] || null;
      e: switch (e = t.stateNode, t.type) {
        case "input":
          if (Ri(
            e,
            a.value,
            a.defaultValue,
            a.defaultValue,
            a.checked,
            a.defaultChecked,
            a.type,
            a.name
          ), t = a.name, a.type === "radio" && t != null) {
            for (a = e; a.parentNode; ) a = a.parentNode;
            for (a = a.querySelectorAll(
              'input[name="' + yt(
                "" + t
              ) + '"][type="radio"]'
            ), t = 0; t < a.length; t++) {
              var l = a[t];
              if (l !== e && l.form === e.form) {
                var u = l[$e] || null;
                if (!u) throw Error(f(90));
                Ri(
                  l,
                  u.value,
                  u.defaultValue,
                  u.defaultValue,
                  u.checked,
                  u.defaultChecked,
                  u.type,
                  u.name
                );
              }
            }
            for (t = 0; t < a.length; t++)
              l = a[t], l.form === e.form && rs(l);
          }
          break e;
        case "textarea":
          os(e, a.value, a.defaultValue);
          break e;
        case "select":
          t = a.value, t != null && cl(e, !!a.multiple, t, !1);
      }
    }
  }
  var Ci = !1;
  function gs(e, t, a) {
    if (Ci) return e(t, a);
    Ci = !0;
    try {
      var l = e(t);
      return l;
    } finally {
      if (Ci = !1, (sl !== null || rl !== null) && (Qn(), sl && (t = sl, e = rl, rl = sl = null, vs(t), e)))
        for (t = 0; t < e.length; t++) vs(e[t]);
    }
  }
  function Fl(e, t) {
    var a = e.stateNode;
    if (a === null) return null;
    var l = a[$e] || null;
    if (l === null) return null;
    a = l[t];
    e: switch (t) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (l = !l.disabled) || (e = e.type, l = !(e === "button" || e === "input" || e === "select" || e === "textarea")), e = !l;
        break e;
      default:
        e = !1;
    }
    if (e) return null;
    if (a && typeof a != "function")
      throw Error(
        f(231, t, typeof a)
      );
    return a;
  }
  var Yt = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), ji = !1;
  if (Yt)
    try {
      var Il = {};
      Object.defineProperty(Il, "passive", {
        get: function() {
          ji = !0;
        }
      }), window.addEventListener("test", Il, Il), window.removeEventListener("test", Il, Il);
    } catch {
      ji = !1;
    }
  var la = null, Zi = null, un = null;
  function _s() {
    if (un) return un;
    var e, t = Zi, a = t.length, l, u = "value" in la ? la.value : la.textContent, n = u.length;
    for (e = 0; e < a && t[e] === u[e]; e++) ;
    var s = a - e;
    for (l = 1; l <= s && t[a - l] === u[n - l]; l++) ;
    return un = u.slice(e, 1 < l ? 1 - l : void 0);
  }
  function nn(e) {
    var t = e.keyCode;
    return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
  }
  function cn() {
    return !0;
  }
  function ps() {
    return !1;
  }
  function We(e) {
    function t(a, l, u, n, s) {
      this._reactName = a, this._targetInst = u, this.type = l, this.nativeEvent = n, this.target = s, this.currentTarget = null;
      for (var d in e)
        e.hasOwnProperty(d) && (a = e[d], this[d] = a ? a(n) : n[d]);
      return this.isDefaultPrevented = (n.defaultPrevented != null ? n.defaultPrevented : n.returnValue === !1) ? cn : ps, this.isPropagationStopped = ps, this;
    }
    return U(t.prototype, {
      preventDefault: function() {
        this.defaultPrevented = !0;
        var a = this.nativeEvent;
        a && (a.preventDefault ? a.preventDefault() : typeof a.returnValue != "unknown" && (a.returnValue = !1), this.isDefaultPrevented = cn);
      },
      stopPropagation: function() {
        var a = this.nativeEvent;
        a && (a.stopPropagation ? a.stopPropagation() : typeof a.cancelBubble != "unknown" && (a.cancelBubble = !0), this.isPropagationStopped = cn);
      },
      persist: function() {
      },
      isPersistent: cn
    }), t;
  }
  var Ha = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(e) {
      return e.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, fn = We(Ha), Pl = U({}, Ha, { view: 0, detail: 0 }), Vh = We(Pl), Hi, qi, eu, sn = U({}, Pl, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: Yi,
    button: 0,
    buttons: 0,
    relatedTarget: function(e) {
      return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
    },
    movementX: function(e) {
      return "movementX" in e ? e.movementX : (e !== eu && (eu && e.type === "mousemove" ? (Hi = e.screenX - eu.screenX, qi = e.screenY - eu.screenY) : qi = Hi = 0, eu = e), Hi);
    },
    movementY: function(e) {
      return "movementY" in e ? e.movementY : qi;
    }
  }), bs = We(sn), Qh = U({}, sn, { dataTransfer: 0 }), kh = We(Qh), wh = U({}, Pl, { relatedTarget: 0 }), Bi = We(wh), Lh = U({}, Ha, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), Kh = We(Lh), Jh = U({}, Ha, {
    clipboardData: function(e) {
      return "clipboardData" in e ? e.clipboardData : window.clipboardData;
    }
  }), $h = We(Jh), Wh = U({}, Ha, { data: 0 }), Ss = We(Wh), Fh = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  }, Ih = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  }, Ph = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function em(e) {
    var t = this.nativeEvent;
    return t.getModifierState ? t.getModifierState(e) : (e = Ph[e]) ? !!t[e] : !1;
  }
  function Yi() {
    return em;
  }
  var tm = U({}, Pl, {
    key: function(e) {
      if (e.key) {
        var t = Fh[e.key] || e.key;
        if (t !== "Unidentified") return t;
      }
      return e.type === "keypress" ? (e = nn(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? Ih[e.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: Yi,
    charCode: function(e) {
      return e.type === "keypress" ? nn(e) : 0;
    },
    keyCode: function(e) {
      return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
    },
    which: function(e) {
      return e.type === "keypress" ? nn(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
    }
  }), am = We(tm), lm = U({}, sn, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0
  }), Ts = We(lm), um = U({}, Pl, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: Yi
  }), nm = We(um), im = U({}, Ha, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), cm = We(im), fm = U({}, sn, {
    deltaX: function(e) {
      return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
    },
    deltaY: function(e) {
      return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), sm = We(fm), rm = U({}, Ha, {
    newState: 0,
    oldState: 0
  }), dm = We(rm), om = [9, 13, 27, 32], Gi = Yt && "CompositionEvent" in window, tu = null;
  Yt && "documentMode" in document && (tu = document.documentMode);
  var hm = Yt && "TextEvent" in window && !tu, As = Yt && (!Gi || tu && 8 < tu && 11 >= tu), Es = " ", xs = !1;
  function Os(e, t) {
    switch (e) {
      case "keyup":
        return om.indexOf(t.keyCode) !== -1;
      case "keydown":
        return t.keyCode !== 229;
      case "keypress":
      case "mousedown":
      case "focusout":
        return !0;
      default:
        return !1;
    }
  }
  function zs(e) {
    return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
  }
  var dl = !1;
  function mm(e, t) {
    switch (e) {
      case "compositionend":
        return zs(t);
      case "keypress":
        return t.which !== 32 ? null : (xs = !0, Es);
      case "textInput":
        return e = t.data, e === Es && xs ? null : e;
      default:
        return null;
    }
  }
  function ym(e, t) {
    if (dl)
      return e === "compositionend" || !Gi && Os(e, t) ? (e = _s(), un = Zi = la = null, dl = !1, e) : null;
    switch (e) {
      case "paste":
        return null;
      case "keypress":
        if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
          if (t.char && 1 < t.char.length)
            return t.char;
          if (t.which) return String.fromCharCode(t.which);
        }
        return null;
      case "compositionend":
        return As && t.locale !== "ko" ? null : t.data;
      default:
        return null;
    }
  }
  var vm = {
    color: !0,
    date: !0,
    datetime: !0,
    "datetime-local": !0,
    email: !0,
    month: !0,
    number: !0,
    password: !0,
    range: !0,
    search: !0,
    tel: !0,
    text: !0,
    time: !0,
    url: !0,
    week: !0
  };
  function Rs(e) {
    var t = e && e.nodeName && e.nodeName.toLowerCase();
    return t === "input" ? !!vm[e.type] : t === "textarea";
  }
  function Ms(e, t, a, l) {
    sl ? rl ? rl.push(l) : rl = [l] : sl = l, t = $n(t, "onChange"), 0 < t.length && (a = new fn(
      "onChange",
      "change",
      null,
      a,
      l
    ), e.push({ event: a, listeners: t }));
  }
  var au = null, lu = null;
  function gm(e) {
    so(e, 0);
  }
  function rn(e) {
    var t = Wl(e);
    if (rs(t)) return e;
  }
  function Ds(e, t) {
    if (e === "change") return t;
  }
  var Ns = !1;
  if (Yt) {
    var Xi;
    if (Yt) {
      var Vi = "oninput" in document;
      if (!Vi) {
        var Us = document.createElement("div");
        Us.setAttribute("oninput", "return;"), Vi = typeof Us.oninput == "function";
      }
      Xi = Vi;
    } else Xi = !1;
    Ns = Xi && (!document.documentMode || 9 < document.documentMode);
  }
  function Cs() {
    au && (au.detachEvent("onpropertychange", js), lu = au = null);
  }
  function js(e) {
    if (e.propertyName === "value" && rn(lu)) {
      var t = [];
      Ms(
        t,
        lu,
        e,
        Ui(e)
      ), gs(gm, t);
    }
  }
  function _m(e, t, a) {
    e === "focusin" ? (Cs(), au = t, lu = a, au.attachEvent("onpropertychange", js)) : e === "focusout" && Cs();
  }
  function pm(e) {
    if (e === "selectionchange" || e === "keyup" || e === "keydown")
      return rn(lu);
  }
  function bm(e, t) {
    if (e === "click") return rn(t);
  }
  function Sm(e, t) {
    if (e === "input" || e === "change")
      return rn(t);
  }
  function Tm(e, t) {
    return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
  }
  var it = typeof Object.is == "function" ? Object.is : Tm;
  function uu(e, t) {
    if (it(e, t)) return !0;
    if (typeof e != "object" || e === null || typeof t != "object" || t === null)
      return !1;
    var a = Object.keys(e), l = Object.keys(t);
    if (a.length !== l.length) return !1;
    for (l = 0; l < a.length; l++) {
      var u = a[l];
      if (!gi.call(t, u) || !it(e[u], t[u]))
        return !1;
    }
    return !0;
  }
  function Zs(e) {
    for (; e && e.firstChild; ) e = e.firstChild;
    return e;
  }
  function Hs(e, t) {
    var a = Zs(e);
    e = 0;
    for (var l; a; ) {
      if (a.nodeType === 3) {
        if (l = e + a.textContent.length, e <= t && l >= t)
          return { node: a, offset: t - e };
        e = l;
      }
      e: {
        for (; a; ) {
          if (a.nextSibling) {
            a = a.nextSibling;
            break e;
          }
          a = a.parentNode;
        }
        a = void 0;
      }
      a = Zs(a);
    }
  }
  function qs(e, t) {
    return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? qs(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
  }
  function Bs(e) {
    e = e != null && e.ownerDocument != null && e.ownerDocument.defaultView != null ? e.ownerDocument.defaultView : window;
    for (var t = an(e.document); t instanceof e.HTMLIFrameElement; ) {
      try {
        var a = typeof t.contentWindow.location.href == "string";
      } catch {
        a = !1;
      }
      if (a) e = t.contentWindow;
      else break;
      t = an(e.document);
    }
    return t;
  }
  function Qi(e) {
    var t = e && e.nodeName && e.nodeName.toLowerCase();
    return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
  }
  var Am = Yt && "documentMode" in document && 11 >= document.documentMode, ol = null, ki = null, nu = null, wi = !1;
  function Ys(e, t, a) {
    var l = a.window === a ? a.document : a.nodeType === 9 ? a : a.ownerDocument;
    wi || ol == null || ol !== an(l) || (l = ol, "selectionStart" in l && Qi(l) ? l = { start: l.selectionStart, end: l.selectionEnd } : (l = (l.ownerDocument && l.ownerDocument.defaultView || window).getSelection(), l = {
      anchorNode: l.anchorNode,
      anchorOffset: l.anchorOffset,
      focusNode: l.focusNode,
      focusOffset: l.focusOffset
    }), nu && uu(nu, l) || (nu = l, l = $n(ki, "onSelect"), 0 < l.length && (t = new fn(
      "onSelect",
      "select",
      null,
      t,
      a
    ), e.push({ event: t, listeners: l }), t.target = ol)));
  }
  function qa(e, t) {
    var a = {};
    return a[e.toLowerCase()] = t.toLowerCase(), a["Webkit" + e] = "webkit" + t, a["Moz" + e] = "moz" + t, a;
  }
  var hl = {
    animationend: qa("Animation", "AnimationEnd"),
    animationiteration: qa("Animation", "AnimationIteration"),
    animationstart: qa("Animation", "AnimationStart"),
    transitionrun: qa("Transition", "TransitionRun"),
    transitionstart: qa("Transition", "TransitionStart"),
    transitioncancel: qa("Transition", "TransitionCancel"),
    transitionend: qa("Transition", "TransitionEnd")
  }, Li = {}, Gs = {};
  Yt && (Gs = document.createElement("div").style, "AnimationEvent" in window || (delete hl.animationend.animation, delete hl.animationiteration.animation, delete hl.animationstart.animation), "TransitionEvent" in window || delete hl.transitionend.transition);
  function Ba(e) {
    if (Li[e]) return Li[e];
    if (!hl[e]) return e;
    var t = hl[e], a;
    for (a in t)
      if (t.hasOwnProperty(a) && a in Gs)
        return Li[e] = t[a];
    return e;
  }
  var Xs = Ba("animationend"), Vs = Ba("animationiteration"), Qs = Ba("animationstart"), Em = Ba("transitionrun"), xm = Ba("transitionstart"), Om = Ba("transitioncancel"), ks = Ba("transitionend"), ws = /* @__PURE__ */ new Map(), Ki = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  Ki.push("scrollEnd");
  function xt(e, t) {
    ws.set(e, t), Za(t, [e]);
  }
  var Ls = /* @__PURE__ */ new WeakMap();
  function vt(e, t) {
    if (typeof e == "object" && e !== null) {
      var a = Ls.get(e);
      return a !== void 0 ? a : (t = {
        value: e,
        source: t,
        stack: fs(t)
      }, Ls.set(e, t), t);
    }
    return {
      value: e,
      source: t,
      stack: fs(t)
    };
  }
  var gt = [], ml = 0, Ji = 0;
  function dn() {
    for (var e = ml, t = Ji = ml = 0; t < e; ) {
      var a = gt[t];
      gt[t++] = null;
      var l = gt[t];
      gt[t++] = null;
      var u = gt[t];
      gt[t++] = null;
      var n = gt[t];
      if (gt[t++] = null, l !== null && u !== null) {
        var s = l.pending;
        s === null ? u.next = u : (u.next = s.next, s.next = u), l.pending = u;
      }
      n !== 0 && Ks(a, u, n);
    }
  }
  function on(e, t, a, l) {
    gt[ml++] = e, gt[ml++] = t, gt[ml++] = a, gt[ml++] = l, Ji |= l, e.lanes |= l, e = e.alternate, e !== null && (e.lanes |= l);
  }
  function $i(e, t, a, l) {
    return on(e, t, a, l), hn(e);
  }
  function yl(e, t) {
    return on(e, null, null, t), hn(e);
  }
  function Ks(e, t, a) {
    e.lanes |= a;
    var l = e.alternate;
    l !== null && (l.lanes |= a);
    for (var u = !1, n = e.return; n !== null; )
      n.childLanes |= a, l = n.alternate, l !== null && (l.childLanes |= a), n.tag === 22 && (e = n.stateNode, e === null || e._visibility & 1 || (u = !0)), e = n, n = n.return;
    return e.tag === 3 ? (n = e.stateNode, u && t !== null && (u = 31 - nt(a), e = n.hiddenUpdates, l = e[u], l === null ? e[u] = [t] : l.push(t), t.lane = a | 536870912), n) : null;
  }
  function hn(e) {
    if (50 < Du)
      throw Du = 0, tf = null, Error(f(185));
    for (var t = e.return; t !== null; )
      e = t, t = e.return;
    return e.tag === 3 ? e.stateNode : null;
  }
  var vl = {};
  function zm(e, t, a, l) {
    this.tag = e, this.key = a, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = l, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function ct(e, t, a, l) {
    return new zm(e, t, a, l);
  }
  function Wi(e) {
    return e = e.prototype, !(!e || !e.isReactComponent);
  }
  function Gt(e, t) {
    var a = e.alternate;
    return a === null ? (a = ct(
      e.tag,
      t,
      e.key,
      e.mode
    ), a.elementType = e.elementType, a.type = e.type, a.stateNode = e.stateNode, a.alternate = e, e.alternate = a) : (a.pendingProps = t, a.type = e.type, a.flags = 0, a.subtreeFlags = 0, a.deletions = null), a.flags = e.flags & 65011712, a.childLanes = e.childLanes, a.lanes = e.lanes, a.child = e.child, a.memoizedProps = e.memoizedProps, a.memoizedState = e.memoizedState, a.updateQueue = e.updateQueue, t = e.dependencies, a.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, a.sibling = e.sibling, a.index = e.index, a.ref = e.ref, a.refCleanup = e.refCleanup, a;
  }
  function Js(e, t) {
    e.flags &= 65011714;
    var a = e.alternate;
    return a === null ? (e.childLanes = 0, e.lanes = t, e.child = null, e.subtreeFlags = 0, e.memoizedProps = null, e.memoizedState = null, e.updateQueue = null, e.dependencies = null, e.stateNode = null) : (e.childLanes = a.childLanes, e.lanes = a.lanes, e.child = a.child, e.subtreeFlags = 0, e.deletions = null, e.memoizedProps = a.memoizedProps, e.memoizedState = a.memoizedState, e.updateQueue = a.updateQueue, e.type = a.type, t = a.dependencies, e.dependencies = t === null ? null : {
      lanes: t.lanes,
      firstContext: t.firstContext
    }), e;
  }
  function mn(e, t, a, l, u, n) {
    var s = 0;
    if (l = e, typeof e == "function") Wi(e) && (s = 1);
    else if (typeof e == "string")
      s = My(
        e,
        a,
        X.current
      ) ? 26 : e === "html" || e === "head" || e === "body" ? 27 : 5;
    else
      e: switch (e) {
        case Rt:
          return e = ct(31, a, t, u), e.elementType = Rt, e.lanes = n, e;
        case pe:
          return Ya(a.children, u, n, t);
        case Je:
          s = 8, u |= 24;
          break;
        case Ne:
          return e = ct(12, a, t, u | 2), e.elementType = Ne, e.lanes = n, e;
        case ie:
          return e = ct(13, a, t, u), e.elementType = ie, e.lanes = n, e;
        case et:
          return e = ct(19, a, t, u), e.elementType = et, e.lanes = n, e;
        default:
          if (typeof e == "object" && e !== null)
            switch (e.$$typeof) {
              case Na:
              case Xe:
                s = 10;
                break e;
              case Ht:
                s = 9;
                break e;
              case Et:
                s = 11;
                break e;
              case tt:
                s = 14;
                break e;
              case at:
                s = 16, l = null;
                break e;
            }
          s = 29, a = Error(
            f(130, e === null ? "null" : typeof e, "")
          ), l = null;
      }
    return t = ct(s, a, t, u), t.elementType = e, t.type = l, t.lanes = n, t;
  }
  function Ya(e, t, a, l) {
    return e = ct(7, e, l, t), e.lanes = a, e;
  }
  function Fi(e, t, a) {
    return e = ct(6, e, null, t), e.lanes = a, e;
  }
  function Ii(e, t, a) {
    return t = ct(
      4,
      e.children !== null ? e.children : [],
      e.key,
      t
    ), t.lanes = a, t.stateNode = {
      containerInfo: e.containerInfo,
      pendingChildren: null,
      implementation: e.implementation
    }, t;
  }
  var gl = [], _l = 0, yn = null, vn = 0, _t = [], pt = 0, Ga = null, Xt = 1, Vt = "";
  function Xa(e, t) {
    gl[_l++] = vn, gl[_l++] = yn, yn = e, vn = t;
  }
  function $s(e, t, a) {
    _t[pt++] = Xt, _t[pt++] = Vt, _t[pt++] = Ga, Ga = e;
    var l = Xt;
    e = Vt;
    var u = 32 - nt(l) - 1;
    l &= ~(1 << u), a += 1;
    var n = 32 - nt(t) + u;
    if (30 < n) {
      var s = u - u % 5;
      n = (l & (1 << s) - 1).toString(32), l >>= s, u -= s, Xt = 1 << 32 - nt(t) + u | a << u | l, Vt = n + e;
    } else
      Xt = 1 << n | a << u | l, Vt = e;
  }
  function Pi(e) {
    e.return !== null && (Xa(e, 1), $s(e, 1, 0));
  }
  function ec(e) {
    for (; e === yn; )
      yn = gl[--_l], gl[_l] = null, vn = gl[--_l], gl[_l] = null;
    for (; e === Ga; )
      Ga = _t[--pt], _t[pt] = null, Vt = _t[--pt], _t[pt] = null, Xt = _t[--pt], _t[pt] = null;
  }
  var Ke = null, Ee = null, re = !1, Va = null, Dt = !1, tc = Error(f(519));
  function Qa(e) {
    var t = Error(f(418, ""));
    throw fu(vt(t, e)), tc;
  }
  function Ws(e) {
    var t = e.stateNode, a = e.type, l = e.memoizedProps;
    switch (t[ke] = e, t[$e] = l, a) {
      case "dialog":
        te("cancel", t), te("close", t);
        break;
      case "iframe":
      case "object":
      case "embed":
        te("load", t);
        break;
      case "video":
      case "audio":
        for (a = 0; a < Uu.length; a++)
          te(Uu[a], t);
        break;
      case "source":
        te("error", t);
        break;
      case "img":
      case "image":
      case "link":
        te("error", t), te("load", t);
        break;
      case "details":
        te("toggle", t);
        break;
      case "input":
        te("invalid", t), ds(
          t,
          l.value,
          l.defaultValue,
          l.checked,
          l.defaultChecked,
          l.type,
          l.name,
          !0
        ), tn(t);
        break;
      case "select":
        te("invalid", t);
        break;
      case "textarea":
        te("invalid", t), hs(t, l.value, l.defaultValue, l.children), tn(t);
    }
    a = l.children, typeof a != "string" && typeof a != "number" && typeof a != "bigint" || t.textContent === "" + a || l.suppressHydrationWarning === !0 || mo(t.textContent, a) ? (l.popover != null && (te("beforetoggle", t), te("toggle", t)), l.onScroll != null && te("scroll", t), l.onScrollEnd != null && te("scrollend", t), l.onClick != null && (t.onclick = Wn), t = !0) : t = !1, t || Qa(e);
  }
  function Fs(e) {
    for (Ke = e.return; Ke; )
      switch (Ke.tag) {
        case 5:
        case 13:
          Dt = !1;
          return;
        case 27:
        case 3:
          Dt = !0;
          return;
        default:
          Ke = Ke.return;
      }
  }
  function iu(e) {
    if (e !== Ke) return !1;
    if (!re) return Fs(e), re = !0, !1;
    var t = e.tag, a;
    if ((a = t !== 3 && t !== 27) && ((a = t === 5) && (a = e.type, a = !(a !== "form" && a !== "button") || _f(e.type, e.memoizedProps)), a = !a), a && Ee && Qa(e), Fs(e), t === 13) {
      if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(f(317));
      e: {
        for (e = e.nextSibling, t = 0; e; ) {
          if (e.nodeType === 8)
            if (a = e.data, a === "/$") {
              if (t === 0) {
                Ee = zt(e.nextSibling);
                break e;
              }
              t--;
            } else
              a !== "$" && a !== "$!" && a !== "$?" || t++;
          e = e.nextSibling;
        }
        Ee = null;
      }
    } else
      t === 27 ? (t = Ee, pa(e.type) ? (e = Tf, Tf = null, Ee = e) : Ee = t) : Ee = Ke ? zt(e.stateNode.nextSibling) : null;
    return !0;
  }
  function cu() {
    Ee = Ke = null, re = !1;
  }
  function Is() {
    var e = Va;
    return e !== null && (Pe === null ? Pe = e : Pe.push.apply(
      Pe,
      e
    ), Va = null), e;
  }
  function fu(e) {
    Va === null ? Va = [e] : Va.push(e);
  }
  var ac = D(null), ka = null, Qt = null;
  function ua(e, t, a) {
    C(ac, t._currentValue), t._currentValue = a;
  }
  function kt(e) {
    e._currentValue = ac.current, H(ac);
  }
  function lc(e, t, a) {
    for (; e !== null; ) {
      var l = e.alternate;
      if ((e.childLanes & t) !== t ? (e.childLanes |= t, l !== null && (l.childLanes |= t)) : l !== null && (l.childLanes & t) !== t && (l.childLanes |= t), e === a) break;
      e = e.return;
    }
  }
  function uc(e, t, a, l) {
    var u = e.child;
    for (u !== null && (u.return = e); u !== null; ) {
      var n = u.dependencies;
      if (n !== null) {
        var s = u.child;
        n = n.firstContext;
        e: for (; n !== null; ) {
          var d = n;
          n = u;
          for (var m = 0; m < t.length; m++)
            if (d.context === t[m]) {
              n.lanes |= a, d = n.alternate, d !== null && (d.lanes |= a), lc(
                n.return,
                a,
                e
              ), l || (s = null);
              break e;
            }
          n = d.next;
        }
      } else if (u.tag === 18) {
        if (s = u.return, s === null) throw Error(f(341));
        s.lanes |= a, n = s.alternate, n !== null && (n.lanes |= a), lc(s, a, e), s = null;
      } else s = u.child;
      if (s !== null) s.return = u;
      else
        for (s = u; s !== null; ) {
          if (s === e) {
            s = null;
            break;
          }
          if (u = s.sibling, u !== null) {
            u.return = s.return, s = u;
            break;
          }
          s = s.return;
        }
      u = s;
    }
  }
  function su(e, t, a, l) {
    e = null;
    for (var u = t, n = !1; u !== null; ) {
      if (!n) {
        if ((u.flags & 524288) !== 0) n = !0;
        else if ((u.flags & 262144) !== 0) break;
      }
      if (u.tag === 10) {
        var s = u.alternate;
        if (s === null) throw Error(f(387));
        if (s = s.memoizedProps, s !== null) {
          var d = u.type;
          it(u.pendingProps.value, s.value) || (e !== null ? e.push(d) : e = [d]);
        }
      } else if (u === lt.current) {
        if (s = u.alternate, s === null) throw Error(f(387));
        s.memoizedState.memoizedState !== u.memoizedState.memoizedState && (e !== null ? e.push(Bu) : e = [Bu]);
      }
      u = u.return;
    }
    e !== null && uc(
      t,
      e,
      a,
      l
    ), t.flags |= 262144;
  }
  function gn(e) {
    for (e = e.firstContext; e !== null; ) {
      if (!it(
        e.context._currentValue,
        e.memoizedValue
      ))
        return !0;
      e = e.next;
    }
    return !1;
  }
  function wa(e) {
    ka = e, Qt = null, e = e.dependencies, e !== null && (e.firstContext = null);
  }
  function we(e) {
    return Ps(ka, e);
  }
  function _n(e, t) {
    return ka === null && wa(e), Ps(e, t);
  }
  function Ps(e, t) {
    var a = t._currentValue;
    if (t = { context: t, memoizedValue: a, next: null }, Qt === null) {
      if (e === null) throw Error(f(308));
      Qt = t, e.dependencies = { lanes: 0, firstContext: t }, e.flags |= 524288;
    } else Qt = Qt.next = t;
    return a;
  }
  var Rm = typeof AbortController < "u" ? AbortController : function() {
    var e = [], t = this.signal = {
      aborted: !1,
      addEventListener: function(a, l) {
        e.push(l);
      }
    };
    this.abort = function() {
      t.aborted = !0, e.forEach(function(a) {
        return a();
      });
    };
  }, Mm = r.unstable_scheduleCallback, Dm = r.unstable_NormalPriority, Ue = {
    $$typeof: Xe,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function nc() {
    return {
      controller: new Rm(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function ru(e) {
    e.refCount--, e.refCount === 0 && Mm(Dm, function() {
      e.controller.abort();
    });
  }
  var du = null, ic = 0, pl = 0, bl = null;
  function Nm(e, t) {
    if (du === null) {
      var a = du = [];
      ic = 0, pl = sf(), bl = {
        status: "pending",
        value: void 0,
        then: function(l) {
          a.push(l);
        }
      };
    }
    return ic++, t.then(er, er), t;
  }
  function er() {
    if (--ic === 0 && du !== null) {
      bl !== null && (bl.status = "fulfilled");
      var e = du;
      du = null, pl = 0, bl = null;
      for (var t = 0; t < e.length; t++) (0, e[t])();
    }
  }
  function Um(e, t) {
    var a = [], l = {
      status: "pending",
      value: null,
      reason: null,
      then: function(u) {
        a.push(u);
      }
    };
    return e.then(
      function() {
        l.status = "fulfilled", l.value = t;
        for (var u = 0; u < a.length; u++) (0, a[u])(t);
      },
      function(u) {
        for (l.status = "rejected", l.reason = u, u = 0; u < a.length; u++)
          (0, a[u])(void 0);
      }
    ), l;
  }
  var tr = O.S;
  O.S = function(e, t) {
    typeof t == "object" && t !== null && typeof t.then == "function" && Nm(e, t), tr !== null && tr(e, t);
  };
  var La = D(null);
  function cc() {
    var e = La.current;
    return e !== null ? e : be.pooledCache;
  }
  function pn(e, t) {
    t === null ? C(La, La.current) : C(La, t.pool);
  }
  function ar() {
    var e = cc();
    return e === null ? null : { parent: Ue._currentValue, pool: e };
  }
  var ou = Error(f(460)), lr = Error(f(474)), bn = Error(f(542)), fc = { then: function() {
  } };
  function ur(e) {
    return e = e.status, e === "fulfilled" || e === "rejected";
  }
  function Sn() {
  }
  function nr(e, t, a) {
    switch (a = e[a], a === void 0 ? e.push(t) : a !== t && (t.then(Sn, Sn), t = a), t.status) {
      case "fulfilled":
        return t.value;
      case "rejected":
        throw e = t.reason, cr(e), e;
      default:
        if (typeof t.status == "string") t.then(Sn, Sn);
        else {
          if (e = be, e !== null && 100 < e.shellSuspendCounter)
            throw Error(f(482));
          e = t, e.status = "pending", e.then(
            function(l) {
              if (t.status === "pending") {
                var u = t;
                u.status = "fulfilled", u.value = l;
              }
            },
            function(l) {
              if (t.status === "pending") {
                var u = t;
                u.status = "rejected", u.reason = l;
              }
            }
          );
        }
        switch (t.status) {
          case "fulfilled":
            return t.value;
          case "rejected":
            throw e = t.reason, cr(e), e;
        }
        throw hu = t, ou;
    }
  }
  var hu = null;
  function ir() {
    if (hu === null) throw Error(f(459));
    var e = hu;
    return hu = null, e;
  }
  function cr(e) {
    if (e === ou || e === bn)
      throw Error(f(483));
  }
  var na = !1;
  function sc(e) {
    e.updateQueue = {
      baseState: e.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function rc(e, t) {
    e = e.updateQueue, t.updateQueue === e && (t.updateQueue = {
      baseState: e.baseState,
      firstBaseUpdate: e.firstBaseUpdate,
      lastBaseUpdate: e.lastBaseUpdate,
      shared: e.shared,
      callbacks: null
    });
  }
  function ia(e) {
    return { lane: e, tag: 0, payload: null, callback: null, next: null };
  }
  function ca(e, t, a) {
    var l = e.updateQueue;
    if (l === null) return null;
    if (l = l.shared, (oe & 2) !== 0) {
      var u = l.pending;
      return u === null ? t.next = t : (t.next = u.next, u.next = t), l.pending = t, t = hn(e), Ks(e, null, a), t;
    }
    return on(e, l, t, a), hn(e);
  }
  function mu(e, t, a) {
    if (t = t.updateQueue, t !== null && (t = t.shared, (a & 4194048) !== 0)) {
      var l = t.lanes;
      l &= e.pendingLanes, a |= l, t.lanes = a, es(e, a);
    }
  }
  function dc(e, t) {
    var a = e.updateQueue, l = e.alternate;
    if (l !== null && (l = l.updateQueue, a === l)) {
      var u = null, n = null;
      if (a = a.firstBaseUpdate, a !== null) {
        do {
          var s = {
            lane: a.lane,
            tag: a.tag,
            payload: a.payload,
            callback: null,
            next: null
          };
          n === null ? u = n = s : n = n.next = s, a = a.next;
        } while (a !== null);
        n === null ? u = n = t : n = n.next = t;
      } else u = n = t;
      a = {
        baseState: l.baseState,
        firstBaseUpdate: u,
        lastBaseUpdate: n,
        shared: l.shared,
        callbacks: l.callbacks
      }, e.updateQueue = a;
      return;
    }
    e = a.lastBaseUpdate, e === null ? a.firstBaseUpdate = t : e.next = t, a.lastBaseUpdate = t;
  }
  var oc = !1;
  function yu() {
    if (oc) {
      var e = bl;
      if (e !== null) throw e;
    }
  }
  function vu(e, t, a, l) {
    oc = !1;
    var u = e.updateQueue;
    na = !1;
    var n = u.firstBaseUpdate, s = u.lastBaseUpdate, d = u.shared.pending;
    if (d !== null) {
      u.shared.pending = null;
      var m = d, b = m.next;
      m.next = null, s === null ? n = b : s.next = b, s = m;
      var x = e.alternate;
      x !== null && (x = x.updateQueue, d = x.lastBaseUpdate, d !== s && (d === null ? x.firstBaseUpdate = b : d.next = b, x.lastBaseUpdate = m));
    }
    if (n !== null) {
      var M = u.baseState;
      s = 0, x = b = m = null, d = n;
      do {
        var S = d.lane & -536870913, T = S !== d.lane;
        if (T ? (ae & S) === S : (l & S) === S) {
          S !== 0 && S === pl && (oc = !0), x !== null && (x = x.next = {
            lane: 0,
            tag: d.tag,
            payload: d.payload,
            callback: null,
            next: null
          });
          e: {
            var w = e, V = d;
            S = t;
            var ve = a;
            switch (V.tag) {
              case 1:
                if (w = V.payload, typeof w == "function") {
                  M = w.call(ve, M, S);
                  break e;
                }
                M = w;
                break e;
              case 3:
                w.flags = w.flags & -65537 | 128;
              case 0:
                if (w = V.payload, S = typeof w == "function" ? w.call(ve, M, S) : w, S == null) break e;
                M = U({}, M, S);
                break e;
              case 2:
                na = !0;
            }
          }
          S = d.callback, S !== null && (e.flags |= 64, T && (e.flags |= 8192), T = u.callbacks, T === null ? u.callbacks = [S] : T.push(S));
        } else
          T = {
            lane: S,
            tag: d.tag,
            payload: d.payload,
            callback: d.callback,
            next: null
          }, x === null ? (b = x = T, m = M) : x = x.next = T, s |= S;
        if (d = d.next, d === null) {
          if (d = u.shared.pending, d === null)
            break;
          T = d, d = T.next, T.next = null, u.lastBaseUpdate = T, u.shared.pending = null;
        }
      } while (!0);
      x === null && (m = M), u.baseState = m, u.firstBaseUpdate = b, u.lastBaseUpdate = x, n === null && (u.shared.lanes = 0), ya |= s, e.lanes = s, e.memoizedState = M;
    }
  }
  function fr(e, t) {
    if (typeof e != "function")
      throw Error(f(191, e));
    e.call(t);
  }
  function sr(e, t) {
    var a = e.callbacks;
    if (a !== null)
      for (e.callbacks = null, e = 0; e < a.length; e++)
        fr(a[e], t);
  }
  var Sl = D(null), Tn = D(0);
  function rr(e, t) {
    e = Ft, C(Tn, e), C(Sl, t), Ft = e | t.baseLanes;
  }
  function hc() {
    C(Tn, Ft), C(Sl, Sl.current);
  }
  function mc() {
    Ft = Tn.current, H(Sl), H(Tn);
  }
  var fa = 0, F = null, me = null, Re = null, An = !1, Tl = !1, Ka = !1, En = 0, gu = 0, Al = null, Cm = 0;
  function Oe() {
    throw Error(f(321));
  }
  function yc(e, t) {
    if (t === null) return !1;
    for (var a = 0; a < t.length && a < e.length; a++)
      if (!it(e[a], t[a])) return !1;
    return !0;
  }
  function vc(e, t, a, l, u, n) {
    return fa = n, F = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, O.H = e === null || e.memoizedState === null ? Kr : Jr, Ka = !1, n = a(l, u), Ka = !1, Tl && (n = or(
      t,
      a,
      l,
      u
    )), dr(e), n;
  }
  function dr(e) {
    O.H = Dn;
    var t = me !== null && me.next !== null;
    if (fa = 0, Re = me = F = null, An = !1, gu = 0, Al = null, t) throw Error(f(300));
    e === null || Ze || (e = e.dependencies, e !== null && gn(e) && (Ze = !0));
  }
  function or(e, t, a, l) {
    F = e;
    var u = 0;
    do {
      if (Tl && (Al = null), gu = 0, Tl = !1, 25 <= u) throw Error(f(301));
      if (u += 1, Re = me = null, e.updateQueue != null) {
        var n = e.updateQueue;
        n.lastEffect = null, n.events = null, n.stores = null, n.memoCache != null && (n.memoCache.index = 0);
      }
      O.H = Gm, n = t(a, l);
    } while (Tl);
    return n;
  }
  function jm() {
    var e = O.H, t = e.useState()[0];
    return t = typeof t.then == "function" ? _u(t) : t, e = e.useState()[0], (me !== null ? me.memoizedState : null) !== e && (F.flags |= 1024), t;
  }
  function gc() {
    var e = En !== 0;
    return En = 0, e;
  }
  function _c(e, t, a) {
    t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~a;
  }
  function pc(e) {
    if (An) {
      for (e = e.memoizedState; e !== null; ) {
        var t = e.queue;
        t !== null && (t.pending = null), e = e.next;
      }
      An = !1;
    }
    fa = 0, Re = me = F = null, Tl = !1, gu = En = 0, Al = null;
  }
  function Fe() {
    var e = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return Re === null ? F.memoizedState = Re = e : Re = Re.next = e, Re;
  }
  function Me() {
    if (me === null) {
      var e = F.alternate;
      e = e !== null ? e.memoizedState : null;
    } else e = me.next;
    var t = Re === null ? F.memoizedState : Re.next;
    if (t !== null)
      Re = t, me = e;
    else {
      if (e === null)
        throw F.alternate === null ? Error(f(467)) : Error(f(310));
      me = e, e = {
        memoizedState: me.memoizedState,
        baseState: me.baseState,
        baseQueue: me.baseQueue,
        queue: me.queue,
        next: null
      }, Re === null ? F.memoizedState = Re = e : Re = Re.next = e;
    }
    return Re;
  }
  function bc() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function _u(e) {
    var t = gu;
    return gu += 1, Al === null && (Al = []), e = nr(Al, e, t), t = F, (Re === null ? t.memoizedState : Re.next) === null && (t = t.alternate, O.H = t === null || t.memoizedState === null ? Kr : Jr), e;
  }
  function xn(e) {
    if (e !== null && typeof e == "object") {
      if (typeof e.then == "function") return _u(e);
      if (e.$$typeof === Xe) return we(e);
    }
    throw Error(f(438, String(e)));
  }
  function Sc(e) {
    var t = null, a = F.updateQueue;
    if (a !== null && (t = a.memoCache), t == null) {
      var l = F.alternate;
      l !== null && (l = l.updateQueue, l !== null && (l = l.memoCache, l != null && (t = {
        data: l.data.map(function(u) {
          return u.slice();
        }),
        index: 0
      })));
    }
    if (t == null && (t = { data: [], index: 0 }), a === null && (a = bc(), F.updateQueue = a), a.memoCache = t, a = t.data[t.index], a === void 0)
      for (a = t.data[t.index] = Array(e), l = 0; l < e; l++)
        a[l] = el;
    return t.index++, a;
  }
  function wt(e, t) {
    return typeof t == "function" ? t(e) : t;
  }
  function On(e) {
    var t = Me();
    return Tc(t, me, e);
  }
  function Tc(e, t, a) {
    var l = e.queue;
    if (l === null) throw Error(f(311));
    l.lastRenderedReducer = a;
    var u = e.baseQueue, n = l.pending;
    if (n !== null) {
      if (u !== null) {
        var s = u.next;
        u.next = n.next, n.next = s;
      }
      t.baseQueue = u = n, l.pending = null;
    }
    if (n = e.baseState, u === null) e.memoizedState = n;
    else {
      t = u.next;
      var d = s = null, m = null, b = t, x = !1;
      do {
        var M = b.lane & -536870913;
        if (M !== b.lane ? (ae & M) === M : (fa & M) === M) {
          var S = b.revertLane;
          if (S === 0)
            m !== null && (m = m.next = {
              lane: 0,
              revertLane: 0,
              action: b.action,
              hasEagerState: b.hasEagerState,
              eagerState: b.eagerState,
              next: null
            }), M === pl && (x = !0);
          else if ((fa & S) === S) {
            b = b.next, S === pl && (x = !0);
            continue;
          } else
            M = {
              lane: 0,
              revertLane: b.revertLane,
              action: b.action,
              hasEagerState: b.hasEagerState,
              eagerState: b.eagerState,
              next: null
            }, m === null ? (d = m = M, s = n) : m = m.next = M, F.lanes |= S, ya |= S;
          M = b.action, Ka && a(n, M), n = b.hasEagerState ? b.eagerState : a(n, M);
        } else
          S = {
            lane: M,
            revertLane: b.revertLane,
            action: b.action,
            hasEagerState: b.hasEagerState,
            eagerState: b.eagerState,
            next: null
          }, m === null ? (d = m = S, s = n) : m = m.next = S, F.lanes |= M, ya |= M;
        b = b.next;
      } while (b !== null && b !== t);
      if (m === null ? s = n : m.next = d, !it(n, e.memoizedState) && (Ze = !0, x && (a = bl, a !== null)))
        throw a;
      e.memoizedState = n, e.baseState = s, e.baseQueue = m, l.lastRenderedState = n;
    }
    return u === null && (l.lanes = 0), [e.memoizedState, l.dispatch];
  }
  function Ac(e) {
    var t = Me(), a = t.queue;
    if (a === null) throw Error(f(311));
    a.lastRenderedReducer = e;
    var l = a.dispatch, u = a.pending, n = t.memoizedState;
    if (u !== null) {
      a.pending = null;
      var s = u = u.next;
      do
        n = e(n, s.action), s = s.next;
      while (s !== u);
      it(n, t.memoizedState) || (Ze = !0), t.memoizedState = n, t.baseQueue === null && (t.baseState = n), a.lastRenderedState = n;
    }
    return [n, l];
  }
  function hr(e, t, a) {
    var l = F, u = Me(), n = re;
    if (n) {
      if (a === void 0) throw Error(f(407));
      a = a();
    } else a = t();
    var s = !it(
      (me || u).memoizedState,
      a
    );
    s && (u.memoizedState = a, Ze = !0), u = u.queue;
    var d = vr.bind(null, l, u, e);
    if (pu(2048, 8, d, [e]), u.getSnapshot !== t || s || Re !== null && Re.memoizedState.tag & 1) {
      if (l.flags |= 2048, El(
        9,
        zn(),
        yr.bind(
          null,
          l,
          u,
          a,
          t
        ),
        null
      ), be === null) throw Error(f(349));
      n || (fa & 124) !== 0 || mr(l, t, a);
    }
    return a;
  }
  function mr(e, t, a) {
    e.flags |= 16384, e = { getSnapshot: t, value: a }, t = F.updateQueue, t === null ? (t = bc(), F.updateQueue = t, t.stores = [e]) : (a = t.stores, a === null ? t.stores = [e] : a.push(e));
  }
  function yr(e, t, a, l) {
    t.value = a, t.getSnapshot = l, gr(t) && _r(e);
  }
  function vr(e, t, a) {
    return a(function() {
      gr(t) && _r(e);
    });
  }
  function gr(e) {
    var t = e.getSnapshot;
    e = e.value;
    try {
      var a = t();
      return !it(e, a);
    } catch {
      return !0;
    }
  }
  function _r(e) {
    var t = yl(e, 2);
    t !== null && ot(t, e, 2);
  }
  function Ec(e) {
    var t = Fe();
    if (typeof e == "function") {
      var a = e;
      if (e = a(), Ka) {
        ta(!0);
        try {
          a();
        } finally {
          ta(!1);
        }
      }
    }
    return t.memoizedState = t.baseState = e, t.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: wt,
      lastRenderedState: e
    }, t;
  }
  function pr(e, t, a, l) {
    return e.baseState = a, Tc(
      e,
      me,
      typeof l == "function" ? l : wt
    );
  }
  function Zm(e, t, a, l, u) {
    if (Mn(e)) throw Error(f(485));
    if (e = t.action, e !== null) {
      var n = {
        payload: u,
        action: e,
        next: null,
        isTransition: !0,
        status: "pending",
        value: null,
        reason: null,
        listeners: [],
        then: function(s) {
          n.listeners.push(s);
        }
      };
      O.T !== null ? a(!0) : n.isTransition = !1, l(n), a = t.pending, a === null ? (n.next = t.pending = n, br(t, n)) : (n.next = a.next, t.pending = a.next = n);
    }
  }
  function br(e, t) {
    var a = t.action, l = t.payload, u = e.state;
    if (t.isTransition) {
      var n = O.T, s = {};
      O.T = s;
      try {
        var d = a(u, l), m = O.S;
        m !== null && m(s, d), Sr(e, t, d);
      } catch (b) {
        xc(e, t, b);
      } finally {
        O.T = n;
      }
    } else
      try {
        n = a(u, l), Sr(e, t, n);
      } catch (b) {
        xc(e, t, b);
      }
  }
  function Sr(e, t, a) {
    a !== null && typeof a == "object" && typeof a.then == "function" ? a.then(
      function(l) {
        Tr(e, t, l);
      },
      function(l) {
        return xc(e, t, l);
      }
    ) : Tr(e, t, a);
  }
  function Tr(e, t, a) {
    t.status = "fulfilled", t.value = a, Ar(t), e.state = a, t = e.pending, t !== null && (a = t.next, a === t ? e.pending = null : (a = a.next, t.next = a, br(e, a)));
  }
  function xc(e, t, a) {
    var l = e.pending;
    if (e.pending = null, l !== null) {
      l = l.next;
      do
        t.status = "rejected", t.reason = a, Ar(t), t = t.next;
      while (t !== l);
    }
    e.action = null;
  }
  function Ar(e) {
    e = e.listeners;
    for (var t = 0; t < e.length; t++) (0, e[t])();
  }
  function Er(e, t) {
    return t;
  }
  function xr(e, t) {
    if (re) {
      var a = be.formState;
      if (a !== null) {
        e: {
          var l = F;
          if (re) {
            if (Ee) {
              t: {
                for (var u = Ee, n = Dt; u.nodeType !== 8; ) {
                  if (!n) {
                    u = null;
                    break t;
                  }
                  if (u = zt(
                    u.nextSibling
                  ), u === null) {
                    u = null;
                    break t;
                  }
                }
                n = u.data, u = n === "F!" || n === "F" ? u : null;
              }
              if (u) {
                Ee = zt(
                  u.nextSibling
                ), l = u.data === "F!";
                break e;
              }
            }
            Qa(l);
          }
          l = !1;
        }
        l && (t = a[0]);
      }
    }
    return a = Fe(), a.memoizedState = a.baseState = t, l = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: Er,
      lastRenderedState: t
    }, a.queue = l, a = kr.bind(
      null,
      F,
      l
    ), l.dispatch = a, l = Ec(!1), n = Dc.bind(
      null,
      F,
      !1,
      l.queue
    ), l = Fe(), u = {
      state: t,
      dispatch: null,
      action: e,
      pending: null
    }, l.queue = u, a = Zm.bind(
      null,
      F,
      u,
      n,
      a
    ), u.dispatch = a, l.memoizedState = e, [t, a, !1];
  }
  function Or(e) {
    var t = Me();
    return zr(t, me, e);
  }
  function zr(e, t, a) {
    if (t = Tc(
      e,
      t,
      Er
    )[0], e = On(wt)[0], typeof t == "object" && t !== null && typeof t.then == "function")
      try {
        var l = _u(t);
      } catch (s) {
        throw s === ou ? bn : s;
      }
    else l = t;
    t = Me();
    var u = t.queue, n = u.dispatch;
    return a !== t.memoizedState && (F.flags |= 2048, El(
      9,
      zn(),
      Hm.bind(null, u, a),
      null
    )), [l, n, e];
  }
  function Hm(e, t) {
    e.action = t;
  }
  function Rr(e) {
    var t = Me(), a = me;
    if (a !== null)
      return zr(t, a, e);
    Me(), t = t.memoizedState, a = Me();
    var l = a.queue.dispatch;
    return a.memoizedState = e, [t, l, !1];
  }
  function El(e, t, a, l) {
    return e = { tag: e, create: a, deps: l, inst: t, next: null }, t = F.updateQueue, t === null && (t = bc(), F.updateQueue = t), a = t.lastEffect, a === null ? t.lastEffect = e.next = e : (l = a.next, a.next = e, e.next = l, t.lastEffect = e), e;
  }
  function zn() {
    return { destroy: void 0, resource: void 0 };
  }
  function Mr() {
    return Me().memoizedState;
  }
  function Rn(e, t, a, l) {
    var u = Fe();
    l = l === void 0 ? null : l, F.flags |= e, u.memoizedState = El(
      1 | t,
      zn(),
      a,
      l
    );
  }
  function pu(e, t, a, l) {
    var u = Me();
    l = l === void 0 ? null : l;
    var n = u.memoizedState.inst;
    me !== null && l !== null && yc(l, me.memoizedState.deps) ? u.memoizedState = El(t, n, a, l) : (F.flags |= e, u.memoizedState = El(
      1 | t,
      n,
      a,
      l
    ));
  }
  function Dr(e, t) {
    Rn(8390656, 8, e, t);
  }
  function Nr(e, t) {
    pu(2048, 8, e, t);
  }
  function Ur(e, t) {
    return pu(4, 2, e, t);
  }
  function Cr(e, t) {
    return pu(4, 4, e, t);
  }
  function jr(e, t) {
    if (typeof t == "function") {
      e = e();
      var a = t(e);
      return function() {
        typeof a == "function" ? a() : t(null);
      };
    }
    if (t != null)
      return e = e(), t.current = e, function() {
        t.current = null;
      };
  }
  function Zr(e, t, a) {
    a = a != null ? a.concat([e]) : null, pu(4, 4, jr.bind(null, t, e), a);
  }
  function Oc() {
  }
  function Hr(e, t) {
    var a = Me();
    t = t === void 0 ? null : t;
    var l = a.memoizedState;
    return t !== null && yc(t, l[1]) ? l[0] : (a.memoizedState = [e, t], e);
  }
  function qr(e, t) {
    var a = Me();
    t = t === void 0 ? null : t;
    var l = a.memoizedState;
    if (t !== null && yc(t, l[1]))
      return l[0];
    if (l = e(), Ka) {
      ta(!0);
      try {
        e();
      } finally {
        ta(!1);
      }
    }
    return a.memoizedState = [l, t], l;
  }
  function zc(e, t, a) {
    return a === void 0 || (fa & 1073741824) !== 0 ? e.memoizedState = t : (e.memoizedState = a, e = Gd(), F.lanes |= e, ya |= e, a);
  }
  function Br(e, t, a, l) {
    return it(a, t) ? a : Sl.current !== null ? (e = zc(e, a, l), it(e, t) || (Ze = !0), e) : (fa & 42) === 0 ? (Ze = !0, e.memoizedState = a) : (e = Gd(), F.lanes |= e, ya |= e, t);
  }
  function Yr(e, t, a, l, u) {
    var n = j.p;
    j.p = n !== 0 && 8 > n ? n : 8;
    var s = O.T, d = {};
    O.T = d, Dc(e, !1, t, a);
    try {
      var m = u(), b = O.S;
      if (b !== null && b(d, m), m !== null && typeof m == "object" && typeof m.then == "function") {
        var x = Um(
          m,
          l
        );
        bu(
          e,
          t,
          x,
          dt(e)
        );
      } else
        bu(
          e,
          t,
          l,
          dt(e)
        );
    } catch (M) {
      bu(
        e,
        t,
        { then: function() {
        }, status: "rejected", reason: M },
        dt()
      );
    } finally {
      j.p = n, O.T = s;
    }
  }
  function qm() {
  }
  function Rc(e, t, a, l) {
    if (e.tag !== 5) throw Error(f(476));
    var u = Gr(e).queue;
    Yr(
      e,
      u,
      t,
      k,
      a === null ? qm : function() {
        return Xr(e), a(l);
      }
    );
  }
  function Gr(e) {
    var t = e.memoizedState;
    if (t !== null) return t;
    t = {
      memoizedState: k,
      baseState: k,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: wt,
        lastRenderedState: k
      },
      next: null
    };
    var a = {};
    return t.next = {
      memoizedState: a,
      baseState: a,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: wt,
        lastRenderedState: a
      },
      next: null
    }, e.memoizedState = t, e = e.alternate, e !== null && (e.memoizedState = t), t;
  }
  function Xr(e) {
    var t = Gr(e).next.queue;
    bu(e, t, {}, dt());
  }
  function Mc() {
    return we(Bu);
  }
  function Vr() {
    return Me().memoizedState;
  }
  function Qr() {
    return Me().memoizedState;
  }
  function Bm(e) {
    for (var t = e.return; t !== null; ) {
      switch (t.tag) {
        case 24:
        case 3:
          var a = dt();
          e = ia(a);
          var l = ca(t, e, a);
          l !== null && (ot(l, t, a), mu(l, t, a)), t = { cache: nc() }, e.payload = t;
          return;
      }
      t = t.return;
    }
  }
  function Ym(e, t, a) {
    var l = dt();
    a = {
      lane: l,
      revertLane: 0,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, Mn(e) ? wr(t, a) : (a = $i(e, t, a, l), a !== null && (ot(a, e, l), Lr(a, t, l)));
  }
  function kr(e, t, a) {
    var l = dt();
    bu(e, t, a, l);
  }
  function bu(e, t, a, l) {
    var u = {
      lane: l,
      revertLane: 0,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (Mn(e)) wr(t, u);
    else {
      var n = e.alternate;
      if (e.lanes === 0 && (n === null || n.lanes === 0) && (n = t.lastRenderedReducer, n !== null))
        try {
          var s = t.lastRenderedState, d = n(s, a);
          if (u.hasEagerState = !0, u.eagerState = d, it(d, s))
            return on(e, t, u, 0), be === null && dn(), !1;
        } catch {
        } finally {
        }
      if (a = $i(e, t, u, l), a !== null)
        return ot(a, e, l), Lr(a, t, l), !0;
    }
    return !1;
  }
  function Dc(e, t, a, l) {
    if (l = {
      lane: 2,
      revertLane: sf(),
      action: l,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, Mn(e)) {
      if (t) throw Error(f(479));
    } else
      t = $i(
        e,
        a,
        l,
        2
      ), t !== null && ot(t, e, 2);
  }
  function Mn(e) {
    var t = e.alternate;
    return e === F || t !== null && t === F;
  }
  function wr(e, t) {
    Tl = An = !0;
    var a = e.pending;
    a === null ? t.next = t : (t.next = a.next, a.next = t), e.pending = t;
  }
  function Lr(e, t, a) {
    if ((a & 4194048) !== 0) {
      var l = t.lanes;
      l &= e.pendingLanes, a |= l, t.lanes = a, es(e, a);
    }
  }
  var Dn = {
    readContext: we,
    use: xn,
    useCallback: Oe,
    useContext: Oe,
    useEffect: Oe,
    useImperativeHandle: Oe,
    useLayoutEffect: Oe,
    useInsertionEffect: Oe,
    useMemo: Oe,
    useReducer: Oe,
    useRef: Oe,
    useState: Oe,
    useDebugValue: Oe,
    useDeferredValue: Oe,
    useTransition: Oe,
    useSyncExternalStore: Oe,
    useId: Oe,
    useHostTransitionStatus: Oe,
    useFormState: Oe,
    useActionState: Oe,
    useOptimistic: Oe,
    useMemoCache: Oe,
    useCacheRefresh: Oe
  }, Kr = {
    readContext: we,
    use: xn,
    useCallback: function(e, t) {
      return Fe().memoizedState = [
        e,
        t === void 0 ? null : t
      ], e;
    },
    useContext: we,
    useEffect: Dr,
    useImperativeHandle: function(e, t, a) {
      a = a != null ? a.concat([e]) : null, Rn(
        4194308,
        4,
        jr.bind(null, t, e),
        a
      );
    },
    useLayoutEffect: function(e, t) {
      return Rn(4194308, 4, e, t);
    },
    useInsertionEffect: function(e, t) {
      Rn(4, 2, e, t);
    },
    useMemo: function(e, t) {
      var a = Fe();
      t = t === void 0 ? null : t;
      var l = e();
      if (Ka) {
        ta(!0);
        try {
          e();
        } finally {
          ta(!1);
        }
      }
      return a.memoizedState = [l, t], l;
    },
    useReducer: function(e, t, a) {
      var l = Fe();
      if (a !== void 0) {
        var u = a(t);
        if (Ka) {
          ta(!0);
          try {
            a(t);
          } finally {
            ta(!1);
          }
        }
      } else u = t;
      return l.memoizedState = l.baseState = u, e = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: e,
        lastRenderedState: u
      }, l.queue = e, e = e.dispatch = Ym.bind(
        null,
        F,
        e
      ), [l.memoizedState, e];
    },
    useRef: function(e) {
      var t = Fe();
      return e = { current: e }, t.memoizedState = e;
    },
    useState: function(e) {
      e = Ec(e);
      var t = e.queue, a = kr.bind(null, F, t);
      return t.dispatch = a, [e.memoizedState, a];
    },
    useDebugValue: Oc,
    useDeferredValue: function(e, t) {
      var a = Fe();
      return zc(a, e, t);
    },
    useTransition: function() {
      var e = Ec(!1);
      return e = Yr.bind(
        null,
        F,
        e.queue,
        !0,
        !1
      ), Fe().memoizedState = e, [!1, e];
    },
    useSyncExternalStore: function(e, t, a) {
      var l = F, u = Fe();
      if (re) {
        if (a === void 0)
          throw Error(f(407));
        a = a();
      } else {
        if (a = t(), be === null)
          throw Error(f(349));
        (ae & 124) !== 0 || mr(l, t, a);
      }
      u.memoizedState = a;
      var n = { value: a, getSnapshot: t };
      return u.queue = n, Dr(vr.bind(null, l, n, e), [
        e
      ]), l.flags |= 2048, El(
        9,
        zn(),
        yr.bind(
          null,
          l,
          n,
          a,
          t
        ),
        null
      ), a;
    },
    useId: function() {
      var e = Fe(), t = be.identifierPrefix;
      if (re) {
        var a = Vt, l = Xt;
        a = (l & ~(1 << 32 - nt(l) - 1)).toString(32) + a, t = "«" + t + "R" + a, a = En++, 0 < a && (t += "H" + a.toString(32)), t += "»";
      } else
        a = Cm++, t = "«" + t + "r" + a.toString(32) + "»";
      return e.memoizedState = t;
    },
    useHostTransitionStatus: Mc,
    useFormState: xr,
    useActionState: xr,
    useOptimistic: function(e) {
      var t = Fe();
      t.memoizedState = t.baseState = e;
      var a = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      return t.queue = a, t = Dc.bind(
        null,
        F,
        !0,
        a
      ), a.dispatch = t, [e, t];
    },
    useMemoCache: Sc,
    useCacheRefresh: function() {
      return Fe().memoizedState = Bm.bind(
        null,
        F
      );
    }
  }, Jr = {
    readContext: we,
    use: xn,
    useCallback: Hr,
    useContext: we,
    useEffect: Nr,
    useImperativeHandle: Zr,
    useInsertionEffect: Ur,
    useLayoutEffect: Cr,
    useMemo: qr,
    useReducer: On,
    useRef: Mr,
    useState: function() {
      return On(wt);
    },
    useDebugValue: Oc,
    useDeferredValue: function(e, t) {
      var a = Me();
      return Br(
        a,
        me.memoizedState,
        e,
        t
      );
    },
    useTransition: function() {
      var e = On(wt)[0], t = Me().memoizedState;
      return [
        typeof e == "boolean" ? e : _u(e),
        t
      ];
    },
    useSyncExternalStore: hr,
    useId: Vr,
    useHostTransitionStatus: Mc,
    useFormState: Or,
    useActionState: Or,
    useOptimistic: function(e, t) {
      var a = Me();
      return pr(a, me, e, t);
    },
    useMemoCache: Sc,
    useCacheRefresh: Qr
  }, Gm = {
    readContext: we,
    use: xn,
    useCallback: Hr,
    useContext: we,
    useEffect: Nr,
    useImperativeHandle: Zr,
    useInsertionEffect: Ur,
    useLayoutEffect: Cr,
    useMemo: qr,
    useReducer: Ac,
    useRef: Mr,
    useState: function() {
      return Ac(wt);
    },
    useDebugValue: Oc,
    useDeferredValue: function(e, t) {
      var a = Me();
      return me === null ? zc(a, e, t) : Br(
        a,
        me.memoizedState,
        e,
        t
      );
    },
    useTransition: function() {
      var e = Ac(wt)[0], t = Me().memoizedState;
      return [
        typeof e == "boolean" ? e : _u(e),
        t
      ];
    },
    useSyncExternalStore: hr,
    useId: Vr,
    useHostTransitionStatus: Mc,
    useFormState: Rr,
    useActionState: Rr,
    useOptimistic: function(e, t) {
      var a = Me();
      return me !== null ? pr(a, me, e, t) : (a.baseState = e, [e, a.queue.dispatch]);
    },
    useMemoCache: Sc,
    useCacheRefresh: Qr
  }, xl = null, Su = 0;
  function Nn(e) {
    var t = Su;
    return Su += 1, xl === null && (xl = []), nr(xl, e, t);
  }
  function Tu(e, t) {
    t = t.props.ref, e.ref = t !== void 0 ? t : null;
  }
  function Un(e, t) {
    throw t.$$typeof === le ? Error(f(525)) : (e = Object.prototype.toString.call(t), Error(
      f(
        31,
        e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e
      )
    ));
  }
  function $r(e) {
    var t = e._init;
    return t(e._payload);
  }
  function Wr(e) {
    function t(g, v) {
      if (e) {
        var _ = g.deletions;
        _ === null ? (g.deletions = [v], g.flags |= 16) : _.push(v);
      }
    }
    function a(g, v) {
      if (!e) return null;
      for (; v !== null; )
        t(g, v), v = v.sibling;
      return null;
    }
    function l(g) {
      for (var v = /* @__PURE__ */ new Map(); g !== null; )
        g.key !== null ? v.set(g.key, g) : v.set(g.index, g), g = g.sibling;
      return v;
    }
    function u(g, v) {
      return g = Gt(g, v), g.index = 0, g.sibling = null, g;
    }
    function n(g, v, _) {
      return g.index = _, e ? (_ = g.alternate, _ !== null ? (_ = _.index, _ < v ? (g.flags |= 67108866, v) : _) : (g.flags |= 67108866, v)) : (g.flags |= 1048576, v);
    }
    function s(g) {
      return e && g.alternate === null && (g.flags |= 67108866), g;
    }
    function d(g, v, _, z) {
      return v === null || v.tag !== 6 ? (v = Fi(_, g.mode, z), v.return = g, v) : (v = u(v, _), v.return = g, v);
    }
    function m(g, v, _, z) {
      var q = _.type;
      return q === pe ? x(
        g,
        v,
        _.props.children,
        z,
        _.key
      ) : v !== null && (v.elementType === q || typeof q == "object" && q !== null && q.$$typeof === at && $r(q) === v.type) ? (v = u(v, _.props), Tu(v, _), v.return = g, v) : (v = mn(
        _.type,
        _.key,
        _.props,
        null,
        g.mode,
        z
      ), Tu(v, _), v.return = g, v);
    }
    function b(g, v, _, z) {
      return v === null || v.tag !== 4 || v.stateNode.containerInfo !== _.containerInfo || v.stateNode.implementation !== _.implementation ? (v = Ii(_, g.mode, z), v.return = g, v) : (v = u(v, _.children || []), v.return = g, v);
    }
    function x(g, v, _, z, q) {
      return v === null || v.tag !== 7 ? (v = Ya(
        _,
        g.mode,
        z,
        q
      ), v.return = g, v) : (v = u(v, _), v.return = g, v);
    }
    function M(g, v, _) {
      if (typeof v == "string" && v !== "" || typeof v == "number" || typeof v == "bigint")
        return v = Fi(
          "" + v,
          g.mode,
          _
        ), v.return = g, v;
      if (typeof v == "object" && v !== null) {
        switch (v.$$typeof) {
          case de:
            return _ = mn(
              v.type,
              v.key,
              v.props,
              null,
              g.mode,
              _
            ), Tu(_, v), _.return = g, _;
          case ne:
            return v = Ii(
              v,
              g.mode,
              _
            ), v.return = g, v;
          case at:
            var z = v._init;
            return v = z(v._payload), M(g, v, _);
        }
        if (Qe(v) || Ve(v))
          return v = Ya(
            v,
            g.mode,
            _,
            null
          ), v.return = g, v;
        if (typeof v.then == "function")
          return M(g, Nn(v), _);
        if (v.$$typeof === Xe)
          return M(
            g,
            _n(g, v),
            _
          );
        Un(g, v);
      }
      return null;
    }
    function S(g, v, _, z) {
      var q = v !== null ? v.key : null;
      if (typeof _ == "string" && _ !== "" || typeof _ == "number" || typeof _ == "bigint")
        return q !== null ? null : d(g, v, "" + _, z);
      if (typeof _ == "object" && _ !== null) {
        switch (_.$$typeof) {
          case de:
            return _.key === q ? m(g, v, _, z) : null;
          case ne:
            return _.key === q ? b(g, v, _, z) : null;
          case at:
            return q = _._init, _ = q(_._payload), S(g, v, _, z);
        }
        if (Qe(_) || Ve(_))
          return q !== null ? null : x(g, v, _, z, null);
        if (typeof _.then == "function")
          return S(
            g,
            v,
            Nn(_),
            z
          );
        if (_.$$typeof === Xe)
          return S(
            g,
            v,
            _n(g, _),
            z
          );
        Un(g, _);
      }
      return null;
    }
    function T(g, v, _, z, q) {
      if (typeof z == "string" && z !== "" || typeof z == "number" || typeof z == "bigint")
        return g = g.get(_) || null, d(v, g, "" + z, q);
      if (typeof z == "object" && z !== null) {
        switch (z.$$typeof) {
          case de:
            return g = g.get(
              z.key === null ? _ : z.key
            ) || null, m(v, g, z, q);
          case ne:
            return g = g.get(
              z.key === null ? _ : z.key
            ) || null, b(v, g, z, q);
          case at:
            var I = z._init;
            return z = I(z._payload), T(
              g,
              v,
              _,
              z,
              q
            );
        }
        if (Qe(z) || Ve(z))
          return g = g.get(_) || null, x(v, g, z, q, null);
        if (typeof z.then == "function")
          return T(
            g,
            v,
            _,
            Nn(z),
            q
          );
        if (z.$$typeof === Xe)
          return T(
            g,
            v,
            _,
            _n(v, z),
            q
          );
        Un(v, z);
      }
      return null;
    }
    function w(g, v, _, z) {
      for (var q = null, I = null, G = v, Q = v = 0, qe = null; G !== null && Q < _.length; Q++) {
        G.index > Q ? (qe = G, G = null) : qe = G.sibling;
        var fe = S(
          g,
          G,
          _[Q],
          z
        );
        if (fe === null) {
          G === null && (G = qe);
          break;
        }
        e && G && fe.alternate === null && t(g, G), v = n(fe, v, Q), I === null ? q = fe : I.sibling = fe, I = fe, G = qe;
      }
      if (Q === _.length)
        return a(g, G), re && Xa(g, Q), q;
      if (G === null) {
        for (; Q < _.length; Q++)
          G = M(g, _[Q], z), G !== null && (v = n(
            G,
            v,
            Q
          ), I === null ? q = G : I.sibling = G, I = G);
        return re && Xa(g, Q), q;
      }
      for (G = l(G); Q < _.length; Q++)
        qe = T(
          G,
          g,
          Q,
          _[Q],
          z
        ), qe !== null && (e && qe.alternate !== null && G.delete(
          qe.key === null ? Q : qe.key
        ), v = n(
          qe,
          v,
          Q
        ), I === null ? q = qe : I.sibling = qe, I = qe);
      return e && G.forEach(function(Ea) {
        return t(g, Ea);
      }), re && Xa(g, Q), q;
    }
    function V(g, v, _, z) {
      if (_ == null) throw Error(f(151));
      for (var q = null, I = null, G = v, Q = v = 0, qe = null, fe = _.next(); G !== null && !fe.done; Q++, fe = _.next()) {
        G.index > Q ? (qe = G, G = null) : qe = G.sibling;
        var Ea = S(g, G, fe.value, z);
        if (Ea === null) {
          G === null && (G = qe);
          break;
        }
        e && G && Ea.alternate === null && t(g, G), v = n(Ea, v, Q), I === null ? q = Ea : I.sibling = Ea, I = Ea, G = qe;
      }
      if (fe.done)
        return a(g, G), re && Xa(g, Q), q;
      if (G === null) {
        for (; !fe.done; Q++, fe = _.next())
          fe = M(g, fe.value, z), fe !== null && (v = n(fe, v, Q), I === null ? q = fe : I.sibling = fe, I = fe);
        return re && Xa(g, Q), q;
      }
      for (G = l(G); !fe.done; Q++, fe = _.next())
        fe = T(G, g, Q, fe.value, z), fe !== null && (e && fe.alternate !== null && G.delete(fe.key === null ? Q : fe.key), v = n(fe, v, Q), I === null ? q = fe : I.sibling = fe, I = fe);
      return e && G.forEach(function(Xy) {
        return t(g, Xy);
      }), re && Xa(g, Q), q;
    }
    function ve(g, v, _, z) {
      if (typeof _ == "object" && _ !== null && _.type === pe && _.key === null && (_ = _.props.children), typeof _ == "object" && _ !== null) {
        switch (_.$$typeof) {
          case de:
            e: {
              for (var q = _.key; v !== null; ) {
                if (v.key === q) {
                  if (q = _.type, q === pe) {
                    if (v.tag === 7) {
                      a(
                        g,
                        v.sibling
                      ), z = u(
                        v,
                        _.props.children
                      ), z.return = g, g = z;
                      break e;
                    }
                  } else if (v.elementType === q || typeof q == "object" && q !== null && q.$$typeof === at && $r(q) === v.type) {
                    a(
                      g,
                      v.sibling
                    ), z = u(v, _.props), Tu(z, _), z.return = g, g = z;
                    break e;
                  }
                  a(g, v);
                  break;
                } else t(g, v);
                v = v.sibling;
              }
              _.type === pe ? (z = Ya(
                _.props.children,
                g.mode,
                z,
                _.key
              ), z.return = g, g = z) : (z = mn(
                _.type,
                _.key,
                _.props,
                null,
                g.mode,
                z
              ), Tu(z, _), z.return = g, g = z);
            }
            return s(g);
          case ne:
            e: {
              for (q = _.key; v !== null; ) {
                if (v.key === q)
                  if (v.tag === 4 && v.stateNode.containerInfo === _.containerInfo && v.stateNode.implementation === _.implementation) {
                    a(
                      g,
                      v.sibling
                    ), z = u(v, _.children || []), z.return = g, g = z;
                    break e;
                  } else {
                    a(g, v);
                    break;
                  }
                else t(g, v);
                v = v.sibling;
              }
              z = Ii(_, g.mode, z), z.return = g, g = z;
            }
            return s(g);
          case at:
            return q = _._init, _ = q(_._payload), ve(
              g,
              v,
              _,
              z
            );
        }
        if (Qe(_))
          return w(
            g,
            v,
            _,
            z
          );
        if (Ve(_)) {
          if (q = Ve(_), typeof q != "function") throw Error(f(150));
          return _ = q.call(_), V(
            g,
            v,
            _,
            z
          );
        }
        if (typeof _.then == "function")
          return ve(
            g,
            v,
            Nn(_),
            z
          );
        if (_.$$typeof === Xe)
          return ve(
            g,
            v,
            _n(g, _),
            z
          );
        Un(g, _);
      }
      return typeof _ == "string" && _ !== "" || typeof _ == "number" || typeof _ == "bigint" ? (_ = "" + _, v !== null && v.tag === 6 ? (a(g, v.sibling), z = u(v, _), z.return = g, g = z) : (a(g, v), z = Fi(_, g.mode, z), z.return = g, g = z), s(g)) : a(g, v);
    }
    return function(g, v, _, z) {
      try {
        Su = 0;
        var q = ve(
          g,
          v,
          _,
          z
        );
        return xl = null, q;
      } catch (G) {
        if (G === ou || G === bn) throw G;
        var I = ct(29, G, null, g.mode);
        return I.lanes = z, I.return = g, I;
      } finally {
      }
    };
  }
  var Ol = Wr(!0), Fr = Wr(!1), bt = D(null), Nt = null;
  function sa(e) {
    var t = e.alternate;
    C(Ce, Ce.current & 1), C(bt, e), Nt === null && (t === null || Sl.current !== null || t.memoizedState !== null) && (Nt = e);
  }
  function Ir(e) {
    if (e.tag === 22) {
      if (C(Ce, Ce.current), C(bt, e), Nt === null) {
        var t = e.alternate;
        t !== null && t.memoizedState !== null && (Nt = e);
      }
    } else ra();
  }
  function ra() {
    C(Ce, Ce.current), C(bt, bt.current);
  }
  function Lt(e) {
    H(bt), Nt === e && (Nt = null), H(Ce);
  }
  var Ce = D(0);
  function Cn(e) {
    for (var t = e; t !== null; ) {
      if (t.tag === 13) {
        var a = t.memoizedState;
        if (a !== null && (a = a.dehydrated, a === null || a.data === "$?" || Sf(a)))
          return t;
      } else if (t.tag === 19 && t.memoizedProps.revealOrder !== void 0) {
        if ((t.flags & 128) !== 0) return t;
      } else if (t.child !== null) {
        t.child.return = t, t = t.child;
        continue;
      }
      if (t === e) break;
      for (; t.sibling === null; ) {
        if (t.return === null || t.return === e) return null;
        t = t.return;
      }
      t.sibling.return = t.return, t = t.sibling;
    }
    return null;
  }
  function Nc(e, t, a, l) {
    t = e.memoizedState, a = a(l, t), a = a == null ? t : U({}, t, a), e.memoizedState = a, e.lanes === 0 && (e.updateQueue.baseState = a);
  }
  var Uc = {
    enqueueSetState: function(e, t, a) {
      e = e._reactInternals;
      var l = dt(), u = ia(l);
      u.payload = t, a != null && (u.callback = a), t = ca(e, u, l), t !== null && (ot(t, e, l), mu(t, e, l));
    },
    enqueueReplaceState: function(e, t, a) {
      e = e._reactInternals;
      var l = dt(), u = ia(l);
      u.tag = 1, u.payload = t, a != null && (u.callback = a), t = ca(e, u, l), t !== null && (ot(t, e, l), mu(t, e, l));
    },
    enqueueForceUpdate: function(e, t) {
      e = e._reactInternals;
      var a = dt(), l = ia(a);
      l.tag = 2, t != null && (l.callback = t), t = ca(e, l, a), t !== null && (ot(t, e, a), mu(t, e, a));
    }
  };
  function Pr(e, t, a, l, u, n, s) {
    return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(l, n, s) : t.prototype && t.prototype.isPureReactComponent ? !uu(a, l) || !uu(u, n) : !0;
  }
  function ed(e, t, a, l) {
    e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(a, l), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(a, l), t.state !== e && Uc.enqueueReplaceState(t, t.state, null);
  }
  function Ja(e, t) {
    var a = t;
    if ("ref" in t) {
      a = {};
      for (var l in t)
        l !== "ref" && (a[l] = t[l]);
    }
    if (e = e.defaultProps) {
      a === t && (a = U({}, a));
      for (var u in e)
        a[u] === void 0 && (a[u] = e[u]);
    }
    return a;
  }
  var jn = typeof reportError == "function" ? reportError : function(e) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var t = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof e == "object" && e !== null && typeof e.message == "string" ? String(e.message) : String(e),
        error: e
      });
      if (!window.dispatchEvent(t)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", e);
      return;
    }
    console.error(e);
  };
  function td(e) {
    jn(e);
  }
  function ad(e) {
    console.error(e);
  }
  function ld(e) {
    jn(e);
  }
  function Zn(e, t) {
    try {
      var a = e.onUncaughtError;
      a(t.value, { componentStack: t.stack });
    } catch (l) {
      setTimeout(function() {
        throw l;
      });
    }
  }
  function ud(e, t, a) {
    try {
      var l = e.onCaughtError;
      l(a.value, {
        componentStack: a.stack,
        errorBoundary: t.tag === 1 ? t.stateNode : null
      });
    } catch (u) {
      setTimeout(function() {
        throw u;
      });
    }
  }
  function Cc(e, t, a) {
    return a = ia(a), a.tag = 3, a.payload = { element: null }, a.callback = function() {
      Zn(e, t);
    }, a;
  }
  function nd(e) {
    return e = ia(e), e.tag = 3, e;
  }
  function id(e, t, a, l) {
    var u = a.type.getDerivedStateFromError;
    if (typeof u == "function") {
      var n = l.value;
      e.payload = function() {
        return u(n);
      }, e.callback = function() {
        ud(t, a, l);
      };
    }
    var s = a.stateNode;
    s !== null && typeof s.componentDidCatch == "function" && (e.callback = function() {
      ud(t, a, l), typeof u != "function" && (va === null ? va = /* @__PURE__ */ new Set([this]) : va.add(this));
      var d = l.stack;
      this.componentDidCatch(l.value, {
        componentStack: d !== null ? d : ""
      });
    });
  }
  function Xm(e, t, a, l, u) {
    if (a.flags |= 32768, l !== null && typeof l == "object" && typeof l.then == "function") {
      if (t = a.alternate, t !== null && su(
        t,
        a,
        u,
        !0
      ), a = bt.current, a !== null) {
        switch (a.tag) {
          case 13:
            return Nt === null ? lf() : a.alternate === null && xe === 0 && (xe = 3), a.flags &= -257, a.flags |= 65536, a.lanes = u, l === fc ? a.flags |= 16384 : (t = a.updateQueue, t === null ? a.updateQueue = /* @__PURE__ */ new Set([l]) : t.add(l), nf(e, l, u)), !1;
          case 22:
            return a.flags |= 65536, l === fc ? a.flags |= 16384 : (t = a.updateQueue, t === null ? (t = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([l])
            }, a.updateQueue = t) : (a = t.retryQueue, a === null ? t.retryQueue = /* @__PURE__ */ new Set([l]) : a.add(l)), nf(e, l, u)), !1;
        }
        throw Error(f(435, a.tag));
      }
      return nf(e, l, u), lf(), !1;
    }
    if (re)
      return t = bt.current, t !== null ? ((t.flags & 65536) === 0 && (t.flags |= 256), t.flags |= 65536, t.lanes = u, l !== tc && (e = Error(f(422), { cause: l }), fu(vt(e, a)))) : (l !== tc && (t = Error(f(423), {
        cause: l
      }), fu(
        vt(t, a)
      )), e = e.current.alternate, e.flags |= 65536, u &= -u, e.lanes |= u, l = vt(l, a), u = Cc(
        e.stateNode,
        l,
        u
      ), dc(e, u), xe !== 4 && (xe = 2)), !1;
    var n = Error(f(520), { cause: l });
    if (n = vt(n, a), Mu === null ? Mu = [n] : Mu.push(n), xe !== 4 && (xe = 2), t === null) return !0;
    l = vt(l, a), a = t;
    do {
      switch (a.tag) {
        case 3:
          return a.flags |= 65536, e = u & -u, a.lanes |= e, e = Cc(a.stateNode, l, e), dc(a, e), !1;
        case 1:
          if (t = a.type, n = a.stateNode, (a.flags & 128) === 0 && (typeof t.getDerivedStateFromError == "function" || n !== null && typeof n.componentDidCatch == "function" && (va === null || !va.has(n))))
            return a.flags |= 65536, u &= -u, a.lanes |= u, u = nd(u), id(
              u,
              e,
              a,
              l
            ), dc(a, u), !1;
      }
      a = a.return;
    } while (a !== null);
    return !1;
  }
  var cd = Error(f(461)), Ze = !1;
  function Be(e, t, a, l) {
    t.child = e === null ? Fr(t, null, a, l) : Ol(
      t,
      e.child,
      a,
      l
    );
  }
  function fd(e, t, a, l, u) {
    a = a.render;
    var n = t.ref;
    if ("ref" in l) {
      var s = {};
      for (var d in l)
        d !== "ref" && (s[d] = l[d]);
    } else s = l;
    return wa(t), l = vc(
      e,
      t,
      a,
      s,
      n,
      u
    ), d = gc(), e !== null && !Ze ? (_c(e, t, u), Kt(e, t, u)) : (re && d && Pi(t), t.flags |= 1, Be(e, t, l, u), t.child);
  }
  function sd(e, t, a, l, u) {
    if (e === null) {
      var n = a.type;
      return typeof n == "function" && !Wi(n) && n.defaultProps === void 0 && a.compare === null ? (t.tag = 15, t.type = n, rd(
        e,
        t,
        n,
        l,
        u
      )) : (e = mn(
        a.type,
        null,
        l,
        t,
        t.mode,
        u
      ), e.ref = t.ref, e.return = t, t.child = e);
    }
    if (n = e.child, !Xc(e, u)) {
      var s = n.memoizedProps;
      if (a = a.compare, a = a !== null ? a : uu, a(s, l) && e.ref === t.ref)
        return Kt(e, t, u);
    }
    return t.flags |= 1, e = Gt(n, l), e.ref = t.ref, e.return = t, t.child = e;
  }
  function rd(e, t, a, l, u) {
    if (e !== null) {
      var n = e.memoizedProps;
      if (uu(n, l) && e.ref === t.ref)
        if (Ze = !1, t.pendingProps = l = n, Xc(e, u))
          (e.flags & 131072) !== 0 && (Ze = !0);
        else
          return t.lanes = e.lanes, Kt(e, t, u);
    }
    return jc(
      e,
      t,
      a,
      l,
      u
    );
  }
  function dd(e, t, a) {
    var l = t.pendingProps, u = l.children, n = e !== null ? e.memoizedState : null;
    if (l.mode === "hidden") {
      if ((t.flags & 128) !== 0) {
        if (l = n !== null ? n.baseLanes | a : a, e !== null) {
          for (u = t.child = e.child, n = 0; u !== null; )
            n = n | u.lanes | u.childLanes, u = u.sibling;
          t.childLanes = n & ~l;
        } else t.childLanes = 0, t.child = null;
        return od(
          e,
          t,
          l,
          a
        );
      }
      if ((a & 536870912) !== 0)
        t.memoizedState = { baseLanes: 0, cachePool: null }, e !== null && pn(
          t,
          n !== null ? n.cachePool : null
        ), n !== null ? rr(t, n) : hc(), Ir(t);
      else
        return t.lanes = t.childLanes = 536870912, od(
          e,
          t,
          n !== null ? n.baseLanes | a : a,
          a
        );
    } else
      n !== null ? (pn(t, n.cachePool), rr(t, n), ra(), t.memoizedState = null) : (e !== null && pn(t, null), hc(), ra());
    return Be(e, t, u, a), t.child;
  }
  function od(e, t, a, l) {
    var u = cc();
    return u = u === null ? null : { parent: Ue._currentValue, pool: u }, t.memoizedState = {
      baseLanes: a,
      cachePool: u
    }, e !== null && pn(t, null), hc(), Ir(t), e !== null && su(e, t, l, !0), null;
  }
  function Hn(e, t) {
    var a = t.ref;
    if (a === null)
      e !== null && e.ref !== null && (t.flags |= 4194816);
    else {
      if (typeof a != "function" && typeof a != "object")
        throw Error(f(284));
      (e === null || e.ref !== a) && (t.flags |= 4194816);
    }
  }
  function jc(e, t, a, l, u) {
    return wa(t), a = vc(
      e,
      t,
      a,
      l,
      void 0,
      u
    ), l = gc(), e !== null && !Ze ? (_c(e, t, u), Kt(e, t, u)) : (re && l && Pi(t), t.flags |= 1, Be(e, t, a, u), t.child);
  }
  function hd(e, t, a, l, u, n) {
    return wa(t), t.updateQueue = null, a = or(
      t,
      l,
      a,
      u
    ), dr(e), l = gc(), e !== null && !Ze ? (_c(e, t, n), Kt(e, t, n)) : (re && l && Pi(t), t.flags |= 1, Be(e, t, a, n), t.child);
  }
  function md(e, t, a, l, u) {
    if (wa(t), t.stateNode === null) {
      var n = vl, s = a.contextType;
      typeof s == "object" && s !== null && (n = we(s)), n = new a(l, n), t.memoizedState = n.state !== null && n.state !== void 0 ? n.state : null, n.updater = Uc, t.stateNode = n, n._reactInternals = t, n = t.stateNode, n.props = l, n.state = t.memoizedState, n.refs = {}, sc(t), s = a.contextType, n.context = typeof s == "object" && s !== null ? we(s) : vl, n.state = t.memoizedState, s = a.getDerivedStateFromProps, typeof s == "function" && (Nc(
        t,
        a,
        s,
        l
      ), n.state = t.memoizedState), typeof a.getDerivedStateFromProps == "function" || typeof n.getSnapshotBeforeUpdate == "function" || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (s = n.state, typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount(), s !== n.state && Uc.enqueueReplaceState(n, n.state, null), vu(t, l, n, u), yu(), n.state = t.memoizedState), typeof n.componentDidMount == "function" && (t.flags |= 4194308), l = !0;
    } else if (e === null) {
      n = t.stateNode;
      var d = t.memoizedProps, m = Ja(a, d);
      n.props = m;
      var b = n.context, x = a.contextType;
      s = vl, typeof x == "object" && x !== null && (s = we(x));
      var M = a.getDerivedStateFromProps;
      x = typeof M == "function" || typeof n.getSnapshotBeforeUpdate == "function", d = t.pendingProps !== d, x || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (d || b !== s) && ed(
        t,
        n,
        l,
        s
      ), na = !1;
      var S = t.memoizedState;
      n.state = S, vu(t, l, n, u), yu(), b = t.memoizedState, d || S !== b || na ? (typeof M == "function" && (Nc(
        t,
        a,
        M,
        l
      ), b = t.memoizedState), (m = na || Pr(
        t,
        a,
        m,
        l,
        S,
        b,
        s
      )) ? (x || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount()), typeof n.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = l, t.memoizedState = b), n.props = l, n.state = b, n.context = s, l = m) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), l = !1);
    } else {
      n = t.stateNode, rc(e, t), s = t.memoizedProps, x = Ja(a, s), n.props = x, M = t.pendingProps, S = n.context, b = a.contextType, m = vl, typeof b == "object" && b !== null && (m = we(b)), d = a.getDerivedStateFromProps, (b = typeof d == "function" || typeof n.getSnapshotBeforeUpdate == "function") || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (s !== M || S !== m) && ed(
        t,
        n,
        l,
        m
      ), na = !1, S = t.memoizedState, n.state = S, vu(t, l, n, u), yu();
      var T = t.memoizedState;
      s !== M || S !== T || na || e !== null && e.dependencies !== null && gn(e.dependencies) ? (typeof d == "function" && (Nc(
        t,
        a,
        d,
        l
      ), T = t.memoizedState), (x = na || Pr(
        t,
        a,
        x,
        l,
        S,
        T,
        m
      ) || e !== null && e.dependencies !== null && gn(e.dependencies)) ? (b || typeof n.UNSAFE_componentWillUpdate != "function" && typeof n.componentWillUpdate != "function" || (typeof n.componentWillUpdate == "function" && n.componentWillUpdate(l, T, m), typeof n.UNSAFE_componentWillUpdate == "function" && n.UNSAFE_componentWillUpdate(
        l,
        T,
        m
      )), typeof n.componentDidUpdate == "function" && (t.flags |= 4), typeof n.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof n.componentDidUpdate != "function" || s === e.memoizedProps && S === e.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || s === e.memoizedProps && S === e.memoizedState || (t.flags |= 1024), t.memoizedProps = l, t.memoizedState = T), n.props = l, n.state = T, n.context = m, l = x) : (typeof n.componentDidUpdate != "function" || s === e.memoizedProps && S === e.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || s === e.memoizedProps && S === e.memoizedState || (t.flags |= 1024), l = !1);
    }
    return n = l, Hn(e, t), l = (t.flags & 128) !== 0, n || l ? (n = t.stateNode, a = l && typeof a.getDerivedStateFromError != "function" ? null : n.render(), t.flags |= 1, e !== null && l ? (t.child = Ol(
      t,
      e.child,
      null,
      u
    ), t.child = Ol(
      t,
      null,
      a,
      u
    )) : Be(e, t, a, u), t.memoizedState = n.state, e = t.child) : e = Kt(
      e,
      t,
      u
    ), e;
  }
  function yd(e, t, a, l) {
    return cu(), t.flags |= 256, Be(e, t, a, l), t.child;
  }
  var Zc = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function Hc(e) {
    return { baseLanes: e, cachePool: ar() };
  }
  function qc(e, t, a) {
    return e = e !== null ? e.childLanes & ~a : 0, t && (e |= St), e;
  }
  function vd(e, t, a) {
    var l = t.pendingProps, u = !1, n = (t.flags & 128) !== 0, s;
    if ((s = n) || (s = e !== null && e.memoizedState === null ? !1 : (Ce.current & 2) !== 0), s && (u = !0, t.flags &= -129), s = (t.flags & 32) !== 0, t.flags &= -33, e === null) {
      if (re) {
        if (u ? sa(t) : ra(), re) {
          var d = Ee, m;
          if (m = d) {
            e: {
              for (m = d, d = Dt; m.nodeType !== 8; ) {
                if (!d) {
                  d = null;
                  break e;
                }
                if (m = zt(
                  m.nextSibling
                ), m === null) {
                  d = null;
                  break e;
                }
              }
              d = m;
            }
            d !== null ? (t.memoizedState = {
              dehydrated: d,
              treeContext: Ga !== null ? { id: Xt, overflow: Vt } : null,
              retryLane: 536870912,
              hydrationErrors: null
            }, m = ct(
              18,
              null,
              null,
              0
            ), m.stateNode = d, m.return = t, t.child = m, Ke = t, Ee = null, m = !0) : m = !1;
          }
          m || Qa(t);
        }
        if (d = t.memoizedState, d !== null && (d = d.dehydrated, d !== null))
          return Sf(d) ? t.lanes = 32 : t.lanes = 536870912, null;
        Lt(t);
      }
      return d = l.children, l = l.fallback, u ? (ra(), u = t.mode, d = qn(
        { mode: "hidden", children: d },
        u
      ), l = Ya(
        l,
        u,
        a,
        null
      ), d.return = t, l.return = t, d.sibling = l, t.child = d, u = t.child, u.memoizedState = Hc(a), u.childLanes = qc(
        e,
        s,
        a
      ), t.memoizedState = Zc, l) : (sa(t), Bc(t, d));
    }
    if (m = e.memoizedState, m !== null && (d = m.dehydrated, d !== null)) {
      if (n)
        t.flags & 256 ? (sa(t), t.flags &= -257, t = Yc(
          e,
          t,
          a
        )) : t.memoizedState !== null ? (ra(), t.child = e.child, t.flags |= 128, t = null) : (ra(), u = l.fallback, d = t.mode, l = qn(
          { mode: "visible", children: l.children },
          d
        ), u = Ya(
          u,
          d,
          a,
          null
        ), u.flags |= 2, l.return = t, u.return = t, l.sibling = u, t.child = l, Ol(
          t,
          e.child,
          null,
          a
        ), l = t.child, l.memoizedState = Hc(a), l.childLanes = qc(
          e,
          s,
          a
        ), t.memoizedState = Zc, t = u);
      else if (sa(t), Sf(d)) {
        if (s = d.nextSibling && d.nextSibling.dataset, s) var b = s.dgst;
        s = b, l = Error(f(419)), l.stack = "", l.digest = s, fu({ value: l, source: null, stack: null }), t = Yc(
          e,
          t,
          a
        );
      } else if (Ze || su(e, t, a, !1), s = (a & e.childLanes) !== 0, Ze || s) {
        if (s = be, s !== null && (l = a & -a, l = (l & 42) !== 0 ? 1 : Si(l), l = (l & (s.suspendedLanes | a)) !== 0 ? 0 : l, l !== 0 && l !== m.retryLane))
          throw m.retryLane = l, yl(e, l), ot(s, e, l), cd;
        d.data === "$?" || lf(), t = Yc(
          e,
          t,
          a
        );
      } else
        d.data === "$?" ? (t.flags |= 192, t.child = e.child, t = null) : (e = m.treeContext, Ee = zt(
          d.nextSibling
        ), Ke = t, re = !0, Va = null, Dt = !1, e !== null && (_t[pt++] = Xt, _t[pt++] = Vt, _t[pt++] = Ga, Xt = e.id, Vt = e.overflow, Ga = t), t = Bc(
          t,
          l.children
        ), t.flags |= 4096);
      return t;
    }
    return u ? (ra(), u = l.fallback, d = t.mode, m = e.child, b = m.sibling, l = Gt(m, {
      mode: "hidden",
      children: l.children
    }), l.subtreeFlags = m.subtreeFlags & 65011712, b !== null ? u = Gt(b, u) : (u = Ya(
      u,
      d,
      a,
      null
    ), u.flags |= 2), u.return = t, l.return = t, l.sibling = u, t.child = l, l = u, u = t.child, d = e.child.memoizedState, d === null ? d = Hc(a) : (m = d.cachePool, m !== null ? (b = Ue._currentValue, m = m.parent !== b ? { parent: b, pool: b } : m) : m = ar(), d = {
      baseLanes: d.baseLanes | a,
      cachePool: m
    }), u.memoizedState = d, u.childLanes = qc(
      e,
      s,
      a
    ), t.memoizedState = Zc, l) : (sa(t), a = e.child, e = a.sibling, a = Gt(a, {
      mode: "visible",
      children: l.children
    }), a.return = t, a.sibling = null, e !== null && (s = t.deletions, s === null ? (t.deletions = [e], t.flags |= 16) : s.push(e)), t.child = a, t.memoizedState = null, a);
  }
  function Bc(e, t) {
    return t = qn(
      { mode: "visible", children: t },
      e.mode
    ), t.return = e, e.child = t;
  }
  function qn(e, t) {
    return e = ct(22, e, null, t), e.lanes = 0, e.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }, e;
  }
  function Yc(e, t, a) {
    return Ol(t, e.child, null, a), e = Bc(
      t,
      t.pendingProps.children
    ), e.flags |= 2, t.memoizedState = null, e;
  }
  function gd(e, t, a) {
    e.lanes |= t;
    var l = e.alternate;
    l !== null && (l.lanes |= t), lc(e.return, t, a);
  }
  function Gc(e, t, a, l, u) {
    var n = e.memoizedState;
    n === null ? e.memoizedState = {
      isBackwards: t,
      rendering: null,
      renderingStartTime: 0,
      last: l,
      tail: a,
      tailMode: u
    } : (n.isBackwards = t, n.rendering = null, n.renderingStartTime = 0, n.last = l, n.tail = a, n.tailMode = u);
  }
  function _d(e, t, a) {
    var l = t.pendingProps, u = l.revealOrder, n = l.tail;
    if (Be(e, t, l.children, a), l = Ce.current, (l & 2) !== 0)
      l = l & 1 | 2, t.flags |= 128;
    else {
      if (e !== null && (e.flags & 128) !== 0)
        e: for (e = t.child; e !== null; ) {
          if (e.tag === 13)
            e.memoizedState !== null && gd(e, a, t);
          else if (e.tag === 19)
            gd(e, a, t);
          else if (e.child !== null) {
            e.child.return = e, e = e.child;
            continue;
          }
          if (e === t) break e;
          for (; e.sibling === null; ) {
            if (e.return === null || e.return === t)
              break e;
            e = e.return;
          }
          e.sibling.return = e.return, e = e.sibling;
        }
      l &= 1;
    }
    switch (C(Ce, l), u) {
      case "forwards":
        for (a = t.child, u = null; a !== null; )
          e = a.alternate, e !== null && Cn(e) === null && (u = a), a = a.sibling;
        a = u, a === null ? (u = t.child, t.child = null) : (u = a.sibling, a.sibling = null), Gc(
          t,
          !1,
          u,
          a,
          n
        );
        break;
      case "backwards":
        for (a = null, u = t.child, t.child = null; u !== null; ) {
          if (e = u.alternate, e !== null && Cn(e) === null) {
            t.child = u;
            break;
          }
          e = u.sibling, u.sibling = a, a = u, u = e;
        }
        Gc(
          t,
          !0,
          a,
          null,
          n
        );
        break;
      case "together":
        Gc(t, !1, null, null, void 0);
        break;
      default:
        t.memoizedState = null;
    }
    return t.child;
  }
  function Kt(e, t, a) {
    if (e !== null && (t.dependencies = e.dependencies), ya |= t.lanes, (a & t.childLanes) === 0)
      if (e !== null) {
        if (su(
          e,
          t,
          a,
          !1
        ), (a & t.childLanes) === 0)
          return null;
      } else return null;
    if (e !== null && t.child !== e.child)
      throw Error(f(153));
    if (t.child !== null) {
      for (e = t.child, a = Gt(e, e.pendingProps), t.child = a, a.return = t; e.sibling !== null; )
        e = e.sibling, a = a.sibling = Gt(e, e.pendingProps), a.return = t;
      a.sibling = null;
    }
    return t.child;
  }
  function Xc(e, t) {
    return (e.lanes & t) !== 0 ? !0 : (e = e.dependencies, !!(e !== null && gn(e)));
  }
  function Vm(e, t, a) {
    switch (t.tag) {
      case 3:
        Se(t, t.stateNode.containerInfo), ua(t, Ue, e.memoizedState.cache), cu();
        break;
      case 27:
      case 5:
        vi(t);
        break;
      case 4:
        Se(t, t.stateNode.containerInfo);
        break;
      case 10:
        ua(
          t,
          t.type,
          t.memoizedProps.value
        );
        break;
      case 13:
        var l = t.memoizedState;
        if (l !== null)
          return l.dehydrated !== null ? (sa(t), t.flags |= 128, null) : (a & t.child.childLanes) !== 0 ? vd(e, t, a) : (sa(t), e = Kt(
            e,
            t,
            a
          ), e !== null ? e.sibling : null);
        sa(t);
        break;
      case 19:
        var u = (e.flags & 128) !== 0;
        if (l = (a & t.childLanes) !== 0, l || (su(
          e,
          t,
          a,
          !1
        ), l = (a & t.childLanes) !== 0), u) {
          if (l)
            return _d(
              e,
              t,
              a
            );
          t.flags |= 128;
        }
        if (u = t.memoizedState, u !== null && (u.rendering = null, u.tail = null, u.lastEffect = null), C(Ce, Ce.current), l) break;
        return null;
      case 22:
      case 23:
        return t.lanes = 0, dd(e, t, a);
      case 24:
        ua(t, Ue, e.memoizedState.cache);
    }
    return Kt(e, t, a);
  }
  function pd(e, t, a) {
    if (e !== null)
      if (e.memoizedProps !== t.pendingProps)
        Ze = !0;
      else {
        if (!Xc(e, a) && (t.flags & 128) === 0)
          return Ze = !1, Vm(
            e,
            t,
            a
          );
        Ze = (e.flags & 131072) !== 0;
      }
    else
      Ze = !1, re && (t.flags & 1048576) !== 0 && $s(t, vn, t.index);
    switch (t.lanes = 0, t.tag) {
      case 16:
        e: {
          e = t.pendingProps;
          var l = t.elementType, u = l._init;
          if (l = u(l._payload), t.type = l, typeof l == "function")
            Wi(l) ? (e = Ja(l, e), t.tag = 1, t = md(
              null,
              t,
              l,
              e,
              a
            )) : (t.tag = 0, t = jc(
              null,
              t,
              l,
              e,
              a
            ));
          else {
            if (l != null) {
              if (u = l.$$typeof, u === Et) {
                t.tag = 11, t = fd(
                  null,
                  t,
                  l,
                  e,
                  a
                );
                break e;
              } else if (u === tt) {
                t.tag = 14, t = sd(
                  null,
                  t,
                  l,
                  e,
                  a
                );
                break e;
              }
            }
            throw t = Ca(l) || l, Error(f(306, t, ""));
          }
        }
        return t;
      case 0:
        return jc(
          e,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 1:
        return l = t.type, u = Ja(
          l,
          t.pendingProps
        ), md(
          e,
          t,
          l,
          u,
          a
        );
      case 3:
        e: {
          if (Se(
            t,
            t.stateNode.containerInfo
          ), e === null) throw Error(f(387));
          l = t.pendingProps;
          var n = t.memoizedState;
          u = n.element, rc(e, t), vu(t, l, null, a);
          var s = t.memoizedState;
          if (l = s.cache, ua(t, Ue, l), l !== n.cache && uc(
            t,
            [Ue],
            a,
            !0
          ), yu(), l = s.element, n.isDehydrated)
            if (n = {
              element: l,
              isDehydrated: !1,
              cache: s.cache
            }, t.updateQueue.baseState = n, t.memoizedState = n, t.flags & 256) {
              t = yd(
                e,
                t,
                l,
                a
              );
              break e;
            } else if (l !== u) {
              u = vt(
                Error(f(424)),
                t
              ), fu(u), t = yd(
                e,
                t,
                l,
                a
              );
              break e;
            } else {
              switch (e = t.stateNode.containerInfo, e.nodeType) {
                case 9:
                  e = e.body;
                  break;
                default:
                  e = e.nodeName === "HTML" ? e.ownerDocument.body : e;
              }
              for (Ee = zt(e.firstChild), Ke = t, re = !0, Va = null, Dt = !0, a = Fr(
                t,
                null,
                l,
                a
              ), t.child = a; a; )
                a.flags = a.flags & -3 | 4096, a = a.sibling;
            }
          else {
            if (cu(), l === u) {
              t = Kt(
                e,
                t,
                a
              );
              break e;
            }
            Be(
              e,
              t,
              l,
              a
            );
          }
          t = t.child;
        }
        return t;
      case 26:
        return Hn(e, t), e === null ? (a = Eo(
          t.type,
          null,
          t.pendingProps,
          null
        )) ? t.memoizedState = a : re || (a = t.type, e = t.pendingProps, l = Fn(
          K.current
        ).createElement(a), l[ke] = t, l[$e] = e, Ge(l, a, e), je(l), t.stateNode = l) : t.memoizedState = Eo(
          t.type,
          e.memoizedProps,
          t.pendingProps,
          e.memoizedState
        ), null;
      case 27:
        return vi(t), e === null && re && (l = t.stateNode = So(
          t.type,
          t.pendingProps,
          K.current
        ), Ke = t, Dt = !0, u = Ee, pa(t.type) ? (Tf = u, Ee = zt(
          l.firstChild
        )) : Ee = u), Be(
          e,
          t,
          t.pendingProps.children,
          a
        ), Hn(e, t), e === null && (t.flags |= 4194304), t.child;
      case 5:
        return e === null && re && ((u = l = Ee) && (l = vy(
          l,
          t.type,
          t.pendingProps,
          Dt
        ), l !== null ? (t.stateNode = l, Ke = t, Ee = zt(
          l.firstChild
        ), Dt = !1, u = !0) : u = !1), u || Qa(t)), vi(t), u = t.type, n = t.pendingProps, s = e !== null ? e.memoizedProps : null, l = n.children, _f(u, n) ? l = null : s !== null && _f(u, s) && (t.flags |= 32), t.memoizedState !== null && (u = vc(
          e,
          t,
          jm,
          null,
          null,
          a
        ), Bu._currentValue = u), Hn(e, t), Be(e, t, l, a), t.child;
      case 6:
        return e === null && re && ((e = a = Ee) && (a = gy(
          a,
          t.pendingProps,
          Dt
        ), a !== null ? (t.stateNode = a, Ke = t, Ee = null, e = !0) : e = !1), e || Qa(t)), null;
      case 13:
        return vd(e, t, a);
      case 4:
        return Se(
          t,
          t.stateNode.containerInfo
        ), l = t.pendingProps, e === null ? t.child = Ol(
          t,
          null,
          l,
          a
        ) : Be(
          e,
          t,
          l,
          a
        ), t.child;
      case 11:
        return fd(
          e,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 7:
        return Be(
          e,
          t,
          t.pendingProps,
          a
        ), t.child;
      case 8:
        return Be(
          e,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 12:
        return Be(
          e,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 10:
        return l = t.pendingProps, ua(t, t.type, l.value), Be(
          e,
          t,
          l.children,
          a
        ), t.child;
      case 9:
        return u = t.type._context, l = t.pendingProps.children, wa(t), u = we(u), l = l(u), t.flags |= 1, Be(e, t, l, a), t.child;
      case 14:
        return sd(
          e,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 15:
        return rd(
          e,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 19:
        return _d(e, t, a);
      case 31:
        return l = t.pendingProps, a = t.mode, l = {
          mode: l.mode,
          children: l.children
        }, e === null ? (a = qn(
          l,
          a
        ), a.ref = t.ref, t.child = a, a.return = t, t = a) : (a = Gt(e.child, l), a.ref = t.ref, t.child = a, a.return = t, t = a), t;
      case 22:
        return dd(e, t, a);
      case 24:
        return wa(t), l = we(Ue), e === null ? (u = cc(), u === null && (u = be, n = nc(), u.pooledCache = n, n.refCount++, n !== null && (u.pooledCacheLanes |= a), u = n), t.memoizedState = {
          parent: l,
          cache: u
        }, sc(t), ua(t, Ue, u)) : ((e.lanes & a) !== 0 && (rc(e, t), vu(t, null, null, a), yu()), u = e.memoizedState, n = t.memoizedState, u.parent !== l ? (u = { parent: l, cache: l }, t.memoizedState = u, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = u), ua(t, Ue, l)) : (l = n.cache, ua(t, Ue, l), l !== u.cache && uc(
          t,
          [Ue],
          a,
          !0
        ))), Be(
          e,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 29:
        throw t.pendingProps;
    }
    throw Error(f(156, t.tag));
  }
  function Jt(e) {
    e.flags |= 4;
  }
  function bd(e, t) {
    if (t.type !== "stylesheet" || (t.state.loading & 4) !== 0)
      e.flags &= -16777217;
    else if (e.flags |= 16777216, !Mo(t)) {
      if (t = bt.current, t !== null && ((ae & 4194048) === ae ? Nt !== null : (ae & 62914560) !== ae && (ae & 536870912) === 0 || t !== Nt))
        throw hu = fc, lr;
      e.flags |= 8192;
    }
  }
  function Bn(e, t) {
    t !== null && (e.flags |= 4), e.flags & 16384 && (t = e.tag !== 22 ? If() : 536870912, e.lanes |= t, Dl |= t);
  }
  function Au(e, t) {
    if (!re)
      switch (e.tailMode) {
        case "hidden":
          t = e.tail;
          for (var a = null; t !== null; )
            t.alternate !== null && (a = t), t = t.sibling;
          a === null ? e.tail = null : a.sibling = null;
          break;
        case "collapsed":
          a = e.tail;
          for (var l = null; a !== null; )
            a.alternate !== null && (l = a), a = a.sibling;
          l === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : l.sibling = null;
      }
  }
  function Ae(e) {
    var t = e.alternate !== null && e.alternate.child === e.child, a = 0, l = 0;
    if (t)
      for (var u = e.child; u !== null; )
        a |= u.lanes | u.childLanes, l |= u.subtreeFlags & 65011712, l |= u.flags & 65011712, u.return = e, u = u.sibling;
    else
      for (u = e.child; u !== null; )
        a |= u.lanes | u.childLanes, l |= u.subtreeFlags, l |= u.flags, u.return = e, u = u.sibling;
    return e.subtreeFlags |= l, e.childLanes = a, t;
  }
  function Qm(e, t, a) {
    var l = t.pendingProps;
    switch (ec(t), t.tag) {
      case 31:
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return Ae(t), null;
      case 1:
        return Ae(t), null;
      case 3:
        return a = t.stateNode, l = null, e !== null && (l = e.memoizedState.cache), t.memoizedState.cache !== l && (t.flags |= 2048), kt(Ue), ea(), a.pendingContext && (a.context = a.pendingContext, a.pendingContext = null), (e === null || e.child === null) && (iu(t) ? Jt(t) : e === null || e.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, Is())), Ae(t), null;
      case 26:
        return a = t.memoizedState, e === null ? (Jt(t), a !== null ? (Ae(t), bd(t, a)) : (Ae(t), t.flags &= -16777217)) : a ? a !== e.memoizedState ? (Jt(t), Ae(t), bd(t, a)) : (Ae(t), t.flags &= -16777217) : (e.memoizedProps !== l && Jt(t), Ae(t), t.flags &= -16777217), null;
      case 27:
        Ju(t), a = K.current;
        var u = t.type;
        if (e !== null && t.stateNode != null)
          e.memoizedProps !== l && Jt(t);
        else {
          if (!l) {
            if (t.stateNode === null)
              throw Error(f(166));
            return Ae(t), null;
          }
          e = X.current, iu(t) ? Ws(t) : (e = So(u, l, a), t.stateNode = e, Jt(t));
        }
        return Ae(t), null;
      case 5:
        if (Ju(t), a = t.type, e !== null && t.stateNode != null)
          e.memoizedProps !== l && Jt(t);
        else {
          if (!l) {
            if (t.stateNode === null)
              throw Error(f(166));
            return Ae(t), null;
          }
          if (e = X.current, iu(t))
            Ws(t);
          else {
            switch (u = Fn(
              K.current
            ), e) {
              case 1:
                e = u.createElementNS(
                  "http://www.w3.org/2000/svg",
                  a
                );
                break;
              case 2:
                e = u.createElementNS(
                  "http://www.w3.org/1998/Math/MathML",
                  a
                );
                break;
              default:
                switch (a) {
                  case "svg":
                    e = u.createElementNS(
                      "http://www.w3.org/2000/svg",
                      a
                    );
                    break;
                  case "math":
                    e = u.createElementNS(
                      "http://www.w3.org/1998/Math/MathML",
                      a
                    );
                    break;
                  case "script":
                    e = u.createElement("div"), e.innerHTML = "<script><\/script>", e = e.removeChild(e.firstChild);
                    break;
                  case "select":
                    e = typeof l.is == "string" ? u.createElement("select", { is: l.is }) : u.createElement("select"), l.multiple ? e.multiple = !0 : l.size && (e.size = l.size);
                    break;
                  default:
                    e = typeof l.is == "string" ? u.createElement(a, { is: l.is }) : u.createElement(a);
                }
            }
            e[ke] = t, e[$e] = l;
            e: for (u = t.child; u !== null; ) {
              if (u.tag === 5 || u.tag === 6)
                e.appendChild(u.stateNode);
              else if (u.tag !== 4 && u.tag !== 27 && u.child !== null) {
                u.child.return = u, u = u.child;
                continue;
              }
              if (u === t) break e;
              for (; u.sibling === null; ) {
                if (u.return === null || u.return === t)
                  break e;
                u = u.return;
              }
              u.sibling.return = u.return, u = u.sibling;
            }
            t.stateNode = e;
            e: switch (Ge(e, a, l), a) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                e = !!l.autoFocus;
                break e;
              case "img":
                e = !0;
                break e;
              default:
                e = !1;
            }
            e && Jt(t);
          }
        }
        return Ae(t), t.flags &= -16777217, null;
      case 6:
        if (e && t.stateNode != null)
          e.memoizedProps !== l && Jt(t);
        else {
          if (typeof l != "string" && t.stateNode === null)
            throw Error(f(166));
          if (e = K.current, iu(t)) {
            if (e = t.stateNode, a = t.memoizedProps, l = null, u = Ke, u !== null)
              switch (u.tag) {
                case 27:
                case 5:
                  l = u.memoizedProps;
              }
            e[ke] = t, e = !!(e.nodeValue === a || l !== null && l.suppressHydrationWarning === !0 || mo(e.nodeValue, a)), e || Qa(t);
          } else
            e = Fn(e).createTextNode(
              l
            ), e[ke] = t, t.stateNode = e;
        }
        return Ae(t), null;
      case 13:
        if (l = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
          if (u = iu(t), l !== null && l.dehydrated !== null) {
            if (e === null) {
              if (!u) throw Error(f(318));
              if (u = t.memoizedState, u = u !== null ? u.dehydrated : null, !u) throw Error(f(317));
              u[ke] = t;
            } else
              cu(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Ae(t), u = !1;
          } else
            u = Is(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = u), u = !0;
          if (!u)
            return t.flags & 256 ? (Lt(t), t) : (Lt(t), null);
        }
        if (Lt(t), (t.flags & 128) !== 0)
          return t.lanes = a, t;
        if (a = l !== null, e = e !== null && e.memoizedState !== null, a) {
          l = t.child, u = null, l.alternate !== null && l.alternate.memoizedState !== null && l.alternate.memoizedState.cachePool !== null && (u = l.alternate.memoizedState.cachePool.pool);
          var n = null;
          l.memoizedState !== null && l.memoizedState.cachePool !== null && (n = l.memoizedState.cachePool.pool), n !== u && (l.flags |= 2048);
        }
        return a !== e && a && (t.child.flags |= 8192), Bn(t, t.updateQueue), Ae(t), null;
      case 4:
        return ea(), e === null && hf(t.stateNode.containerInfo), Ae(t), null;
      case 10:
        return kt(t.type), Ae(t), null;
      case 19:
        if (H(Ce), u = t.memoizedState, u === null) return Ae(t), null;
        if (l = (t.flags & 128) !== 0, n = u.rendering, n === null)
          if (l) Au(u, !1);
          else {
            if (xe !== 0 || e !== null && (e.flags & 128) !== 0)
              for (e = t.child; e !== null; ) {
                if (n = Cn(e), n !== null) {
                  for (t.flags |= 128, Au(u, !1), e = n.updateQueue, t.updateQueue = e, Bn(t, e), t.subtreeFlags = 0, e = a, a = t.child; a !== null; )
                    Js(a, e), a = a.sibling;
                  return C(
                    Ce,
                    Ce.current & 1 | 2
                  ), t.child;
                }
                e = e.sibling;
              }
            u.tail !== null && Mt() > Xn && (t.flags |= 128, l = !0, Au(u, !1), t.lanes = 4194304);
          }
        else {
          if (!l)
            if (e = Cn(n), e !== null) {
              if (t.flags |= 128, l = !0, e = e.updateQueue, t.updateQueue = e, Bn(t, e), Au(u, !0), u.tail === null && u.tailMode === "hidden" && !n.alternate && !re)
                return Ae(t), null;
            } else
              2 * Mt() - u.renderingStartTime > Xn && a !== 536870912 && (t.flags |= 128, l = !0, Au(u, !1), t.lanes = 4194304);
          u.isBackwards ? (n.sibling = t.child, t.child = n) : (e = u.last, e !== null ? e.sibling = n : t.child = n, u.last = n);
        }
        return u.tail !== null ? (t = u.tail, u.rendering = t, u.tail = t.sibling, u.renderingStartTime = Mt(), t.sibling = null, e = Ce.current, C(Ce, l ? e & 1 | 2 : e & 1), t) : (Ae(t), null);
      case 22:
      case 23:
        return Lt(t), mc(), l = t.memoizedState !== null, e !== null ? e.memoizedState !== null !== l && (t.flags |= 8192) : l && (t.flags |= 8192), l ? (a & 536870912) !== 0 && (t.flags & 128) === 0 && (Ae(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : Ae(t), a = t.updateQueue, a !== null && Bn(t, a.retryQueue), a = null, e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (a = e.memoizedState.cachePool.pool), l = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (l = t.memoizedState.cachePool.pool), l !== a && (t.flags |= 2048), e !== null && H(La), null;
      case 24:
        return a = null, e !== null && (a = e.memoizedState.cache), t.memoizedState.cache !== a && (t.flags |= 2048), kt(Ue), Ae(t), null;
      case 25:
        return null;
      case 30:
        return null;
    }
    throw Error(f(156, t.tag));
  }
  function km(e, t) {
    switch (ec(t), t.tag) {
      case 1:
        return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
      case 3:
        return kt(Ue), ea(), e = t.flags, (e & 65536) !== 0 && (e & 128) === 0 ? (t.flags = e & -65537 | 128, t) : null;
      case 26:
      case 27:
      case 5:
        return Ju(t), null;
      case 13:
        if (Lt(t), e = t.memoizedState, e !== null && e.dehydrated !== null) {
          if (t.alternate === null)
            throw Error(f(340));
          cu();
        }
        return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
      case 19:
        return H(Ce), null;
      case 4:
        return ea(), null;
      case 10:
        return kt(t.type), null;
      case 22:
      case 23:
        return Lt(t), mc(), e !== null && H(La), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
      case 24:
        return kt(Ue), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function Sd(e, t) {
    switch (ec(t), t.tag) {
      case 3:
        kt(Ue), ea();
        break;
      case 26:
      case 27:
      case 5:
        Ju(t);
        break;
      case 4:
        ea();
        break;
      case 13:
        Lt(t);
        break;
      case 19:
        H(Ce);
        break;
      case 10:
        kt(t.type);
        break;
      case 22:
      case 23:
        Lt(t), mc(), e !== null && H(La);
        break;
      case 24:
        kt(Ue);
    }
  }
  function Eu(e, t) {
    try {
      var a = t.updateQueue, l = a !== null ? a.lastEffect : null;
      if (l !== null) {
        var u = l.next;
        a = u;
        do {
          if ((a.tag & e) === e) {
            l = void 0;
            var n = a.create, s = a.inst;
            l = n(), s.destroy = l;
          }
          a = a.next;
        } while (a !== u);
      }
    } catch (d) {
      _e(t, t.return, d);
    }
  }
  function da(e, t, a) {
    try {
      var l = t.updateQueue, u = l !== null ? l.lastEffect : null;
      if (u !== null) {
        var n = u.next;
        l = n;
        do {
          if ((l.tag & e) === e) {
            var s = l.inst, d = s.destroy;
            if (d !== void 0) {
              s.destroy = void 0, u = t;
              var m = a, b = d;
              try {
                b();
              } catch (x) {
                _e(
                  u,
                  m,
                  x
                );
              }
            }
          }
          l = l.next;
        } while (l !== n);
      }
    } catch (x) {
      _e(t, t.return, x);
    }
  }
  function Td(e) {
    var t = e.updateQueue;
    if (t !== null) {
      var a = e.stateNode;
      try {
        sr(t, a);
      } catch (l) {
        _e(e, e.return, l);
      }
    }
  }
  function Ad(e, t, a) {
    a.props = Ja(
      e.type,
      e.memoizedProps
    ), a.state = e.memoizedState;
    try {
      a.componentWillUnmount();
    } catch (l) {
      _e(e, t, l);
    }
  }
  function xu(e, t) {
    try {
      var a = e.ref;
      if (a !== null) {
        switch (e.tag) {
          case 26:
          case 27:
          case 5:
            var l = e.stateNode;
            break;
          case 30:
            l = e.stateNode;
            break;
          default:
            l = e.stateNode;
        }
        typeof a == "function" ? e.refCleanup = a(l) : a.current = l;
      }
    } catch (u) {
      _e(e, t, u);
    }
  }
  function Ut(e, t) {
    var a = e.ref, l = e.refCleanup;
    if (a !== null)
      if (typeof l == "function")
        try {
          l();
        } catch (u) {
          _e(e, t, u);
        } finally {
          e.refCleanup = null, e = e.alternate, e != null && (e.refCleanup = null);
        }
      else if (typeof a == "function")
        try {
          a(null);
        } catch (u) {
          _e(e, t, u);
        }
      else a.current = null;
  }
  function Ed(e) {
    var t = e.type, a = e.memoizedProps, l = e.stateNode;
    try {
      e: switch (t) {
        case "button":
        case "input":
        case "select":
        case "textarea":
          a.autoFocus && l.focus();
          break e;
        case "img":
          a.src ? l.src = a.src : a.srcSet && (l.srcset = a.srcSet);
      }
    } catch (u) {
      _e(e, e.return, u);
    }
  }
  function Vc(e, t, a) {
    try {
      var l = e.stateNode;
      dy(l, e.type, a, t), l[$e] = t;
    } catch (u) {
      _e(e, e.return, u);
    }
  }
  function xd(e) {
    return e.tag === 5 || e.tag === 3 || e.tag === 26 || e.tag === 27 && pa(e.type) || e.tag === 4;
  }
  function Qc(e) {
    e: for (; ; ) {
      for (; e.sibling === null; ) {
        if (e.return === null || xd(e.return)) return null;
        e = e.return;
      }
      for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
        if (e.tag === 27 && pa(e.type) || e.flags & 2 || e.child === null || e.tag === 4) continue e;
        e.child.return = e, e = e.child;
      }
      if (!(e.flags & 2)) return e.stateNode;
    }
  }
  function kc(e, t, a) {
    var l = e.tag;
    if (l === 5 || l === 6)
      e = e.stateNode, t ? (a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a).insertBefore(e, t) : (t = a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a, t.appendChild(e), a = a._reactRootContainer, a != null || t.onclick !== null || (t.onclick = Wn));
    else if (l !== 4 && (l === 27 && pa(e.type) && (a = e.stateNode, t = null), e = e.child, e !== null))
      for (kc(e, t, a), e = e.sibling; e !== null; )
        kc(e, t, a), e = e.sibling;
  }
  function Yn(e, t, a) {
    var l = e.tag;
    if (l === 5 || l === 6)
      e = e.stateNode, t ? a.insertBefore(e, t) : a.appendChild(e);
    else if (l !== 4 && (l === 27 && pa(e.type) && (a = e.stateNode), e = e.child, e !== null))
      for (Yn(e, t, a), e = e.sibling; e !== null; )
        Yn(e, t, a), e = e.sibling;
  }
  function Od(e) {
    var t = e.stateNode, a = e.memoizedProps;
    try {
      for (var l = e.type, u = t.attributes; u.length; )
        t.removeAttributeNode(u[0]);
      Ge(t, l, a), t[ke] = e, t[$e] = a;
    } catch (n) {
      _e(e, e.return, n);
    }
  }
  var $t = !1, ze = !1, wc = !1, zd = typeof WeakSet == "function" ? WeakSet : Set, He = null;
  function wm(e, t) {
    if (e = e.containerInfo, vf = li, e = Bs(e), Qi(e)) {
      if ("selectionStart" in e)
        var a = {
          start: e.selectionStart,
          end: e.selectionEnd
        };
      else
        e: {
          a = (a = e.ownerDocument) && a.defaultView || window;
          var l = a.getSelection && a.getSelection();
          if (l && l.rangeCount !== 0) {
            a = l.anchorNode;
            var u = l.anchorOffset, n = l.focusNode;
            l = l.focusOffset;
            try {
              a.nodeType, n.nodeType;
            } catch {
              a = null;
              break e;
            }
            var s = 0, d = -1, m = -1, b = 0, x = 0, M = e, S = null;
            t: for (; ; ) {
              for (var T; M !== a || u !== 0 && M.nodeType !== 3 || (d = s + u), M !== n || l !== 0 && M.nodeType !== 3 || (m = s + l), M.nodeType === 3 && (s += M.nodeValue.length), (T = M.firstChild) !== null; )
                S = M, M = T;
              for (; ; ) {
                if (M === e) break t;
                if (S === a && ++b === u && (d = s), S === n && ++x === l && (m = s), (T = M.nextSibling) !== null) break;
                M = S, S = M.parentNode;
              }
              M = T;
            }
            a = d === -1 || m === -1 ? null : { start: d, end: m };
          } else a = null;
        }
      a = a || { start: 0, end: 0 };
    } else a = null;
    for (gf = { focusedElem: e, selectionRange: a }, li = !1, He = t; He !== null; )
      if (t = He, e = t.child, (t.subtreeFlags & 1024) !== 0 && e !== null)
        e.return = t, He = e;
      else
        for (; He !== null; ) {
          switch (t = He, n = t.alternate, e = t.flags, t.tag) {
            case 0:
              break;
            case 11:
            case 15:
              break;
            case 1:
              if ((e & 1024) !== 0 && n !== null) {
                e = void 0, a = t, u = n.memoizedProps, n = n.memoizedState, l = a.stateNode;
                try {
                  var w = Ja(
                    a.type,
                    u,
                    a.elementType === a.type
                  );
                  e = l.getSnapshotBeforeUpdate(
                    w,
                    n
                  ), l.__reactInternalSnapshotBeforeUpdate = e;
                } catch (V) {
                  _e(
                    a,
                    a.return,
                    V
                  );
                }
              }
              break;
            case 3:
              if ((e & 1024) !== 0) {
                if (e = t.stateNode.containerInfo, a = e.nodeType, a === 9)
                  bf(e);
                else if (a === 1)
                  switch (e.nodeName) {
                    case "HEAD":
                    case "HTML":
                    case "BODY":
                      bf(e);
                      break;
                    default:
                      e.textContent = "";
                  }
              }
              break;
            case 5:
            case 26:
            case 27:
            case 6:
            case 4:
            case 17:
              break;
            default:
              if ((e & 1024) !== 0) throw Error(f(163));
          }
          if (e = t.sibling, e !== null) {
            e.return = t.return, He = e;
            break;
          }
          He = t.return;
        }
  }
  function Rd(e, t, a) {
    var l = a.flags;
    switch (a.tag) {
      case 0:
      case 11:
      case 15:
        oa(e, a), l & 4 && Eu(5, a);
        break;
      case 1:
        if (oa(e, a), l & 4)
          if (e = a.stateNode, t === null)
            try {
              e.componentDidMount();
            } catch (s) {
              _e(a, a.return, s);
            }
          else {
            var u = Ja(
              a.type,
              t.memoizedProps
            );
            t = t.memoizedState;
            try {
              e.componentDidUpdate(
                u,
                t,
                e.__reactInternalSnapshotBeforeUpdate
              );
            } catch (s) {
              _e(
                a,
                a.return,
                s
              );
            }
          }
        l & 64 && Td(a), l & 512 && xu(a, a.return);
        break;
      case 3:
        if (oa(e, a), l & 64 && (e = a.updateQueue, e !== null)) {
          if (t = null, a.child !== null)
            switch (a.child.tag) {
              case 27:
              case 5:
                t = a.child.stateNode;
                break;
              case 1:
                t = a.child.stateNode;
            }
          try {
            sr(e, t);
          } catch (s) {
            _e(a, a.return, s);
          }
        }
        break;
      case 27:
        t === null && l & 4 && Od(a);
      case 26:
      case 5:
        oa(e, a), t === null && l & 4 && Ed(a), l & 512 && xu(a, a.return);
        break;
      case 12:
        oa(e, a);
        break;
      case 13:
        oa(e, a), l & 4 && Nd(e, a), l & 64 && (e = a.memoizedState, e !== null && (e = e.dehydrated, e !== null && (a = ey.bind(
          null,
          a
        ), _y(e, a))));
        break;
      case 22:
        if (l = a.memoizedState !== null || $t, !l) {
          t = t !== null && t.memoizedState !== null || ze, u = $t;
          var n = ze;
          $t = l, (ze = t) && !n ? ha(
            e,
            a,
            (a.subtreeFlags & 8772) !== 0
          ) : oa(e, a), $t = u, ze = n;
        }
        break;
      case 30:
        break;
      default:
        oa(e, a);
    }
  }
  function Md(e) {
    var t = e.alternate;
    t !== null && (e.alternate = null, Md(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && Ei(t)), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
  }
  var Te = null, Ie = !1;
  function Wt(e, t, a) {
    for (a = a.child; a !== null; )
      Dd(e, t, a), a = a.sibling;
  }
  function Dd(e, t, a) {
    if (ut && typeof ut.onCommitFiberUnmount == "function")
      try {
        ut.onCommitFiberUnmount(Ll, a);
      } catch {
      }
    switch (a.tag) {
      case 26:
        ze || Ut(a, t), Wt(
          e,
          t,
          a
        ), a.memoizedState ? a.memoizedState.count-- : a.stateNode && (a = a.stateNode, a.parentNode.removeChild(a));
        break;
      case 27:
        ze || Ut(a, t);
        var l = Te, u = Ie;
        pa(a.type) && (Te = a.stateNode, Ie = !1), Wt(
          e,
          t,
          a
        ), ju(a.stateNode), Te = l, Ie = u;
        break;
      case 5:
        ze || Ut(a, t);
      case 6:
        if (l = Te, u = Ie, Te = null, Wt(
          e,
          t,
          a
        ), Te = l, Ie = u, Te !== null)
          if (Ie)
            try {
              (Te.nodeType === 9 ? Te.body : Te.nodeName === "HTML" ? Te.ownerDocument.body : Te).removeChild(a.stateNode);
            } catch (n) {
              _e(
                a,
                t,
                n
              );
            }
          else
            try {
              Te.removeChild(a.stateNode);
            } catch (n) {
              _e(
                a,
                t,
                n
              );
            }
        break;
      case 18:
        Te !== null && (Ie ? (e = Te, po(
          e.nodeType === 9 ? e.body : e.nodeName === "HTML" ? e.ownerDocument.body : e,
          a.stateNode
        ), Vu(e)) : po(Te, a.stateNode));
        break;
      case 4:
        l = Te, u = Ie, Te = a.stateNode.containerInfo, Ie = !0, Wt(
          e,
          t,
          a
        ), Te = l, Ie = u;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        ze || da(2, a, t), ze || da(4, a, t), Wt(
          e,
          t,
          a
        );
        break;
      case 1:
        ze || (Ut(a, t), l = a.stateNode, typeof l.componentWillUnmount == "function" && Ad(
          a,
          t,
          l
        )), Wt(
          e,
          t,
          a
        );
        break;
      case 21:
        Wt(
          e,
          t,
          a
        );
        break;
      case 22:
        ze = (l = ze) || a.memoizedState !== null, Wt(
          e,
          t,
          a
        ), ze = l;
        break;
      default:
        Wt(
          e,
          t,
          a
        );
    }
  }
  function Nd(e, t) {
    if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null && (e = e.dehydrated, e !== null))))
      try {
        Vu(e);
      } catch (a) {
        _e(t, t.return, a);
      }
  }
  function Lm(e) {
    switch (e.tag) {
      case 13:
      case 19:
        var t = e.stateNode;
        return t === null && (t = e.stateNode = new zd()), t;
      case 22:
        return e = e.stateNode, t = e._retryCache, t === null && (t = e._retryCache = new zd()), t;
      default:
        throw Error(f(435, e.tag));
    }
  }
  function Lc(e, t) {
    var a = Lm(e);
    t.forEach(function(l) {
      var u = ty.bind(null, e, l);
      a.has(l) || (a.add(l), l.then(u, u));
    });
  }
  function ft(e, t) {
    var a = t.deletions;
    if (a !== null)
      for (var l = 0; l < a.length; l++) {
        var u = a[l], n = e, s = t, d = s;
        e: for (; d !== null; ) {
          switch (d.tag) {
            case 27:
              if (pa(d.type)) {
                Te = d.stateNode, Ie = !1;
                break e;
              }
              break;
            case 5:
              Te = d.stateNode, Ie = !1;
              break e;
            case 3:
            case 4:
              Te = d.stateNode.containerInfo, Ie = !0;
              break e;
          }
          d = d.return;
        }
        if (Te === null) throw Error(f(160));
        Dd(n, s, u), Te = null, Ie = !1, n = u.alternate, n !== null && (n.return = null), u.return = null;
      }
    if (t.subtreeFlags & 13878)
      for (t = t.child; t !== null; )
        Ud(t, e), t = t.sibling;
  }
  var Ot = null;
  function Ud(e, t) {
    var a = e.alternate, l = e.flags;
    switch (e.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        ft(t, e), st(e), l & 4 && (da(3, e, e.return), Eu(3, e), da(5, e, e.return));
        break;
      case 1:
        ft(t, e), st(e), l & 512 && (ze || a === null || Ut(a, a.return)), l & 64 && $t && (e = e.updateQueue, e !== null && (l = e.callbacks, l !== null && (a = e.shared.hiddenCallbacks, e.shared.hiddenCallbacks = a === null ? l : a.concat(l))));
        break;
      case 26:
        var u = Ot;
        if (ft(t, e), st(e), l & 512 && (ze || a === null || Ut(a, a.return)), l & 4) {
          var n = a !== null ? a.memoizedState : null;
          if (l = e.memoizedState, a === null)
            if (l === null)
              if (e.stateNode === null) {
                e: {
                  l = e.type, a = e.memoizedProps, u = u.ownerDocument || u;
                  t: switch (l) {
                    case "title":
                      n = u.getElementsByTagName("title")[0], (!n || n[$l] || n[ke] || n.namespaceURI === "http://www.w3.org/2000/svg" || n.hasAttribute("itemprop")) && (n = u.createElement(l), u.head.insertBefore(
                        n,
                        u.querySelector("head > title")
                      )), Ge(n, l, a), n[ke] = e, je(n), l = n;
                      break e;
                    case "link":
                      var s = zo(
                        "link",
                        "href",
                        u
                      ).get(l + (a.href || ""));
                      if (s) {
                        for (var d = 0; d < s.length; d++)
                          if (n = s[d], n.getAttribute("href") === (a.href == null || a.href === "" ? null : a.href) && n.getAttribute("rel") === (a.rel == null ? null : a.rel) && n.getAttribute("title") === (a.title == null ? null : a.title) && n.getAttribute("crossorigin") === (a.crossOrigin == null ? null : a.crossOrigin)) {
                            s.splice(d, 1);
                            break t;
                          }
                      }
                      n = u.createElement(l), Ge(n, l, a), u.head.appendChild(n);
                      break;
                    case "meta":
                      if (s = zo(
                        "meta",
                        "content",
                        u
                      ).get(l + (a.content || ""))) {
                        for (d = 0; d < s.length; d++)
                          if (n = s[d], n.getAttribute("content") === (a.content == null ? null : "" + a.content) && n.getAttribute("name") === (a.name == null ? null : a.name) && n.getAttribute("property") === (a.property == null ? null : a.property) && n.getAttribute("http-equiv") === (a.httpEquiv == null ? null : a.httpEquiv) && n.getAttribute("charset") === (a.charSet == null ? null : a.charSet)) {
                            s.splice(d, 1);
                            break t;
                          }
                      }
                      n = u.createElement(l), Ge(n, l, a), u.head.appendChild(n);
                      break;
                    default:
                      throw Error(f(468, l));
                  }
                  n[ke] = e, je(n), l = n;
                }
                e.stateNode = l;
              } else
                Ro(
                  u,
                  e.type,
                  e.stateNode
                );
            else
              e.stateNode = Oo(
                u,
                l,
                e.memoizedProps
              );
          else
            n !== l ? (n === null ? a.stateNode !== null && (a = a.stateNode, a.parentNode.removeChild(a)) : n.count--, l === null ? Ro(
              u,
              e.type,
              e.stateNode
            ) : Oo(
              u,
              l,
              e.memoizedProps
            )) : l === null && e.stateNode !== null && Vc(
              e,
              e.memoizedProps,
              a.memoizedProps
            );
        }
        break;
      case 27:
        ft(t, e), st(e), l & 512 && (ze || a === null || Ut(a, a.return)), a !== null && l & 4 && Vc(
          e,
          e.memoizedProps,
          a.memoizedProps
        );
        break;
      case 5:
        if (ft(t, e), st(e), l & 512 && (ze || a === null || Ut(a, a.return)), e.flags & 32) {
          u = e.stateNode;
          try {
            fl(u, "");
          } catch (T) {
            _e(e, e.return, T);
          }
        }
        l & 4 && e.stateNode != null && (u = e.memoizedProps, Vc(
          e,
          u,
          a !== null ? a.memoizedProps : u
        )), l & 1024 && (wc = !0);
        break;
      case 6:
        if (ft(t, e), st(e), l & 4) {
          if (e.stateNode === null)
            throw Error(f(162));
          l = e.memoizedProps, a = e.stateNode;
          try {
            a.nodeValue = l;
          } catch (T) {
            _e(e, e.return, T);
          }
        }
        break;
      case 3:
        if (ei = null, u = Ot, Ot = In(t.containerInfo), ft(t, e), Ot = u, st(e), l & 4 && a !== null && a.memoizedState.isDehydrated)
          try {
            Vu(t.containerInfo);
          } catch (T) {
            _e(e, e.return, T);
          }
        wc && (wc = !1, Cd(e));
        break;
      case 4:
        l = Ot, Ot = In(
          e.stateNode.containerInfo
        ), ft(t, e), st(e), Ot = l;
        break;
      case 12:
        ft(t, e), st(e);
        break;
      case 13:
        ft(t, e), st(e), e.child.flags & 8192 && e.memoizedState !== null != (a !== null && a.memoizedState !== null) && (Ic = Mt()), l & 4 && (l = e.updateQueue, l !== null && (e.updateQueue = null, Lc(e, l)));
        break;
      case 22:
        u = e.memoizedState !== null;
        var m = a !== null && a.memoizedState !== null, b = $t, x = ze;
        if ($t = b || u, ze = x || m, ft(t, e), ze = x, $t = b, st(e), l & 8192)
          e: for (t = e.stateNode, t._visibility = u ? t._visibility & -2 : t._visibility | 1, u && (a === null || m || $t || ze || $a(e)), a = null, t = e; ; ) {
            if (t.tag === 5 || t.tag === 26) {
              if (a === null) {
                m = a = t;
                try {
                  if (n = m.stateNode, u)
                    s = n.style, typeof s.setProperty == "function" ? s.setProperty("display", "none", "important") : s.display = "none";
                  else {
                    d = m.stateNode;
                    var M = m.memoizedProps.style, S = M != null && M.hasOwnProperty("display") ? M.display : null;
                    d.style.display = S == null || typeof S == "boolean" ? "" : ("" + S).trim();
                  }
                } catch (T) {
                  _e(m, m.return, T);
                }
              }
            } else if (t.tag === 6) {
              if (a === null) {
                m = t;
                try {
                  m.stateNode.nodeValue = u ? "" : m.memoizedProps;
                } catch (T) {
                  _e(m, m.return, T);
                }
              }
            } else if ((t.tag !== 22 && t.tag !== 23 || t.memoizedState === null || t === e) && t.child !== null) {
              t.child.return = t, t = t.child;
              continue;
            }
            if (t === e) break e;
            for (; t.sibling === null; ) {
              if (t.return === null || t.return === e) break e;
              a === t && (a = null), t = t.return;
            }
            a === t && (a = null), t.sibling.return = t.return, t = t.sibling;
          }
        l & 4 && (l = e.updateQueue, l !== null && (a = l.retryQueue, a !== null && (l.retryQueue = null, Lc(e, a))));
        break;
      case 19:
        ft(t, e), st(e), l & 4 && (l = e.updateQueue, l !== null && (e.updateQueue = null, Lc(e, l)));
        break;
      case 30:
        break;
      case 21:
        break;
      default:
        ft(t, e), st(e);
    }
  }
  function st(e) {
    var t = e.flags;
    if (t & 2) {
      try {
        for (var a, l = e.return; l !== null; ) {
          if (xd(l)) {
            a = l;
            break;
          }
          l = l.return;
        }
        if (a == null) throw Error(f(160));
        switch (a.tag) {
          case 27:
            var u = a.stateNode, n = Qc(e);
            Yn(e, n, u);
            break;
          case 5:
            var s = a.stateNode;
            a.flags & 32 && (fl(s, ""), a.flags &= -33);
            var d = Qc(e);
            Yn(e, d, s);
            break;
          case 3:
          case 4:
            var m = a.stateNode.containerInfo, b = Qc(e);
            kc(
              e,
              b,
              m
            );
            break;
          default:
            throw Error(f(161));
        }
      } catch (x) {
        _e(e, e.return, x);
      }
      e.flags &= -3;
    }
    t & 4096 && (e.flags &= -4097);
  }
  function Cd(e) {
    if (e.subtreeFlags & 1024)
      for (e = e.child; e !== null; ) {
        var t = e;
        Cd(t), t.tag === 5 && t.flags & 1024 && t.stateNode.reset(), e = e.sibling;
      }
  }
  function oa(e, t) {
    if (t.subtreeFlags & 8772)
      for (t = t.child; t !== null; )
        Rd(e, t.alternate, t), t = t.sibling;
  }
  function $a(e) {
    for (e = e.child; e !== null; ) {
      var t = e;
      switch (t.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          da(4, t, t.return), $a(t);
          break;
        case 1:
          Ut(t, t.return);
          var a = t.stateNode;
          typeof a.componentWillUnmount == "function" && Ad(
            t,
            t.return,
            a
          ), $a(t);
          break;
        case 27:
          ju(t.stateNode);
        case 26:
        case 5:
          Ut(t, t.return), $a(t);
          break;
        case 22:
          t.memoizedState === null && $a(t);
          break;
        case 30:
          $a(t);
          break;
        default:
          $a(t);
      }
      e = e.sibling;
    }
  }
  function ha(e, t, a) {
    for (a = a && (t.subtreeFlags & 8772) !== 0, t = t.child; t !== null; ) {
      var l = t.alternate, u = e, n = t, s = n.flags;
      switch (n.tag) {
        case 0:
        case 11:
        case 15:
          ha(
            u,
            n,
            a
          ), Eu(4, n);
          break;
        case 1:
          if (ha(
            u,
            n,
            a
          ), l = n, u = l.stateNode, typeof u.componentDidMount == "function")
            try {
              u.componentDidMount();
            } catch (b) {
              _e(l, l.return, b);
            }
          if (l = n, u = l.updateQueue, u !== null) {
            var d = l.stateNode;
            try {
              var m = u.shared.hiddenCallbacks;
              if (m !== null)
                for (u.shared.hiddenCallbacks = null, u = 0; u < m.length; u++)
                  fr(m[u], d);
            } catch (b) {
              _e(l, l.return, b);
            }
          }
          a && s & 64 && Td(n), xu(n, n.return);
          break;
        case 27:
          Od(n);
        case 26:
        case 5:
          ha(
            u,
            n,
            a
          ), a && l === null && s & 4 && Ed(n), xu(n, n.return);
          break;
        case 12:
          ha(
            u,
            n,
            a
          );
          break;
        case 13:
          ha(
            u,
            n,
            a
          ), a && s & 4 && Nd(u, n);
          break;
        case 22:
          n.memoizedState === null && ha(
            u,
            n,
            a
          ), xu(n, n.return);
          break;
        case 30:
          break;
        default:
          ha(
            u,
            n,
            a
          );
      }
      t = t.sibling;
    }
  }
  function Kc(e, t) {
    var a = null;
    e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (a = e.memoizedState.cachePool.pool), e = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (e = t.memoizedState.cachePool.pool), e !== a && (e != null && e.refCount++, a != null && ru(a));
  }
  function Jc(e, t) {
    e = null, t.alternate !== null && (e = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== e && (t.refCount++, e != null && ru(e));
  }
  function Ct(e, t, a, l) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; )
        jd(
          e,
          t,
          a,
          l
        ), t = t.sibling;
  }
  function jd(e, t, a, l) {
    var u = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 15:
        Ct(
          e,
          t,
          a,
          l
        ), u & 2048 && Eu(9, t);
        break;
      case 1:
        Ct(
          e,
          t,
          a,
          l
        );
        break;
      case 3:
        Ct(
          e,
          t,
          a,
          l
        ), u & 2048 && (e = null, t.alternate !== null && (e = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== e && (t.refCount++, e != null && ru(e)));
        break;
      case 12:
        if (u & 2048) {
          Ct(
            e,
            t,
            a,
            l
          ), e = t.stateNode;
          try {
            var n = t.memoizedProps, s = n.id, d = n.onPostCommit;
            typeof d == "function" && d(
              s,
              t.alternate === null ? "mount" : "update",
              e.passiveEffectDuration,
              -0
            );
          } catch (m) {
            _e(t, t.return, m);
          }
        } else
          Ct(
            e,
            t,
            a,
            l
          );
        break;
      case 13:
        Ct(
          e,
          t,
          a,
          l
        );
        break;
      case 23:
        break;
      case 22:
        n = t.stateNode, s = t.alternate, t.memoizedState !== null ? n._visibility & 2 ? Ct(
          e,
          t,
          a,
          l
        ) : Ou(e, t) : n._visibility & 2 ? Ct(
          e,
          t,
          a,
          l
        ) : (n._visibility |= 2, zl(
          e,
          t,
          a,
          l,
          (t.subtreeFlags & 10256) !== 0
        )), u & 2048 && Kc(s, t);
        break;
      case 24:
        Ct(
          e,
          t,
          a,
          l
        ), u & 2048 && Jc(t.alternate, t);
        break;
      default:
        Ct(
          e,
          t,
          a,
          l
        );
    }
  }
  function zl(e, t, a, l, u) {
    for (u = u && (t.subtreeFlags & 10256) !== 0, t = t.child; t !== null; ) {
      var n = e, s = t, d = a, m = l, b = s.flags;
      switch (s.tag) {
        case 0:
        case 11:
        case 15:
          zl(
            n,
            s,
            d,
            m,
            u
          ), Eu(8, s);
          break;
        case 23:
          break;
        case 22:
          var x = s.stateNode;
          s.memoizedState !== null ? x._visibility & 2 ? zl(
            n,
            s,
            d,
            m,
            u
          ) : Ou(
            n,
            s
          ) : (x._visibility |= 2, zl(
            n,
            s,
            d,
            m,
            u
          )), u && b & 2048 && Kc(
            s.alternate,
            s
          );
          break;
        case 24:
          zl(
            n,
            s,
            d,
            m,
            u
          ), u && b & 2048 && Jc(s.alternate, s);
          break;
        default:
          zl(
            n,
            s,
            d,
            m,
            u
          );
      }
      t = t.sibling;
    }
  }
  function Ou(e, t) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) {
        var a = e, l = t, u = l.flags;
        switch (l.tag) {
          case 22:
            Ou(a, l), u & 2048 && Kc(
              l.alternate,
              l
            );
            break;
          case 24:
            Ou(a, l), u & 2048 && Jc(l.alternate, l);
            break;
          default:
            Ou(a, l);
        }
        t = t.sibling;
      }
  }
  var zu = 8192;
  function Rl(e) {
    if (e.subtreeFlags & zu)
      for (e = e.child; e !== null; )
        Zd(e), e = e.sibling;
  }
  function Zd(e) {
    switch (e.tag) {
      case 26:
        Rl(e), e.flags & zu && e.memoizedState !== null && Ny(
          Ot,
          e.memoizedState,
          e.memoizedProps
        );
        break;
      case 5:
        Rl(e);
        break;
      case 3:
      case 4:
        var t = Ot;
        Ot = In(e.stateNode.containerInfo), Rl(e), Ot = t;
        break;
      case 22:
        e.memoizedState === null && (t = e.alternate, t !== null && t.memoizedState !== null ? (t = zu, zu = 16777216, Rl(e), zu = t) : Rl(e));
        break;
      default:
        Rl(e);
    }
  }
  function Hd(e) {
    var t = e.alternate;
    if (t !== null && (e = t.child, e !== null)) {
      t.child = null;
      do
        t = e.sibling, e.sibling = null, e = t;
      while (e !== null);
    }
  }
  function Ru(e) {
    var t = e.deletions;
    if ((e.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var l = t[a];
          He = l, Bd(
            l,
            e
          );
        }
      Hd(e);
    }
    if (e.subtreeFlags & 10256)
      for (e = e.child; e !== null; )
        qd(e), e = e.sibling;
  }
  function qd(e) {
    switch (e.tag) {
      case 0:
      case 11:
      case 15:
        Ru(e), e.flags & 2048 && da(9, e, e.return);
        break;
      case 3:
        Ru(e);
        break;
      case 12:
        Ru(e);
        break;
      case 22:
        var t = e.stateNode;
        e.memoizedState !== null && t._visibility & 2 && (e.return === null || e.return.tag !== 13) ? (t._visibility &= -3, Gn(e)) : Ru(e);
        break;
      default:
        Ru(e);
    }
  }
  function Gn(e) {
    var t = e.deletions;
    if ((e.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var l = t[a];
          He = l, Bd(
            l,
            e
          );
        }
      Hd(e);
    }
    for (e = e.child; e !== null; ) {
      switch (t = e, t.tag) {
        case 0:
        case 11:
        case 15:
          da(8, t, t.return), Gn(t);
          break;
        case 22:
          a = t.stateNode, a._visibility & 2 && (a._visibility &= -3, Gn(t));
          break;
        default:
          Gn(t);
      }
      e = e.sibling;
    }
  }
  function Bd(e, t) {
    for (; He !== null; ) {
      var a = He;
      switch (a.tag) {
        case 0:
        case 11:
        case 15:
          da(8, a, t);
          break;
        case 23:
        case 22:
          if (a.memoizedState !== null && a.memoizedState.cachePool !== null) {
            var l = a.memoizedState.cachePool.pool;
            l != null && l.refCount++;
          }
          break;
        case 24:
          ru(a.memoizedState.cache);
      }
      if (l = a.child, l !== null) l.return = a, He = l;
      else
        e: for (a = e; He !== null; ) {
          l = He;
          var u = l.sibling, n = l.return;
          if (Md(l), l === a) {
            He = null;
            break e;
          }
          if (u !== null) {
            u.return = n, He = u;
            break e;
          }
          He = n;
        }
    }
  }
  var Km = {
    getCacheForType: function(e) {
      var t = we(Ue), a = t.data.get(e);
      return a === void 0 && (a = e(), t.data.set(e, a)), a;
    }
  }, Jm = typeof WeakMap == "function" ? WeakMap : Map, oe = 0, be = null, ee = null, ae = 0, he = 0, rt = null, ma = !1, Ml = !1, $c = !1, Ft = 0, xe = 0, ya = 0, Wa = 0, Wc = 0, St = 0, Dl = 0, Mu = null, Pe = null, Fc = !1, Ic = 0, Xn = 1 / 0, Vn = null, va = null, Ye = 0, ga = null, Nl = null, Ul = 0, Pc = 0, ef = null, Yd = null, Du = 0, tf = null;
  function dt() {
    if ((oe & 2) !== 0 && ae !== 0)
      return ae & -ae;
    if (O.T !== null) {
      var e = pl;
      return e !== 0 ? e : sf();
    }
    return ts();
  }
  function Gd() {
    St === 0 && (St = (ae & 536870912) === 0 || re ? Ff() : 536870912);
    var e = bt.current;
    return e !== null && (e.flags |= 32), St;
  }
  function ot(e, t, a) {
    (e === be && (he === 2 || he === 9) || e.cancelPendingCommit !== null) && (Cl(e, 0), _a(
      e,
      ae,
      St,
      !1
    )), Jl(e, a), ((oe & 2) === 0 || e !== be) && (e === be && ((oe & 2) === 0 && (Wa |= a), xe === 4 && _a(
      e,
      ae,
      St,
      !1
    )), jt(e));
  }
  function Xd(e, t, a) {
    if ((oe & 6) !== 0) throw Error(f(327));
    var l = !a && (t & 124) === 0 && (t & e.expiredLanes) === 0 || Kl(e, t), u = l ? Fm(e, t) : uf(e, t, !0), n = l;
    do {
      if (u === 0) {
        Ml && !l && _a(e, t, 0, !1);
        break;
      } else {
        if (a = e.current.alternate, n && !$m(a)) {
          u = uf(e, t, !1), n = !1;
          continue;
        }
        if (u === 2) {
          if (n = t, e.errorRecoveryDisabledLanes & n)
            var s = 0;
          else
            s = e.pendingLanes & -536870913, s = s !== 0 ? s : s & 536870912 ? 536870912 : 0;
          if (s !== 0) {
            t = s;
            e: {
              var d = e;
              u = Mu;
              var m = d.current.memoizedState.isDehydrated;
              if (m && (Cl(d, s).flags |= 256), s = uf(
                d,
                s,
                !1
              ), s !== 2) {
                if ($c && !m) {
                  d.errorRecoveryDisabledLanes |= n, Wa |= n, u = 4;
                  break e;
                }
                n = Pe, Pe = u, n !== null && (Pe === null ? Pe = n : Pe.push.apply(
                  Pe,
                  n
                ));
              }
              u = s;
            }
            if (n = !1, u !== 2) continue;
          }
        }
        if (u === 1) {
          Cl(e, 0), _a(e, t, 0, !0);
          break;
        }
        e: {
          switch (l = e, n = u, n) {
            case 0:
            case 1:
              throw Error(f(345));
            case 4:
              if ((t & 4194048) !== t) break;
            case 6:
              _a(
                l,
                t,
                St,
                !ma
              );
              break e;
            case 2:
              Pe = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(f(329));
          }
          if ((t & 62914560) === t && (u = Ic + 300 - Mt(), 10 < u)) {
            if (_a(
              l,
              t,
              St,
              !ma
            ), Iu(l, 0, !0) !== 0) break e;
            l.timeoutHandle = go(
              Vd.bind(
                null,
                l,
                a,
                Pe,
                Vn,
                Fc,
                t,
                St,
                Wa,
                Dl,
                ma,
                n,
                2,
                -0,
                0
              ),
              u
            );
            break e;
          }
          Vd(
            l,
            a,
            Pe,
            Vn,
            Fc,
            t,
            St,
            Wa,
            Dl,
            ma,
            n,
            0,
            -0,
            0
          );
        }
      }
      break;
    } while (!0);
    jt(e);
  }
  function Vd(e, t, a, l, u, n, s, d, m, b, x, M, S, T) {
    if (e.timeoutHandle = -1, M = t.subtreeFlags, (M & 8192 || (M & 16785408) === 16785408) && (qu = { stylesheets: null, count: 0, unsuspend: Dy }, Zd(t), M = Uy(), M !== null)) {
      e.cancelPendingCommit = M(
        $d.bind(
          null,
          e,
          t,
          n,
          a,
          l,
          u,
          s,
          d,
          m,
          x,
          1,
          S,
          T
        )
      ), _a(e, n, s, !b);
      return;
    }
    $d(
      e,
      t,
      n,
      a,
      l,
      u,
      s,
      d,
      m
    );
  }
  function $m(e) {
    for (var t = e; ; ) {
      var a = t.tag;
      if ((a === 0 || a === 11 || a === 15) && t.flags & 16384 && (a = t.updateQueue, a !== null && (a = a.stores, a !== null)))
        for (var l = 0; l < a.length; l++) {
          var u = a[l], n = u.getSnapshot;
          u = u.value;
          try {
            if (!it(n(), u)) return !1;
          } catch {
            return !1;
          }
        }
      if (a = t.child, t.subtreeFlags & 16384 && a !== null)
        a.return = t, t = a;
      else {
        if (t === e) break;
        for (; t.sibling === null; ) {
          if (t.return === null || t.return === e) return !0;
          t = t.return;
        }
        t.sibling.return = t.return, t = t.sibling;
      }
    }
    return !0;
  }
  function _a(e, t, a, l) {
    t &= ~Wc, t &= ~Wa, e.suspendedLanes |= t, e.pingedLanes &= ~t, l && (e.warmLanes |= t), l = e.expirationTimes;
    for (var u = t; 0 < u; ) {
      var n = 31 - nt(u), s = 1 << n;
      l[n] = -1, u &= ~s;
    }
    a !== 0 && Pf(e, a, t);
  }
  function Qn() {
    return (oe & 6) === 0 ? (Nu(0), !1) : !0;
  }
  function af() {
    if (ee !== null) {
      if (he === 0)
        var e = ee.return;
      else
        e = ee, Qt = ka = null, pc(e), xl = null, Su = 0, e = ee;
      for (; e !== null; )
        Sd(e.alternate, e), e = e.return;
      ee = null;
    }
  }
  function Cl(e, t) {
    var a = e.timeoutHandle;
    a !== -1 && (e.timeoutHandle = -1, hy(a)), a = e.cancelPendingCommit, a !== null && (e.cancelPendingCommit = null, a()), af(), be = e, ee = a = Gt(e.current, null), ae = t, he = 0, rt = null, ma = !1, Ml = Kl(e, t), $c = !1, Dl = St = Wc = Wa = ya = xe = 0, Pe = Mu = null, Fc = !1, (t & 8) !== 0 && (t |= t & 32);
    var l = e.entangledLanes;
    if (l !== 0)
      for (e = e.entanglements, l &= t; 0 < l; ) {
        var u = 31 - nt(l), n = 1 << u;
        t |= e[u], l &= ~n;
      }
    return Ft = t, dn(), a;
  }
  function Qd(e, t) {
    F = null, O.H = Dn, t === ou || t === bn ? (t = ir(), he = 3) : t === lr ? (t = ir(), he = 4) : he = t === cd ? 8 : t !== null && typeof t == "object" && typeof t.then == "function" ? 6 : 1, rt = t, ee === null && (xe = 1, Zn(
      e,
      vt(t, e.current)
    ));
  }
  function kd() {
    var e = O.H;
    return O.H = Dn, e === null ? Dn : e;
  }
  function wd() {
    var e = O.A;
    return O.A = Km, e;
  }
  function lf() {
    xe = 4, ma || (ae & 4194048) !== ae && bt.current !== null || (Ml = !0), (ya & 134217727) === 0 && (Wa & 134217727) === 0 || be === null || _a(
      be,
      ae,
      St,
      !1
    );
  }
  function uf(e, t, a) {
    var l = oe;
    oe |= 2;
    var u = kd(), n = wd();
    (be !== e || ae !== t) && (Vn = null, Cl(e, t)), t = !1;
    var s = xe;
    e: do
      try {
        if (he !== 0 && ee !== null) {
          var d = ee, m = rt;
          switch (he) {
            case 8:
              af(), s = 6;
              break e;
            case 3:
            case 2:
            case 9:
            case 6:
              bt.current === null && (t = !0);
              var b = he;
              if (he = 0, rt = null, jl(e, d, m, b), a && Ml) {
                s = 0;
                break e;
              }
              break;
            default:
              b = he, he = 0, rt = null, jl(e, d, m, b);
          }
        }
        Wm(), s = xe;
        break;
      } catch (x) {
        Qd(e, x);
      }
    while (!0);
    return t && e.shellSuspendCounter++, Qt = ka = null, oe = l, O.H = u, O.A = n, ee === null && (be = null, ae = 0, dn()), s;
  }
  function Wm() {
    for (; ee !== null; ) Ld(ee);
  }
  function Fm(e, t) {
    var a = oe;
    oe |= 2;
    var l = kd(), u = wd();
    be !== e || ae !== t ? (Vn = null, Xn = Mt() + 500, Cl(e, t)) : Ml = Kl(
      e,
      t
    );
    e: do
      try {
        if (he !== 0 && ee !== null) {
          t = ee;
          var n = rt;
          t: switch (he) {
            case 1:
              he = 0, rt = null, jl(e, t, n, 1);
              break;
            case 2:
            case 9:
              if (ur(n)) {
                he = 0, rt = null, Kd(t);
                break;
              }
              t = function() {
                he !== 2 && he !== 9 || be !== e || (he = 7), jt(e);
              }, n.then(t, t);
              break e;
            case 3:
              he = 7;
              break e;
            case 4:
              he = 5;
              break e;
            case 7:
              ur(n) ? (he = 0, rt = null, Kd(t)) : (he = 0, rt = null, jl(e, t, n, 7));
              break;
            case 5:
              var s = null;
              switch (ee.tag) {
                case 26:
                  s = ee.memoizedState;
                case 5:
                case 27:
                  var d = ee;
                  if (!s || Mo(s)) {
                    he = 0, rt = null;
                    var m = d.sibling;
                    if (m !== null) ee = m;
                    else {
                      var b = d.return;
                      b !== null ? (ee = b, kn(b)) : ee = null;
                    }
                    break t;
                  }
              }
              he = 0, rt = null, jl(e, t, n, 5);
              break;
            case 6:
              he = 0, rt = null, jl(e, t, n, 6);
              break;
            case 8:
              af(), xe = 6;
              break e;
            default:
              throw Error(f(462));
          }
        }
        Im();
        break;
      } catch (x) {
        Qd(e, x);
      }
    while (!0);
    return Qt = ka = null, O.H = l, O.A = u, oe = a, ee !== null ? 0 : (be = null, ae = 0, dn(), xe);
  }
  function Im() {
    for (; ee !== null && !bh(); )
      Ld(ee);
  }
  function Ld(e) {
    var t = pd(e.alternate, e, Ft);
    e.memoizedProps = e.pendingProps, t === null ? kn(e) : ee = t;
  }
  function Kd(e) {
    var t = e, a = t.alternate;
    switch (t.tag) {
      case 15:
      case 0:
        t = hd(
          a,
          t,
          t.pendingProps,
          t.type,
          void 0,
          ae
        );
        break;
      case 11:
        t = hd(
          a,
          t,
          t.pendingProps,
          t.type.render,
          t.ref,
          ae
        );
        break;
      case 5:
        pc(t);
      default:
        Sd(a, t), t = ee = Js(t, Ft), t = pd(a, t, Ft);
    }
    e.memoizedProps = e.pendingProps, t === null ? kn(e) : ee = t;
  }
  function jl(e, t, a, l) {
    Qt = ka = null, pc(t), xl = null, Su = 0;
    var u = t.return;
    try {
      if (Xm(
        e,
        u,
        t,
        a,
        ae
      )) {
        xe = 1, Zn(
          e,
          vt(a, e.current)
        ), ee = null;
        return;
      }
    } catch (n) {
      if (u !== null) throw ee = u, n;
      xe = 1, Zn(
        e,
        vt(a, e.current)
      ), ee = null;
      return;
    }
    t.flags & 32768 ? (re || l === 1 ? e = !0 : Ml || (ae & 536870912) !== 0 ? e = !1 : (ma = e = !0, (l === 2 || l === 9 || l === 3 || l === 6) && (l = bt.current, l !== null && l.tag === 13 && (l.flags |= 16384))), Jd(t, e)) : kn(t);
  }
  function kn(e) {
    var t = e;
    do {
      if ((t.flags & 32768) !== 0) {
        Jd(
          t,
          ma
        );
        return;
      }
      e = t.return;
      var a = Qm(
        t.alternate,
        t,
        Ft
      );
      if (a !== null) {
        ee = a;
        return;
      }
      if (t = t.sibling, t !== null) {
        ee = t;
        return;
      }
      ee = t = e;
    } while (t !== null);
    xe === 0 && (xe = 5);
  }
  function Jd(e, t) {
    do {
      var a = km(e.alternate, e);
      if (a !== null) {
        a.flags &= 32767, ee = a;
        return;
      }
      if (a = e.return, a !== null && (a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null), !t && (e = e.sibling, e !== null)) {
        ee = e;
        return;
      }
      ee = e = a;
    } while (e !== null);
    xe = 6, ee = null;
  }
  function $d(e, t, a, l, u, n, s, d, m) {
    e.cancelPendingCommit = null;
    do
      wn();
    while (Ye !== 0);
    if ((oe & 6) !== 0) throw Error(f(327));
    if (t !== null) {
      if (t === e.current) throw Error(f(177));
      if (n = t.lanes | t.childLanes, n |= Ji, Dh(
        e,
        a,
        n,
        s,
        d,
        m
      ), e === be && (ee = be = null, ae = 0), Nl = t, ga = e, Ul = a, Pc = n, ef = u, Yd = l, (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0 ? (e.callbackNode = null, e.callbackPriority = 0, ay($u, function() {
        return eo(), null;
      })) : (e.callbackNode = null, e.callbackPriority = 0), l = (t.flags & 13878) !== 0, (t.subtreeFlags & 13878) !== 0 || l) {
        l = O.T, O.T = null, u = j.p, j.p = 2, s = oe, oe |= 4;
        try {
          wm(e, t, a);
        } finally {
          oe = s, j.p = u, O.T = l;
        }
      }
      Ye = 1, Wd(), Fd(), Id();
    }
  }
  function Wd() {
    if (Ye === 1) {
      Ye = 0;
      var e = ga, t = Nl, a = (t.flags & 13878) !== 0;
      if ((t.subtreeFlags & 13878) !== 0 || a) {
        a = O.T, O.T = null;
        var l = j.p;
        j.p = 2;
        var u = oe;
        oe |= 4;
        try {
          Ud(t, e);
          var n = gf, s = Bs(e.containerInfo), d = n.focusedElem, m = n.selectionRange;
          if (s !== d && d && d.ownerDocument && qs(
            d.ownerDocument.documentElement,
            d
          )) {
            if (m !== null && Qi(d)) {
              var b = m.start, x = m.end;
              if (x === void 0 && (x = b), "selectionStart" in d)
                d.selectionStart = b, d.selectionEnd = Math.min(
                  x,
                  d.value.length
                );
              else {
                var M = d.ownerDocument || document, S = M && M.defaultView || window;
                if (S.getSelection) {
                  var T = S.getSelection(), w = d.textContent.length, V = Math.min(m.start, w), ve = m.end === void 0 ? V : Math.min(m.end, w);
                  !T.extend && V > ve && (s = ve, ve = V, V = s);
                  var g = Hs(
                    d,
                    V
                  ), v = Hs(
                    d,
                    ve
                  );
                  if (g && v && (T.rangeCount !== 1 || T.anchorNode !== g.node || T.anchorOffset !== g.offset || T.focusNode !== v.node || T.focusOffset !== v.offset)) {
                    var _ = M.createRange();
                    _.setStart(g.node, g.offset), T.removeAllRanges(), V > ve ? (T.addRange(_), T.extend(v.node, v.offset)) : (_.setEnd(v.node, v.offset), T.addRange(_));
                  }
                }
              }
            }
            for (M = [], T = d; T = T.parentNode; )
              T.nodeType === 1 && M.push({
                element: T,
                left: T.scrollLeft,
                top: T.scrollTop
              });
            for (typeof d.focus == "function" && d.focus(), d = 0; d < M.length; d++) {
              var z = M[d];
              z.element.scrollLeft = z.left, z.element.scrollTop = z.top;
            }
          }
          li = !!vf, gf = vf = null;
        } finally {
          oe = u, j.p = l, O.T = a;
        }
      }
      e.current = t, Ye = 2;
    }
  }
  function Fd() {
    if (Ye === 2) {
      Ye = 0;
      var e = ga, t = Nl, a = (t.flags & 8772) !== 0;
      if ((t.subtreeFlags & 8772) !== 0 || a) {
        a = O.T, O.T = null;
        var l = j.p;
        j.p = 2;
        var u = oe;
        oe |= 4;
        try {
          Rd(e, t.alternate, t);
        } finally {
          oe = u, j.p = l, O.T = a;
        }
      }
      Ye = 3;
    }
  }
  function Id() {
    if (Ye === 4 || Ye === 3) {
      Ye = 0, Sh();
      var e = ga, t = Nl, a = Ul, l = Yd;
      (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0 ? Ye = 5 : (Ye = 0, Nl = ga = null, Pd(e, e.pendingLanes));
      var u = e.pendingLanes;
      if (u === 0 && (va = null), Ti(a), t = t.stateNode, ut && typeof ut.onCommitFiberRoot == "function")
        try {
          ut.onCommitFiberRoot(
            Ll,
            t,
            void 0,
            (t.current.flags & 128) === 128
          );
        } catch {
        }
      if (l !== null) {
        t = O.T, u = j.p, j.p = 2, O.T = null;
        try {
          for (var n = e.onRecoverableError, s = 0; s < l.length; s++) {
            var d = l[s];
            n(d.value, {
              componentStack: d.stack
            });
          }
        } finally {
          O.T = t, j.p = u;
        }
      }
      (Ul & 3) !== 0 && wn(), jt(e), u = e.pendingLanes, (a & 4194090) !== 0 && (u & 42) !== 0 ? e === tf ? Du++ : (Du = 0, tf = e) : Du = 0, Nu(0);
    }
  }
  function Pd(e, t) {
    (e.pooledCacheLanes &= t) === 0 && (t = e.pooledCache, t != null && (e.pooledCache = null, ru(t)));
  }
  function wn(e) {
    return Wd(), Fd(), Id(), eo();
  }
  function eo() {
    if (Ye !== 5) return !1;
    var e = ga, t = Pc;
    Pc = 0;
    var a = Ti(Ul), l = O.T, u = j.p;
    try {
      j.p = 32 > a ? 32 : a, O.T = null, a = ef, ef = null;
      var n = ga, s = Ul;
      if (Ye = 0, Nl = ga = null, Ul = 0, (oe & 6) !== 0) throw Error(f(331));
      var d = oe;
      if (oe |= 4, qd(n.current), jd(
        n,
        n.current,
        s,
        a
      ), oe = d, Nu(0, !1), ut && typeof ut.onPostCommitFiberRoot == "function")
        try {
          ut.onPostCommitFiberRoot(Ll, n);
        } catch {
        }
      return !0;
    } finally {
      j.p = u, O.T = l, Pd(e, t);
    }
  }
  function to(e, t, a) {
    t = vt(a, t), t = Cc(e.stateNode, t, 2), e = ca(e, t, 2), e !== null && (Jl(e, 2), jt(e));
  }
  function _e(e, t, a) {
    if (e.tag === 3)
      to(e, e, a);
    else
      for (; t !== null; ) {
        if (t.tag === 3) {
          to(
            t,
            e,
            a
          );
          break;
        } else if (t.tag === 1) {
          var l = t.stateNode;
          if (typeof t.type.getDerivedStateFromError == "function" || typeof l.componentDidCatch == "function" && (va === null || !va.has(l))) {
            e = vt(a, e), a = nd(2), l = ca(t, a, 2), l !== null && (id(
              a,
              l,
              t,
              e
            ), Jl(l, 2), jt(l));
            break;
          }
        }
        t = t.return;
      }
  }
  function nf(e, t, a) {
    var l = e.pingCache;
    if (l === null) {
      l = e.pingCache = new Jm();
      var u = /* @__PURE__ */ new Set();
      l.set(t, u);
    } else
      u = l.get(t), u === void 0 && (u = /* @__PURE__ */ new Set(), l.set(t, u));
    u.has(a) || ($c = !0, u.add(a), e = Pm.bind(null, e, t, a), t.then(e, e));
  }
  function Pm(e, t, a) {
    var l = e.pingCache;
    l !== null && l.delete(t), e.pingedLanes |= e.suspendedLanes & a, e.warmLanes &= ~a, be === e && (ae & a) === a && (xe === 4 || xe === 3 && (ae & 62914560) === ae && 300 > Mt() - Ic ? (oe & 2) === 0 && Cl(e, 0) : Wc |= a, Dl === ae && (Dl = 0)), jt(e);
  }
  function ao(e, t) {
    t === 0 && (t = If()), e = yl(e, t), e !== null && (Jl(e, t), jt(e));
  }
  function ey(e) {
    var t = e.memoizedState, a = 0;
    t !== null && (a = t.retryLane), ao(e, a);
  }
  function ty(e, t) {
    var a = 0;
    switch (e.tag) {
      case 13:
        var l = e.stateNode, u = e.memoizedState;
        u !== null && (a = u.retryLane);
        break;
      case 19:
        l = e.stateNode;
        break;
      case 22:
        l = e.stateNode._retryCache;
        break;
      default:
        throw Error(f(314));
    }
    l !== null && l.delete(t), ao(e, a);
  }
  function ay(e, t) {
    return _i(e, t);
  }
  var Ln = null, Zl = null, cf = !1, Kn = !1, ff = !1, Fa = 0;
  function jt(e) {
    e !== Zl && e.next === null && (Zl === null ? Ln = Zl = e : Zl = Zl.next = e), Kn = !0, cf || (cf = !0, uy());
  }
  function Nu(e, t) {
    if (!ff && Kn) {
      ff = !0;
      do
        for (var a = !1, l = Ln; l !== null; ) {
          if (e !== 0) {
            var u = l.pendingLanes;
            if (u === 0) var n = 0;
            else {
              var s = l.suspendedLanes, d = l.pingedLanes;
              n = (1 << 31 - nt(42 | e) + 1) - 1, n &= u & ~(s & ~d), n = n & 201326741 ? n & 201326741 | 1 : n ? n | 2 : 0;
            }
            n !== 0 && (a = !0, io(l, n));
          } else
            n = ae, n = Iu(
              l,
              l === be ? n : 0,
              l.cancelPendingCommit !== null || l.timeoutHandle !== -1
            ), (n & 3) === 0 || Kl(l, n) || (a = !0, io(l, n));
          l = l.next;
        }
      while (a);
      ff = !1;
    }
  }
  function ly() {
    lo();
  }
  function lo() {
    Kn = cf = !1;
    var e = 0;
    Fa !== 0 && (oy() && (e = Fa), Fa = 0);
    for (var t = Mt(), a = null, l = Ln; l !== null; ) {
      var u = l.next, n = uo(l, t);
      n === 0 ? (l.next = null, a === null ? Ln = u : a.next = u, u === null && (Zl = a)) : (a = l, (e !== 0 || (n & 3) !== 0) && (Kn = !0)), l = u;
    }
    Nu(e);
  }
  function uo(e, t) {
    for (var a = e.suspendedLanes, l = e.pingedLanes, u = e.expirationTimes, n = e.pendingLanes & -62914561; 0 < n; ) {
      var s = 31 - nt(n), d = 1 << s, m = u[s];
      m === -1 ? ((d & a) === 0 || (d & l) !== 0) && (u[s] = Mh(d, t)) : m <= t && (e.expiredLanes |= d), n &= ~d;
    }
    if (t = be, a = ae, a = Iu(
      e,
      e === t ? a : 0,
      e.cancelPendingCommit !== null || e.timeoutHandle !== -1
    ), l = e.callbackNode, a === 0 || e === t && (he === 2 || he === 9) || e.cancelPendingCommit !== null)
      return l !== null && l !== null && pi(l), e.callbackNode = null, e.callbackPriority = 0;
    if ((a & 3) === 0 || Kl(e, a)) {
      if (t = a & -a, t === e.callbackPriority) return t;
      switch (l !== null && pi(l), Ti(a)) {
        case 2:
        case 8:
          a = $f;
          break;
        case 32:
          a = $u;
          break;
        case 268435456:
          a = Wf;
          break;
        default:
          a = $u;
      }
      return l = no.bind(null, e), a = _i(a, l), e.callbackPriority = t, e.callbackNode = a, t;
    }
    return l !== null && l !== null && pi(l), e.callbackPriority = 2, e.callbackNode = null, 2;
  }
  function no(e, t) {
    if (Ye !== 0 && Ye !== 5)
      return e.callbackNode = null, e.callbackPriority = 0, null;
    var a = e.callbackNode;
    if (wn() && e.callbackNode !== a)
      return null;
    var l = ae;
    return l = Iu(
      e,
      e === be ? l : 0,
      e.cancelPendingCommit !== null || e.timeoutHandle !== -1
    ), l === 0 ? null : (Xd(e, l, t), uo(e, Mt()), e.callbackNode != null && e.callbackNode === a ? no.bind(null, e) : null);
  }
  function io(e, t) {
    if (wn()) return null;
    Xd(e, t, !0);
  }
  function uy() {
    my(function() {
      (oe & 6) !== 0 ? _i(
        Jf,
        ly
      ) : lo();
    });
  }
  function sf() {
    return Fa === 0 && (Fa = Ff()), Fa;
  }
  function co(e) {
    return e == null || typeof e == "symbol" || typeof e == "boolean" ? null : typeof e == "function" ? e : ln("" + e);
  }
  function fo(e, t) {
    var a = t.ownerDocument.createElement("input");
    return a.name = t.name, a.value = t.value, e.id && a.setAttribute("form", e.id), t.parentNode.insertBefore(a, t), e = new FormData(e), a.parentNode.removeChild(a), e;
  }
  function ny(e, t, a, l, u) {
    if (t === "submit" && a && a.stateNode === u) {
      var n = co(
        (u[$e] || null).action
      ), s = l.submitter;
      s && (t = (t = s[$e] || null) ? co(t.formAction) : s.getAttribute("formAction"), t !== null && (n = t, s = null));
      var d = new fn(
        "action",
        "action",
        null,
        l,
        u
      );
      e.push({
        event: d,
        listeners: [
          {
            instance: null,
            listener: function() {
              if (l.defaultPrevented) {
                if (Fa !== 0) {
                  var m = s ? fo(u, s) : new FormData(u);
                  Rc(
                    a,
                    {
                      pending: !0,
                      data: m,
                      method: u.method,
                      action: n
                    },
                    null,
                    m
                  );
                }
              } else
                typeof n == "function" && (d.preventDefault(), m = s ? fo(u, s) : new FormData(u), Rc(
                  a,
                  {
                    pending: !0,
                    data: m,
                    method: u.method,
                    action: n
                  },
                  n,
                  m
                ));
            },
            currentTarget: u
          }
        ]
      });
    }
  }
  for (var rf = 0; rf < Ki.length; rf++) {
    var df = Ki[rf], iy = df.toLowerCase(), cy = df[0].toUpperCase() + df.slice(1);
    xt(
      iy,
      "on" + cy
    );
  }
  xt(Xs, "onAnimationEnd"), xt(Vs, "onAnimationIteration"), xt(Qs, "onAnimationStart"), xt("dblclick", "onDoubleClick"), xt("focusin", "onFocus"), xt("focusout", "onBlur"), xt(Em, "onTransitionRun"), xt(xm, "onTransitionStart"), xt(Om, "onTransitionCancel"), xt(ks, "onTransitionEnd"), nl("onMouseEnter", ["mouseout", "mouseover"]), nl("onMouseLeave", ["mouseout", "mouseover"]), nl("onPointerEnter", ["pointerout", "pointerover"]), nl("onPointerLeave", ["pointerout", "pointerover"]), Za(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(" ")
  ), Za(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  ), Za("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]), Za(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  ), Za(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  ), Za(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var Uu = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), fy = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(Uu)
  );
  function so(e, t) {
    t = (t & 4) !== 0;
    for (var a = 0; a < e.length; a++) {
      var l = e[a], u = l.event;
      l = l.listeners;
      e: {
        var n = void 0;
        if (t)
          for (var s = l.length - 1; 0 <= s; s--) {
            var d = l[s], m = d.instance, b = d.currentTarget;
            if (d = d.listener, m !== n && u.isPropagationStopped())
              break e;
            n = d, u.currentTarget = b;
            try {
              n(u);
            } catch (x) {
              jn(x);
            }
            u.currentTarget = null, n = m;
          }
        else
          for (s = 0; s < l.length; s++) {
            if (d = l[s], m = d.instance, b = d.currentTarget, d = d.listener, m !== n && u.isPropagationStopped())
              break e;
            n = d, u.currentTarget = b;
            try {
              n(u);
            } catch (x) {
              jn(x);
            }
            u.currentTarget = null, n = m;
          }
      }
    }
  }
  function te(e, t) {
    var a = t[Ai];
    a === void 0 && (a = t[Ai] = /* @__PURE__ */ new Set());
    var l = e + "__bubble";
    a.has(l) || (ro(t, e, 2, !1), a.add(l));
  }
  function of(e, t, a) {
    var l = 0;
    t && (l |= 4), ro(
      a,
      e,
      l,
      t
    );
  }
  var Jn = "_reactListening" + Math.random().toString(36).slice(2);
  function hf(e) {
    if (!e[Jn]) {
      e[Jn] = !0, ls.forEach(function(a) {
        a !== "selectionchange" && (fy.has(a) || of(a, !1, e), of(a, !0, e));
      });
      var t = e.nodeType === 9 ? e : e.ownerDocument;
      t === null || t[Jn] || (t[Jn] = !0, of("selectionchange", !1, t));
    }
  }
  function ro(e, t, a, l) {
    switch (Zo(t)) {
      case 2:
        var u = Zy;
        break;
      case 8:
        u = Hy;
        break;
      default:
        u = zf;
    }
    a = u.bind(
      null,
      t,
      a,
      e
    ), u = void 0, !ji || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (u = !0), l ? u !== void 0 ? e.addEventListener(t, a, {
      capture: !0,
      passive: u
    }) : e.addEventListener(t, a, !0) : u !== void 0 ? e.addEventListener(t, a, {
      passive: u
    }) : e.addEventListener(t, a, !1);
  }
  function mf(e, t, a, l, u) {
    var n = l;
    if ((t & 1) === 0 && (t & 2) === 0 && l !== null)
      e: for (; ; ) {
        if (l === null) return;
        var s = l.tag;
        if (s === 3 || s === 4) {
          var d = l.stateNode.containerInfo;
          if (d === u) break;
          if (s === 4)
            for (s = l.return; s !== null; ) {
              var m = s.tag;
              if ((m === 3 || m === 4) && s.stateNode.containerInfo === u)
                return;
              s = s.return;
            }
          for (; d !== null; ) {
            if (s = al(d), s === null) return;
            if (m = s.tag, m === 5 || m === 6 || m === 26 || m === 27) {
              l = n = s;
              continue e;
            }
            d = d.parentNode;
          }
        }
        l = l.return;
      }
    gs(function() {
      var b = n, x = Ui(a), M = [];
      e: {
        var S = ws.get(e);
        if (S !== void 0) {
          var T = fn, w = e;
          switch (e) {
            case "keypress":
              if (nn(a) === 0) break e;
            case "keydown":
            case "keyup":
              T = am;
              break;
            case "focusin":
              w = "focus", T = Bi;
              break;
            case "focusout":
              w = "blur", T = Bi;
              break;
            case "beforeblur":
            case "afterblur":
              T = Bi;
              break;
            case "click":
              if (a.button === 2) break e;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              T = bs;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              T = kh;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              T = nm;
              break;
            case Xs:
            case Vs:
            case Qs:
              T = Kh;
              break;
            case ks:
              T = cm;
              break;
            case "scroll":
            case "scrollend":
              T = Vh;
              break;
            case "wheel":
              T = sm;
              break;
            case "copy":
            case "cut":
            case "paste":
              T = $h;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              T = Ts;
              break;
            case "toggle":
            case "beforetoggle":
              T = dm;
          }
          var V = (t & 4) !== 0, ve = !V && (e === "scroll" || e === "scrollend"), g = V ? S !== null ? S + "Capture" : null : S;
          V = [];
          for (var v = b, _; v !== null; ) {
            var z = v;
            if (_ = z.stateNode, z = z.tag, z !== 5 && z !== 26 && z !== 27 || _ === null || g === null || (z = Fl(v, g), z != null && V.push(
              Cu(v, z, _)
            )), ve) break;
            v = v.return;
          }
          0 < V.length && (S = new T(
            S,
            w,
            null,
            a,
            x
          ), M.push({ event: S, listeners: V }));
        }
      }
      if ((t & 7) === 0) {
        e: {
          if (S = e === "mouseover" || e === "pointerover", T = e === "mouseout" || e === "pointerout", S && a !== Ni && (w = a.relatedTarget || a.fromElement) && (al(w) || w[tl]))
            break e;
          if ((T || S) && (S = x.window === x ? x : (S = x.ownerDocument) ? S.defaultView || S.parentWindow : window, T ? (w = a.relatedTarget || a.toElement, T = b, w = w ? al(w) : null, w !== null && (ve = h(w), V = w.tag, w !== ve || V !== 5 && V !== 27 && V !== 6) && (w = null)) : (T = null, w = b), T !== w)) {
            if (V = bs, z = "onMouseLeave", g = "onMouseEnter", v = "mouse", (e === "pointerout" || e === "pointerover") && (V = Ts, z = "onPointerLeave", g = "onPointerEnter", v = "pointer"), ve = T == null ? S : Wl(T), _ = w == null ? S : Wl(w), S = new V(
              z,
              v + "leave",
              T,
              a,
              x
            ), S.target = ve, S.relatedTarget = _, z = null, al(x) === b && (V = new V(
              g,
              v + "enter",
              w,
              a,
              x
            ), V.target = _, V.relatedTarget = ve, z = V), ve = z, T && w)
              t: {
                for (V = T, g = w, v = 0, _ = V; _; _ = Hl(_))
                  v++;
                for (_ = 0, z = g; z; z = Hl(z))
                  _++;
                for (; 0 < v - _; )
                  V = Hl(V), v--;
                for (; 0 < _ - v; )
                  g = Hl(g), _--;
                for (; v--; ) {
                  if (V === g || g !== null && V === g.alternate)
                    break t;
                  V = Hl(V), g = Hl(g);
                }
                V = null;
              }
            else V = null;
            T !== null && oo(
              M,
              S,
              T,
              V,
              !1
            ), w !== null && ve !== null && oo(
              M,
              ve,
              w,
              V,
              !0
            );
          }
        }
        e: {
          if (S = b ? Wl(b) : window, T = S.nodeName && S.nodeName.toLowerCase(), T === "select" || T === "input" && S.type === "file")
            var q = Ds;
          else if (Rs(S))
            if (Ns)
              q = Sm;
            else {
              q = pm;
              var I = _m;
            }
          else
            T = S.nodeName, !T || T.toLowerCase() !== "input" || S.type !== "checkbox" && S.type !== "radio" ? b && Di(b.elementType) && (q = Ds) : q = bm;
          if (q && (q = q(e, b))) {
            Ms(
              M,
              q,
              a,
              x
            );
            break e;
          }
          I && I(e, S, b), e === "focusout" && b && S.type === "number" && b.memoizedProps.value != null && Mi(S, "number", S.value);
        }
        switch (I = b ? Wl(b) : window, e) {
          case "focusin":
            (Rs(I) || I.contentEditable === "true") && (ol = I, ki = b, nu = null);
            break;
          case "focusout":
            nu = ki = ol = null;
            break;
          case "mousedown":
            wi = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            wi = !1, Ys(M, a, x);
            break;
          case "selectionchange":
            if (Am) break;
          case "keydown":
          case "keyup":
            Ys(M, a, x);
        }
        var G;
        if (Gi)
          e: {
            switch (e) {
              case "compositionstart":
                var Q = "onCompositionStart";
                break e;
              case "compositionend":
                Q = "onCompositionEnd";
                break e;
              case "compositionupdate":
                Q = "onCompositionUpdate";
                break e;
            }
            Q = void 0;
          }
        else
          dl ? Os(e, a) && (Q = "onCompositionEnd") : e === "keydown" && a.keyCode === 229 && (Q = "onCompositionStart");
        Q && (As && a.locale !== "ko" && (dl || Q !== "onCompositionStart" ? Q === "onCompositionEnd" && dl && (G = _s()) : (la = x, Zi = "value" in la ? la.value : la.textContent, dl = !0)), I = $n(b, Q), 0 < I.length && (Q = new Ss(
          Q,
          e,
          null,
          a,
          x
        ), M.push({ event: Q, listeners: I }), G ? Q.data = G : (G = zs(a), G !== null && (Q.data = G)))), (G = hm ? mm(e, a) : ym(e, a)) && (Q = $n(b, "onBeforeInput"), 0 < Q.length && (I = new Ss(
          "onBeforeInput",
          "beforeinput",
          null,
          a,
          x
        ), M.push({
          event: I,
          listeners: Q
        }), I.data = G)), ny(
          M,
          e,
          b,
          a,
          x
        );
      }
      so(M, t);
    });
  }
  function Cu(e, t, a) {
    return {
      instance: e,
      listener: t,
      currentTarget: a
    };
  }
  function $n(e, t) {
    for (var a = t + "Capture", l = []; e !== null; ) {
      var u = e, n = u.stateNode;
      if (u = u.tag, u !== 5 && u !== 26 && u !== 27 || n === null || (u = Fl(e, a), u != null && l.unshift(
        Cu(e, u, n)
      ), u = Fl(e, t), u != null && l.push(
        Cu(e, u, n)
      )), e.tag === 3) return l;
      e = e.return;
    }
    return [];
  }
  function Hl(e) {
    if (e === null) return null;
    do
      e = e.return;
    while (e && e.tag !== 5 && e.tag !== 27);
    return e || null;
  }
  function oo(e, t, a, l, u) {
    for (var n = t._reactName, s = []; a !== null && a !== l; ) {
      var d = a, m = d.alternate, b = d.stateNode;
      if (d = d.tag, m !== null && m === l) break;
      d !== 5 && d !== 26 && d !== 27 || b === null || (m = b, u ? (b = Fl(a, n), b != null && s.unshift(
        Cu(a, b, m)
      )) : u || (b = Fl(a, n), b != null && s.push(
        Cu(a, b, m)
      ))), a = a.return;
    }
    s.length !== 0 && e.push({ event: t, listeners: s });
  }
  var sy = /\r\n?/g, ry = /\u0000|\uFFFD/g;
  function ho(e) {
    return (typeof e == "string" ? e : "" + e).replace(sy, `
`).replace(ry, "");
  }
  function mo(e, t) {
    return t = ho(t), ho(e) === t;
  }
  function Wn() {
  }
  function ye(e, t, a, l, u, n) {
    switch (a) {
      case "children":
        typeof l == "string" ? t === "body" || t === "textarea" && l === "" || fl(e, l) : (typeof l == "number" || typeof l == "bigint") && t !== "body" && fl(e, "" + l);
        break;
      case "className":
        en(e, "class", l);
        break;
      case "tabIndex":
        en(e, "tabindex", l);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        en(e, a, l);
        break;
      case "style":
        ys(e, l, n);
        break;
      case "data":
        if (t !== "object") {
          en(e, "data", l);
          break;
        }
      case "src":
      case "href":
        if (l === "" && (t !== "a" || a !== "href")) {
          e.removeAttribute(a);
          break;
        }
        if (l == null || typeof l == "function" || typeof l == "symbol" || typeof l == "boolean") {
          e.removeAttribute(a);
          break;
        }
        l = ln("" + l), e.setAttribute(a, l);
        break;
      case "action":
      case "formAction":
        if (typeof l == "function") {
          e.setAttribute(
            a,
            "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"
          );
          break;
        } else
          typeof n == "function" && (a === "formAction" ? (t !== "input" && ye(e, t, "name", u.name, u, null), ye(
            e,
            t,
            "formEncType",
            u.formEncType,
            u,
            null
          ), ye(
            e,
            t,
            "formMethod",
            u.formMethod,
            u,
            null
          ), ye(
            e,
            t,
            "formTarget",
            u.formTarget,
            u,
            null
          )) : (ye(e, t, "encType", u.encType, u, null), ye(e, t, "method", u.method, u, null), ye(e, t, "target", u.target, u, null)));
        if (l == null || typeof l == "symbol" || typeof l == "boolean") {
          e.removeAttribute(a);
          break;
        }
        l = ln("" + l), e.setAttribute(a, l);
        break;
      case "onClick":
        l != null && (e.onclick = Wn);
        break;
      case "onScroll":
        l != null && te("scroll", e);
        break;
      case "onScrollEnd":
        l != null && te("scrollend", e);
        break;
      case "dangerouslySetInnerHTML":
        if (l != null) {
          if (typeof l != "object" || !("__html" in l))
            throw Error(f(61));
          if (a = l.__html, a != null) {
            if (u.children != null) throw Error(f(60));
            e.innerHTML = a;
          }
        }
        break;
      case "multiple":
        e.multiple = l && typeof l != "function" && typeof l != "symbol";
        break;
      case "muted":
        e.muted = l && typeof l != "function" && typeof l != "symbol";
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "defaultValue":
      case "defaultChecked":
      case "innerHTML":
      case "ref":
        break;
      case "autoFocus":
        break;
      case "xlinkHref":
        if (l == null || typeof l == "function" || typeof l == "boolean" || typeof l == "symbol") {
          e.removeAttribute("xlink:href");
          break;
        }
        a = ln("" + l), e.setAttributeNS(
          "http://www.w3.org/1999/xlink",
          "xlink:href",
          a
        );
        break;
      case "contentEditable":
      case "spellCheck":
      case "draggable":
      case "value":
      case "autoReverse":
      case "externalResourcesRequired":
      case "focusable":
      case "preserveAlpha":
        l != null && typeof l != "function" && typeof l != "symbol" ? e.setAttribute(a, "" + l) : e.removeAttribute(a);
        break;
      case "inert":
      case "allowFullScreen":
      case "async":
      case "autoPlay":
      case "controls":
      case "default":
      case "defer":
      case "disabled":
      case "disablePictureInPicture":
      case "disableRemotePlayback":
      case "formNoValidate":
      case "hidden":
      case "loop":
      case "noModule":
      case "noValidate":
      case "open":
      case "playsInline":
      case "readOnly":
      case "required":
      case "reversed":
      case "scoped":
      case "seamless":
      case "itemScope":
        l && typeof l != "function" && typeof l != "symbol" ? e.setAttribute(a, "") : e.removeAttribute(a);
        break;
      case "capture":
      case "download":
        l === !0 ? e.setAttribute(a, "") : l !== !1 && l != null && typeof l != "function" && typeof l != "symbol" ? e.setAttribute(a, l) : e.removeAttribute(a);
        break;
      case "cols":
      case "rows":
      case "size":
      case "span":
        l != null && typeof l != "function" && typeof l != "symbol" && !isNaN(l) && 1 <= l ? e.setAttribute(a, l) : e.removeAttribute(a);
        break;
      case "rowSpan":
      case "start":
        l == null || typeof l == "function" || typeof l == "symbol" || isNaN(l) ? e.removeAttribute(a) : e.setAttribute(a, l);
        break;
      case "popover":
        te("beforetoggle", e), te("toggle", e), Pu(e, "popover", l);
        break;
      case "xlinkActuate":
        Bt(
          e,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          l
        );
        break;
      case "xlinkArcrole":
        Bt(
          e,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          l
        );
        break;
      case "xlinkRole":
        Bt(
          e,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          l
        );
        break;
      case "xlinkShow":
        Bt(
          e,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          l
        );
        break;
      case "xlinkTitle":
        Bt(
          e,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          l
        );
        break;
      case "xlinkType":
        Bt(
          e,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          l
        );
        break;
      case "xmlBase":
        Bt(
          e,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          l
        );
        break;
      case "xmlLang":
        Bt(
          e,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          l
        );
        break;
      case "xmlSpace":
        Bt(
          e,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          l
        );
        break;
      case "is":
        Pu(e, "is", l);
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        (!(2 < a.length) || a[0] !== "o" && a[0] !== "O" || a[1] !== "n" && a[1] !== "N") && (a = Gh.get(a) || a, Pu(e, a, l));
    }
  }
  function yf(e, t, a, l, u, n) {
    switch (a) {
      case "style":
        ys(e, l, n);
        break;
      case "dangerouslySetInnerHTML":
        if (l != null) {
          if (typeof l != "object" || !("__html" in l))
            throw Error(f(61));
          if (a = l.__html, a != null) {
            if (u.children != null) throw Error(f(60));
            e.innerHTML = a;
          }
        }
        break;
      case "children":
        typeof l == "string" ? fl(e, l) : (typeof l == "number" || typeof l == "bigint") && fl(e, "" + l);
        break;
      case "onScroll":
        l != null && te("scroll", e);
        break;
      case "onScrollEnd":
        l != null && te("scrollend", e);
        break;
      case "onClick":
        l != null && (e.onclick = Wn);
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "innerHTML":
      case "ref":
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        if (!us.hasOwnProperty(a))
          e: {
            if (a[0] === "o" && a[1] === "n" && (u = a.endsWith("Capture"), t = a.slice(2, u ? a.length - 7 : void 0), n = e[$e] || null, n = n != null ? n[a] : null, typeof n == "function" && e.removeEventListener(t, n, u), typeof l == "function")) {
              typeof n != "function" && n !== null && (a in e ? e[a] = null : e.hasAttribute(a) && e.removeAttribute(a)), e.addEventListener(t, l, u);
              break e;
            }
            a in e ? e[a] = l : l === !0 ? e.setAttribute(a, "") : Pu(e, a, l);
          }
    }
  }
  function Ge(e, t, a) {
    switch (t) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "img":
        te("error", e), te("load", e);
        var l = !1, u = !1, n;
        for (n in a)
          if (a.hasOwnProperty(n)) {
            var s = a[n];
            if (s != null)
              switch (n) {
                case "src":
                  l = !0;
                  break;
                case "srcSet":
                  u = !0;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  throw Error(f(137, t));
                default:
                  ye(e, t, n, s, a, null);
              }
          }
        u && ye(e, t, "srcSet", a.srcSet, a, null), l && ye(e, t, "src", a.src, a, null);
        return;
      case "input":
        te("invalid", e);
        var d = n = s = u = null, m = null, b = null;
        for (l in a)
          if (a.hasOwnProperty(l)) {
            var x = a[l];
            if (x != null)
              switch (l) {
                case "name":
                  u = x;
                  break;
                case "type":
                  s = x;
                  break;
                case "checked":
                  m = x;
                  break;
                case "defaultChecked":
                  b = x;
                  break;
                case "value":
                  n = x;
                  break;
                case "defaultValue":
                  d = x;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  if (x != null)
                    throw Error(f(137, t));
                  break;
                default:
                  ye(e, t, l, x, a, null);
              }
          }
        ds(
          e,
          n,
          d,
          m,
          b,
          s,
          u,
          !1
        ), tn(e);
        return;
      case "select":
        te("invalid", e), l = s = n = null;
        for (u in a)
          if (a.hasOwnProperty(u) && (d = a[u], d != null))
            switch (u) {
              case "value":
                n = d;
                break;
              case "defaultValue":
                s = d;
                break;
              case "multiple":
                l = d;
              default:
                ye(e, t, u, d, a, null);
            }
        t = n, a = s, e.multiple = !!l, t != null ? cl(e, !!l, t, !1) : a != null && cl(e, !!l, a, !0);
        return;
      case "textarea":
        te("invalid", e), n = u = l = null;
        for (s in a)
          if (a.hasOwnProperty(s) && (d = a[s], d != null))
            switch (s) {
              case "value":
                l = d;
                break;
              case "defaultValue":
                u = d;
                break;
              case "children":
                n = d;
                break;
              case "dangerouslySetInnerHTML":
                if (d != null) throw Error(f(91));
                break;
              default:
                ye(e, t, s, d, a, null);
            }
        hs(e, l, u, n), tn(e);
        return;
      case "option":
        for (m in a)
          if (a.hasOwnProperty(m) && (l = a[m], l != null))
            switch (m) {
              case "selected":
                e.selected = l && typeof l != "function" && typeof l != "symbol";
                break;
              default:
                ye(e, t, m, l, a, null);
            }
        return;
      case "dialog":
        te("beforetoggle", e), te("toggle", e), te("cancel", e), te("close", e);
        break;
      case "iframe":
      case "object":
        te("load", e);
        break;
      case "video":
      case "audio":
        for (l = 0; l < Uu.length; l++)
          te(Uu[l], e);
        break;
      case "image":
        te("error", e), te("load", e);
        break;
      case "details":
        te("toggle", e);
        break;
      case "embed":
      case "source":
      case "link":
        te("error", e), te("load", e);
      case "area":
      case "base":
      case "br":
      case "col":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "track":
      case "wbr":
      case "menuitem":
        for (b in a)
          if (a.hasOwnProperty(b) && (l = a[b], l != null))
            switch (b) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(f(137, t));
              default:
                ye(e, t, b, l, a, null);
            }
        return;
      default:
        if (Di(t)) {
          for (x in a)
            a.hasOwnProperty(x) && (l = a[x], l !== void 0 && yf(
              e,
              t,
              x,
              l,
              a,
              void 0
            ));
          return;
        }
    }
    for (d in a)
      a.hasOwnProperty(d) && (l = a[d], l != null && ye(e, t, d, l, a, null));
  }
  function dy(e, t, a, l) {
    switch (t) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "input":
        var u = null, n = null, s = null, d = null, m = null, b = null, x = null;
        for (T in a) {
          var M = a[T];
          if (a.hasOwnProperty(T) && M != null)
            switch (T) {
              case "checked":
                break;
              case "value":
                break;
              case "defaultValue":
                m = M;
              default:
                l.hasOwnProperty(T) || ye(e, t, T, null, l, M);
            }
        }
        for (var S in l) {
          var T = l[S];
          if (M = a[S], l.hasOwnProperty(S) && (T != null || M != null))
            switch (S) {
              case "type":
                n = T;
                break;
              case "name":
                u = T;
                break;
              case "checked":
                b = T;
                break;
              case "defaultChecked":
                x = T;
                break;
              case "value":
                s = T;
                break;
              case "defaultValue":
                d = T;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (T != null)
                  throw Error(f(137, t));
                break;
              default:
                T !== M && ye(
                  e,
                  t,
                  S,
                  T,
                  l,
                  M
                );
            }
        }
        Ri(
          e,
          s,
          d,
          m,
          b,
          x,
          n,
          u
        );
        return;
      case "select":
        T = s = d = S = null;
        for (n in a)
          if (m = a[n], a.hasOwnProperty(n) && m != null)
            switch (n) {
              case "value":
                break;
              case "multiple":
                T = m;
              default:
                l.hasOwnProperty(n) || ye(
                  e,
                  t,
                  n,
                  null,
                  l,
                  m
                );
            }
        for (u in l)
          if (n = l[u], m = a[u], l.hasOwnProperty(u) && (n != null || m != null))
            switch (u) {
              case "value":
                S = n;
                break;
              case "defaultValue":
                d = n;
                break;
              case "multiple":
                s = n;
              default:
                n !== m && ye(
                  e,
                  t,
                  u,
                  n,
                  l,
                  m
                );
            }
        t = d, a = s, l = T, S != null ? cl(e, !!a, S, !1) : !!l != !!a && (t != null ? cl(e, !!a, t, !0) : cl(e, !!a, a ? [] : "", !1));
        return;
      case "textarea":
        T = S = null;
        for (d in a)
          if (u = a[d], a.hasOwnProperty(d) && u != null && !l.hasOwnProperty(d))
            switch (d) {
              case "value":
                break;
              case "children":
                break;
              default:
                ye(e, t, d, null, l, u);
            }
        for (s in l)
          if (u = l[s], n = a[s], l.hasOwnProperty(s) && (u != null || n != null))
            switch (s) {
              case "value":
                S = u;
                break;
              case "defaultValue":
                T = u;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (u != null) throw Error(f(91));
                break;
              default:
                u !== n && ye(e, t, s, u, l, n);
            }
        os(e, S, T);
        return;
      case "option":
        for (var w in a)
          if (S = a[w], a.hasOwnProperty(w) && S != null && !l.hasOwnProperty(w))
            switch (w) {
              case "selected":
                e.selected = !1;
                break;
              default:
                ye(
                  e,
                  t,
                  w,
                  null,
                  l,
                  S
                );
            }
        for (m in l)
          if (S = l[m], T = a[m], l.hasOwnProperty(m) && S !== T && (S != null || T != null))
            switch (m) {
              case "selected":
                e.selected = S && typeof S != "function" && typeof S != "symbol";
                break;
              default:
                ye(
                  e,
                  t,
                  m,
                  S,
                  l,
                  T
                );
            }
        return;
      case "img":
      case "link":
      case "area":
      case "base":
      case "br":
      case "col":
      case "embed":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "source":
      case "track":
      case "wbr":
      case "menuitem":
        for (var V in a)
          S = a[V], a.hasOwnProperty(V) && S != null && !l.hasOwnProperty(V) && ye(e, t, V, null, l, S);
        for (b in l)
          if (S = l[b], T = a[b], l.hasOwnProperty(b) && S !== T && (S != null || T != null))
            switch (b) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (S != null)
                  throw Error(f(137, t));
                break;
              default:
                ye(
                  e,
                  t,
                  b,
                  S,
                  l,
                  T
                );
            }
        return;
      default:
        if (Di(t)) {
          for (var ve in a)
            S = a[ve], a.hasOwnProperty(ve) && S !== void 0 && !l.hasOwnProperty(ve) && yf(
              e,
              t,
              ve,
              void 0,
              l,
              S
            );
          for (x in l)
            S = l[x], T = a[x], !l.hasOwnProperty(x) || S === T || S === void 0 && T === void 0 || yf(
              e,
              t,
              x,
              S,
              l,
              T
            );
          return;
        }
    }
    for (var g in a)
      S = a[g], a.hasOwnProperty(g) && S != null && !l.hasOwnProperty(g) && ye(e, t, g, null, l, S);
    for (M in l)
      S = l[M], T = a[M], !l.hasOwnProperty(M) || S === T || S == null && T == null || ye(e, t, M, S, l, T);
  }
  var vf = null, gf = null;
  function Fn(e) {
    return e.nodeType === 9 ? e : e.ownerDocument;
  }
  function yo(e) {
    switch (e) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function vo(e, t) {
    if (e === 0)
      switch (t) {
        case "svg":
          return 1;
        case "math":
          return 2;
        default:
          return 0;
      }
    return e === 1 && t === "foreignObject" ? 0 : e;
  }
  function _f(e, t) {
    return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
  }
  var pf = null;
  function oy() {
    var e = window.event;
    return e && e.type === "popstate" ? e === pf ? !1 : (pf = e, !0) : (pf = null, !1);
  }
  var go = typeof setTimeout == "function" ? setTimeout : void 0, hy = typeof clearTimeout == "function" ? clearTimeout : void 0, _o = typeof Promise == "function" ? Promise : void 0, my = typeof queueMicrotask == "function" ? queueMicrotask : typeof _o < "u" ? function(e) {
    return _o.resolve(null).then(e).catch(yy);
  } : go;
  function yy(e) {
    setTimeout(function() {
      throw e;
    });
  }
  function pa(e) {
    return e === "head";
  }
  function po(e, t) {
    var a = t, l = 0, u = 0;
    do {
      var n = a.nextSibling;
      if (e.removeChild(a), n && n.nodeType === 8)
        if (a = n.data, a === "/$") {
          if (0 < l && 8 > l) {
            a = l;
            var s = e.ownerDocument;
            if (a & 1 && ju(s.documentElement), a & 2 && ju(s.body), a & 4)
              for (a = s.head, ju(a), s = a.firstChild; s; ) {
                var d = s.nextSibling, m = s.nodeName;
                s[$l] || m === "SCRIPT" || m === "STYLE" || m === "LINK" && s.rel.toLowerCase() === "stylesheet" || a.removeChild(s), s = d;
              }
          }
          if (u === 0) {
            e.removeChild(n), Vu(t);
            return;
          }
          u--;
        } else
          a === "$" || a === "$?" || a === "$!" ? u++ : l = a.charCodeAt(0) - 48;
      else l = 0;
      a = n;
    } while (a);
    Vu(t);
  }
  function bf(e) {
    var t = e.firstChild;
    for (t && t.nodeType === 10 && (t = t.nextSibling); t; ) {
      var a = t;
      switch (t = t.nextSibling, a.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          bf(a), Ei(a);
          continue;
        case "SCRIPT":
        case "STYLE":
          continue;
        case "LINK":
          if (a.rel.toLowerCase() === "stylesheet") continue;
      }
      e.removeChild(a);
    }
  }
  function vy(e, t, a, l) {
    for (; e.nodeType === 1; ) {
      var u = a;
      if (e.nodeName.toLowerCase() !== t.toLowerCase()) {
        if (!l && (e.nodeName !== "INPUT" || e.type !== "hidden"))
          break;
      } else if (l) {
        if (!e[$l])
          switch (t) {
            case "meta":
              if (!e.hasAttribute("itemprop")) break;
              return e;
            case "link":
              if (n = e.getAttribute("rel"), n === "stylesheet" && e.hasAttribute("data-precedence"))
                break;
              if (n !== u.rel || e.getAttribute("href") !== (u.href == null || u.href === "" ? null : u.href) || e.getAttribute("crossorigin") !== (u.crossOrigin == null ? null : u.crossOrigin) || e.getAttribute("title") !== (u.title == null ? null : u.title))
                break;
              return e;
            case "style":
              if (e.hasAttribute("data-precedence")) break;
              return e;
            case "script":
              if (n = e.getAttribute("src"), (n !== (u.src == null ? null : u.src) || e.getAttribute("type") !== (u.type == null ? null : u.type) || e.getAttribute("crossorigin") !== (u.crossOrigin == null ? null : u.crossOrigin)) && n && e.hasAttribute("async") && !e.hasAttribute("itemprop"))
                break;
              return e;
            default:
              return e;
          }
      } else if (t === "input" && e.type === "hidden") {
        var n = u.name == null ? null : "" + u.name;
        if (u.type === "hidden" && e.getAttribute("name") === n)
          return e;
      } else return e;
      if (e = zt(e.nextSibling), e === null) break;
    }
    return null;
  }
  function gy(e, t, a) {
    if (t === "") return null;
    for (; e.nodeType !== 3; )
      if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !a || (e = zt(e.nextSibling), e === null)) return null;
    return e;
  }
  function Sf(e) {
    return e.data === "$!" || e.data === "$?" && e.ownerDocument.readyState === "complete";
  }
  function _y(e, t) {
    var a = e.ownerDocument;
    if (e.data !== "$?" || a.readyState === "complete")
      t();
    else {
      var l = function() {
        t(), a.removeEventListener("DOMContentLoaded", l);
      };
      a.addEventListener("DOMContentLoaded", l), e._reactRetry = l;
    }
  }
  function zt(e) {
    for (; e != null; e = e.nextSibling) {
      var t = e.nodeType;
      if (t === 1 || t === 3) break;
      if (t === 8) {
        if (t = e.data, t === "$" || t === "$!" || t === "$?" || t === "F!" || t === "F")
          break;
        if (t === "/$") return null;
      }
    }
    return e;
  }
  var Tf = null;
  function bo(e) {
    e = e.previousSibling;
    for (var t = 0; e; ) {
      if (e.nodeType === 8) {
        var a = e.data;
        if (a === "$" || a === "$!" || a === "$?") {
          if (t === 0) return e;
          t--;
        } else a === "/$" && t++;
      }
      e = e.previousSibling;
    }
    return null;
  }
  function So(e, t, a) {
    switch (t = Fn(a), e) {
      case "html":
        if (e = t.documentElement, !e) throw Error(f(452));
        return e;
      case "head":
        if (e = t.head, !e) throw Error(f(453));
        return e;
      case "body":
        if (e = t.body, !e) throw Error(f(454));
        return e;
      default:
        throw Error(f(451));
    }
  }
  function ju(e) {
    for (var t = e.attributes; t.length; )
      e.removeAttributeNode(t[0]);
    Ei(e);
  }
  var Tt = /* @__PURE__ */ new Map(), To = /* @__PURE__ */ new Set();
  function In(e) {
    return typeof e.getRootNode == "function" ? e.getRootNode() : e.nodeType === 9 ? e : e.ownerDocument;
  }
  var It = j.d;
  j.d = {
    f: py,
    r: by,
    D: Sy,
    C: Ty,
    L: Ay,
    m: Ey,
    X: Oy,
    S: xy,
    M: zy
  };
  function py() {
    var e = It.f(), t = Qn();
    return e || t;
  }
  function by(e) {
    var t = ll(e);
    t !== null && t.tag === 5 && t.type === "form" ? Xr(t) : It.r(e);
  }
  var ql = typeof document > "u" ? null : document;
  function Ao(e, t, a) {
    var l = ql;
    if (l && typeof t == "string" && t) {
      var u = yt(t);
      u = 'link[rel="' + e + '"][href="' + u + '"]', typeof a == "string" && (u += '[crossorigin="' + a + '"]'), To.has(u) || (To.add(u), e = { rel: e, crossOrigin: a, href: t }, l.querySelector(u) === null && (t = l.createElement("link"), Ge(t, "link", e), je(t), l.head.appendChild(t)));
    }
  }
  function Sy(e) {
    It.D(e), Ao("dns-prefetch", e, null);
  }
  function Ty(e, t) {
    It.C(e, t), Ao("preconnect", e, t);
  }
  function Ay(e, t, a) {
    It.L(e, t, a);
    var l = ql;
    if (l && e && t) {
      var u = 'link[rel="preload"][as="' + yt(t) + '"]';
      t === "image" && a && a.imageSrcSet ? (u += '[imagesrcset="' + yt(
        a.imageSrcSet
      ) + '"]', typeof a.imageSizes == "string" && (u += '[imagesizes="' + yt(
        a.imageSizes
      ) + '"]')) : u += '[href="' + yt(e) + '"]';
      var n = u;
      switch (t) {
        case "style":
          n = Bl(e);
          break;
        case "script":
          n = Yl(e);
      }
      Tt.has(n) || (e = U(
        {
          rel: "preload",
          href: t === "image" && a && a.imageSrcSet ? void 0 : e,
          as: t
        },
        a
      ), Tt.set(n, e), l.querySelector(u) !== null || t === "style" && l.querySelector(Zu(n)) || t === "script" && l.querySelector(Hu(n)) || (t = l.createElement("link"), Ge(t, "link", e), je(t), l.head.appendChild(t)));
    }
  }
  function Ey(e, t) {
    It.m(e, t);
    var a = ql;
    if (a && e) {
      var l = t && typeof t.as == "string" ? t.as : "script", u = 'link[rel="modulepreload"][as="' + yt(l) + '"][href="' + yt(e) + '"]', n = u;
      switch (l) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          n = Yl(e);
      }
      if (!Tt.has(n) && (e = U({ rel: "modulepreload", href: e }, t), Tt.set(n, e), a.querySelector(u) === null)) {
        switch (l) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (a.querySelector(Hu(n)))
              return;
        }
        l = a.createElement("link"), Ge(l, "link", e), je(l), a.head.appendChild(l);
      }
    }
  }
  function xy(e, t, a) {
    It.S(e, t, a);
    var l = ql;
    if (l && e) {
      var u = ul(l).hoistableStyles, n = Bl(e);
      t = t || "default";
      var s = u.get(n);
      if (!s) {
        var d = { loading: 0, preload: null };
        if (s = l.querySelector(
          Zu(n)
        ))
          d.loading = 5;
        else {
          e = U(
            { rel: "stylesheet", href: e, "data-precedence": t },
            a
          ), (a = Tt.get(n)) && Af(e, a);
          var m = s = l.createElement("link");
          je(m), Ge(m, "link", e), m._p = new Promise(function(b, x) {
            m.onload = b, m.onerror = x;
          }), m.addEventListener("load", function() {
            d.loading |= 1;
          }), m.addEventListener("error", function() {
            d.loading |= 2;
          }), d.loading |= 4, Pn(s, t, l);
        }
        s = {
          type: "stylesheet",
          instance: s,
          count: 1,
          state: d
        }, u.set(n, s);
      }
    }
  }
  function Oy(e, t) {
    It.X(e, t);
    var a = ql;
    if (a && e) {
      var l = ul(a).hoistableScripts, u = Yl(e), n = l.get(u);
      n || (n = a.querySelector(Hu(u)), n || (e = U({ src: e, async: !0 }, t), (t = Tt.get(u)) && Ef(e, t), n = a.createElement("script"), je(n), Ge(n, "link", e), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, l.set(u, n));
    }
  }
  function zy(e, t) {
    It.M(e, t);
    var a = ql;
    if (a && e) {
      var l = ul(a).hoistableScripts, u = Yl(e), n = l.get(u);
      n || (n = a.querySelector(Hu(u)), n || (e = U({ src: e, async: !0, type: "module" }, t), (t = Tt.get(u)) && Ef(e, t), n = a.createElement("script"), je(n), Ge(n, "link", e), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, l.set(u, n));
    }
  }
  function Eo(e, t, a, l) {
    var u = (u = K.current) ? In(u) : null;
    if (!u) throw Error(f(446));
    switch (e) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof a.precedence == "string" && typeof a.href == "string" ? (t = Bl(a.href), a = ul(
          u
        ).hoistableStyles, l = a.get(t), l || (l = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, a.set(t, l)), l) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if (a.rel === "stylesheet" && typeof a.href == "string" && typeof a.precedence == "string") {
          e = Bl(a.href);
          var n = ul(
            u
          ).hoistableStyles, s = n.get(e);
          if (s || (u = u.ownerDocument || u, s = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, n.set(e, s), (n = u.querySelector(
            Zu(e)
          )) && !n._p && (s.instance = n, s.state.loading = 5), Tt.has(e) || (a = {
            rel: "preload",
            as: "style",
            href: a.href,
            crossOrigin: a.crossOrigin,
            integrity: a.integrity,
            media: a.media,
            hrefLang: a.hrefLang,
            referrerPolicy: a.referrerPolicy
          }, Tt.set(e, a), n || Ry(
            u,
            e,
            a,
            s.state
          ))), t && l === null)
            throw Error(f(528, ""));
          return s;
        }
        if (t && l !== null)
          throw Error(f(529, ""));
        return null;
      case "script":
        return t = a.async, a = a.src, typeof a == "string" && t && typeof t != "function" && typeof t != "symbol" ? (t = Yl(a), a = ul(
          u
        ).hoistableScripts, l = a.get(t), l || (l = {
          type: "script",
          instance: null,
          count: 0,
          state: null
        }, a.set(t, l)), l) : { type: "void", instance: null, count: 0, state: null };
      default:
        throw Error(f(444, e));
    }
  }
  function Bl(e) {
    return 'href="' + yt(e) + '"';
  }
  function Zu(e) {
    return 'link[rel="stylesheet"][' + e + "]";
  }
  function xo(e) {
    return U({}, e, {
      "data-precedence": e.precedence,
      precedence: null
    });
  }
  function Ry(e, t, a, l) {
    e.querySelector('link[rel="preload"][as="style"][' + t + "]") ? l.loading = 1 : (t = e.createElement("link"), l.preload = t, t.addEventListener("load", function() {
      return l.loading |= 1;
    }), t.addEventListener("error", function() {
      return l.loading |= 2;
    }), Ge(t, "link", a), je(t), e.head.appendChild(t));
  }
  function Yl(e) {
    return '[src="' + yt(e) + '"]';
  }
  function Hu(e) {
    return "script[async]" + e;
  }
  function Oo(e, t, a) {
    if (t.count++, t.instance === null)
      switch (t.type) {
        case "style":
          var l = e.querySelector(
            'style[data-href~="' + yt(a.href) + '"]'
          );
          if (l)
            return t.instance = l, je(l), l;
          var u = U({}, a, {
            "data-href": a.href,
            "data-precedence": a.precedence,
            href: null,
            precedence: null
          });
          return l = (e.ownerDocument || e).createElement(
            "style"
          ), je(l), Ge(l, "style", u), Pn(l, a.precedence, e), t.instance = l;
        case "stylesheet":
          u = Bl(a.href);
          var n = e.querySelector(
            Zu(u)
          );
          if (n)
            return t.state.loading |= 4, t.instance = n, je(n), n;
          l = xo(a), (u = Tt.get(u)) && Af(l, u), n = (e.ownerDocument || e).createElement("link"), je(n);
          var s = n;
          return s._p = new Promise(function(d, m) {
            s.onload = d, s.onerror = m;
          }), Ge(n, "link", l), t.state.loading |= 4, Pn(n, a.precedence, e), t.instance = n;
        case "script":
          return n = Yl(a.src), (u = e.querySelector(
            Hu(n)
          )) ? (t.instance = u, je(u), u) : (l = a, (u = Tt.get(n)) && (l = U({}, a), Ef(l, u)), e = e.ownerDocument || e, u = e.createElement("script"), je(u), Ge(u, "link", l), e.head.appendChild(u), t.instance = u);
        case "void":
          return null;
        default:
          throw Error(f(443, t.type));
      }
    else
      t.type === "stylesheet" && (t.state.loading & 4) === 0 && (l = t.instance, t.state.loading |= 4, Pn(l, a.precedence, e));
    return t.instance;
  }
  function Pn(e, t, a) {
    for (var l = a.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), u = l.length ? l[l.length - 1] : null, n = u, s = 0; s < l.length; s++) {
      var d = l[s];
      if (d.dataset.precedence === t) n = d;
      else if (n !== u) break;
    }
    n ? n.parentNode.insertBefore(e, n.nextSibling) : (t = a.nodeType === 9 ? a.head : a, t.insertBefore(e, t.firstChild));
  }
  function Af(e, t) {
    e.crossOrigin == null && (e.crossOrigin = t.crossOrigin), e.referrerPolicy == null && (e.referrerPolicy = t.referrerPolicy), e.title == null && (e.title = t.title);
  }
  function Ef(e, t) {
    e.crossOrigin == null && (e.crossOrigin = t.crossOrigin), e.referrerPolicy == null && (e.referrerPolicy = t.referrerPolicy), e.integrity == null && (e.integrity = t.integrity);
  }
  var ei = null;
  function zo(e, t, a) {
    if (ei === null) {
      var l = /* @__PURE__ */ new Map(), u = ei = /* @__PURE__ */ new Map();
      u.set(a, l);
    } else
      u = ei, l = u.get(a), l || (l = /* @__PURE__ */ new Map(), u.set(a, l));
    if (l.has(e)) return l;
    for (l.set(e, null), a = a.getElementsByTagName(e), u = 0; u < a.length; u++) {
      var n = a[u];
      if (!(n[$l] || n[ke] || e === "link" && n.getAttribute("rel") === "stylesheet") && n.namespaceURI !== "http://www.w3.org/2000/svg") {
        var s = n.getAttribute(t) || "";
        s = e + s;
        var d = l.get(s);
        d ? d.push(n) : l.set(s, [n]);
      }
    }
    return l;
  }
  function Ro(e, t, a) {
    e = e.ownerDocument || e, e.head.insertBefore(
      a,
      t === "title" ? e.querySelector("head > title") : null
    );
  }
  function My(e, t, a) {
    if (a === 1 || t.itemProp != null) return !1;
    switch (e) {
      case "meta":
      case "title":
        return !0;
      case "style":
        if (typeof t.precedence != "string" || typeof t.href != "string" || t.href === "")
          break;
        return !0;
      case "link":
        if (typeof t.rel != "string" || typeof t.href != "string" || t.href === "" || t.onLoad || t.onError)
          break;
        switch (t.rel) {
          case "stylesheet":
            return e = t.disabled, typeof t.precedence == "string" && e == null;
          default:
            return !0;
        }
      case "script":
        if (t.async && typeof t.async != "function" && typeof t.async != "symbol" && !t.onLoad && !t.onError && t.src && typeof t.src == "string")
          return !0;
    }
    return !1;
  }
  function Mo(e) {
    return !(e.type === "stylesheet" && (e.state.loading & 3) === 0);
  }
  var qu = null;
  function Dy() {
  }
  function Ny(e, t, a) {
    if (qu === null) throw Error(f(475));
    var l = qu;
    if (t.type === "stylesheet" && (typeof a.media != "string" || matchMedia(a.media).matches !== !1) && (t.state.loading & 4) === 0) {
      if (t.instance === null) {
        var u = Bl(a.href), n = e.querySelector(
          Zu(u)
        );
        if (n) {
          e = n._p, e !== null && typeof e == "object" && typeof e.then == "function" && (l.count++, l = ti.bind(l), e.then(l, l)), t.state.loading |= 4, t.instance = n, je(n);
          return;
        }
        n = e.ownerDocument || e, a = xo(a), (u = Tt.get(u)) && Af(a, u), n = n.createElement("link"), je(n);
        var s = n;
        s._p = new Promise(function(d, m) {
          s.onload = d, s.onerror = m;
        }), Ge(n, "link", a), t.instance = n;
      }
      l.stylesheets === null && (l.stylesheets = /* @__PURE__ */ new Map()), l.stylesheets.set(t, e), (e = t.state.preload) && (t.state.loading & 3) === 0 && (l.count++, t = ti.bind(l), e.addEventListener("load", t), e.addEventListener("error", t));
    }
  }
  function Uy() {
    if (qu === null) throw Error(f(475));
    var e = qu;
    return e.stylesheets && e.count === 0 && xf(e, e.stylesheets), 0 < e.count ? function(t) {
      var a = setTimeout(function() {
        if (e.stylesheets && xf(e, e.stylesheets), e.unsuspend) {
          var l = e.unsuspend;
          e.unsuspend = null, l();
        }
      }, 6e4);
      return e.unsuspend = t, function() {
        e.unsuspend = null, clearTimeout(a);
      };
    } : null;
  }
  function ti() {
    if (this.count--, this.count === 0) {
      if (this.stylesheets) xf(this, this.stylesheets);
      else if (this.unsuspend) {
        var e = this.unsuspend;
        this.unsuspend = null, e();
      }
    }
  }
  var ai = null;
  function xf(e, t) {
    e.stylesheets = null, e.unsuspend !== null && (e.count++, ai = /* @__PURE__ */ new Map(), t.forEach(Cy, e), ai = null, ti.call(e));
  }
  function Cy(e, t) {
    if (!(t.state.loading & 4)) {
      var a = ai.get(e);
      if (a) var l = a.get(null);
      else {
        a = /* @__PURE__ */ new Map(), ai.set(e, a);
        for (var u = e.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), n = 0; n < u.length; n++) {
          var s = u[n];
          (s.nodeName === "LINK" || s.getAttribute("media") !== "not all") && (a.set(s.dataset.precedence, s), l = s);
        }
        l && a.set(null, l);
      }
      u = t.instance, s = u.getAttribute("data-precedence"), n = a.get(s) || l, n === l && a.set(null, u), a.set(s, u), this.count++, l = ti.bind(this), u.addEventListener("load", l), u.addEventListener("error", l), n ? n.parentNode.insertBefore(u, n.nextSibling) : (e = e.nodeType === 9 ? e.head : e, e.insertBefore(u, e.firstChild)), t.state.loading |= 4;
    }
  }
  var Bu = {
    $$typeof: Xe,
    Provider: null,
    Consumer: null,
    _currentValue: k,
    _currentValue2: k,
    _threadCount: 0
  };
  function jy(e, t, a, l, u, n, s, d) {
    this.tag = 1, this.containerInfo = e, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = bi(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = bi(0), this.hiddenUpdates = bi(null), this.identifierPrefix = l, this.onUncaughtError = u, this.onCaughtError = n, this.onRecoverableError = s, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = d, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function Do(e, t, a, l, u, n, s, d, m, b, x, M) {
    return e = new jy(
      e,
      t,
      a,
      s,
      d,
      m,
      b,
      M
    ), t = 1, n === !0 && (t |= 24), n = ct(3, null, null, t), e.current = n, n.stateNode = e, t = nc(), t.refCount++, e.pooledCache = t, t.refCount++, n.memoizedState = {
      element: l,
      isDehydrated: a,
      cache: t
    }, sc(n), e;
  }
  function No(e) {
    return e ? (e = vl, e) : vl;
  }
  function Uo(e, t, a, l, u, n) {
    u = No(u), l.context === null ? l.context = u : l.pendingContext = u, l = ia(t), l.payload = { element: a }, n = n === void 0 ? null : n, n !== null && (l.callback = n), a = ca(e, l, t), a !== null && (ot(a, e, t), mu(a, e, t));
  }
  function Co(e, t) {
    if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
      var a = e.retryLane;
      e.retryLane = a !== 0 && a < t ? a : t;
    }
  }
  function Of(e, t) {
    Co(e, t), (e = e.alternate) && Co(e, t);
  }
  function jo(e) {
    if (e.tag === 13) {
      var t = yl(e, 67108864);
      t !== null && ot(t, e, 67108864), Of(e, 67108864);
    }
  }
  var li = !0;
  function Zy(e, t, a, l) {
    var u = O.T;
    O.T = null;
    var n = j.p;
    try {
      j.p = 2, zf(e, t, a, l);
    } finally {
      j.p = n, O.T = u;
    }
  }
  function Hy(e, t, a, l) {
    var u = O.T;
    O.T = null;
    var n = j.p;
    try {
      j.p = 8, zf(e, t, a, l);
    } finally {
      j.p = n, O.T = u;
    }
  }
  function zf(e, t, a, l) {
    if (li) {
      var u = Rf(l);
      if (u === null)
        mf(
          e,
          t,
          l,
          ui,
          a
        ), Ho(e, l);
      else if (By(
        u,
        e,
        t,
        a,
        l
      ))
        l.stopPropagation();
      else if (Ho(e, l), t & 4 && -1 < qy.indexOf(e)) {
        for (; u !== null; ) {
          var n = ll(u);
          if (n !== null)
            switch (n.tag) {
              case 3:
                if (n = n.stateNode, n.current.memoizedState.isDehydrated) {
                  var s = ja(n.pendingLanes);
                  if (s !== 0) {
                    var d = n;
                    for (d.pendingLanes |= 2, d.entangledLanes |= 2; s; ) {
                      var m = 1 << 31 - nt(s);
                      d.entanglements[1] |= m, s &= ~m;
                    }
                    jt(n), (oe & 6) === 0 && (Xn = Mt() + 500, Nu(0));
                  }
                }
                break;
              case 13:
                d = yl(n, 2), d !== null && ot(d, n, 2), Qn(), Of(n, 2);
            }
          if (n = Rf(l), n === null && mf(
            e,
            t,
            l,
            ui,
            a
          ), n === u) break;
          u = n;
        }
        u !== null && l.stopPropagation();
      } else
        mf(
          e,
          t,
          l,
          null,
          a
        );
    }
  }
  function Rf(e) {
    return e = Ui(e), Mf(e);
  }
  var ui = null;
  function Mf(e) {
    if (ui = null, e = al(e), e !== null) {
      var t = h(e);
      if (t === null) e = null;
      else {
        var a = t.tag;
        if (a === 13) {
          if (e = A(t), e !== null) return e;
          e = null;
        } else if (a === 3) {
          if (t.stateNode.current.memoizedState.isDehydrated)
            return t.tag === 3 ? t.stateNode.containerInfo : null;
          e = null;
        } else t !== e && (e = null);
      }
    }
    return ui = e, null;
  }
  function Zo(e) {
    switch (e) {
      case "beforetoggle":
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "resize":
      case "seeked":
      case "submit":
      case "toggle":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 2;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "scroll":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 8;
      case "message":
        switch (Th()) {
          case Jf:
            return 2;
          case $f:
            return 8;
          case $u:
          case Ah:
            return 32;
          case Wf:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var Df = !1, ba = null, Sa = null, Ta = null, Yu = /* @__PURE__ */ new Map(), Gu = /* @__PURE__ */ new Map(), Aa = [], qy = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function Ho(e, t) {
    switch (e) {
      case "focusin":
      case "focusout":
        ba = null;
        break;
      case "dragenter":
      case "dragleave":
        Sa = null;
        break;
      case "mouseover":
      case "mouseout":
        Ta = null;
        break;
      case "pointerover":
      case "pointerout":
        Yu.delete(t.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        Gu.delete(t.pointerId);
    }
  }
  function Xu(e, t, a, l, u, n) {
    return e === null || e.nativeEvent !== n ? (e = {
      blockedOn: t,
      domEventName: a,
      eventSystemFlags: l,
      nativeEvent: n,
      targetContainers: [u]
    }, t !== null && (t = ll(t), t !== null && jo(t)), e) : (e.eventSystemFlags |= l, t = e.targetContainers, u !== null && t.indexOf(u) === -1 && t.push(u), e);
  }
  function By(e, t, a, l, u) {
    switch (t) {
      case "focusin":
        return ba = Xu(
          ba,
          e,
          t,
          a,
          l,
          u
        ), !0;
      case "dragenter":
        return Sa = Xu(
          Sa,
          e,
          t,
          a,
          l,
          u
        ), !0;
      case "mouseover":
        return Ta = Xu(
          Ta,
          e,
          t,
          a,
          l,
          u
        ), !0;
      case "pointerover":
        var n = u.pointerId;
        return Yu.set(
          n,
          Xu(
            Yu.get(n) || null,
            e,
            t,
            a,
            l,
            u
          )
        ), !0;
      case "gotpointercapture":
        return n = u.pointerId, Gu.set(
          n,
          Xu(
            Gu.get(n) || null,
            e,
            t,
            a,
            l,
            u
          )
        ), !0;
    }
    return !1;
  }
  function qo(e) {
    var t = al(e.target);
    if (t !== null) {
      var a = h(t);
      if (a !== null) {
        if (t = a.tag, t === 13) {
          if (t = A(a), t !== null) {
            e.blockedOn = t, Nh(e.priority, function() {
              if (a.tag === 13) {
                var l = dt();
                l = Si(l);
                var u = yl(a, l);
                u !== null && ot(u, a, l), Of(a, l);
              }
            });
            return;
          }
        } else if (t === 3 && a.stateNode.current.memoizedState.isDehydrated) {
          e.blockedOn = a.tag === 3 ? a.stateNode.containerInfo : null;
          return;
        }
      }
    }
    e.blockedOn = null;
  }
  function ni(e) {
    if (e.blockedOn !== null) return !1;
    for (var t = e.targetContainers; 0 < t.length; ) {
      var a = Rf(e.nativeEvent);
      if (a === null) {
        a = e.nativeEvent;
        var l = new a.constructor(
          a.type,
          a
        );
        Ni = l, a.target.dispatchEvent(l), Ni = null;
      } else
        return t = ll(a), t !== null && jo(t), e.blockedOn = a, !1;
      t.shift();
    }
    return !0;
  }
  function Bo(e, t, a) {
    ni(e) && a.delete(t);
  }
  function Yy() {
    Df = !1, ba !== null && ni(ba) && (ba = null), Sa !== null && ni(Sa) && (Sa = null), Ta !== null && ni(Ta) && (Ta = null), Yu.forEach(Bo), Gu.forEach(Bo);
  }
  function ii(e, t) {
    e.blockedOn === t && (e.blockedOn = null, Df || (Df = !0, r.unstable_scheduleCallback(
      r.unstable_NormalPriority,
      Yy
    )));
  }
  var ci = null;
  function Yo(e) {
    ci !== e && (ci = e, r.unstable_scheduleCallback(
      r.unstable_NormalPriority,
      function() {
        ci === e && (ci = null);
        for (var t = 0; t < e.length; t += 3) {
          var a = e[t], l = e[t + 1], u = e[t + 2];
          if (typeof l != "function") {
            if (Mf(l || a) === null)
              continue;
            break;
          }
          var n = ll(a);
          n !== null && (e.splice(t, 3), t -= 3, Rc(
            n,
            {
              pending: !0,
              data: u,
              method: a.method,
              action: l
            },
            l,
            u
          ));
        }
      }
    ));
  }
  function Vu(e) {
    function t(m) {
      return ii(m, e);
    }
    ba !== null && ii(ba, e), Sa !== null && ii(Sa, e), Ta !== null && ii(Ta, e), Yu.forEach(t), Gu.forEach(t);
    for (var a = 0; a < Aa.length; a++) {
      var l = Aa[a];
      l.blockedOn === e && (l.blockedOn = null);
    }
    for (; 0 < Aa.length && (a = Aa[0], a.blockedOn === null); )
      qo(a), a.blockedOn === null && Aa.shift();
    if (a = (e.ownerDocument || e).$$reactFormReplay, a != null)
      for (l = 0; l < a.length; l += 3) {
        var u = a[l], n = a[l + 1], s = u[$e] || null;
        if (typeof n == "function")
          s || Yo(a);
        else if (s) {
          var d = null;
          if (n && n.hasAttribute("formAction")) {
            if (u = n, s = n[$e] || null)
              d = s.formAction;
            else if (Mf(u) !== null) continue;
          } else d = s.action;
          typeof d == "function" ? a[l + 1] = d : (a.splice(l, 3), l -= 3), Yo(a);
        }
      }
  }
  function Nf(e) {
    this._internalRoot = e;
  }
  fi.prototype.render = Nf.prototype.render = function(e) {
    var t = this._internalRoot;
    if (t === null) throw Error(f(409));
    var a = t.current, l = dt();
    Uo(a, l, e, t, null, null);
  }, fi.prototype.unmount = Nf.prototype.unmount = function() {
    var e = this._internalRoot;
    if (e !== null) {
      this._internalRoot = null;
      var t = e.containerInfo;
      Uo(e.current, 2, null, e, null, null), Qn(), t[tl] = null;
    }
  };
  function fi(e) {
    this._internalRoot = e;
  }
  fi.prototype.unstable_scheduleHydration = function(e) {
    if (e) {
      var t = ts();
      e = { blockedOn: null, target: e, priority: t };
      for (var a = 0; a < Aa.length && t !== 0 && t < Aa[a].priority; a++) ;
      Aa.splice(a, 0, e), a === 0 && qo(e);
    }
  };
  var Go = i.version;
  if (Go !== "19.1.1")
    throw Error(
      f(
        527,
        Go,
        "19.1.1"
      )
    );
  j.findDOMNode = function(e) {
    var t = e._reactInternals;
    if (t === void 0)
      throw typeof e.render == "function" ? Error(f(188)) : (e = Object.keys(e).join(","), Error(f(268, e)));
    return e = R(t), e = e !== null ? p(e) : null, e = e === null ? null : e.stateNode, e;
  };
  var Gy = {
    bundleType: 0,
    version: "19.1.1",
    rendererPackageName: "react-dom",
    currentDispatcherRef: O,
    reconcilerVersion: "19.1.1"
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var si = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!si.isDisabled && si.supportsFiber)
      try {
        Ll = si.inject(
          Gy
        ), ut = si;
      } catch {
      }
  }
  return ku.createRoot = function(e, t) {
    if (!o(e)) throw Error(f(299));
    var a = !1, l = "", u = td, n = ad, s = ld, d = null;
    return t != null && (t.unstable_strictMode === !0 && (a = !0), t.identifierPrefix !== void 0 && (l = t.identifierPrefix), t.onUncaughtError !== void 0 && (u = t.onUncaughtError), t.onCaughtError !== void 0 && (n = t.onCaughtError), t.onRecoverableError !== void 0 && (s = t.onRecoverableError), t.unstable_transitionCallbacks !== void 0 && (d = t.unstable_transitionCallbacks)), t = Do(
      e,
      1,
      !1,
      null,
      null,
      a,
      l,
      u,
      n,
      s,
      d,
      null
    ), e[tl] = t.current, hf(e), new Nf(t);
  }, ku.hydrateRoot = function(e, t, a) {
    if (!o(e)) throw Error(f(299));
    var l = !1, u = "", n = td, s = ad, d = ld, m = null, b = null;
    return a != null && (a.unstable_strictMode === !0 && (l = !0), a.identifierPrefix !== void 0 && (u = a.identifierPrefix), a.onUncaughtError !== void 0 && (n = a.onUncaughtError), a.onCaughtError !== void 0 && (s = a.onCaughtError), a.onRecoverableError !== void 0 && (d = a.onRecoverableError), a.unstable_transitionCallbacks !== void 0 && (m = a.unstable_transitionCallbacks), a.formState !== void 0 && (b = a.formState)), t = Do(
      e,
      1,
      !0,
      t,
      a ?? null,
      l,
      u,
      n,
      s,
      d,
      m,
      b
    ), t.context = No(null), a = t.current, l = dt(), l = Si(l), u = ia(l), u.callback = null, ca(a, u, l), a = l, t.current.lanes = a, Jl(t, a), jt(t), e[tl] = t.current, hf(e), new fi(t);
  }, ku.version = "19.1.1", ku;
}
var Wo;
function Iy() {
  if (Wo) return jf.exports;
  Wo = 1;
  function r() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(r);
      } catch (i) {
        console.error(i);
      }
  }
  return r(), jf.exports = Fy(), jf.exports;
}
var Bf = Iy();
class Fo extends Error {
  constructor(c, f, o = {}) {
    super(c, { cause: o.cause });
    ri(this, "code");
    ri(this, "requestId");
    this.status = f, this.name = "ApiError", this.code = o.code, this.requestId = o.requestId;
  }
}
function Py(r) {
  if (!r || typeof r != "object" || !("detail" in r)) return;
  const i = r.detail;
  if (typeof i == "string") return i;
  if (Array.isArray(i))
    return i.map((c) => c && typeof c == "object" && "msg" in c ? String(c.msg) : "").filter(Boolean).join(" ");
  if (i && typeof i == "object") {
    const c = i;
    return c.message ? String(c.message) : c.code ? String(c.code) : void 0;
  }
}
async function Io(r, i = {}) {
  let c;
  try {
    c = await fetch(r, {
      credentials: "include",
      ...i,
      headers: { "Content-Type": "application/json", ...i.headers }
    });
  } catch (o) {
    const h = o instanceof DOMException && o.name === "AbortError";
    throw new Fo(
      h ? "İstek zaman aşımına uğradı. Lütfen tekrar dene." : "API sunucusuna ulaşılamadı.",
      0,
      { code: h ? "timeout" : "network", cause: o }
    );
  }
  if (c.status === 204) return;
  const f = await c.json().catch(() => ({}));
  if (!c.ok)
    throw new Fo(Py(f) || "İşlem tamamlanamadı.", c.status, {
      requestId: c.headers.get("X-Request-ID")
    });
  if (r.includes("/community") && f && typeof f == "object" && "comments" in f) {
    const o = f.comments;
    Array.isArray(o) && o.forEach((h) => {
      h != null && h.author && h.author_id && (h.author.id = h.author_id);
    });
  }
  return f;
}
const ev = {
  tr: { cancel: "Vazgeç", confirm: "Onayla", actionTitle: "İşlem önizlemesi", planTitle: "Okuma planı", targetDate: "Bitirme tarihi", reminder: "Hatırlatıcı açık", weekdays: "Okunmayacak günler" },
  en: { cancel: "Cancel", confirm: "Confirm", actionTitle: "Action preview", planTitle: "Reading plan", targetDate: "Target date", reminder: "Reminder enabled", weekdays: "Days off" }
}, tv = document.documentElement.lang === "en" ? "en" : "tr", Ia = (r) => ev[tv][r];
var se;
(function(r) {
  r.assertEqual = (o) => {
  };
  function i(o) {
  }
  r.assertIs = i;
  function c(o) {
    throw new Error();
  }
  r.assertNever = c, r.arrayToEnum = (o) => {
    const h = {};
    for (const A of o)
      h[A] = A;
    return h;
  }, r.getValidEnumValues = (o) => {
    const h = r.objectKeys(o).filter((E) => typeof o[o[E]] != "number"), A = {};
    for (const E of h)
      A[E] = o[E];
    return r.objectValues(A);
  }, r.objectValues = (o) => r.objectKeys(o).map(function(h) {
    return o[h];
  }), r.objectKeys = typeof Object.keys == "function" ? (o) => Object.keys(o) : (o) => {
    const h = [];
    for (const A in o)
      Object.prototype.hasOwnProperty.call(o, A) && h.push(A);
    return h;
  }, r.find = (o, h) => {
    for (const A of o)
      if (h(A))
        return A;
  }, r.isInteger = typeof Number.isInteger == "function" ? (o) => Number.isInteger(o) : (o) => typeof o == "number" && Number.isFinite(o) && Math.floor(o) === o;
  function f(o, h = " | ") {
    return o.map((A) => typeof A == "string" ? `'${A}'` : A).join(h);
  }
  r.joinValues = f, r.jsonStringifyReplacer = (o, h) => typeof h == "bigint" ? h.toString() : h;
})(se || (se = {}));
var Po;
(function(r) {
  r.mergeShapes = (i, c) => ({
    ...i,
    ...c
    // second overwrites first
  });
})(Po || (Po = {}));
const B = se.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]), Oa = (r) => {
  switch (typeof r) {
    case "undefined":
      return B.undefined;
    case "string":
      return B.string;
    case "number":
      return Number.isNaN(r) ? B.nan : B.number;
    case "boolean":
      return B.boolean;
    case "function":
      return B.function;
    case "bigint":
      return B.bigint;
    case "symbol":
      return B.symbol;
    case "object":
      return Array.isArray(r) ? B.array : r === null ? B.null : r.then && typeof r.then == "function" && r.catch && typeof r.catch == "function" ? B.promise : typeof Map < "u" && r instanceof Map ? B.map : typeof Set < "u" && r instanceof Set ? B.set : typeof Date < "u" && r instanceof Date ? B.date : B.object;
    default:
      return B.unknown;
  }
}, N = se.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
class Pt extends Error {
  get errors() {
    return this.issues;
  }
  constructor(i) {
    super(), this.issues = [], this.addIssue = (f) => {
      this.issues = [...this.issues, f];
    }, this.addIssues = (f = []) => {
      this.issues = [...this.issues, ...f];
    };
    const c = new.target.prototype;
    Object.setPrototypeOf ? Object.setPrototypeOf(this, c) : this.__proto__ = c, this.name = "ZodError", this.issues = i;
  }
  format(i) {
    const c = i || function(h) {
      return h.message;
    }, f = { _errors: [] }, o = (h) => {
      for (const A of h.issues)
        if (A.code === "invalid_union")
          A.unionErrors.map(o);
        else if (A.code === "invalid_return_type")
          o(A.returnTypeError);
        else if (A.code === "invalid_arguments")
          o(A.argumentsError);
        else if (A.path.length === 0)
          f._errors.push(c(A));
        else {
          let E = f, R = 0;
          for (; R < A.path.length; ) {
            const p = A.path[R];
            R === A.path.length - 1 ? (E[p] = E[p] || { _errors: [] }, E[p]._errors.push(c(A))) : E[p] = E[p] || { _errors: [] }, E = E[p], R++;
          }
        }
    };
    return o(this), f;
  }
  static assert(i) {
    if (!(i instanceof Pt))
      throw new Error(`Not a ZodError: ${i}`);
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, se.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(i = (c) => c.message) {
    const c = {}, f = [];
    for (const o of this.issues)
      if (o.path.length > 0) {
        const h = o.path[0];
        c[h] = c[h] || [], c[h].push(i(o));
      } else
        f.push(i(o));
    return { formErrors: f, fieldErrors: c };
  }
  get formErrors() {
    return this.flatten();
  }
}
Pt.create = (r) => new Pt(r);
const Xf = (r, i) => {
  let c;
  switch (r.code) {
    case N.invalid_type:
      r.received === B.undefined ? c = "Required" : c = `Expected ${r.expected}, received ${r.received}`;
      break;
    case N.invalid_literal:
      c = `Invalid literal value, expected ${JSON.stringify(r.expected, se.jsonStringifyReplacer)}`;
      break;
    case N.unrecognized_keys:
      c = `Unrecognized key(s) in object: ${se.joinValues(r.keys, ", ")}`;
      break;
    case N.invalid_union:
      c = "Invalid input";
      break;
    case N.invalid_union_discriminator:
      c = `Invalid discriminator value. Expected ${se.joinValues(r.options)}`;
      break;
    case N.invalid_enum_value:
      c = `Invalid enum value. Expected ${se.joinValues(r.options)}, received '${r.received}'`;
      break;
    case N.invalid_arguments:
      c = "Invalid function arguments";
      break;
    case N.invalid_return_type:
      c = "Invalid function return type";
      break;
    case N.invalid_date:
      c = "Invalid date";
      break;
    case N.invalid_string:
      typeof r.validation == "object" ? "includes" in r.validation ? (c = `Invalid input: must include "${r.validation.includes}"`, typeof r.validation.position == "number" && (c = `${c} at one or more positions greater than or equal to ${r.validation.position}`)) : "startsWith" in r.validation ? c = `Invalid input: must start with "${r.validation.startsWith}"` : "endsWith" in r.validation ? c = `Invalid input: must end with "${r.validation.endsWith}"` : se.assertNever(r.validation) : r.validation !== "regex" ? c = `Invalid ${r.validation}` : c = "Invalid";
      break;
    case N.too_small:
      r.type === "array" ? c = `Array must contain ${r.exact ? "exactly" : r.inclusive ? "at least" : "more than"} ${r.minimum} element(s)` : r.type === "string" ? c = `String must contain ${r.exact ? "exactly" : r.inclusive ? "at least" : "over"} ${r.minimum} character(s)` : r.type === "number" ? c = `Number must be ${r.exact ? "exactly equal to " : r.inclusive ? "greater than or equal to " : "greater than "}${r.minimum}` : r.type === "bigint" ? c = `Number must be ${r.exact ? "exactly equal to " : r.inclusive ? "greater than or equal to " : "greater than "}${r.minimum}` : r.type === "date" ? c = `Date must be ${r.exact ? "exactly equal to " : r.inclusive ? "greater than or equal to " : "greater than "}${new Date(Number(r.minimum))}` : c = "Invalid input";
      break;
    case N.too_big:
      r.type === "array" ? c = `Array must contain ${r.exact ? "exactly" : r.inclusive ? "at most" : "less than"} ${r.maximum} element(s)` : r.type === "string" ? c = `String must contain ${r.exact ? "exactly" : r.inclusive ? "at most" : "under"} ${r.maximum} character(s)` : r.type === "number" ? c = `Number must be ${r.exact ? "exactly" : r.inclusive ? "less than or equal to" : "less than"} ${r.maximum}` : r.type === "bigint" ? c = `BigInt must be ${r.exact ? "exactly" : r.inclusive ? "less than or equal to" : "less than"} ${r.maximum}` : r.type === "date" ? c = `Date must be ${r.exact ? "exactly" : r.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(Number(r.maximum))}` : c = "Invalid input";
      break;
    case N.custom:
      c = "Invalid input";
      break;
    case N.invalid_intersection_types:
      c = "Intersection results could not be merged";
      break;
    case N.not_multiple_of:
      c = `Number must be a multiple of ${r.multipleOf}`;
      break;
    case N.not_finite:
      c = "Number must be finite";
      break;
    default:
      c = i.defaultError, se.assertNever(r);
  }
  return { message: c };
};
let av = Xf;
function lv() {
  return av;
}
const uv = (r) => {
  const { data: i, path: c, errorMaps: f, issueData: o } = r, h = [...c, ...o.path || []], A = {
    ...o,
    path: h
  };
  if (o.message !== void 0)
    return {
      ...o,
      path: h,
      message: o.message
    };
  let E = "";
  const R = f.filter((p) => !!p).slice().reverse();
  for (const p of R)
    E = p(A, { data: i, defaultError: E }).message;
  return {
    ...o,
    path: h,
    message: E
  };
};
function Z(r, i) {
  const c = lv(), f = uv({
    issueData: i,
    data: r.data,
    path: r.path,
    errorMaps: [
      r.common.contextualErrorMap,
      // contextual error map is first priority
      r.schemaErrorMap,
      // then schema-bound map if available
      c,
      // then global override map
      c === Xf ? void 0 : Xf
      // then global default map
    ].filter((o) => !!o)
  });
  r.common.issues.push(f);
}
class ht {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    this.value === "valid" && (this.value = "dirty");
  }
  abort() {
    this.value !== "aborted" && (this.value = "aborted");
  }
  static mergeArray(i, c) {
    const f = [];
    for (const o of c) {
      if (o.status === "aborted")
        return J;
      o.status === "dirty" && i.dirty(), f.push(o.value);
    }
    return { status: i.value, value: f };
  }
  static async mergeObjectAsync(i, c) {
    const f = [];
    for (const o of c) {
      const h = await o.key, A = await o.value;
      f.push({
        key: h,
        value: A
      });
    }
    return ht.mergeObjectSync(i, f);
  }
  static mergeObjectSync(i, c) {
    const f = {};
    for (const o of c) {
      const { key: h, value: A } = o;
      if (h.status === "aborted" || A.status === "aborted")
        return J;
      h.status === "dirty" && i.dirty(), A.status === "dirty" && i.dirty(), h.value !== "__proto__" && (typeof A.value < "u" || o.alwaysSet) && (f[h.value] = A.value);
    }
    return { status: i.value, value: f };
  }
}
const J = Object.freeze({
  status: "aborted"
}), wu = (r) => ({ status: "dirty", value: r }), At = (r) => ({ status: "valid", value: r }), eh = (r) => r.status === "aborted", th = (r) => r.status === "dirty", Xl = (r) => r.status === "valid", di = (r) => typeof Promise < "u" && r instanceof Promise;
var Y;
(function(r) {
  r.errToObj = (i) => typeof i == "string" ? { message: i } : i || {}, r.toString = (i) => typeof i == "string" ? i : i == null ? void 0 : i.message;
})(Y || (Y = {}));
class Ma {
  constructor(i, c, f, o) {
    this._cachedPath = [], this.parent = i, this.data = c, this._path = f, this._key = o;
  }
  get path() {
    return this._cachedPath.length || (Array.isArray(this._key) ? this._cachedPath.push(...this._path, ...this._key) : this._cachedPath.push(...this._path, this._key)), this._cachedPath;
  }
}
const ah = (r, i) => {
  if (Xl(i))
    return { success: !0, data: i.value };
  if (!r.common.issues.length)
    throw new Error("Validation failed but no issues detected.");
  return {
    success: !1,
    get error() {
      if (this._error)
        return this._error;
      const c = new Pt(r.common.issues);
      return this._error = c, this._error;
    }
  };
};
function P(r) {
  if (!r)
    return {};
  const { errorMap: i, invalid_type_error: c, required_error: f, description: o } = r;
  if (i && (c || f))
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  return i ? { errorMap: i, description: o } : { errorMap: (A, E) => {
    const { message: R } = r;
    return A.code === "invalid_enum_value" ? { message: R ?? E.defaultError } : typeof E.data > "u" ? { message: R ?? f ?? E.defaultError } : A.code !== "invalid_type" ? { message: E.defaultError } : { message: R ?? c ?? E.defaultError };
  }, description: o };
}
class ue {
  get description() {
    return this._def.description;
  }
  _getType(i) {
    return Oa(i.data);
  }
  _getOrReturnCtx(i, c) {
    return c || {
      common: i.parent.common,
      data: i.data,
      parsedType: Oa(i.data),
      schemaErrorMap: this._def.errorMap,
      path: i.path,
      parent: i.parent
    };
  }
  _processInputParams(i) {
    return {
      status: new ht(),
      ctx: {
        common: i.parent.common,
        data: i.data,
        parsedType: Oa(i.data),
        schemaErrorMap: this._def.errorMap,
        path: i.path,
        parent: i.parent
      }
    };
  }
  _parseSync(i) {
    const c = this._parse(i);
    if (di(c))
      throw new Error("Synchronous parse encountered promise.");
    return c;
  }
  _parseAsync(i) {
    const c = this._parse(i);
    return Promise.resolve(c);
  }
  parse(i, c) {
    const f = this.safeParse(i, c);
    if (f.success)
      return f.data;
    throw f.error;
  }
  safeParse(i, c) {
    const f = {
      common: {
        issues: [],
        async: (c == null ? void 0 : c.async) ?? !1,
        contextualErrorMap: c == null ? void 0 : c.errorMap
      },
      path: (c == null ? void 0 : c.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: i,
      parsedType: Oa(i)
    }, o = this._parseSync({ data: i, path: f.path, parent: f });
    return ah(f, o);
  }
  "~validate"(i) {
    var f, o;
    const c = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: i,
      parsedType: Oa(i)
    };
    if (!this["~standard"].async)
      try {
        const h = this._parseSync({ data: i, path: [], parent: c });
        return Xl(h) ? {
          value: h.value
        } : {
          issues: c.common.issues
        };
      } catch (h) {
        (o = (f = h == null ? void 0 : h.message) == null ? void 0 : f.toLowerCase()) != null && o.includes("encountered") && (this["~standard"].async = !0), c.common = {
          issues: [],
          async: !0
        };
      }
    return this._parseAsync({ data: i, path: [], parent: c }).then((h) => Xl(h) ? {
      value: h.value
    } : {
      issues: c.common.issues
    });
  }
  async parseAsync(i, c) {
    const f = await this.safeParseAsync(i, c);
    if (f.success)
      return f.data;
    throw f.error;
  }
  async safeParseAsync(i, c) {
    const f = {
      common: {
        issues: [],
        contextualErrorMap: c == null ? void 0 : c.errorMap,
        async: !0
      },
      path: (c == null ? void 0 : c.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: i,
      parsedType: Oa(i)
    }, o = this._parse({ data: i, path: f.path, parent: f }), h = await (di(o) ? o : Promise.resolve(o));
    return ah(f, h);
  }
  refine(i, c) {
    const f = (o) => typeof c == "string" || typeof c > "u" ? { message: c } : typeof c == "function" ? c(o) : c;
    return this._refinement((o, h) => {
      const A = i(o), E = () => h.addIssue({
        code: N.custom,
        ...f(o)
      });
      return typeof Promise < "u" && A instanceof Promise ? A.then((R) => R ? !0 : (E(), !1)) : A ? !0 : (E(), !1);
    });
  }
  refinement(i, c) {
    return this._refinement((f, o) => i(f) ? !0 : (o.addIssue(typeof c == "function" ? c(f, o) : c), !1));
  }
  _refinement(i) {
    return new kl({
      schema: this,
      typeName: $.ZodEffects,
      effect: { type: "refinement", refinement: i }
    });
  }
  superRefine(i) {
    return this._refinement(i);
  }
  constructor(i) {
    this.spa = this.safeParseAsync, this._def = i, this.parse = this.parse.bind(this), this.safeParse = this.safeParse.bind(this), this.parseAsync = this.parseAsync.bind(this), this.safeParseAsync = this.safeParseAsync.bind(this), this.spa = this.spa.bind(this), this.refine = this.refine.bind(this), this.refinement = this.refinement.bind(this), this.superRefine = this.superRefine.bind(this), this.optional = this.optional.bind(this), this.nullable = this.nullable.bind(this), this.nullish = this.nullish.bind(this), this.array = this.array.bind(this), this.promise = this.promise.bind(this), this.or = this.or.bind(this), this.and = this.and.bind(this), this.transform = this.transform.bind(this), this.brand = this.brand.bind(this), this.default = this.default.bind(this), this.catch = this.catch.bind(this), this.describe = this.describe.bind(this), this.pipe = this.pipe.bind(this), this.readonly = this.readonly.bind(this), this.isNullable = this.isNullable.bind(this), this.isOptional = this.isOptional.bind(this), this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (c) => this["~validate"](c)
    };
  }
  optional() {
    return Ra.create(this, this._def);
  }
  nullable() {
    return wl.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return Zt.create(this);
  }
  promise() {
    return yi.create(this, this._def);
  }
  or(i) {
    return hi.create([this, i], this._def);
  }
  and(i) {
    return mi.create(this, i, this._def);
  }
  transform(i) {
    return new kl({
      ...P(this._def),
      schema: this,
      typeName: $.ZodEffects,
      effect: { type: "transform", transform: i }
    });
  }
  default(i) {
    const c = typeof i == "function" ? i : () => i;
    return new Qf({
      ...P(this._def),
      innerType: this,
      defaultValue: c,
      typeName: $.ZodDefault
    });
  }
  brand() {
    return new zv({
      typeName: $.ZodBranded,
      type: this,
      ...P(this._def)
    });
  }
  catch(i) {
    const c = typeof i == "function" ? i : () => i;
    return new kf({
      ...P(this._def),
      innerType: this,
      catchValue: c,
      typeName: $.ZodCatch
    });
  }
  describe(i) {
    const c = this.constructor;
    return new c({
      ...this._def,
      description: i
    });
  }
  pipe(i) {
    return Kf.create(this, i);
  }
  readonly() {
    return wf.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
const nv = /^c[^\s-]{8,}$/i, iv = /^[0-9a-z]+$/, cv = /^[0-9A-HJKMNP-TV-Z]{26}$/i, fv = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i, sv = /^[a-z0-9_-]{21}$/i, rv = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/, dv = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/, ov = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i, hv = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$";
let Yf;
const mv = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, yv = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/, vv = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/, gv = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/, _v = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/, pv = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/, gh = "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))", bv = new RegExp(`^${gh}$`);
function _h(r) {
  let i = "[0-5]\\d";
  r.precision ? i = `${i}\\.\\d{${r.precision}}` : r.precision == null && (i = `${i}(\\.\\d+)?`);
  const c = r.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${i})${c}`;
}
function Sv(r) {
  return new RegExp(`^${_h(r)}$`);
}
function Tv(r) {
  let i = `${gh}T${_h(r)}`;
  const c = [];
  return c.push(r.local ? "Z?" : "Z"), r.offset && c.push("([+-]\\d{2}:?\\d{2})"), i = `${i}(${c.join("|")})`, new RegExp(`^${i}$`);
}
function Av(r, i) {
  return !!((i === "v4" || !i) && mv.test(r) || (i === "v6" || !i) && vv.test(r));
}
function Ev(r, i) {
  if (!rv.test(r))
    return !1;
  try {
    const [c] = r.split(".");
    if (!c)
      return !1;
    const f = c.replace(/-/g, "+").replace(/_/g, "/").padEnd(c.length + (4 - c.length % 4) % 4, "="), o = JSON.parse(atob(f));
    return !(typeof o != "object" || o === null || "typ" in o && (o == null ? void 0 : o.typ) !== "JWT" || !o.alg || i && o.alg !== i);
  } catch {
    return !1;
  }
}
function xv(r, i) {
  return !!((i === "v4" || !i) && yv.test(r) || (i === "v6" || !i) && gv.test(r));
}
class za extends ue {
  _parse(i) {
    if (this._def.coerce && (i.data = String(i.data)), this._getType(i) !== B.string) {
      const h = this._getOrReturnCtx(i);
      return Z(h, {
        code: N.invalid_type,
        expected: B.string,
        received: h.parsedType
      }), J;
    }
    const f = new ht();
    let o;
    for (const h of this._def.checks)
      if (h.kind === "min")
        i.data.length < h.value && (o = this._getOrReturnCtx(i, o), Z(o, {
          code: N.too_small,
          minimum: h.value,
          type: "string",
          inclusive: !0,
          exact: !1,
          message: h.message
        }), f.dirty());
      else if (h.kind === "max")
        i.data.length > h.value && (o = this._getOrReturnCtx(i, o), Z(o, {
          code: N.too_big,
          maximum: h.value,
          type: "string",
          inclusive: !0,
          exact: !1,
          message: h.message
        }), f.dirty());
      else if (h.kind === "length") {
        const A = i.data.length > h.value, E = i.data.length < h.value;
        (A || E) && (o = this._getOrReturnCtx(i, o), A ? Z(o, {
          code: N.too_big,
          maximum: h.value,
          type: "string",
          inclusive: !0,
          exact: !0,
          message: h.message
        }) : E && Z(o, {
          code: N.too_small,
          minimum: h.value,
          type: "string",
          inclusive: !0,
          exact: !0,
          message: h.message
        }), f.dirty());
      } else if (h.kind === "email")
        ov.test(i.data) || (o = this._getOrReturnCtx(i, o), Z(o, {
          validation: "email",
          code: N.invalid_string,
          message: h.message
        }), f.dirty());
      else if (h.kind === "emoji")
        Yf || (Yf = new RegExp(hv, "u")), Yf.test(i.data) || (o = this._getOrReturnCtx(i, o), Z(o, {
          validation: "emoji",
          code: N.invalid_string,
          message: h.message
        }), f.dirty());
      else if (h.kind === "uuid")
        fv.test(i.data) || (o = this._getOrReturnCtx(i, o), Z(o, {
          validation: "uuid",
          code: N.invalid_string,
          message: h.message
        }), f.dirty());
      else if (h.kind === "nanoid")
        sv.test(i.data) || (o = this._getOrReturnCtx(i, o), Z(o, {
          validation: "nanoid",
          code: N.invalid_string,
          message: h.message
        }), f.dirty());
      else if (h.kind === "cuid")
        nv.test(i.data) || (o = this._getOrReturnCtx(i, o), Z(o, {
          validation: "cuid",
          code: N.invalid_string,
          message: h.message
        }), f.dirty());
      else if (h.kind === "cuid2")
        iv.test(i.data) || (o = this._getOrReturnCtx(i, o), Z(o, {
          validation: "cuid2",
          code: N.invalid_string,
          message: h.message
        }), f.dirty());
      else if (h.kind === "ulid")
        cv.test(i.data) || (o = this._getOrReturnCtx(i, o), Z(o, {
          validation: "ulid",
          code: N.invalid_string,
          message: h.message
        }), f.dirty());
      else if (h.kind === "url")
        try {
          new URL(i.data);
        } catch {
          o = this._getOrReturnCtx(i, o), Z(o, {
            validation: "url",
            code: N.invalid_string,
            message: h.message
          }), f.dirty();
        }
      else h.kind === "regex" ? (h.regex.lastIndex = 0, h.regex.test(i.data) || (o = this._getOrReturnCtx(i, o), Z(o, {
        validation: "regex",
        code: N.invalid_string,
        message: h.message
      }), f.dirty())) : h.kind === "trim" ? i.data = i.data.trim() : h.kind === "includes" ? i.data.includes(h.value, h.position) || (o = this._getOrReturnCtx(i, o), Z(o, {
        code: N.invalid_string,
        validation: { includes: h.value, position: h.position },
        message: h.message
      }), f.dirty()) : h.kind === "toLowerCase" ? i.data = i.data.toLowerCase() : h.kind === "toUpperCase" ? i.data = i.data.toUpperCase() : h.kind === "startsWith" ? i.data.startsWith(h.value) || (o = this._getOrReturnCtx(i, o), Z(o, {
        code: N.invalid_string,
        validation: { startsWith: h.value },
        message: h.message
      }), f.dirty()) : h.kind === "endsWith" ? i.data.endsWith(h.value) || (o = this._getOrReturnCtx(i, o), Z(o, {
        code: N.invalid_string,
        validation: { endsWith: h.value },
        message: h.message
      }), f.dirty()) : h.kind === "datetime" ? Tv(h).test(i.data) || (o = this._getOrReturnCtx(i, o), Z(o, {
        code: N.invalid_string,
        validation: "datetime",
        message: h.message
      }), f.dirty()) : h.kind === "date" ? bv.test(i.data) || (o = this._getOrReturnCtx(i, o), Z(o, {
        code: N.invalid_string,
        validation: "date",
        message: h.message
      }), f.dirty()) : h.kind === "time" ? Sv(h).test(i.data) || (o = this._getOrReturnCtx(i, o), Z(o, {
        code: N.invalid_string,
        validation: "time",
        message: h.message
      }), f.dirty()) : h.kind === "duration" ? dv.test(i.data) || (o = this._getOrReturnCtx(i, o), Z(o, {
        validation: "duration",
        code: N.invalid_string,
        message: h.message
      }), f.dirty()) : h.kind === "ip" ? Av(i.data, h.version) || (o = this._getOrReturnCtx(i, o), Z(o, {
        validation: "ip",
        code: N.invalid_string,
        message: h.message
      }), f.dirty()) : h.kind === "jwt" ? Ev(i.data, h.alg) || (o = this._getOrReturnCtx(i, o), Z(o, {
        validation: "jwt",
        code: N.invalid_string,
        message: h.message
      }), f.dirty()) : h.kind === "cidr" ? xv(i.data, h.version) || (o = this._getOrReturnCtx(i, o), Z(o, {
        validation: "cidr",
        code: N.invalid_string,
        message: h.message
      }), f.dirty()) : h.kind === "base64" ? _v.test(i.data) || (o = this._getOrReturnCtx(i, o), Z(o, {
        validation: "base64",
        code: N.invalid_string,
        message: h.message
      }), f.dirty()) : h.kind === "base64url" ? pv.test(i.data) || (o = this._getOrReturnCtx(i, o), Z(o, {
        validation: "base64url",
        code: N.invalid_string,
        message: h.message
      }), f.dirty()) : se.assertNever(h);
    return { status: f.value, value: i.data };
  }
  _regex(i, c, f) {
    return this.refinement((o) => i.test(o), {
      validation: c,
      code: N.invalid_string,
      ...Y.errToObj(f)
    });
  }
  _addCheck(i) {
    return new za({
      ...this._def,
      checks: [...this._def.checks, i]
    });
  }
  email(i) {
    return this._addCheck({ kind: "email", ...Y.errToObj(i) });
  }
  url(i) {
    return this._addCheck({ kind: "url", ...Y.errToObj(i) });
  }
  emoji(i) {
    return this._addCheck({ kind: "emoji", ...Y.errToObj(i) });
  }
  uuid(i) {
    return this._addCheck({ kind: "uuid", ...Y.errToObj(i) });
  }
  nanoid(i) {
    return this._addCheck({ kind: "nanoid", ...Y.errToObj(i) });
  }
  cuid(i) {
    return this._addCheck({ kind: "cuid", ...Y.errToObj(i) });
  }
  cuid2(i) {
    return this._addCheck({ kind: "cuid2", ...Y.errToObj(i) });
  }
  ulid(i) {
    return this._addCheck({ kind: "ulid", ...Y.errToObj(i) });
  }
  base64(i) {
    return this._addCheck({ kind: "base64", ...Y.errToObj(i) });
  }
  base64url(i) {
    return this._addCheck({
      kind: "base64url",
      ...Y.errToObj(i)
    });
  }
  jwt(i) {
    return this._addCheck({ kind: "jwt", ...Y.errToObj(i) });
  }
  ip(i) {
    return this._addCheck({ kind: "ip", ...Y.errToObj(i) });
  }
  cidr(i) {
    return this._addCheck({ kind: "cidr", ...Y.errToObj(i) });
  }
  datetime(i) {
    return typeof i == "string" ? this._addCheck({
      kind: "datetime",
      precision: null,
      offset: !1,
      local: !1,
      message: i
    }) : this._addCheck({
      kind: "datetime",
      precision: typeof (i == null ? void 0 : i.precision) > "u" ? null : i == null ? void 0 : i.precision,
      offset: (i == null ? void 0 : i.offset) ?? !1,
      local: (i == null ? void 0 : i.local) ?? !1,
      ...Y.errToObj(i == null ? void 0 : i.message)
    });
  }
  date(i) {
    return this._addCheck({ kind: "date", message: i });
  }
  time(i) {
    return typeof i == "string" ? this._addCheck({
      kind: "time",
      precision: null,
      message: i
    }) : this._addCheck({
      kind: "time",
      precision: typeof (i == null ? void 0 : i.precision) > "u" ? null : i == null ? void 0 : i.precision,
      ...Y.errToObj(i == null ? void 0 : i.message)
    });
  }
  duration(i) {
    return this._addCheck({ kind: "duration", ...Y.errToObj(i) });
  }
  regex(i, c) {
    return this._addCheck({
      kind: "regex",
      regex: i,
      ...Y.errToObj(c)
    });
  }
  includes(i, c) {
    return this._addCheck({
      kind: "includes",
      value: i,
      position: c == null ? void 0 : c.position,
      ...Y.errToObj(c == null ? void 0 : c.message)
    });
  }
  startsWith(i, c) {
    return this._addCheck({
      kind: "startsWith",
      value: i,
      ...Y.errToObj(c)
    });
  }
  endsWith(i, c) {
    return this._addCheck({
      kind: "endsWith",
      value: i,
      ...Y.errToObj(c)
    });
  }
  min(i, c) {
    return this._addCheck({
      kind: "min",
      value: i,
      ...Y.errToObj(c)
    });
  }
  max(i, c) {
    return this._addCheck({
      kind: "max",
      value: i,
      ...Y.errToObj(c)
    });
  }
  length(i, c) {
    return this._addCheck({
      kind: "length",
      value: i,
      ...Y.errToObj(c)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(i) {
    return this.min(1, Y.errToObj(i));
  }
  trim() {
    return new za({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new za({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new za({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((i) => i.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((i) => i.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((i) => i.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((i) => i.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((i) => i.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((i) => i.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((i) => i.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((i) => i.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((i) => i.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((i) => i.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((i) => i.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((i) => i.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((i) => i.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((i) => i.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((i) => i.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((i) => i.kind === "base64url");
  }
  get minLength() {
    let i = null;
    for (const c of this._def.checks)
      c.kind === "min" && (i === null || c.value > i) && (i = c.value);
    return i;
  }
  get maxLength() {
    let i = null;
    for (const c of this._def.checks)
      c.kind === "max" && (i === null || c.value < i) && (i = c.value);
    return i;
  }
}
za.create = (r) => new za({
  checks: [],
  typeName: $.ZodString,
  coerce: (r == null ? void 0 : r.coerce) ?? !1,
  ...P(r)
});
function Ov(r, i) {
  const c = (r.toString().split(".")[1] || "").length, f = (i.toString().split(".")[1] || "").length, o = c > f ? c : f, h = Number.parseInt(r.toFixed(o).replace(".", "")), A = Number.parseInt(i.toFixed(o).replace(".", ""));
  return h % A / 10 ** o;
}
class Vl extends ue {
  constructor() {
    super(...arguments), this.min = this.gte, this.max = this.lte, this.step = this.multipleOf;
  }
  _parse(i) {
    if (this._def.coerce && (i.data = Number(i.data)), this._getType(i) !== B.number) {
      const h = this._getOrReturnCtx(i);
      return Z(h, {
        code: N.invalid_type,
        expected: B.number,
        received: h.parsedType
      }), J;
    }
    let f;
    const o = new ht();
    for (const h of this._def.checks)
      h.kind === "int" ? se.isInteger(i.data) || (f = this._getOrReturnCtx(i, f), Z(f, {
        code: N.invalid_type,
        expected: "integer",
        received: "float",
        message: h.message
      }), o.dirty()) : h.kind === "min" ? (h.inclusive ? i.data < h.value : i.data <= h.value) && (f = this._getOrReturnCtx(i, f), Z(f, {
        code: N.too_small,
        minimum: h.value,
        type: "number",
        inclusive: h.inclusive,
        exact: !1,
        message: h.message
      }), o.dirty()) : h.kind === "max" ? (h.inclusive ? i.data > h.value : i.data >= h.value) && (f = this._getOrReturnCtx(i, f), Z(f, {
        code: N.too_big,
        maximum: h.value,
        type: "number",
        inclusive: h.inclusive,
        exact: !1,
        message: h.message
      }), o.dirty()) : h.kind === "multipleOf" ? Ov(i.data, h.value) !== 0 && (f = this._getOrReturnCtx(i, f), Z(f, {
        code: N.not_multiple_of,
        multipleOf: h.value,
        message: h.message
      }), o.dirty()) : h.kind === "finite" ? Number.isFinite(i.data) || (f = this._getOrReturnCtx(i, f), Z(f, {
        code: N.not_finite,
        message: h.message
      }), o.dirty()) : se.assertNever(h);
    return { status: o.value, value: i.data };
  }
  gte(i, c) {
    return this.setLimit("min", i, !0, Y.toString(c));
  }
  gt(i, c) {
    return this.setLimit("min", i, !1, Y.toString(c));
  }
  lte(i, c) {
    return this.setLimit("max", i, !0, Y.toString(c));
  }
  lt(i, c) {
    return this.setLimit("max", i, !1, Y.toString(c));
  }
  setLimit(i, c, f, o) {
    return new Vl({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind: i,
          value: c,
          inclusive: f,
          message: Y.toString(o)
        }
      ]
    });
  }
  _addCheck(i) {
    return new Vl({
      ...this._def,
      checks: [...this._def.checks, i]
    });
  }
  int(i) {
    return this._addCheck({
      kind: "int",
      message: Y.toString(i)
    });
  }
  positive(i) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: !1,
      message: Y.toString(i)
    });
  }
  negative(i) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: !1,
      message: Y.toString(i)
    });
  }
  nonpositive(i) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: !0,
      message: Y.toString(i)
    });
  }
  nonnegative(i) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: !0,
      message: Y.toString(i)
    });
  }
  multipleOf(i, c) {
    return this._addCheck({
      kind: "multipleOf",
      value: i,
      message: Y.toString(c)
    });
  }
  finite(i) {
    return this._addCheck({
      kind: "finite",
      message: Y.toString(i)
    });
  }
  safe(i) {
    return this._addCheck({
      kind: "min",
      inclusive: !0,
      value: Number.MIN_SAFE_INTEGER,
      message: Y.toString(i)
    })._addCheck({
      kind: "max",
      inclusive: !0,
      value: Number.MAX_SAFE_INTEGER,
      message: Y.toString(i)
    });
  }
  get minValue() {
    let i = null;
    for (const c of this._def.checks)
      c.kind === "min" && (i === null || c.value > i) && (i = c.value);
    return i;
  }
  get maxValue() {
    let i = null;
    for (const c of this._def.checks)
      c.kind === "max" && (i === null || c.value < i) && (i = c.value);
    return i;
  }
  get isInt() {
    return !!this._def.checks.find((i) => i.kind === "int" || i.kind === "multipleOf" && se.isInteger(i.value));
  }
  get isFinite() {
    let i = null, c = null;
    for (const f of this._def.checks) {
      if (f.kind === "finite" || f.kind === "int" || f.kind === "multipleOf")
        return !0;
      f.kind === "min" ? (c === null || f.value > c) && (c = f.value) : f.kind === "max" && (i === null || f.value < i) && (i = f.value);
    }
    return Number.isFinite(c) && Number.isFinite(i);
  }
}
Vl.create = (r) => new Vl({
  checks: [],
  typeName: $.ZodNumber,
  coerce: (r == null ? void 0 : r.coerce) || !1,
  ...P(r)
});
class Lu extends ue {
  constructor() {
    super(...arguments), this.min = this.gte, this.max = this.lte;
  }
  _parse(i) {
    if (this._def.coerce)
      try {
        i.data = BigInt(i.data);
      } catch {
        return this._getInvalidInput(i);
      }
    if (this._getType(i) !== B.bigint)
      return this._getInvalidInput(i);
    let f;
    const o = new ht();
    for (const h of this._def.checks)
      h.kind === "min" ? (h.inclusive ? i.data < h.value : i.data <= h.value) && (f = this._getOrReturnCtx(i, f), Z(f, {
        code: N.too_small,
        type: "bigint",
        minimum: h.value,
        inclusive: h.inclusive,
        message: h.message
      }), o.dirty()) : h.kind === "max" ? (h.inclusive ? i.data > h.value : i.data >= h.value) && (f = this._getOrReturnCtx(i, f), Z(f, {
        code: N.too_big,
        type: "bigint",
        maximum: h.value,
        inclusive: h.inclusive,
        message: h.message
      }), o.dirty()) : h.kind === "multipleOf" ? i.data % h.value !== BigInt(0) && (f = this._getOrReturnCtx(i, f), Z(f, {
        code: N.not_multiple_of,
        multipleOf: h.value,
        message: h.message
      }), o.dirty()) : se.assertNever(h);
    return { status: o.value, value: i.data };
  }
  _getInvalidInput(i) {
    const c = this._getOrReturnCtx(i);
    return Z(c, {
      code: N.invalid_type,
      expected: B.bigint,
      received: c.parsedType
    }), J;
  }
  gte(i, c) {
    return this.setLimit("min", i, !0, Y.toString(c));
  }
  gt(i, c) {
    return this.setLimit("min", i, !1, Y.toString(c));
  }
  lte(i, c) {
    return this.setLimit("max", i, !0, Y.toString(c));
  }
  lt(i, c) {
    return this.setLimit("max", i, !1, Y.toString(c));
  }
  setLimit(i, c, f, o) {
    return new Lu({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind: i,
          value: c,
          inclusive: f,
          message: Y.toString(o)
        }
      ]
    });
  }
  _addCheck(i) {
    return new Lu({
      ...this._def,
      checks: [...this._def.checks, i]
    });
  }
  positive(i) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: !1,
      message: Y.toString(i)
    });
  }
  negative(i) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: !1,
      message: Y.toString(i)
    });
  }
  nonpositive(i) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: !0,
      message: Y.toString(i)
    });
  }
  nonnegative(i) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: !0,
      message: Y.toString(i)
    });
  }
  multipleOf(i, c) {
    return this._addCheck({
      kind: "multipleOf",
      value: i,
      message: Y.toString(c)
    });
  }
  get minValue() {
    let i = null;
    for (const c of this._def.checks)
      c.kind === "min" && (i === null || c.value > i) && (i = c.value);
    return i;
  }
  get maxValue() {
    let i = null;
    for (const c of this._def.checks)
      c.kind === "max" && (i === null || c.value < i) && (i = c.value);
    return i;
  }
}
Lu.create = (r) => new Lu({
  checks: [],
  typeName: $.ZodBigInt,
  coerce: (r == null ? void 0 : r.coerce) ?? !1,
  ...P(r)
});
class lh extends ue {
  _parse(i) {
    if (this._def.coerce && (i.data = !!i.data), this._getType(i) !== B.boolean) {
      const f = this._getOrReturnCtx(i);
      return Z(f, {
        code: N.invalid_type,
        expected: B.boolean,
        received: f.parsedType
      }), J;
    }
    return At(i.data);
  }
}
lh.create = (r) => new lh({
  typeName: $.ZodBoolean,
  coerce: (r == null ? void 0 : r.coerce) || !1,
  ...P(r)
});
class oi extends ue {
  _parse(i) {
    if (this._def.coerce && (i.data = new Date(i.data)), this._getType(i) !== B.date) {
      const h = this._getOrReturnCtx(i);
      return Z(h, {
        code: N.invalid_type,
        expected: B.date,
        received: h.parsedType
      }), J;
    }
    if (Number.isNaN(i.data.getTime())) {
      const h = this._getOrReturnCtx(i);
      return Z(h, {
        code: N.invalid_date
      }), J;
    }
    const f = new ht();
    let o;
    for (const h of this._def.checks)
      h.kind === "min" ? i.data.getTime() < h.value && (o = this._getOrReturnCtx(i, o), Z(o, {
        code: N.too_small,
        message: h.message,
        inclusive: !0,
        exact: !1,
        minimum: h.value,
        type: "date"
      }), f.dirty()) : h.kind === "max" ? i.data.getTime() > h.value && (o = this._getOrReturnCtx(i, o), Z(o, {
        code: N.too_big,
        message: h.message,
        inclusive: !0,
        exact: !1,
        maximum: h.value,
        type: "date"
      }), f.dirty()) : se.assertNever(h);
    return {
      status: f.value,
      value: new Date(i.data.getTime())
    };
  }
  _addCheck(i) {
    return new oi({
      ...this._def,
      checks: [...this._def.checks, i]
    });
  }
  min(i, c) {
    return this._addCheck({
      kind: "min",
      value: i.getTime(),
      message: Y.toString(c)
    });
  }
  max(i, c) {
    return this._addCheck({
      kind: "max",
      value: i.getTime(),
      message: Y.toString(c)
    });
  }
  get minDate() {
    let i = null;
    for (const c of this._def.checks)
      c.kind === "min" && (i === null || c.value > i) && (i = c.value);
    return i != null ? new Date(i) : null;
  }
  get maxDate() {
    let i = null;
    for (const c of this._def.checks)
      c.kind === "max" && (i === null || c.value < i) && (i = c.value);
    return i != null ? new Date(i) : null;
  }
}
oi.create = (r) => new oi({
  checks: [],
  coerce: (r == null ? void 0 : r.coerce) || !1,
  typeName: $.ZodDate,
  ...P(r)
});
class uh extends ue {
  _parse(i) {
    if (this._getType(i) !== B.symbol) {
      const f = this._getOrReturnCtx(i);
      return Z(f, {
        code: N.invalid_type,
        expected: B.symbol,
        received: f.parsedType
      }), J;
    }
    return At(i.data);
  }
}
uh.create = (r) => new uh({
  typeName: $.ZodSymbol,
  ...P(r)
});
class nh extends ue {
  _parse(i) {
    if (this._getType(i) !== B.undefined) {
      const f = this._getOrReturnCtx(i);
      return Z(f, {
        code: N.invalid_type,
        expected: B.undefined,
        received: f.parsedType
      }), J;
    }
    return At(i.data);
  }
}
nh.create = (r) => new nh({
  typeName: $.ZodUndefined,
  ...P(r)
});
class ih extends ue {
  _parse(i) {
    if (this._getType(i) !== B.null) {
      const f = this._getOrReturnCtx(i);
      return Z(f, {
        code: N.invalid_type,
        expected: B.null,
        received: f.parsedType
      }), J;
    }
    return At(i.data);
  }
}
ih.create = (r) => new ih({
  typeName: $.ZodNull,
  ...P(r)
});
class ch extends ue {
  constructor() {
    super(...arguments), this._any = !0;
  }
  _parse(i) {
    return At(i.data);
  }
}
ch.create = (r) => new ch({
  typeName: $.ZodAny,
  ...P(r)
});
class fh extends ue {
  constructor() {
    super(...arguments), this._unknown = !0;
  }
  _parse(i) {
    return At(i.data);
  }
}
fh.create = (r) => new fh({
  typeName: $.ZodUnknown,
  ...P(r)
});
class Da extends ue {
  _parse(i) {
    const c = this._getOrReturnCtx(i);
    return Z(c, {
      code: N.invalid_type,
      expected: B.never,
      received: c.parsedType
    }), J;
  }
}
Da.create = (r) => new Da({
  typeName: $.ZodNever,
  ...P(r)
});
class sh extends ue {
  _parse(i) {
    if (this._getType(i) !== B.undefined) {
      const f = this._getOrReturnCtx(i);
      return Z(f, {
        code: N.invalid_type,
        expected: B.void,
        received: f.parsedType
      }), J;
    }
    return At(i.data);
  }
}
sh.create = (r) => new sh({
  typeName: $.ZodVoid,
  ...P(r)
});
class Zt extends ue {
  _parse(i) {
    const { ctx: c, status: f } = this._processInputParams(i), o = this._def;
    if (c.parsedType !== B.array)
      return Z(c, {
        code: N.invalid_type,
        expected: B.array,
        received: c.parsedType
      }), J;
    if (o.exactLength !== null) {
      const A = c.data.length > o.exactLength.value, E = c.data.length < o.exactLength.value;
      (A || E) && (Z(c, {
        code: A ? N.too_big : N.too_small,
        minimum: E ? o.exactLength.value : void 0,
        maximum: A ? o.exactLength.value : void 0,
        type: "array",
        inclusive: !0,
        exact: !0,
        message: o.exactLength.message
      }), f.dirty());
    }
    if (o.minLength !== null && c.data.length < o.minLength.value && (Z(c, {
      code: N.too_small,
      minimum: o.minLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: o.minLength.message
    }), f.dirty()), o.maxLength !== null && c.data.length > o.maxLength.value && (Z(c, {
      code: N.too_big,
      maximum: o.maxLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: o.maxLength.message
    }), f.dirty()), c.common.async)
      return Promise.all([...c.data].map((A, E) => o.type._parseAsync(new Ma(c, A, c.path, E)))).then((A) => ht.mergeArray(f, A));
    const h = [...c.data].map((A, E) => o.type._parseSync(new Ma(c, A, c.path, E)));
    return ht.mergeArray(f, h);
  }
  get element() {
    return this._def.type;
  }
  min(i, c) {
    return new Zt({
      ...this._def,
      minLength: { value: i, message: Y.toString(c) }
    });
  }
  max(i, c) {
    return new Zt({
      ...this._def,
      maxLength: { value: i, message: Y.toString(c) }
    });
  }
  length(i, c) {
    return new Zt({
      ...this._def,
      exactLength: { value: i, message: Y.toString(c) }
    });
  }
  nonempty(i) {
    return this.min(1, i);
  }
}
Zt.create = (r, i) => new Zt({
  type: r,
  minLength: null,
  maxLength: null,
  exactLength: null,
  typeName: $.ZodArray,
  ...P(i)
});
function Gl(r) {
  if (r instanceof De) {
    const i = {};
    for (const c in r.shape) {
      const f = r.shape[c];
      i[c] = Ra.create(Gl(f));
    }
    return new De({
      ...r._def,
      shape: () => i
    });
  } else return r instanceof Zt ? new Zt({
    ...r._def,
    type: Gl(r.element)
  }) : r instanceof Ra ? Ra.create(Gl(r.unwrap())) : r instanceof wl ? wl.create(Gl(r.unwrap())) : r instanceof Pa ? Pa.create(r.items.map((i) => Gl(i))) : r;
}
class De extends ue {
  constructor() {
    super(...arguments), this._cached = null, this.nonstrict = this.passthrough, this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const i = this._def.shape(), c = se.objectKeys(i);
    return this._cached = { shape: i, keys: c }, this._cached;
  }
  _parse(i) {
    if (this._getType(i) !== B.object) {
      const p = this._getOrReturnCtx(i);
      return Z(p, {
        code: N.invalid_type,
        expected: B.object,
        received: p.parsedType
      }), J;
    }
    const { status: f, ctx: o } = this._processInputParams(i), { shape: h, keys: A } = this._getCached(), E = [];
    if (!(this._def.catchall instanceof Da && this._def.unknownKeys === "strip"))
      for (const p in o.data)
        A.includes(p) || E.push(p);
    const R = [];
    for (const p of A) {
      const U = h[p], le = o.data[p];
      R.push({
        key: { status: "valid", value: p },
        value: U._parse(new Ma(o, le, o.path, p)),
        alwaysSet: p in o.data
      });
    }
    if (this._def.catchall instanceof Da) {
      const p = this._def.unknownKeys;
      if (p === "passthrough")
        for (const U of E)
          R.push({
            key: { status: "valid", value: U },
            value: { status: "valid", value: o.data[U] }
          });
      else if (p === "strict")
        E.length > 0 && (Z(o, {
          code: N.unrecognized_keys,
          keys: E
        }), f.dirty());
      else if (p !== "strip") throw new Error("Internal ZodObject error: invalid unknownKeys value.");
    } else {
      const p = this._def.catchall;
      for (const U of E) {
        const le = o.data[U];
        R.push({
          key: { status: "valid", value: U },
          value: p._parse(
            new Ma(o, le, o.path, U)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: U in o.data
        });
      }
    }
    return o.common.async ? Promise.resolve().then(async () => {
      const p = [];
      for (const U of R) {
        const le = await U.key, de = await U.value;
        p.push({
          key: le,
          value: de,
          alwaysSet: U.alwaysSet
        });
      }
      return p;
    }).then((p) => ht.mergeObjectSync(f, p)) : ht.mergeObjectSync(f, R);
  }
  get shape() {
    return this._def.shape();
  }
  strict(i) {
    return Y.errToObj, new De({
      ...this._def,
      unknownKeys: "strict",
      ...i !== void 0 ? {
        errorMap: (c, f) => {
          var h, A;
          const o = ((A = (h = this._def).errorMap) == null ? void 0 : A.call(h, c, f).message) ?? f.defaultError;
          return c.code === "unrecognized_keys" ? {
            message: Y.errToObj(i).message ?? o
          } : {
            message: o
          };
        }
      } : {}
    });
  }
  strip() {
    return new De({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new De({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(i) {
    return new De({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...i
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(i) {
    return new De({
      unknownKeys: i._def.unknownKeys,
      catchall: i._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...i._def.shape()
      }),
      typeName: $.ZodObject
    });
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(i, c) {
    return this.augment({ [i]: c });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(i) {
    return new De({
      ...this._def,
      catchall: i
    });
  }
  pick(i) {
    const c = {};
    for (const f of se.objectKeys(i))
      i[f] && this.shape[f] && (c[f] = this.shape[f]);
    return new De({
      ...this._def,
      shape: () => c
    });
  }
  omit(i) {
    const c = {};
    for (const f of se.objectKeys(this.shape))
      i[f] || (c[f] = this.shape[f]);
    return new De({
      ...this._def,
      shape: () => c
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return Gl(this);
  }
  partial(i) {
    const c = {};
    for (const f of se.objectKeys(this.shape)) {
      const o = this.shape[f];
      i && !i[f] ? c[f] = o : c[f] = o.optional();
    }
    return new De({
      ...this._def,
      shape: () => c
    });
  }
  required(i) {
    const c = {};
    for (const f of se.objectKeys(this.shape))
      if (i && !i[f])
        c[f] = this.shape[f];
      else {
        let h = this.shape[f];
        for (; h instanceof Ra; )
          h = h._def.innerType;
        c[f] = h;
      }
    return new De({
      ...this._def,
      shape: () => c
    });
  }
  keyof() {
    return ph(se.objectKeys(this.shape));
  }
}
De.create = (r, i) => new De({
  shape: () => r,
  unknownKeys: "strip",
  catchall: Da.create(),
  typeName: $.ZodObject,
  ...P(i)
});
De.strictCreate = (r, i) => new De({
  shape: () => r,
  unknownKeys: "strict",
  catchall: Da.create(),
  typeName: $.ZodObject,
  ...P(i)
});
De.lazycreate = (r, i) => new De({
  shape: r,
  unknownKeys: "strip",
  catchall: Da.create(),
  typeName: $.ZodObject,
  ...P(i)
});
class hi extends ue {
  _parse(i) {
    const { ctx: c } = this._processInputParams(i), f = this._def.options;
    function o(h) {
      for (const E of h)
        if (E.result.status === "valid")
          return E.result;
      for (const E of h)
        if (E.result.status === "dirty")
          return c.common.issues.push(...E.ctx.common.issues), E.result;
      const A = h.map((E) => new Pt(E.ctx.common.issues));
      return Z(c, {
        code: N.invalid_union,
        unionErrors: A
      }), J;
    }
    if (c.common.async)
      return Promise.all(f.map(async (h) => {
        const A = {
          ...c,
          common: {
            ...c.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await h._parseAsync({
            data: c.data,
            path: c.path,
            parent: A
          }),
          ctx: A
        };
      })).then(o);
    {
      let h;
      const A = [];
      for (const R of f) {
        const p = {
          ...c,
          common: {
            ...c.common,
            issues: []
          },
          parent: null
        }, U = R._parseSync({
          data: c.data,
          path: c.path,
          parent: p
        });
        if (U.status === "valid")
          return U;
        U.status === "dirty" && !h && (h = { result: U, ctx: p }), p.common.issues.length && A.push(p.common.issues);
      }
      if (h)
        return c.common.issues.push(...h.ctx.common.issues), h.result;
      const E = A.map((R) => new Pt(R));
      return Z(c, {
        code: N.invalid_union,
        unionErrors: E
      }), J;
    }
  }
  get options() {
    return this._def.options;
  }
}
hi.create = (r, i) => new hi({
  options: r,
  typeName: $.ZodUnion,
  ...P(i)
});
function Vf(r, i) {
  const c = Oa(r), f = Oa(i);
  if (r === i)
    return { valid: !0, data: r };
  if (c === B.object && f === B.object) {
    const o = se.objectKeys(i), h = se.objectKeys(r).filter((E) => o.indexOf(E) !== -1), A = { ...r, ...i };
    for (const E of h) {
      const R = Vf(r[E], i[E]);
      if (!R.valid)
        return { valid: !1 };
      A[E] = R.data;
    }
    return { valid: !0, data: A };
  } else if (c === B.array && f === B.array) {
    if (r.length !== i.length)
      return { valid: !1 };
    const o = [];
    for (let h = 0; h < r.length; h++) {
      const A = r[h], E = i[h], R = Vf(A, E);
      if (!R.valid)
        return { valid: !1 };
      o.push(R.data);
    }
    return { valid: !0, data: o };
  } else return c === B.date && f === B.date && +r == +i ? { valid: !0, data: r } : { valid: !1 };
}
class mi extends ue {
  _parse(i) {
    const { status: c, ctx: f } = this._processInputParams(i), o = (h, A) => {
      if (eh(h) || eh(A))
        return J;
      const E = Vf(h.value, A.value);
      return E.valid ? ((th(h) || th(A)) && c.dirty(), { status: c.value, value: E.data }) : (Z(f, {
        code: N.invalid_intersection_types
      }), J);
    };
    return f.common.async ? Promise.all([
      this._def.left._parseAsync({
        data: f.data,
        path: f.path,
        parent: f
      }),
      this._def.right._parseAsync({
        data: f.data,
        path: f.path,
        parent: f
      })
    ]).then(([h, A]) => o(h, A)) : o(this._def.left._parseSync({
      data: f.data,
      path: f.path,
      parent: f
    }), this._def.right._parseSync({
      data: f.data,
      path: f.path,
      parent: f
    }));
  }
}
mi.create = (r, i, c) => new mi({
  left: r,
  right: i,
  typeName: $.ZodIntersection,
  ...P(c)
});
class Pa extends ue {
  _parse(i) {
    const { status: c, ctx: f } = this._processInputParams(i);
    if (f.parsedType !== B.array)
      return Z(f, {
        code: N.invalid_type,
        expected: B.array,
        received: f.parsedType
      }), J;
    if (f.data.length < this._def.items.length)
      return Z(f, {
        code: N.too_small,
        minimum: this._def.items.length,
        inclusive: !0,
        exact: !1,
        type: "array"
      }), J;
    !this._def.rest && f.data.length > this._def.items.length && (Z(f, {
      code: N.too_big,
      maximum: this._def.items.length,
      inclusive: !0,
      exact: !1,
      type: "array"
    }), c.dirty());
    const h = [...f.data].map((A, E) => {
      const R = this._def.items[E] || this._def.rest;
      return R ? R._parse(new Ma(f, A, f.path, E)) : null;
    }).filter((A) => !!A);
    return f.common.async ? Promise.all(h).then((A) => ht.mergeArray(c, A)) : ht.mergeArray(c, h);
  }
  get items() {
    return this._def.items;
  }
  rest(i) {
    return new Pa({
      ...this._def,
      rest: i
    });
  }
}
Pa.create = (r, i) => {
  if (!Array.isArray(r))
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  return new Pa({
    items: r,
    typeName: $.ZodTuple,
    rest: null,
    ...P(i)
  });
};
class rh extends ue {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(i) {
    const { status: c, ctx: f } = this._processInputParams(i);
    if (f.parsedType !== B.map)
      return Z(f, {
        code: N.invalid_type,
        expected: B.map,
        received: f.parsedType
      }), J;
    const o = this._def.keyType, h = this._def.valueType, A = [...f.data.entries()].map(([E, R], p) => ({
      key: o._parse(new Ma(f, E, f.path, [p, "key"])),
      value: h._parse(new Ma(f, R, f.path, [p, "value"]))
    }));
    if (f.common.async) {
      const E = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const R of A) {
          const p = await R.key, U = await R.value;
          if (p.status === "aborted" || U.status === "aborted")
            return J;
          (p.status === "dirty" || U.status === "dirty") && c.dirty(), E.set(p.value, U.value);
        }
        return { status: c.value, value: E };
      });
    } else {
      const E = /* @__PURE__ */ new Map();
      for (const R of A) {
        const p = R.key, U = R.value;
        if (p.status === "aborted" || U.status === "aborted")
          return J;
        (p.status === "dirty" || U.status === "dirty") && c.dirty(), E.set(p.value, U.value);
      }
      return { status: c.value, value: E };
    }
  }
}
rh.create = (r, i, c) => new rh({
  valueType: i,
  keyType: r,
  typeName: $.ZodMap,
  ...P(c)
});
class Ku extends ue {
  _parse(i) {
    const { status: c, ctx: f } = this._processInputParams(i);
    if (f.parsedType !== B.set)
      return Z(f, {
        code: N.invalid_type,
        expected: B.set,
        received: f.parsedType
      }), J;
    const o = this._def;
    o.minSize !== null && f.data.size < o.minSize.value && (Z(f, {
      code: N.too_small,
      minimum: o.minSize.value,
      type: "set",
      inclusive: !0,
      exact: !1,
      message: o.minSize.message
    }), c.dirty()), o.maxSize !== null && f.data.size > o.maxSize.value && (Z(f, {
      code: N.too_big,
      maximum: o.maxSize.value,
      type: "set",
      inclusive: !0,
      exact: !1,
      message: o.maxSize.message
    }), c.dirty());
    const h = this._def.valueType;
    function A(R) {
      const p = /* @__PURE__ */ new Set();
      for (const U of R) {
        if (U.status === "aborted")
          return J;
        U.status === "dirty" && c.dirty(), p.add(U.value);
      }
      return { status: c.value, value: p };
    }
    const E = [...f.data.values()].map((R, p) => h._parse(new Ma(f, R, f.path, p)));
    return f.common.async ? Promise.all(E).then((R) => A(R)) : A(E);
  }
  min(i, c) {
    return new Ku({
      ...this._def,
      minSize: { value: i, message: Y.toString(c) }
    });
  }
  max(i, c) {
    return new Ku({
      ...this._def,
      maxSize: { value: i, message: Y.toString(c) }
    });
  }
  size(i, c) {
    return this.min(i, c).max(i, c);
  }
  nonempty(i) {
    return this.min(1, i);
  }
}
Ku.create = (r, i) => new Ku({
  valueType: r,
  minSize: null,
  maxSize: null,
  typeName: $.ZodSet,
  ...P(i)
});
class dh extends ue {
  get schema() {
    return this._def.getter();
  }
  _parse(i) {
    const { ctx: c } = this._processInputParams(i);
    return this._def.getter()._parse({ data: c.data, path: c.path, parent: c });
  }
}
dh.create = (r, i) => new dh({
  getter: r,
  typeName: $.ZodLazy,
  ...P(i)
});
class oh extends ue {
  _parse(i) {
    if (i.data !== this._def.value) {
      const c = this._getOrReturnCtx(i);
      return Z(c, {
        received: c.data,
        code: N.invalid_literal,
        expected: this._def.value
      }), J;
    }
    return { status: "valid", value: i.data };
  }
  get value() {
    return this._def.value;
  }
}
oh.create = (r, i) => new oh({
  value: r,
  typeName: $.ZodLiteral,
  ...P(i)
});
function ph(r, i) {
  return new Ql({
    values: r,
    typeName: $.ZodEnum,
    ...P(i)
  });
}
class Ql extends ue {
  _parse(i) {
    if (typeof i.data != "string") {
      const c = this._getOrReturnCtx(i), f = this._def.values;
      return Z(c, {
        expected: se.joinValues(f),
        received: c.parsedType,
        code: N.invalid_type
      }), J;
    }
    if (this._cache || (this._cache = new Set(this._def.values)), !this._cache.has(i.data)) {
      const c = this._getOrReturnCtx(i), f = this._def.values;
      return Z(c, {
        received: c.data,
        code: N.invalid_enum_value,
        options: f
      }), J;
    }
    return At(i.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const i = {};
    for (const c of this._def.values)
      i[c] = c;
    return i;
  }
  get Values() {
    const i = {};
    for (const c of this._def.values)
      i[c] = c;
    return i;
  }
  get Enum() {
    const i = {};
    for (const c of this._def.values)
      i[c] = c;
    return i;
  }
  extract(i, c = this._def) {
    return Ql.create(i, {
      ...this._def,
      ...c
    });
  }
  exclude(i, c = this._def) {
    return Ql.create(this.options.filter((f) => !i.includes(f)), {
      ...this._def,
      ...c
    });
  }
}
Ql.create = ph;
class hh extends ue {
  _parse(i) {
    const c = se.getValidEnumValues(this._def.values), f = this._getOrReturnCtx(i);
    if (f.parsedType !== B.string && f.parsedType !== B.number) {
      const o = se.objectValues(c);
      return Z(f, {
        expected: se.joinValues(o),
        received: f.parsedType,
        code: N.invalid_type
      }), J;
    }
    if (this._cache || (this._cache = new Set(se.getValidEnumValues(this._def.values))), !this._cache.has(i.data)) {
      const o = se.objectValues(c);
      return Z(f, {
        received: f.data,
        code: N.invalid_enum_value,
        options: o
      }), J;
    }
    return At(i.data);
  }
  get enum() {
    return this._def.values;
  }
}
hh.create = (r, i) => new hh({
  values: r,
  typeName: $.ZodNativeEnum,
  ...P(i)
});
class yi extends ue {
  unwrap() {
    return this._def.type;
  }
  _parse(i) {
    const { ctx: c } = this._processInputParams(i);
    if (c.parsedType !== B.promise && c.common.async === !1)
      return Z(c, {
        code: N.invalid_type,
        expected: B.promise,
        received: c.parsedType
      }), J;
    const f = c.parsedType === B.promise ? c.data : Promise.resolve(c.data);
    return At(f.then((o) => this._def.type.parseAsync(o, {
      path: c.path,
      errorMap: c.common.contextualErrorMap
    })));
  }
}
yi.create = (r, i) => new yi({
  type: r,
  typeName: $.ZodPromise,
  ...P(i)
});
class kl extends ue {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === $.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(i) {
    const { status: c, ctx: f } = this._processInputParams(i), o = this._def.effect || null, h = {
      addIssue: (A) => {
        Z(f, A), A.fatal ? c.abort() : c.dirty();
      },
      get path() {
        return f.path;
      }
    };
    if (h.addIssue = h.addIssue.bind(h), o.type === "preprocess") {
      const A = o.transform(f.data, h);
      if (f.common.async)
        return Promise.resolve(A).then(async (E) => {
          if (c.value === "aborted")
            return J;
          const R = await this._def.schema._parseAsync({
            data: E,
            path: f.path,
            parent: f
          });
          return R.status === "aborted" ? J : R.status === "dirty" || c.value === "dirty" ? wu(R.value) : R;
        });
      {
        if (c.value === "aborted")
          return J;
        const E = this._def.schema._parseSync({
          data: A,
          path: f.path,
          parent: f
        });
        return E.status === "aborted" ? J : E.status === "dirty" || c.value === "dirty" ? wu(E.value) : E;
      }
    }
    if (o.type === "refinement") {
      const A = (E) => {
        const R = o.refinement(E, h);
        if (f.common.async)
          return Promise.resolve(R);
        if (R instanceof Promise)
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        return E;
      };
      if (f.common.async === !1) {
        const E = this._def.schema._parseSync({
          data: f.data,
          path: f.path,
          parent: f
        });
        return E.status === "aborted" ? J : (E.status === "dirty" && c.dirty(), A(E.value), { status: c.value, value: E.value });
      } else
        return this._def.schema._parseAsync({ data: f.data, path: f.path, parent: f }).then((E) => E.status === "aborted" ? J : (E.status === "dirty" && c.dirty(), A(E.value).then(() => ({ status: c.value, value: E.value }))));
    }
    if (o.type === "transform")
      if (f.common.async === !1) {
        const A = this._def.schema._parseSync({
          data: f.data,
          path: f.path,
          parent: f
        });
        if (!Xl(A))
          return J;
        const E = o.transform(A.value, h);
        if (E instanceof Promise)
          throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");
        return { status: c.value, value: E };
      } else
        return this._def.schema._parseAsync({ data: f.data, path: f.path, parent: f }).then((A) => Xl(A) ? Promise.resolve(o.transform(A.value, h)).then((E) => ({
          status: c.value,
          value: E
        })) : J);
    se.assertNever(o);
  }
}
kl.create = (r, i, c) => new kl({
  schema: r,
  typeName: $.ZodEffects,
  effect: i,
  ...P(c)
});
kl.createWithPreprocess = (r, i, c) => new kl({
  schema: i,
  effect: { type: "preprocess", transform: r },
  typeName: $.ZodEffects,
  ...P(c)
});
class Ra extends ue {
  _parse(i) {
    return this._getType(i) === B.undefined ? At(void 0) : this._def.innerType._parse(i);
  }
  unwrap() {
    return this._def.innerType;
  }
}
Ra.create = (r, i) => new Ra({
  innerType: r,
  typeName: $.ZodOptional,
  ...P(i)
});
class wl extends ue {
  _parse(i) {
    return this._getType(i) === B.null ? At(null) : this._def.innerType._parse(i);
  }
  unwrap() {
    return this._def.innerType;
  }
}
wl.create = (r, i) => new wl({
  innerType: r,
  typeName: $.ZodNullable,
  ...P(i)
});
class Qf extends ue {
  _parse(i) {
    const { ctx: c } = this._processInputParams(i);
    let f = c.data;
    return c.parsedType === B.undefined && (f = this._def.defaultValue()), this._def.innerType._parse({
      data: f,
      path: c.path,
      parent: c
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
Qf.create = (r, i) => new Qf({
  innerType: r,
  typeName: $.ZodDefault,
  defaultValue: typeof i.default == "function" ? i.default : () => i.default,
  ...P(i)
});
class kf extends ue {
  _parse(i) {
    const { ctx: c } = this._processInputParams(i), f = {
      ...c,
      common: {
        ...c.common,
        issues: []
      }
    }, o = this._def.innerType._parse({
      data: f.data,
      path: f.path,
      parent: {
        ...f
      }
    });
    return di(o) ? o.then((h) => ({
      status: "valid",
      value: h.status === "valid" ? h.value : this._def.catchValue({
        get error() {
          return new Pt(f.common.issues);
        },
        input: f.data
      })
    })) : {
      status: "valid",
      value: o.status === "valid" ? o.value : this._def.catchValue({
        get error() {
          return new Pt(f.common.issues);
        },
        input: f.data
      })
    };
  }
  removeCatch() {
    return this._def.innerType;
  }
}
kf.create = (r, i) => new kf({
  innerType: r,
  typeName: $.ZodCatch,
  catchValue: typeof i.catch == "function" ? i.catch : () => i.catch,
  ...P(i)
});
class mh extends ue {
  _parse(i) {
    if (this._getType(i) !== B.nan) {
      const f = this._getOrReturnCtx(i);
      return Z(f, {
        code: N.invalid_type,
        expected: B.nan,
        received: f.parsedType
      }), J;
    }
    return { status: "valid", value: i.data };
  }
}
mh.create = (r) => new mh({
  typeName: $.ZodNaN,
  ...P(r)
});
class zv extends ue {
  _parse(i) {
    const { ctx: c } = this._processInputParams(i), f = c.data;
    return this._def.type._parse({
      data: f,
      path: c.path,
      parent: c
    });
  }
  unwrap() {
    return this._def.type;
  }
}
class Kf extends ue {
  _parse(i) {
    const { status: c, ctx: f } = this._processInputParams(i);
    if (f.common.async)
      return (async () => {
        const h = await this._def.in._parseAsync({
          data: f.data,
          path: f.path,
          parent: f
        });
        return h.status === "aborted" ? J : h.status === "dirty" ? (c.dirty(), wu(h.value)) : this._def.out._parseAsync({
          data: h.value,
          path: f.path,
          parent: f
        });
      })();
    {
      const o = this._def.in._parseSync({
        data: f.data,
        path: f.path,
        parent: f
      });
      return o.status === "aborted" ? J : o.status === "dirty" ? (c.dirty(), {
        status: "dirty",
        value: o.value
      }) : this._def.out._parseSync({
        data: o.value,
        path: f.path,
        parent: f
      });
    }
  }
  static create(i, c) {
    return new Kf({
      in: i,
      out: c,
      typeName: $.ZodPipeline
    });
  }
}
class wf extends ue {
  _parse(i) {
    const c = this._def.innerType._parse(i), f = (o) => (Xl(o) && (o.value = Object.freeze(o.value)), o);
    return di(c) ? c.then((o) => f(o)) : f(c);
  }
  unwrap() {
    return this._def.innerType;
  }
}
wf.create = (r, i) => new wf({
  innerType: r,
  typeName: $.ZodReadonly,
  ...P(i)
});
var $;
(function(r) {
  r.ZodString = "ZodString", r.ZodNumber = "ZodNumber", r.ZodNaN = "ZodNaN", r.ZodBigInt = "ZodBigInt", r.ZodBoolean = "ZodBoolean", r.ZodDate = "ZodDate", r.ZodSymbol = "ZodSymbol", r.ZodUndefined = "ZodUndefined", r.ZodNull = "ZodNull", r.ZodAny = "ZodAny", r.ZodUnknown = "ZodUnknown", r.ZodNever = "ZodNever", r.ZodVoid = "ZodVoid", r.ZodArray = "ZodArray", r.ZodObject = "ZodObject", r.ZodUnion = "ZodUnion", r.ZodDiscriminatedUnion = "ZodDiscriminatedUnion", r.ZodIntersection = "ZodIntersection", r.ZodTuple = "ZodTuple", r.ZodRecord = "ZodRecord", r.ZodMap = "ZodMap", r.ZodSet = "ZodSet", r.ZodFunction = "ZodFunction", r.ZodLazy = "ZodLazy", r.ZodLiteral = "ZodLiteral", r.ZodEnum = "ZodEnum", r.ZodEffects = "ZodEffects", r.ZodNativeEnum = "ZodNativeEnum", r.ZodOptional = "ZodOptional", r.ZodNullable = "ZodNullable", r.ZodDefault = "ZodDefault", r.ZodCatch = "ZodCatch", r.ZodPromise = "ZodPromise", r.ZodBranded = "ZodBranded", r.ZodPipeline = "ZodPipeline", r.ZodReadonly = "ZodReadonly";
})($ || ($ = {}));
const Gf = za.create, Rv = Vl.create;
Da.create;
const Mv = Zt.create, Dv = De.create;
hi.create;
mi.create;
Pa.create;
const Nv = Ql.create;
yi.create;
Ra.create;
wl.create;
const Uv = Dv({
  target_date: Gf().date(),
  reminder_time: Gf().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: Gf().min(3),
  excluded_weekdays: Mv(Rv().int().min(0).max(6)),
  delivery_channel: Nv(["in_app", "email", "push"])
});
class yh extends xa.Component {
  constructor() {
    super(...arguments);
    ri(this, "state", { failed: !1 });
  }
  static getDerivedStateFromError() {
    return { failed: !0 };
  }
  componentDidCatch(c, f) {
    console.error("Ürün arayüzü hatası", c, f);
  }
  render() {
    return this.state.failed ? /* @__PURE__ */ L.jsxs("section", { className: "product-error-state", role: "alert", children: [
      /* @__PURE__ */ L.jsx("h2", { children: "Bu bölüm yüklenemedi" }),
      /* @__PURE__ */ L.jsx("p", { children: "Diğer bölümleri kullanmaya devam edebilirsin." }),
      /* @__PURE__ */ L.jsx("button", { onClick: () => this.setState({ failed: !1 }), children: "Yeniden dene" })
    ] }) : this.props.children;
  }
}
function Cv() {
  const [r, i] = xa.useState(null), [c, f] = xa.useState(null), [o, h] = xa.useState(!1), [A, E] = xa.useState(""), R = xa.useRef(() => {
  }), p = xa.useRef(() => {
  });
  xa.useEffect(() => {
    window.BookPusulasiUI = {
      confirmAction(ne) {
        return E(""), i(ne), new Promise((pe) => {
          R.current = pe;
        });
      },
      openReadingPlan(ne) {
        return E(""), f(ne), new Promise((pe) => {
          p.current = pe;
        });
      }
    }, import("./app-shell-CcuT7h1V.js").then(({ initializeAppShell: ne }) => ne());
  }, []);
  async function U() {
    if (r) {
      h(!0), E("");
      try {
        const ne = await Io("/me/chat/actions/execute", { method: "POST", body: JSON.stringify({ action: r, idempotency_key: crypto.randomUUID() }) });
        i(null), R.current(ne);
      } catch (ne) {
        E(ne instanceof Error ? ne.message : "İşlem tamamlanamadı.");
      } finally {
        h(!1);
      }
    }
  }
  async function le(ne) {
    if (ne.preventDefault(), !c) return;
    const pe = new FormData(ne.currentTarget), Je = Uv.safeParse({ target_date: pe.get("target_date"), reminder_time: pe.get("reminder_time"), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Istanbul", excluded_weekdays: pe.getAll("excluded_weekdays").map(Number), delivery_channel: pe.get("delivery_channel") });
    if (!Je.success) {
      E("Plan alanlarını kontrol edin.");
      return;
    }
    h(!0), E("");
    try {
      const Ne = await Io("/me/reading-plans", { method: "PUT", body: JSON.stringify({ book_id: c.id, reminder_enabled: !0, ...Je.data }) });
      f(null), p.current(Ne);
    } catch (Ne) {
      E(Ne instanceof Error ? Ne.message : "Plan oluşturulamadı.");
    } finally {
      h(!1);
    }
  }
  const de = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  return /* @__PURE__ */ L.jsxs(L.Fragment, { children: [
    r && /* @__PURE__ */ L.jsx("div", { className: "product-modal", role: "presentation", children: /* @__PURE__ */ L.jsxs("section", { role: "dialog", "aria-modal": "true", "aria-labelledby": "action-preview-title", className: "product-dialog", children: [
      /* @__PURE__ */ L.jsx("p", { className: "product-eyebrow", children: "GÜVENLİ EYLEM" }),
      /* @__PURE__ */ L.jsx("h2", { id: "action-preview-title", children: Ia("actionTitle") }),
      /* @__PURE__ */ L.jsxs("dl", { children: [
        /* @__PURE__ */ L.jsxs("div", { children: [
          /* @__PURE__ */ L.jsx("dt", { children: "Kitap" }),
          /* @__PURE__ */ L.jsx("dd", { children: r.book_title })
        ] }),
        /* @__PURE__ */ L.jsxs("div", { children: [
          /* @__PURE__ */ L.jsx("dt", { children: "İşlem" }),
          /* @__PURE__ */ L.jsx("dd", { children: r.confirmation })
        ] })
      ] }),
      A && /* @__PURE__ */ L.jsx("p", { role: "alert", className: "product-error", children: A }),
      /* @__PURE__ */ L.jsxs("div", { className: "product-actions", children: [
        /* @__PURE__ */ L.jsx("button", { onClick: () => {
          i(null), R.current(null);
        }, children: Ia("cancel") }),
        /* @__PURE__ */ L.jsx("button", { className: "primary", disabled: o, onClick: U, children: o ? "İşleniyor…" : Ia("confirm") })
      ] })
    ] }) }),
    c && /* @__PURE__ */ L.jsx("div", { className: "product-modal", role: "presentation", children: /* @__PURE__ */ L.jsxs("form", { role: "dialog", "aria-modal": "true", "aria-labelledby": "plan-title", className: "product-dialog", onSubmit: le, children: [
      /* @__PURE__ */ L.jsx("p", { className: "product-eyebrow", children: "OKUMA RİTMİ" }),
      /* @__PURE__ */ L.jsxs("h2", { id: "plan-title", children: [
        c.title,
        " · ",
        Ia("planTitle")
      ] }),
      /* @__PURE__ */ L.jsxs("label", { children: [
        Ia("targetDate"),
        /* @__PURE__ */ L.jsx("input", { name: "target_date", type: "date", min: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), defaultValue: de, required: !0, autoFocus: !0 })
      ] }),
      /* @__PURE__ */ L.jsxs("div", { className: "product-grid", children: [
        /* @__PURE__ */ L.jsxs("label", { children: [
          "Bildirim saati",
          /* @__PURE__ */ L.jsx("input", { name: "reminder_time", type: "time", defaultValue: "20:00", required: !0 })
        ] }),
        /* @__PURE__ */ L.jsxs("label", { children: [
          "Kanal",
          /* @__PURE__ */ L.jsxs("select", { name: "delivery_channel", defaultValue: "in_app", children: [
            /* @__PURE__ */ L.jsx("option", { value: "in_app", children: "Uygulama içi" }),
            /* @__PURE__ */ L.jsx("option", { value: "email", children: "E-posta" }),
            /* @__PURE__ */ L.jsx("option", { value: "push", children: "Push" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ L.jsxs("fieldset", { children: [
        /* @__PURE__ */ L.jsx("legend", { children: Ia("weekdays") }),
        ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"].map((ne, pe) => /* @__PURE__ */ L.jsxs("label", { children: [
          /* @__PURE__ */ L.jsx("input", { type: "checkbox", name: "excluded_weekdays", value: pe }),
          ne
        ] }, ne))
      ] }),
      A && /* @__PURE__ */ L.jsx("p", { role: "alert", className: "product-error", children: A }),
      /* @__PURE__ */ L.jsxs("div", { className: "product-actions", children: [
        /* @__PURE__ */ L.jsx("button", { type: "button", onClick: () => {
          f(null), p.current(null);
        }, children: Ia("cancel") }),
        /* @__PURE__ */ L.jsx("button", { className: "primary", disabled: o, children: o ? "Hazırlanıyor…" : "Planı oluştur" })
      ] })
    ] }) })
  ] });
}
function vh() {
  var E;
  const r = document.getElementById("pkm-dashboard-mount");
  let i = !1;
  const c = async () => {
    if (!(!r || i)) {
      i = !0;
      try {
        const { BentoReadingDashboard: R } = await import("./BentoReadingDashboard-DNWsA9Me.js");
        Bf.createRoot(r).render(/* @__PURE__ */ L.jsx(R, {}));
      } catch {
        i = !1, r.textContent = "Okuma paneli yüklenemedi. Lütfen tekrar deneyin.";
      }
    }
  };
  window.addEventListener("pkm-refresh", c), (E = document.getElementById("app")) != null && E.classList.contains("hidden") || c();
  const f = document.getElementById("product-ui-root");
  f && Bf.createRoot(f).render(/* @__PURE__ */ L.jsx(yh, { children: /* @__PURE__ */ L.jsx(Cv, {}) }));
  const o = document.getElementById("growth-hub-mount");
  let h = !1;
  const A = async () => {
    if (!(!o || h)) {
      h = !0;
      try {
        const { ProductGrowthHub: R } = await import("./ProductGrowthHub-ekqT1fV5.js");
        Bf.createRoot(o).render(/* @__PURE__ */ L.jsx(yh, { children: /* @__PURE__ */ L.jsx(R, {}) }));
      } catch {
        h = !1, o.textContent = "Okur merkezi yüklenemedi. Lütfen tekrar deneyin.";
      }
    }
  };
  window.addEventListener("growth-refresh", A);
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", vh) : vh();
export {
  Io as a,
  L as j,
  xa as r
};
