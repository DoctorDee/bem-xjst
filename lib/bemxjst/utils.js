var amp = '&amp;';
var lt = '&lt;';
var gt = '&gt;';
var quot = '&quot;';
var singleQuot = '&#39;';
var grave = '&#96;';

var matchXmlRegExp = /[&<>]/;

exports.xmlEscape = function(string) {
  var str = '' + string;
  var match = matchXmlRegExp.exec(str);

  if (!match)
    return str;

  var escape;
  var html = '';
  var index = 0;
  var lastIndex = 0;

  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 38: // &
        escape = amp;
        break;
      case 60: // <
        escape = lt;
        break;
      case 62: // >
        escape = gt;
        break;
      default:
        continue;
    }

    if (lastIndex !== index)
      html += str.substring(lastIndex, index);

    lastIndex = index + 1;
    html += escape;
  }

  return lastIndex !== index ?
    html + str.substring(lastIndex, index) :
    html;
};

var matchAttrRegExp = /[`"&]/;

exports.attrEscape = function(string) {
  var str = '' + string;
  var match = matchAttrRegExp.exec(str);

  if (!match)
    return str;

  var escape;
  var html = '';
  var index = 0;
  var lastIndex = 0;

  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34: // "
        escape = quot;
        break;
      case 38: // &
        escape = amp;
        break;
      // XSS using accent grave in IE: https://html5sec.org/#59
      case 96: // `
        escape = grave;
        break;
      default:
        continue;
    }

    if (lastIndex !== index)
      html += str.substring(lastIndex, index);

    lastIndex = index + 1;
    html += escape;
  }

  return lastIndex !== index ?
    html + str.substring(lastIndex, index) :
    html;
};

var matchJsAttrRegExp = /['&]/;

exports.jsAttrEscape = function(string) {
  var str = '' + string;
  var match = matchJsAttrRegExp.exec(str);

  if (!match)
    return str;

  var escape;
  var html = '';
  var index = 0;
  var lastIndex = 0;

  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 38: // &
        escape = amp;
        break;
      case 39: // '
        escape = singleQuot;
        break;
      default:
        continue;
    }

    if (lastIndex !== index)
      html += str.substring(lastIndex, index);

    lastIndex = index + 1;
    html += escape;
  }

  return lastIndex !== index ?
    html + str.substring(lastIndex, index) :
    html;
};

exports.extend = function extend(o1, o2) {
  if (!o1 || !o2)
    return o1 || o2;

  var res = {};
  var n;

  for (n in o1)
    if (o1.hasOwnProperty(n))
      res[n] = o1[n];
  for (n in o2)
    if (o2.hasOwnProperty(n))
      res[n] = o2[n];
  return res;
};

var SHORT_TAGS = { // хэш для быстрого определения, является ли тэг коротким
  area: 1, base: 1, br: 1, col: 1, command: 1, embed: 1, hr: 1, img: 1,
  input: 1, keygen: 1, link: 1, meta: 1, param: 1, source: 1, wbr: 1
};

exports.isShortTag = function isShortTag(t) {
  return SHORT_TAGS.hasOwnProperty(t);
};

exports.isSimple = function isSimple(obj) {
  if (!obj || obj === true) return true;
  if (!obj.block &&
      !obj.elem &&
      !obj.tag &&
      !obj.cls &&
      !obj.attrs &&
      obj.hasOwnProperty('html') &&
      isSimple(obj.html))
    return true;
  return typeof obj === 'string' || typeof obj === 'number';
};

exports.isObj = function isObj(val) {
  return val && typeof val === 'object' && !Array.isArray(val) &&
    val !== null;
};

var uniqCount = 0;
var uniqId = +new Date();
var uniqExpando = '__' + uniqId;
var uniqPrefix = 'uniq' + uniqId;

function getUniq() {
  return uniqPrefix + (++uniqCount);
}
exports.getUniq = getUniq;

exports.identify = function identify(obj, onlyGet) {
  if (!obj)
    return getUniq();
  if (onlyGet || obj[uniqExpando])
    return obj[uniqExpando];

  var u = getUniq();
  obj[uniqExpando] = u;
  return u;
};

exports.fnToString = function fnToString(code) {
  // It is fine to compile without templates at first
  if (!code)
    return '';

  if (typeof code === 'function') {
    // Examples:
    //   function () { … }
    //   function name() { … }
    //   function (a, b) { … }
    //   function name(a, b) { … }
    var regularFunction = /^function\s*[^{]+{|}$/g;

    // Examples:
    //   () => { … }
    //   (a, b) => { … }
    //   _ => { … }
    var arrowFunction = /^(_|\(\w|[^=>]+\))\s=>\s{|}$/g;

    code = code.toString();
    code = code.replace(
      code.indexOf('function') === 0 ? regularFunction : arrowFunction,
    '');
  }

  return code;
};
