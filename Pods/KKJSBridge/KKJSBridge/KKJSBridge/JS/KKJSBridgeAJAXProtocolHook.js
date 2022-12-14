(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define('lib/fetch.js', factory) :
  (global = global || self, global.KKJSBridge = factory());
}(this, (function () { 'use strict';

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob:
      'FileReader' in self &&
      'Blob' in self &&
      (function() {
        try {
          new Blob();
          return true
        } catch (e) {
          return false
        }
      })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  };

  function isDataView(obj) {
    return obj && DataView.prototype.isPrototypeOf(obj)
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ];

    var isArrayBufferView =
      ArrayBuffer.isView ||
      function(obj) {
        return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
      };
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name);
    }
    if (/[^a-z0-9\-#$%&'*+.^_`|~!]/i.test(name) || name === '') {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value);
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift();
        return {done: value === undefined, value: value}
      }
    };

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      };
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {};

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value);
      }, this);
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1]);
      }, this);
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name]);
      }, this);
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name);
    value = normalizeValue(value);
    var oldValue = this.map[name];
    this.map[name] = oldValue ? oldValue + ', ' + value : value;
  };

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)];
  };

  Headers.prototype.get = function(name) {
    name = normalizeName(name);
    return this.has(name) ? this.map[name] : null
  };

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  };

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value);
  };

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this);
      }
    }
  };

  Headers.prototype.keys = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push(name);
    });
    return iteratorFor(items)
  };

  Headers.prototype.values = function() {
    var items = [];
    this.forEach(function(value) {
      items.push(value);
    });
    return iteratorFor(items)
  };

  Headers.prototype.entries = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push([name, value]);
    });
    return iteratorFor(items)
  };

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true;
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result);
      };
      reader.onerror = function() {
        reject(reader.error);
      };
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsArrayBuffer(blob);
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsText(blob);
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf);
    var chars = new Array(view.length);

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i]);
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength);
      view.set(new Uint8Array(buf));
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false;

    this._initBody = function(body) {
      /*
        fetch-mock wraps the Response object in an ES6 Proxy to
        provide useful test harness features such as flush. However, on
        ES5 browsers without fetch or Proxy support pollyfills must be used;
        the proxy-pollyfill is unable to proxy an attribute unless it exists
        on the object before the Proxy is created. This change ensures
        Response.bodyUsed exists on the instance, while maintaining the
        semantic of setting Request.bodyUsed in the constructor before
        _initBody is called.
      */
      this.bodyUsed = this.bodyUsed;
      this._bodyInit = body;
      if (!body) {
        this._bodyText = '';
      } else if (typeof body === 'string') {
        this._bodyText = body;
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body;
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body;
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString();
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer);
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer]);
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body);
      } else {
        this._bodyText = body = Object.prototype.toString.call(body);
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8');
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type);
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
        }
      }
    };

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this);
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      };

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      };
    }

    this.text = function() {
      var rejected = consumed(this);
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    };

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      };
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    };

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

  function normalizeMethod(method) {
    var upcased = method.toUpperCase();
    return methods.indexOf(upcased) > -1 ? upcased : method
  }

  function Request(input, options) {
    options = options || {};
    var body = options.body;

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url;
      this.credentials = input.credentials;
      if (!options.headers) {
        this.headers = new Headers(input.headers);
      }
      this.method = input.method;
      this.mode = input.mode;
      this.signal = input.signal;
      if (!body && input._bodyInit != null) {
        body = input._bodyInit;
        input.bodyUsed = true;
      }
    } else {
      this.url = String(input);
    }

    this.credentials = options.credentials || this.credentials || 'same-origin';
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers);
    }
    this.method = normalizeMethod(options.method || this.method || 'GET');
    this.mode = options.mode || this.mode || null;
    this.signal = options.signal || this.signal;
    this.referrer = null;

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body);
  }

  Request.prototype.clone = function() {
    return new Request(this, {body: this._bodyInit})
  };

  function decode(body) {
    var form = new FormData();
    body
      .trim()
      .split('&')
      .forEach(function(bytes) {
        if (bytes) {
          var split = bytes.split('=');
          var name = split.shift().replace(/\+/g, ' ');
          var value = split.join('=').replace(/\+/g, ' ');
          form.append(decodeURIComponent(name), decodeURIComponent(value));
        }
      });
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers();
    // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
    // https://tools.ietf.org/html/rfc7230#section-3.2
    var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
    preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':');
      var key = parts.shift().trim();
      if (key) {
        var value = parts.join(':').trim();
        headers.append(key, value);
      }
    });
    return headers
  }

  Body.call(Request.prototype);

  function Response(bodyInit, options) {
    if (!options) {
      options = {};
    }

    this.type = 'default';
    this.status = options.status === undefined ? 200 : options.status;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = 'statusText' in options ? options.statusText : '';
    this.headers = new Headers(options.headers);
    this.url = options.url || '';
    this._initBody(bodyInit);
  }

  Body.call(Response.prototype);

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  };

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''});
    response.type = 'error';
    return response
  };

  var redirectStatuses = [301, 302, 303, 307, 308];

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  };

  var DOMException = self.DOMException;
  try {
    new DOMException();
  } catch (err) {
    DOMException = function(message, name) {
      this.message = message;
      this.name = name;
      var error = Error(message);
      this.stack = error.stack;
    };
    DOMException.prototype = Object.create(Error.prototype);
    DOMException.prototype.constructor = DOMException;
  }

  function fetch(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init);

      if (request.signal && request.signal.aborted) {
        return reject(new DOMException('Aborted', 'AbortError'))
      }

      var xhr = new XMLHttpRequest();

      function abortXhr() {
        xhr.abort();
      }

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        };
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
        var body = 'response' in xhr ? xhr.response : xhr.responseText;
        setTimeout(function() {
          resolve(new Response(body, options));
        }, 0);
      };

      xhr.onerror = function() {
        setTimeout(function() {
          reject(new TypeError('Network request failed'));
        }, 0);
      };

      xhr.ontimeout = function() {
        setTimeout(function() {
          reject(new TypeError('Network request failed'));
        }, 0);
      };

      xhr.onabort = function() {
        setTimeout(function() {
          reject(new DOMException('Aborted', 'AbortError'));
        }, 0);
      };

      function fixUrl(url) {
        try {
          return url === '' && self.location.href ? self.location.href : url
        } catch (e) {
          return url
        }
      }

      xhr.open(request.method, fixUrl(request.url), true);

      if (request.credentials === 'include') {
        xhr.withCredentials = true;
      } else if (request.credentials === 'omit') {
        xhr.withCredentials = false;
      }

      if ('responseType' in xhr) {
        if (support.blob) {
          xhr.responseType = 'blob';
        } else if (
          support.arrayBuffer &&
          request.headers.get('Content-Type').indexOf('application/octet-stream') !== -1
        ) {
          xhr.responseType = 'arraybuffer';
        }
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value);
      });

      if (request.signal) {
        request.signal.addEventListener('abort', abortXhr);

        xhr.onreadystatechange = function() {
          // DONE (success or failure)
          if (xhr.readyState === 4) {
            request.signal.removeEventListener('abort', abortXhr);
          }
        };
      }

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
    })
  }

  fetch.polyfill = true;

  // ?????????
  var originHeaders = self.Headers;
  var originRequest = self.Request;
  var originResponse = self.Response;
  var originFetch = self.fetch;

  if (!self.fetch) {
    self.fetch = fetch;
    self.Headers = Headers;
    self.Request = Request;
    self.Response = Response;
  }

  function enableFetchHook(enable) {
    if (originFetch) { // ???????????????????????? fetch???????????? hook
      if (enable) {
        // ?????? fetch hook
        self.fetch = fetch;
        self.Headers = Headers;
        self.Request = Request;
        self.Response = Response;
      } else {
        // ?????? fetch hook
        self.fetch = originFetch;
        self.Headers = originHeaders;
        self.Request = originRequest;
        self.Response = originResponse;
      }
    }
  }

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation. All rights reserved.
  Licensed under the Apache License, Version 2.0 (the "License"); you may not use
  this file except in compliance with the License. You may obtain a copy of the
  License at http://www.apache.org/licenses/LICENSE-2.0

  THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
  WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
  MERCHANTABLITY OR NON-INFRINGEMENT.

  See the Apache Version 2.0 License for specific language governing permissions
  and limitations under the License.
  ***************************************************************************** */

  function __values(o) {
      var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
      if (m) return m.call(o);
      return {
          next: function () {
              if (o && i >= o.length) o = void 0;
              return { value: o && o[i++], done: !o };
          }
      };
  }

  var _KKJSBridgeFormData = /** @class */ (function () {
      function _KKJSBridgeFormData() {
      }
      /**
       * Hook FormData????????????????????? FormData ???????????? entries() ????????? api?????????????????? ajax send ????????????????????????????????????????????????
       * ???????????????????????? iOS ????????? Hook FormData ?????????
       */
      _KKJSBridgeFormData.setupHook = function () {
          var originAppend = window.FormData.prototype['append'];
          var originEntries = window.FormData.prototype['entries'];
          if (!originEntries) {
              window.FormData.prototype['append'] = function () {
                  if (!this._entries) {
                      this._entries = [];
                  }
                  this._entries.push(arguments);
                  return originAppend.apply(this, arguments);
              };
          }
      };
      /**
       * ??????????????????
       */
      _KKJSBridgeFormData.traversalEntries = function (formData, traversal) {
          var e_1, _a;
          if (formData._entries) { // ???????????? iOS ????????????????????? entries() ????????????????????????????????????
              for (var i = 0; i < formData._entries.length; i++) {
                  var pair = formData._entries[i];
                  var key = pair[0];
                  var value = pair[1];
                  var fileName = pair.length > 2 ? pair[2] : null;
                  if (traversal) {
                      traversal(key, value, fileName);
                  }
              }
          }
          else {
              try {
                  // JS ??? FormData ????????????????????????????????????
                  for (var _b = __values(formData.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                      var pair = _c.value;
                      var key = pair[0];
                      var value = pair[1];
                      if (traversal) {
                          traversal(key, value, null);
                      }
                  }
              }
              catch (e_1_1) { e_1 = { error: e_1_1 }; }
              finally {
                  try {
                      if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                  }
                  finally { if (e_1) throw e_1.error; }
              }
          }
      };
      return _KKJSBridgeFormData;
  }());

  /// <reference path="../../types/index.d.ts" />
  /**
   * KKJSBridge ??????
   */
  var KKJSBridgeUtil = /** @class */ (function () {
      function KKJSBridgeUtil() {
      }
      /**
       * ??? arraybuffer ?????? base64
       * @param arraybuffer
       */
      KKJSBridgeUtil.convertArrayBufferToBase64 = function (arraybuffer) {
          var uint8Array = new Uint8Array(arraybuffer);
          var charCode = "";
          var length = uint8Array.byteLength;
          for (var i = 0; i < length; i++) {
              charCode += String.fromCharCode(uint8Array[i]);
          }
          // ???????????????base64
          return window.btoa(charCode);
      };
      /**
       * ?????? form ????????? json ??????
       * @param formData
       * @param callback
       */
      KKJSBridgeUtil.convertFormDataToJson = function (formData, callback) {
          var allPromise = [];
          _KKJSBridgeFormData.traversalEntries(formData, function (key, value, fileName) {
              allPromise.push(KKJSBridgeUtil.convertSingleFormDataRecordToArray(key, value, fileName));
          });
          Promise.all(allPromise).then(function (formDatas) {
              var formDataJson = {};
              var formDataFileKeys = [];
              for (var i = 0; i < formDatas.length; i++) {
                  var singleKeyValue = formDatas[i];
                  // ???????????????????????????????????????????????????????????????????????? formDataFileKeys ???????????? native ???????????????
                  if (singleKeyValue.length > 1 && !(typeof singleKeyValue[1] == "string")) {
                      formDataFileKeys.push(singleKeyValue[0]);
                  }
              }
              formDataJson['fileKeys'] = formDataFileKeys;
              formDataJson['formData'] = formDatas;
              callback(formDataJson);
          }).catch(function (error) {
              console.log(error);
          });
      };
      /**
       * ?????????????????????????????????????????????
       * @param key
       * @param value
       * @param fileName
       */
      KKJSBridgeUtil.convertSingleFormDataRecordToArray = function (key, value, fileName) {
          return new Promise(function (resolve, reject) {
              var singleKeyValue = [];
              singleKeyValue.push(key);
              if (value instanceof File || value instanceof Blob) { // ????????????????????????
                  var reader = new FileReader();
                  reader.readAsDataURL(value);
                  reader.onload = function (ev) {
                      var base64 = ev.target.result;
                      var formDataFile = {
                          name: fileName ? fileName : (value instanceof File ? value.name : ''),
                          lastModified: value instanceof File ? value.lastModified : 0,
                          size: value.size,
                          type: value.type,
                          data: base64
                      };
                      singleKeyValue.push(formDataFile);
                      resolve(singleKeyValue);
                      return null;
                  };
                  reader.onerror = function (ev) {
                      reject(Error("formdata ??????????????????????????????"));
                      return null;
                  };
              }
              else {
                  singleKeyValue.push(value);
                  resolve(singleKeyValue);
              }
          });
      };
      /**
       * ???????????????????????????????????? base64??????????????? json ??????
       * @param file
       */
      KKJSBridgeUtil.convertFileToJson = function (file) {
          return new Promise(function (resolve, reject) {
              var reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = function (ev) {
                  var base64 = ev.target.result;
                  var formDataFile = {
                      name: file instanceof File ? file.name : '',
                      lastModified: file instanceof File ? file.lastModified : 0,
                      size: file.size,
                      type: file.type,
                      data: base64
                  };
                  resolve(formDataFile);
                  return null;
              };
              reader.onerror = function (ev) {
                  reject(Error("formdata ??????????????????????????????"));
                  return null;
              };
          });
      };
      return KKJSBridgeUtil;
  }());
  /**
   * ?????? iframe ??????
   */
  var KKJSBridgeIframe = /** @class */ (function () {
      function KKJSBridgeIframe() {
      }
      /**
       * ????????????
       * @param messageString
       */
      KKJSBridgeIframe.dispatchMessage = function (messageString) {
          // ????????? iframe ?????????
          var iframes = document.querySelectorAll("iframe");
          if (iframes) {
              var len = iframes.length;
              for (var i = 0; i < len; i++) {
                  var win = iframes[i].contentWindow;
                  win.postMessage(messageString, '*');
              }
          }
      };
      /**
       * ????????????????????????
       */
      KKJSBridgeIframe.addMessageListener = function () {
          // iframe ?????????????????? window ?????????
          window.addEventListener('message', function (e) {
              var data = e.data;
              if (typeof data == "string") {
                  var str = data;
                  if (str.indexOf("messageType") != -1) {
                      window.KKJSBridge._handleMessageFromNative(str);
                  }
              }
          });
      };
      /**
       * ?????? ajax ??????????????????
       */
      KKJSBridgeIframe.addAjaxMessageListener = function () {
          // iframe ?????????????????? window ajax ????????????
          window.addEventListener('message', function (e) {
              var data = e.data;
              if (typeof data == "string") {
                  var str = data;
                  if (str.indexOf("ajaxType") != -1) {
                      window._KKJSBridgeXHR.setProperties(str);
                  }
              }
          });
      };
      /**
       * ??? iframe ???????????? app ???????????????
       */
      KKJSBridgeIframe.setupHook = function () {
          // ?????? iframe ?????? ??? sandbox ??????
          document.addEventListener('DOMContentLoaded', function () {
              var iframes = document.querySelectorAll("iframe");
              if (iframes) {
                  var len = iframes.length;
                  for (var i = 0; i < len; i++) {
                      var iframe = iframes[i];
                      if (iframe.getAttribute('sandbox') && iframe.getAttribute('sandbox').indexOf('allow-scripts') == -1) {
                          iframe.setAttribute('sandbox', iframe.getAttribute('sandbox') + ' allow-scripts');
                      }
                  }
              }
          });
          // ?????? iframe ??????????????? sandbox ??????
          var originalCreateElement = document.createElement;
          document.createElement = function (tag) {
              var element = originalCreateElement.call(document, tag);
              if (tag.toLowerCase() === 'iframe') {
                  try {
                      var iframeSandbox = Object.getOwnPropertyDescriptor(window.HTMLIFrameElement, 'sandbox') ||
                          Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'sandbox');
                      if (iframeSandbox && iframeSandbox.configurable) {
                          Object.defineProperty(element, 'sandbox', {
                              configurable: true,
                              enumerable: true,
                              get: function () {
                                  return iframeSandbox.get.call(element);
                              },
                              set: function (val) {
                                  if (val.indexOf('allow-scripts') == -1) {
                                      val = val + ' allow-scripts';
                                  }
                                  iframeSandbox.set.call(element, val);
                              }
                          });
                      }
                  }
                  catch (e) {
                      console.log('this browser does not support reconfigure iframe sandbox property', e);
                  }
              }
              return element;
          };
      };
      return KKJSBridgeIframe;
  }());

  /// <reference path="../../types/index.d.ts" />
  /**
   * ????????? native ???????????????
   */
  var KKJSBridge = /** @class */ (function () {
      function KKJSBridge() {
          this.uniqueId = 1;
          this.callbackCache = {};
          this.eventCallbackCache = {};
      }
      /**
       * ?????? Natvie ??????
       * @param module ??????
       * @param method ??????
       * @param data ??????
       * @param callback ????????????
       */
      KKJSBridge.prototype.callNative = function (module, method, data, callback) {
          var message = {
              module: module || 'default',
              method: method,
              data: data,
              callbackId: null
          };
          if (callback) {
              // ?????? callbackId
              var callbackId = 'cb_' + message.module + '_' + method + '_' + (this.uniqueId++) + '_' + new Date().getTime();
              // ?????? callback???????????? Native ??????????????????????????? H5
              this.callbackCache[callbackId] = callback;
              // ?????? callbackId ??????
              message.callbackId = callbackId;
          }
          // ??????????????? Native
          window.webkit.messageHandlers.KKJSBridgeMessage.postMessage(message);
      };
      /**
       * ?????????????????? Native ?????????
       * @param callbackMessage ????????????
       */
      KKJSBridge.prototype._handleMessageFromNative = function (messageString) {
          var callbackMessage = JSON.parse(messageString);
          if (callbackMessage.messageType === "callback" /* Callback */) { // ????????????
              var callback = this.callbackCache[callbackMessage.callbackId];
              if (callback) { // ?????? callback ??????????????????????????? callback
                  callback(callbackMessage.data);
                  this.callbackCache[callbackMessage.callbackId] = null;
                  delete this.callbackCache[callbackMessage.callbackId];
              }
          }
          else if (callbackMessage.messageType === "event" /* Event */) { // ????????????
              // ????????????????????????
              var obsevers = this.eventCallbackCache[callbackMessage.eventName];
              if (obsevers) {
                  for (var i = 0; i < obsevers.length; i++) {
                      var eventCallback = obsevers[i];
                      if (eventCallback) {
                          eventCallback(callbackMessage.data);
                      }
                  }
              }
          }
          // ????????? iframe ?????????
          KKJSBridgeIframe.dispatchMessage(messageString);
      };
      /**
       * ??????????????????
       * @param module ??????
       * @param method ??????
       * @param data ??????
       * @param callback ????????????
       */
      KKJSBridge.prototype.call = function (module, method, data, callback) {
          this.callNative(module, method, data, callback);
      };
      /**
       * ??????????????????
       * @param module ??????
       * @param method ??????
       * @param data ??????
       */
      KKJSBridge.prototype.syncCall = function (module, method, data) {
          function call() {
              var message = {
                  module: module || 'default',
                  method: method,
                  data: data,
              };
              var messageString = JSON.stringify(message);
              var response = window.prompt("KKJSBridge", messageString);
              return response ? JSON.parse(response) : null;
          }
          try {
              return call();
          }
          catch (e) {
              // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onbeforeunload
              console.log('window.prompt will happen error when beforeunload event triggered', e);
              return null;
          }
      };
      /**
       * ????????????
       * @param eventName ????????????
       * @param callback ????????????
       */
      KKJSBridge.prototype.on = function (eventName, callback) {
          // ????????????????????????????????????
          var obsevers = this.eventCallbackCache[eventName];
          if (obsevers) {
              obsevers.push(callback);
          }
          else {
              obsevers = [callback];
              this.eventCallbackCache[eventName] = obsevers;
          }
      };
      /**
       * ??????????????????
       * @param eventName ????????????
       */
      KKJSBridge.prototype.off = function (eventName) {
          var obsevers = this.eventCallbackCache[eventName];
          if (obsevers && obsevers.length > 0) {
              obsevers.splice(0, obsevers.length);
          }
      };
      return KKJSBridge;
  }());

  /// <reference path="../../types/index.d.ts" />
  /**
   * hook document.cookie
   */
  var _KKJSBridgeCOOKIE = /** @class */ (function () {
      function _KKJSBridgeCOOKIE() {
      }
      _KKJSBridgeCOOKIE.ready = function () {
          window.KKJSBridge.call(_KKJSBridgeCOOKIE.moduleName, 'bridgeReady', {});
      };
      // ?????????????????????
      _KKJSBridgeCOOKIE.moduleName = 'cookie';
      /**
       * ?????????????????? cookie ??????????????? cookie hook
       */
      _KKJSBridgeCOOKIE.setupHook = function () {
          try {
              var cookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
                  Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
              if (cookieDesc && cookieDesc.configurable) {
                  Object.defineProperty(document, 'cookie', {
                      configurable: true,
                      enumerable: true,
                      get: function () {
                          // console.log('getCookie');
                          // ?????????????????? ajax hook ??? cookie get hook??????????????? document.cookie ????????????????????? JSBridge ????????? NSHTTPCookieStorage ????????? cookie???
                          // ???????????? ajax hook ???????????????????????? WKWebView ?????????????????? ajax ???????????? Set-Cookie ??????????????? WKCookie ???????????????????????????????????? WKCookie ????????? cookie ??????
                          if (window.KKJSBridgeConfig.ajaxHook && window.KKJSBridgeConfig.cookieGetHook) {
                              var cookieJson = window.KKJSBridge.syncCall(_KKJSBridgeCOOKIE.moduleName, 'cookie', {
                                  "url": window.location.href
                              });
                              return cookieJson.cookie;
                          }
                          return cookieDesc.get.call(document);
                      },
                      set: function (val) {
                          // console.log('setCookie');
                          if (window.KKJSBridgeConfig.cookieSetHook) { // ???????????? cookie set hook??????????????? cookie ????????? Native
                              window.KKJSBridge.call(_KKJSBridgeCOOKIE.moduleName, 'setCookie', {
                                  "cookie": val
                              });
                          }
                          cookieDesc.set.call(document, val);
                      }
                  });
              }
          }
          catch (e) {
              console.log('this browser does not support reconfigure document.cookie property', e);
          }
      };
      return _KKJSBridgeCOOKIE;
  }());

  /// <reference path="../../types/index.d.ts" />
  /**
   * AJAX ????????????
   */
  var _KKJSBridgeXHR = /** @class */ (function () {
      function _KKJSBridgeXHR() {
      }
      // ?????????????????????
      _KKJSBridgeXHR.moduleName = 'ajax';
      _KKJSBridgeXHR.globalId = Math.floor(Math.random() * 100000);
      _KKJSBridgeXHR.callbackCache = [];
      /**
       * ?????? ajax ????????????id
       */
      _KKJSBridgeXHR.generateXHRRequestId = function () {
          return (new Date).getTime() + "" + _KKJSBridgeXHR.globalId++; // ????????? + ?????????????????????id???????????????id
      };
      /**
       * ????????????????????? action
       */
      _KKJSBridgeXHR.generateNewActionForForm = function (form, requestId) {
          var orignAction = form.action;
          form.action = _KKJSBridgeXHR.generateNewUrlWithRequestId(orignAction, requestId);
      };
      /**
       * ?????? requestId ???????????? url
       */
      _KKJSBridgeXHR.generateNewUrlWithRequestId = function (url, requestId) {
          var orignAction = url;
          // ?????? a ??????????????????????????? action
          var aTag = document.createElement("a");
          aTag.href = orignAction;
          var search = aTag.search ? aTag.search : "";
          var hash = aTag.hash ? aTag.hash : "";
          if (/KKJSBridge-RequestId/.test(orignAction)) { // ?????????????????? requestId
              aTag.search = aTag.search.replace(/KKJSBridge-RequestId=(\d+)/, "KKJSBridge-RequestId=" + requestId);
          }
          else if (aTag.search && aTag.search.length > 0) {
              var s = aTag.search;
              if (/KKJSBridge-RequestId/.test(s)) { // ?????????????????? requestId
                  aTag.search = s.replace(/KKJSBridge-RequestId=(\d+)/, "KKJSBridge-RequestId=" + requestId);
              }
              else {
                  aTag.search = s + "&KKJSBridge-RequestId=" + requestId;
              }
          }
          else {
              aTag.search = "?KKJSBridge-RequestId=" + requestId;
          }
          url = orignAction.replace(search, "").replace(hash, "");
          if ("#" === url.trim()) {
              url = "";
          }
          var newAction = url + aTag.search + aTag.hash;
          return newAction;
      };
      /**
       * ??? open url ??????????????? id ?????? url
       */
      _KKJSBridgeXHR.generateNewOpenUrlWithRequestId = function (url, requestId) {
          var getOpenUrlReuestId = function (requestId) {
              return "^^^^" + requestId + "^^^^";
          };
          var openUrlReuestReg = /\^\^\^\^(\d+)\^\^\^\^/;
          // ?????? a ??????????????????????????? action
          var aTag = document.createElement("a");
          aTag.href = url;
          var hash = aTag.hash ? aTag.hash : "";
          if (openUrlReuestReg.test(aTag.hash)) {
              aTag.hash = aTag.hash.replace(openUrlReuestReg, getOpenUrlReuestId(requestId));
          }
          else if (aTag.hash && aTag.hash.length > 0) {
              aTag.hash = aTag.hash + getOpenUrlReuestId(requestId);
          }
          else {
              aTag.hash = getOpenUrlReuestId(requestId);
          }
          url = url.replace(hash, "");
          if ("#" === url.trim()) {
              url = "";
          }
          var newUrl = url + aTag.hash;
          return newUrl;
      };
      /**
       * ????????????????????? http ??????????????? url: blob:https:// ????????????????????? XMLHTTPRequest????????????????????????
       */
      _KKJSBridgeXHR.isNonNormalHttpRequest = function (url, httpMethod) {
          var pattern = /^((http|https):\/\/)/;
          var isNonNormalRequest = !pattern.test(url) && httpMethod === "GET";
          return isNonNormalRequest;
      };
      /**
       * ?????? body ??? native ???????????????
       * @param xhr
       * @param originMethod
       * @param originArguments
       * @param body
       */
      _KKJSBridgeXHR.sendBodyToNativeForCache = function (targetType, target, originMethod, originArguments, request, requestAsync) {
          /*
              ajax ???????????????????????????????????????????????? Blob ??? FormData ?????????
              ???????????????????????????????????? FileReaderSync ?????????????????????????????? workers ????????????
              ????????????????????????????????? I/O ????????????????????????????????????
              https://developer.mozilla.org/zh-CN/docs/Web/API/FileReaderSync
          */
          if (requestAsync === void 0) { requestAsync = true; }
          var requestId = target.requestId;
          var cacheCallback = {
              requestId: requestId,
              callback: function () {
                  // if (targetType === "AJAX") {// ajax
                  //   // ????????????????????????????????????????????? native ??????????????????????????? body
                  //   target.setRequestHeader("KKJSBridge-RequestId", requestId);
                  // }
                  if (targetType === "FORM") { // ?????? submit
                      // ?????????????????? action?????? action ?????? requestId
                      _KKJSBridgeXHR.generateNewActionForForm(target, requestId);
                  }
                  // ???????????? send ?????? 
                  return originMethod.apply(target, originArguments);
              }
          };
          if (requestAsync) { // ????????????
              // ?????? callbcak
              _KKJSBridgeXHR.callbackCache[requestId] = cacheCallback;
              // ?????? body ????????? native
              window.KKJSBridge.call(_KKJSBridgeXHR.moduleName, 'cacheAJAXBody', request, function (message) {
                  // ?????? native ???????????????????????????
                  var callbackFromNative = message;
                  var requestId = callbackFromNative.requestId;
                  // ???????????? id??????????????? send ???????????????
                  if (_KKJSBridgeXHR.callbackCache[requestId]) {
                      var callbackFromNative_1 = _KKJSBridgeXHR.callbackCache[requestId];
                      if (callbackFromNative_1 && callbackFromNative_1.callback && typeof callbackFromNative_1.callback == "function") {
                          callbackFromNative_1.callback();
                      }
                      delete _KKJSBridgeXHR.callbackCache[requestId];
                  }
              });
              return;
          }
          // ????????????
          // ?????? body ????????? native
          window.KKJSBridge.syncCall(_KKJSBridgeXHR.moduleName, 'cacheAJAXBody', request);
          // ????????????????????????????????? send ??????
          cacheCallback.callback();
      };
      /**
       * ?????? AJAX Proxy
       */
      _KKJSBridgeXHR.setupHook = function () {
          /**
           * ??? hook open/send ??????
           */
          var originOpen = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = function (method, url, async, username, password) {
              var args = [].slice.call(arguments);
              var xhr = this;
              // ??????????????????id
              xhr.requestId = _KKJSBridgeXHR.generateXHRRequestId();
              xhr.requestUrl = url;
              xhr.requestHref = document.location.href;
              xhr.requestMethod = method;
              xhr.requestAsync = async;
              if (_KKJSBridgeXHR.isNonNormalHttpRequest(url, method)) { // ?????????????????????????????????????????? open
                  return originOpen.apply(xhr, args);
              }
              if (!window.KKJSBridgeConfig.ajaxHook) { // ?????????????????? ajax hook?????????????????? open
                  return originOpen.apply(xhr, args);
              }
              // ???????????? url
              args[1] = _KKJSBridgeXHR.generateNewUrlWithRequestId(url, xhr.requestId);
              originOpen.apply(xhr, args);
          };
          var originSend = XMLHttpRequest.prototype.send;
          XMLHttpRequest.prototype.send = function (body) {
              var args = [].slice.call(arguments);
              var xhr = this;
              var request = {
                  requestId: xhr.requestId,
                  requestHref: xhr.requestHref,
                  requestUrl: xhr.requestUrl,
                  bodyType: "String",
                  value: null
              };
              if (_KKJSBridgeXHR.isNonNormalHttpRequest(xhr.requestUrl, xhr.requestMethod)) { // ?????????????????????????????????????????? send
                  return originSend.apply(xhr, args);
              }
              if (!window.KKJSBridgeConfig.ajaxHook) { // ?????????????????? ajax hook?????????????????? send
                  return originSend.apply(xhr, args);
              }
              if (!body) { // ?????? body??????????????? send
                  return originSend.apply(xhr, args);
              }
              else if (body instanceof ArrayBuffer) { // ????????? ArrayBuffer????????? base64
                  request.bodyType = "ArrayBuffer";
                  request.value = KKJSBridgeUtil.convertArrayBufferToBase64(body);
              }
              else if (body instanceof Blob) { // ????????? Blob????????? base64
                  request.bodyType = "Blob";
                  var fileReader = new FileReader();
                  fileReader.onload = function (ev) {
                      var base64 = ev.target.result;
                      request.value = base64;
                      _KKJSBridgeXHR.sendBodyToNativeForCache("AJAX", xhr, originSend, args, request);
                  };
                  fileReader.readAsDataURL(body);
                  return;
              }
              else if (body instanceof FormData) { // ???????????????
                  request.bodyType = "FormData";
                  request.formEnctype = "multipart/form-data";
                  KKJSBridgeUtil.convertFormDataToJson(body, function (json) {
                      request.value = json;
                      _KKJSBridgeXHR.sendBodyToNativeForCache("AJAX", xhr, originSend, args, request);
                  });
                  return;
              }
              else { // ????????????????????????json
                  request.bodyType = "String";
                  request.value = body;
              }
              // ????????? native ????????????
              _KKJSBridgeXHR.sendBodyToNativeForCache("AJAX", xhr, originSend, args, request, xhr.requestAsync);
          };
          /**
           * hook form submit ??????
           */
          var originSubmit = HTMLFormElement.prototype.submit;
          HTMLFormElement.prototype.submit = function () {
              var args = [].slice.call(arguments);
              var form = this;
              form.requestId = _KKJSBridgeXHR.generateXHRRequestId();
              form.requestUrl = form.action;
              form.requestHref = document.location.href;
              var request = {
                  requestId: form.requestId,
                  requestHref: form.requestHref,
                  requestUrl: form.requestUrl,
                  bodyType: "FormData",
                  formEnctype: form.enctype,
                  value: null
              };
              if (!window.KKJSBridgeConfig.ajaxHook) { // ?????????????????? ajax hook?????????????????? submit
                  return originSubmit.apply(form, args);
              }
              var action = form.action;
              if (!action) { // ?????? action ?????????????????????????????? submit
                  return originSubmit.apply(form, args);
              }
              var formData = new FormData(form);
              KKJSBridgeUtil.convertFormDataToJson(formData, function (json) {
                  request.value = json;
                  _KKJSBridgeXHR.sendBodyToNativeForCache("FORM", form, originSubmit, args, request);
              });
          };
      };
      return _KKJSBridgeXHR;
  }());

  /// <reference path="../types/index.d.ts" />
  var init = function () {
      if (window.KKJSBridge) {
          return;
      }
      /**
       * KKJSBridge ??????
       */
      var KKJSBridgeConfig = /** @class */ (function () {
          function KKJSBridgeConfig() {
          }
          KKJSBridgeConfig.ajaxHook = false;
          KKJSBridgeConfig.cookieSetHook = true;
          KKJSBridgeConfig.cookieGetHook = true;
          /**
           * ?????? ajax hook
           */
          KKJSBridgeConfig.enableAjaxHook = function (enable) {
              if (enable) {
                  KKJSBridgeConfig.ajaxHook = true;
                  enableFetchHook(true);
              }
              else {
                  KKJSBridgeConfig.ajaxHook = false;
                  enableFetchHook(false);
              }
          };
          /**
           * ?????? cookie set hook
           */
          KKJSBridgeConfig.enableCookieSetHook = function (enable) {
              KKJSBridgeConfig.cookieSetHook = enable;
          };
          /**
           * ?????? cookie get hook
           */
          KKJSBridgeConfig.enableCookieGetHook = function (enable) {
              KKJSBridgeConfig.cookieGetHook = enable;
          };
          /**
           * bridge Ready
           */
          KKJSBridgeConfig.bridgeReady = function () {
              _KKJSBridgeCOOKIE.ready();
              // ?????? H5 ?????? KKJSBridge ?????? ready
              var KKJSBridgeReadyEvent = document.createEvent("Events");
              KKJSBridgeReadyEvent.initEvent("KKJSBridgeReady");
              document.dispatchEvent(KKJSBridgeReadyEvent);
          };
          return KKJSBridgeConfig;
      }());
      // ????????? KKJSBridge ?????????????????????
      window.KKJSBridge = new KKJSBridge();
      // ?????? KKJSBridgeConfig ???????????????
      window.KKJSBridgeConfig = KKJSBridgeConfig;
      // ?????? _KKJSBridgeXHR ???????????????
      window._KKJSBridgeXHR = _KKJSBridgeXHR;
      // iframe ?????????????????? window ?????????
      KKJSBridgeIframe.addMessageListener();
      // ?????? iframe hook??? ?????? iframe ??? sandbox ??????
      KKJSBridgeIframe.setupHook();
      // ?????? formData hook
      _KKJSBridgeFormData.setupHook();
      // ?????? cookie hook
      _KKJSBridgeCOOKIE.setupHook();
      // ?????? ajax hook
      _KKJSBridgeXHR.setupHook();
      // JSBridge ????????????
      window.KKJSBridgeConfig.bridgeReady();
  };
  init();
  var index = window.KKJSBridge;

  return index;

})));
