(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":3,"ieee754":4}],4:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],5:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],6:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],7:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":5,"./encode":6}],8:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

if (typeof module !== 'undefined') {
  module.exports = Emitter;
}

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  function on() {
    this.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks['$' + event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks['$' + event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }

  // Remove event specific arrays for event types that no
  // one is subscribed for to avoid memory leak.
  if (callbacks.length === 0) {
    delete this._callbacks['$' + event];
  }

  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};

  var args = new Array(arguments.length - 1)
    , callbacks = this._callbacks['$' + event];

  for (var i = 1; i < arguments.length; i++) {
    args[i - 1] = arguments[i];
  }

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks['$' + event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],9:[function(require,module,exports){
module.exports = stringify
stringify.default = stringify
stringify.stable = deterministicStringify
stringify.stableStringify = deterministicStringify

var LIMIT_REPLACE_NODE = '[...]'
var CIRCULAR_REPLACE_NODE = '[Circular]'

var arr = []
var replacerStack = []

function defaultOptions () {
  return {
    depthLimit: Number.MAX_SAFE_INTEGER,
    edgesLimit: Number.MAX_SAFE_INTEGER
  }
}

// Regular stringify
function stringify (obj, replacer, spacer, options) {
  if (typeof options === 'undefined') {
    options = defaultOptions()
  }

  decirc(obj, '', 0, [], undefined, 0, options)
  var res
  try {
    if (replacerStack.length === 0) {
      res = JSON.stringify(obj, replacer, spacer)
    } else {
      res = JSON.stringify(obj, replaceGetterValues(replacer), spacer)
    }
  } catch (_) {
    return JSON.stringify('[unable to serialize, circular reference is too complex to analyze]')
  } finally {
    while (arr.length !== 0) {
      var part = arr.pop()
      if (part.length === 4) {
        Object.defineProperty(part[0], part[1], part[3])
      } else {
        part[0][part[1]] = part[2]
      }
    }
  }
  return res
}

function setReplace (replace, val, k, parent) {
  var propertyDescriptor = Object.getOwnPropertyDescriptor(parent, k)
  if (propertyDescriptor.get !== undefined) {
    if (propertyDescriptor.configurable) {
      Object.defineProperty(parent, k, { value: replace })
      arr.push([parent, k, val, propertyDescriptor])
    } else {
      replacerStack.push([val, k, replace])
    }
  } else {
    parent[k] = replace
    arr.push([parent, k, val])
  }
}

function decirc (val, k, edgeIndex, stack, parent, depth, options) {
  depth += 1
  var i
  if (typeof val === 'object' && val !== null) {
    for (i = 0; i < stack.length; i++) {
      if (stack[i] === val) {
        setReplace(CIRCULAR_REPLACE_NODE, val, k, parent)
        return
      }
    }

    if (
      typeof options.depthLimit !== 'undefined' &&
      depth > options.depthLimit
    ) {
      setReplace(LIMIT_REPLACE_NODE, val, k, parent)
      return
    }

    if (
      typeof options.edgesLimit !== 'undefined' &&
      edgeIndex + 1 > options.edgesLimit
    ) {
      setReplace(LIMIT_REPLACE_NODE, val, k, parent)
      return
    }

    stack.push(val)
    // Optimize for Arrays. Big arrays could kill the performance otherwise!
    if (Array.isArray(val)) {
      for (i = 0; i < val.length; i++) {
        decirc(val[i], i, i, stack, val, depth, options)
      }
    } else {
      var keys = Object.keys(val)
      for (i = 0; i < keys.length; i++) {
        var key = keys[i]
        decirc(val[key], key, i, stack, val, depth, options)
      }
    }
    stack.pop()
  }
}

// Stable-stringify
function compareFunction (a, b) {
  if (a < b) {
    return -1
  }
  if (a > b) {
    return 1
  }
  return 0
}

function deterministicStringify (obj, replacer, spacer, options) {
  if (typeof options === 'undefined') {
    options = defaultOptions()
  }

  var tmp = deterministicDecirc(obj, '', 0, [], undefined, 0, options) || obj
  var res
  try {
    if (replacerStack.length === 0) {
      res = JSON.stringify(tmp, replacer, spacer)
    } else {
      res = JSON.stringify(tmp, replaceGetterValues(replacer), spacer)
    }
  } catch (_) {
    return JSON.stringify('[unable to serialize, circular reference is too complex to analyze]')
  } finally {
    // Ensure that we restore the object as it was.
    while (arr.length !== 0) {
      var part = arr.pop()
      if (part.length === 4) {
        Object.defineProperty(part[0], part[1], part[3])
      } else {
        part[0][part[1]] = part[2]
      }
    }
  }
  return res
}

function deterministicDecirc (val, k, edgeIndex, stack, parent, depth, options) {
  depth += 1
  var i
  if (typeof val === 'object' && val !== null) {
    for (i = 0; i < stack.length; i++) {
      if (stack[i] === val) {
        setReplace(CIRCULAR_REPLACE_NODE, val, k, parent)
        return
      }
    }
    try {
      if (typeof val.toJSON === 'function') {
        return
      }
    } catch (_) {
      return
    }

    if (
      typeof options.depthLimit !== 'undefined' &&
      depth > options.depthLimit
    ) {
      setReplace(LIMIT_REPLACE_NODE, val, k, parent)
      return
    }

    if (
      typeof options.edgesLimit !== 'undefined' &&
      edgeIndex + 1 > options.edgesLimit
    ) {
      setReplace(LIMIT_REPLACE_NODE, val, k, parent)
      return
    }

    stack.push(val)
    // Optimize for Arrays. Big arrays could kill the performance otherwise!
    if (Array.isArray(val)) {
      for (i = 0; i < val.length; i++) {
        deterministicDecirc(val[i], i, i, stack, val, depth, options)
      }
    } else {
      // Create a temporary object in the required way
      var tmp = {}
      var keys = Object.keys(val).sort(compareFunction)
      for (i = 0; i < keys.length; i++) {
        var key = keys[i]
        deterministicDecirc(val[key], key, i, stack, val, depth, options)
        tmp[key] = val[key]
      }
      if (typeof parent !== 'undefined') {
        arr.push([parent, k, val])
        parent[k] = tmp
      } else {
        return tmp
      }
    }
    stack.pop()
  }
}

// wraps replacer function to handle values we couldn't replace
// and mark them as replaced value
function replaceGetterValues (replacer) {
  replacer =
    typeof replacer !== 'undefined'
      ? replacer
      : function (k, v) {
        return v
      }
  return function (key, val) {
    if (replacerStack.length > 0) {
      for (var i = 0; i < replacerStack.length; i++) {
        var part = replacerStack[i]
        if (part[1] === key && part[0] === val) {
          val = part[2]
          replacerStack.splice(i, 1)
          break
        }
      }
    }
    return replacer.call(this, key, val)
  }
}

},{}],10:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _superagent = _interopRequireDefault(require("superagent"));

var _querystring = _interopRequireDefault(require("querystring"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
* @module ApiClient
* @version 1.2.16
*/

/**
* Manages low level client-server communications, parameter marshalling, etc. There should not be any need for an
* application to use this class directly - the *Api and model classes provide the public API for the service. The
* contents of this file should be regarded as internal but are documented for completeness.
* @alias module:ApiClient
* @class
*/
var ApiClient = /*#__PURE__*/function () {
  function ApiClient() {
    _classCallCheck(this, ApiClient);

    /**
     * The base URL against which to resolve every API call's (relative) path.
     * @type {String}
     * @default https://finnhub.io/api/v1
     */
    this.basePath = 'https://finnhub.io/api/v1'.replace(/\/+$/, '');
    /**
     * The authentication methods to be included for all API calls.
     * @type {Array.<String>}
     */

    this.authentications = {
      'api_key': {
        type: 'apiKey',
        'in': 'query',
        name: 'token'
      }
    };
    /**
     * The default HTTP headers to be included for all API calls.
     * @type {Array.<String>}
     * @default {}
     */

    this.defaultHeaders = {
      'User-Agent': 'OpenAPI-Generator/1.2.16/Javascript'
    };
    /**
     * The default HTTP timeout for all API calls.
     * @type {Number}
     * @default 60000
     */

    this.timeout = 60000;
    /**
     * If set to false an additional timestamp parameter is added to all API GET calls to
     * prevent browser caching
     * @type {Boolean}
     * @default true
     */

    this.cache = true;
    /**
     * If set to true, the client will save the cookies from each server
     * response, and return them in the next request.
     * @default false
     */

    this.enableCookies = false;
    /*
     * Used to save and return cookies in a node.js (non-browser) setting,
     * if this.enableCookies is set to true.
     */

    if (typeof window === 'undefined') {
      this.agent = new _superagent["default"].agent();
    }
    /*
     * Allow user to override superagent agent
     */


    this.requestAgent = null;
    /*
     * Allow user to add superagent plugins
     */

    this.plugins = null;
  }
  /**
  * Returns a string representation for an actual parameter.
  * @param param The actual parameter.
  * @returns {String} The string representation of <code>param</code>.
  */


  _createClass(ApiClient, [{
    key: "paramToString",
    value: function paramToString(param) {
      if (param == undefined || param == null) {
        return '';
      }

      if (param instanceof Date) {
        return param.toJSON();
      }

      if (ApiClient.canBeJsonified(param)) {
        return JSON.stringify(param);
      }

      return param.toString();
    }
    /**
    * Returns a boolean indicating if the parameter could be JSON.stringified
    * @param param The actual parameter
    * @returns {Boolean} Flag indicating if <code>param</code> can be JSON.stringified
    */

  }, {
    key: "buildUrl",

    /**
     * Builds full URL by appending the given path to the base URL and replacing path parameter place-holders with parameter values.
     * NOTE: query parameters are not handled here.
     * @param {String} path The path to append to the base URL.
     * @param {Object} pathParams The parameter values to append.
     * @param {String} apiBasePath Base path defined in the path, operation level to override the default one
     * @returns {String} The encoded path with parameter values substituted.
     */
    value: function buildUrl(path, pathParams, apiBasePath) {
      var _this = this;

      if (!path.match(/^\//)) {
        path = '/' + path;
      }

      var url = this.basePath + path; // use API (operation, path) base path if defined

      if (apiBasePath !== null && apiBasePath !== undefined) {
        url = apiBasePath + path;
      }

      url = url.replace(/\{([\w-\.]+)\}/g, function (fullMatch, key) {
        var value;

        if (pathParams.hasOwnProperty(key)) {
          value = _this.paramToString(pathParams[key]);
        } else {
          value = fullMatch;
        }

        return encodeURIComponent(value);
      });
      return url;
    }
    /**
    * Checks whether the given content type represents JSON.<br>
    * JSON content type examples:<br>
    * <ul>
    * <li>application/json</li>
    * <li>application/json; charset=UTF8</li>
    * <li>APPLICATION/JSON</li>
    * </ul>
    * @param {String} contentType The MIME content type to check.
    * @returns {Boolean} <code>true</code> if <code>contentType</code> represents JSON, otherwise <code>false</code>.
    */

  }, {
    key: "isJsonMime",
    value: function isJsonMime(contentType) {
      return Boolean(contentType != null && contentType.match(/^application\/json(;.*)?$/i));
    }
    /**
    * Chooses a content type from the given array, with JSON preferred; i.e. return JSON if included, otherwise return the first.
    * @param {Array.<String>} contentTypes
    * @returns {String} The chosen content type, preferring JSON.
    */

  }, {
    key: "jsonPreferredMime",
    value: function jsonPreferredMime(contentTypes) {
      for (var i = 0; i < contentTypes.length; i++) {
        if (this.isJsonMime(contentTypes[i])) {
          return contentTypes[i];
        }
      }

      return contentTypes[0];
    }
    /**
    * Checks whether the given parameter value represents file-like content.
    * @param param The parameter to check.
    * @returns {Boolean} <code>true</code> if <code>param</code> represents a file.
    */

  }, {
    key: "isFileParam",
    value: function isFileParam(param) {
      // fs.ReadStream in Node.js and Electron (but not in runtime like browserify)
      if (typeof require === 'function') {
        var fs;

        try {
          fs = require('fs');
        } catch (err) {}

        if (fs && fs.ReadStream && param instanceof fs.ReadStream) {
          return true;
        }
      } // Buffer in Node.js


      if (typeof Buffer === 'function' && param instanceof Buffer) {
        return true;
      } // Blob in browser


      if (typeof Blob === 'function' && param instanceof Blob) {
        return true;
      } // File in browser (it seems File object is also instance of Blob, but keep this for safe)


      if (typeof File === 'function' && param instanceof File) {
        return true;
      }

      return false;
    }
    /**
    * Normalizes parameter values:
    * <ul>
    * <li>remove nils</li>
    * <li>keep files and arrays</li>
    * <li>format to string with `paramToString` for other cases</li>
    * </ul>
    * @param {Object.<String, Object>} params The parameters as object properties.
    * @returns {Object.<String, Object>} normalized parameters.
    */

  }, {
    key: "normalizeParams",
    value: function normalizeParams(params) {
      var newParams = {};

      for (var key in params) {
        if (params.hasOwnProperty(key) && params[key] != undefined && params[key] != null) {
          var value = params[key];

          if (this.isFileParam(value) || Array.isArray(value)) {
            newParams[key] = value;
          } else {
            newParams[key] = this.paramToString(value);
          }
        }
      }

      return newParams;
    }
    /**
    * Builds a string representation of an array-type actual parameter, according to the given collection format.
    * @param {Array} param An array parameter.
    * @param {module:ApiClient.CollectionFormatEnum} collectionFormat The array element separator strategy.
    * @returns {String|Array} A string representation of the supplied collection, using the specified delimiter. Returns
    * <code>param</code> as is if <code>collectionFormat</code> is <code>multi</code>.
    */

  }, {
    key: "buildCollectionParam",
    value: function buildCollectionParam(param, collectionFormat) {
      if (param == null) {
        return null;
      }

      switch (collectionFormat) {
        case 'csv':
          return param.map(this.paramToString, this).join(',');

        case 'ssv':
          return param.map(this.paramToString, this).join(' ');

        case 'tsv':
          return param.map(this.paramToString, this).join('\t');

        case 'pipes':
          return param.map(this.paramToString, this).join('|');

        case 'multi':
          //return the array directly as SuperAgent will handle it as expected
          return param.map(this.paramToString, this);

        case 'passthrough':
          return param;

        default:
          throw new Error('Unknown collection format: ' + collectionFormat);
      }
    }
    /**
    * Applies authentication headers to the request.
    * @param {Object} request The request object created by a <code>superagent()</code> call.
    * @param {Array.<String>} authNames An array of authentication method names.
    */

  }, {
    key: "applyAuthToRequest",
    value: function applyAuthToRequest(request, authNames) {
      var _this2 = this;

      authNames.forEach(function (authName) {
        var auth = _this2.authentications[authName];

        switch (auth.type) {
          case 'basic':
            if (auth.username || auth.password) {
              request.auth(auth.username || '', auth.password || '');
            }

            break;

          case 'bearer':
            if (auth.accessToken) {
              var localVarBearerToken = typeof auth.accessToken === 'function' ? auth.accessToken() : auth.accessToken;
              request.set({
                'Authorization': 'Bearer ' + localVarBearerToken
              });
            }

            break;

          case 'apiKey':
            if (auth.apiKey) {
              var data = {};

              if (auth.apiKeyPrefix) {
                data[auth.name] = auth.apiKeyPrefix + ' ' + auth.apiKey;
              } else {
                data[auth.name] = auth.apiKey;
              }

              if (auth['in'] === 'header') {
                request.set(data);
              } else {
                request.query(data);
              }
            }

            break;

          case 'oauth2':
            if (auth.accessToken) {
              request.set({
                'Authorization': 'Bearer ' + auth.accessToken
              });
            }

            break;

          default:
            throw new Error('Unknown authentication type: ' + auth.type);
        }
      });
    }
    /**
     * Deserializes an HTTP response body into a value of the specified type.
     * @param {Object} response A SuperAgent response object.
     * @param {(String|Array.<String>|Object.<String, Object>|Function)} returnType The type to return. Pass a string for simple types
     * or the constructor function for a complex type. Pass an array containing the type name to return an array of that type. To
     * return an object, pass an object with one property whose name is the key type and whose value is the corresponding value type:
     * all properties on <code>data<code> will be converted to this type.
     * @returns A value of the specified type.
     */

  }, {
    key: "deserialize",
    value: function deserialize(response, returnType) {
      if (response == null || returnType == null || response.status == 204) {
        return null;
      } // Rely on SuperAgent for parsing response body.
      // See http://visionmedia.github.io/superagent/#parsing-response-bodies


      var data = response.body;

      if (data == null || _typeof(data) === 'object' && typeof data.length === 'undefined' && !Object.keys(data).length) {
        // SuperAgent does not always produce a body; use the unparsed response as a fallback
        data = response.text;
      }

      return ApiClient.convertToType(data, returnType);
    }
    /**
     * Callback function to receive the result of the operation.
     * @callback module:ApiClient~callApiCallback
     * @param {String} error Error message, if any.
     * @param data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Invokes the REST service using the supplied settings and parameters.
     * @param {String} path The base URL to invoke.
     * @param {String} httpMethod The HTTP method to use.
     * @param {Object.<String, String>} pathParams A map of path parameters and their values.
     * @param {Object.<String, Object>} queryParams A map of query parameters and their values.
     * @param {Object.<String, Object>} headerParams A map of header parameters and their values.
     * @param {Object.<String, Object>} formParams A map of form parameters and their values.
     * @param {Object} bodyParam The value to pass as the request body.
     * @param {Array.<String>} authNames An array of authentication type names.
     * @param {Array.<String>} contentTypes An array of request MIME types.
     * @param {Array.<String>} accepts An array of acceptable response MIME types.
     * @param {(String|Array|ObjectFunction)} returnType The required type to return; can be a string for simple types or the
     * constructor for a complex type.
     * @param {String} apiBasePath base path defined in the operation/path level to override the default one
     * @param {module:ApiClient~callApiCallback} callback The callback function.
     * @returns {Object} The SuperAgent request object.
     */

  }, {
    key: "callApi",
    value: function callApi(path, httpMethod, pathParams, queryParams, headerParams, formParams, bodyParam, authNames, contentTypes, accepts, returnType, apiBasePath, callback) {
      var _this3 = this;

      var url = this.buildUrl(path, pathParams, apiBasePath);
      var request = (0, _superagent["default"])(httpMethod, url);

      if (this.plugins !== null) {
        for (var index in this.plugins) {
          if (this.plugins.hasOwnProperty(index)) {
            request.use(this.plugins[index]);
          }
        }
      } // apply authentications


      this.applyAuthToRequest(request, authNames); // set query parameters

      if (httpMethod.toUpperCase() === 'GET' && this.cache === false) {
        queryParams['_'] = new Date().getTime();
      }

      request.query(this.normalizeParams(queryParams)); // set header parameters

      request.set(this.defaultHeaders).set(this.normalizeParams(headerParams)); // set requestAgent if it is set by user

      if (this.requestAgent) {
        request.agent(this.requestAgent);
      } // set request timeout


      request.timeout(this.timeout);
      var contentType = this.jsonPreferredMime(contentTypes);

      if (contentType) {
        // Issue with superagent and multipart/form-data (https://github.com/visionmedia/superagent/issues/746)
        if (contentType != 'multipart/form-data') {
          request.type(contentType);
        }
      }

      if (contentType === 'application/x-www-form-urlencoded') {
        request.send(_querystring["default"].stringify(this.normalizeParams(formParams)));
      } else if (contentType == 'multipart/form-data') {
        var _formParams = this.normalizeParams(formParams);

        for (var key in _formParams) {
          if (_formParams.hasOwnProperty(key)) {
            var _formParamsValue = _formParams[key];

            if (this.isFileParam(_formParamsValue)) {
              // file field
              request.attach(key, _formParamsValue);
            } else if (Array.isArray(_formParamsValue) && _formParamsValue.length && this.isFileParam(_formParamsValue[0])) {
              // multiple files
              _formParamsValue.forEach(function (file) {
                return request.attach(key, file);
              });
            } else {
              request.field(key, _formParamsValue);
            }
          }
        }
      } else if (bodyParam !== null && bodyParam !== undefined) {
        if (!request.header['Content-Type']) {
          request.type('application/json');
        }

        request.send(bodyParam);
      }

      var accept = this.jsonPreferredMime(accepts);

      if (accept) {
        request.accept(accept);
      }

      if (returnType === 'Blob') {
        request.responseType('blob');
      } else if (returnType === 'String') {
        request.responseType('string');
      } // Attach previously saved cookies, if enabled


      if (this.enableCookies) {
        if (typeof window === 'undefined') {
          this.agent._attachCookies(request);
        } else {
          request.withCredentials();
        }
      }

      request.end(function (error, response) {
        if (callback) {
          var data = null;

          if (!error) {
            try {
              data = _this3.deserialize(response, returnType);

              if (_this3.enableCookies && typeof window === 'undefined') {
                _this3.agent._saveCookies(response);
              }
            } catch (err) {
              error = err;
            }
          }

          callback(error, data, response);
        }
      });
      return request;
    }
    /**
    * Parses an ISO-8601 string representation or epoch representation of a date value.
    * @param {String} str The date value as a string.
    * @returns {Date} The parsed date object.
    */

  }, {
    key: "hostSettings",

    /**
      * Gets an array of host settings
      * @returns An array of host settings
      */
    value: function hostSettings() {
      return [{
        'url': "https://finnhub.io/api/v1",
        'description': "No description provided"
      }];
    }
  }, {
    key: "getBasePathFromSettings",
    value: function getBasePathFromSettings(index) {
      var variables = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var servers = this.hostSettings(); // check array index out of bound

      if (index < 0 || index >= servers.length) {
        throw new Error("Invalid index " + index + " when selecting the host settings. Must be less than " + servers.length);
      }

      var server = servers[index];
      var url = server['url']; // go through variable and assign a value

      for (var variable_name in server['variables']) {
        if (variable_name in variables) {
          var variable = server['variables'][variable_name];

          if (!('enum_values' in variable) || variable['enum_values'].includes(variables[variable_name])) {
            url = url.replace("{" + variable_name + "}", variables[variable_name]);
          } else {
            throw new Error("The variable `" + variable_name + "` in the host URL has invalid value " + variables[variable_name] + ". Must be " + server['variables'][variable_name]['enum_values'] + ".");
          }
        } else {
          // use default value
          url = url.replace("{" + variable_name + "}", server['variables'][variable_name]['default_value']);
        }
      }

      return url;
    }
    /**
    * Constructs a new map or array model from REST data.
    * @param data {Object|Array} The REST data.
    * @param obj {Object|Array} The target object or array.
    */

  }], [{
    key: "canBeJsonified",
    value: function canBeJsonified(str) {
      if (typeof str !== 'string' && _typeof(str) !== 'object') return false;

      try {
        var type = str.toString();
        return type === '[object Object]' || type === '[object Array]';
      } catch (err) {
        return false;
      }
    }
  }, {
    key: "parseDate",
    value: function parseDate(str) {
      if (isNaN(str)) {
        return new Date(str.replace(/(\d)(T)(\d)/i, '$1 $3'));
      }

      return new Date(+str);
    }
    /**
    * Converts a value to the specified type.
    * @param {(String|Object)} data The data to convert, as a string or object.
    * @param {(String|Array.<String>|Object.<String, Object>|Function)} type The type to return. Pass a string for simple types
    * or the constructor function for a complex type. Pass an array containing the type name to return an array of that type. To
    * return an object, pass an object with one property whose name is the key type and whose value is the corresponding value type:
    * all properties on <code>data<code> will be converted to this type.
    * @returns An instance of the specified type or null or undefined if data is null or undefined.
    */

  }, {
    key: "convertToType",
    value: function convertToType(data, type) {
      if (data === null || data === undefined) return data;

      switch (type) {
        case 'Boolean':
          return Boolean(data);

        case 'Integer':
          return parseInt(data, 10);

        case 'Number':
          return parseFloat(data);

        case 'String':
          return String(data);

        case 'Date':
          return ApiClient.parseDate(String(data));

        case 'Blob':
          return data;

        default:
          if (type === Object) {
            // generic object, return directly
            return data;
          } else if (typeof type.constructFromObject === 'function') {
            // for model type like User and enum class
            return type.constructFromObject(data);
          } else if (Array.isArray(type)) {
            // for array type like: ['String']
            var itemType = type[0];
            return data.map(function (item) {
              return ApiClient.convertToType(item, itemType);
            });
          } else if (_typeof(type) === 'object') {
            // for plain object type like: {'String': 'Integer'}
            var keyType, valueType;

            for (var k in type) {
              if (type.hasOwnProperty(k)) {
                keyType = k;
                valueType = type[k];
                break;
              }
            }

            var result = {};

            for (var k in data) {
              if (data.hasOwnProperty(k)) {
                var key = ApiClient.convertToType(k, keyType);
                var value = ApiClient.convertToType(data[k], valueType);
                result[key] = value;
              }
            }

            return result;
          } else {
            // for unknown type, return the data directly
            return data;
          }

      }
    }
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj, itemType) {
      if (Array.isArray(data)) {
        for (var i = 0; i < data.length; i++) {
          if (data.hasOwnProperty(i)) obj[i] = ApiClient.convertToType(data[i], itemType);
        }
      } else {
        for (var k in data) {
          if (data.hasOwnProperty(k)) obj[k] = ApiClient.convertToType(data[k], itemType);
        }
      }
    }
  }]);

  return ApiClient;
}();
/**
 * Enumeration of collection format separator strategies.
 * @enum {String}
 * @readonly
 */


ApiClient.CollectionFormatEnum = {
  /**
   * Comma-separated values. Value: <code>csv</code>
   * @const
   */
  CSV: ',',

  /**
   * Space-separated values. Value: <code>ssv</code>
   * @const
   */
  SSV: ' ',

  /**
   * Tab-separated values. Value: <code>tsv</code>
   * @const
   */
  TSV: '\t',

  /**
   * Pipe(|)-separated values. Value: <code>pipes</code>
   * @const
   */
  PIPES: '|',

  /**
   * Native array. Value: <code>multi</code>
   * @const
   */
  MULTI: 'multi'
};
/**
* The default API client implementation.
* @type {module:ApiClient}
*/

ApiClient.instance = new ApiClient();
var _default = ApiClient;
exports["default"] = _default;
}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3,"fs":2,"querystring":7,"superagent":153}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _AggregateIndicators = _interopRequireDefault(require("../model/AggregateIndicators"));

var _BasicFinancials = _interopRequireDefault(require("../model/BasicFinancials"));

var _BondCandles = _interopRequireDefault(require("../model/BondCandles"));

var _BondProfile = _interopRequireDefault(require("../model/BondProfile"));

var _BondTickData = _interopRequireDefault(require("../model/BondTickData"));

var _CompanyESG = _interopRequireDefault(require("../model/CompanyESG"));

var _CompanyEarningsQualityScore = _interopRequireDefault(require("../model/CompanyEarningsQualityScore"));

var _CompanyExecutive = _interopRequireDefault(require("../model/CompanyExecutive"));

var _CompanyNews = _interopRequireDefault(require("../model/CompanyNews"));

var _CompanyProfile = _interopRequireDefault(require("../model/CompanyProfile"));

var _CompanyProfile2 = _interopRequireDefault(require("../model/CompanyProfile2"));

var _CountryMetadata = _interopRequireDefault(require("../model/CountryMetadata"));

var _CovidInfo = _interopRequireDefault(require("../model/CovidInfo"));

var _CryptoCandles = _interopRequireDefault(require("../model/CryptoCandles"));

var _CryptoProfile = _interopRequireDefault(require("../model/CryptoProfile"));

var _CryptoSymbol = _interopRequireDefault(require("../model/CryptoSymbol"));

var _Dividends = _interopRequireDefault(require("../model/Dividends"));

var _Dividends2 = _interopRequireDefault(require("../model/Dividends2"));

var _ETFsCountryExposure = _interopRequireDefault(require("../model/ETFsCountryExposure"));

var _ETFsHoldings = _interopRequireDefault(require("../model/ETFsHoldings"));

var _ETFsProfile = _interopRequireDefault(require("../model/ETFsProfile"));

var _ETFsSectorExposure = _interopRequireDefault(require("../model/ETFsSectorExposure"));

var _EarningResult = _interopRequireDefault(require("../model/EarningResult"));

var _EarningsCalendar = _interopRequireDefault(require("../model/EarningsCalendar"));

var _EarningsCallTranscripts = _interopRequireDefault(require("../model/EarningsCallTranscripts"));

var _EarningsCallTranscriptsList = _interopRequireDefault(require("../model/EarningsCallTranscriptsList"));

var _EarningsEstimates = _interopRequireDefault(require("../model/EarningsEstimates"));

var _EbitEstimates = _interopRequireDefault(require("../model/EbitEstimates"));

var _EbitdaEstimates = _interopRequireDefault(require("../model/EbitdaEstimates"));

var _EconomicCalendar = _interopRequireDefault(require("../model/EconomicCalendar"));

var _EconomicCode = _interopRequireDefault(require("../model/EconomicCode"));

var _EconomicData = _interopRequireDefault(require("../model/EconomicData"));

var _FDAComitteeMeeting = _interopRequireDefault(require("../model/FDAComitteeMeeting"));

var _Filing = _interopRequireDefault(require("../model/Filing"));

var _FinancialStatements = _interopRequireDefault(require("../model/FinancialStatements"));

var _FinancialsAsReported = _interopRequireDefault(require("../model/FinancialsAsReported"));

var _ForexCandles = _interopRequireDefault(require("../model/ForexCandles"));

var _ForexSymbol = _interopRequireDefault(require("../model/ForexSymbol"));

var _Forexrates = _interopRequireDefault(require("../model/Forexrates"));

var _FundOwnership = _interopRequireDefault(require("../model/FundOwnership"));

var _HistoricalNBBO = _interopRequireDefault(require("../model/HistoricalNBBO"));

var _IPOCalendar = _interopRequireDefault(require("../model/IPOCalendar"));

var _IndicesConstituents = _interopRequireDefault(require("../model/IndicesConstituents"));

var _IndicesHistoricalConstituents = _interopRequireDefault(require("../model/IndicesHistoricalConstituents"));

var _InsiderSentiments = _interopRequireDefault(require("../model/InsiderSentiments"));

var _InsiderTransactions = _interopRequireDefault(require("../model/InsiderTransactions"));

var _InstitutionalOwnership = _interopRequireDefault(require("../model/InstitutionalOwnership"));

var _InstitutionalPortfolio = _interopRequireDefault(require("../model/InstitutionalPortfolio"));

var _InstitutionalProfile = _interopRequireDefault(require("../model/InstitutionalProfile"));

var _InternationalFiling = _interopRequireDefault(require("../model/InternationalFiling"));

var _InvestmentThemes = _interopRequireDefault(require("../model/InvestmentThemes"));

var _IsinChange = _interopRequireDefault(require("../model/IsinChange"));

var _LastBidAsk = _interopRequireDefault(require("../model/LastBidAsk"));

var _LobbyingResult = _interopRequireDefault(require("../model/LobbyingResult"));

var _MarketNews = _interopRequireDefault(require("../model/MarketNews"));

var _MutualFundCountryExposure = _interopRequireDefault(require("../model/MutualFundCountryExposure"));

var _MutualFundHoldings = _interopRequireDefault(require("../model/MutualFundHoldings"));

var _MutualFundProfile = _interopRequireDefault(require("../model/MutualFundProfile"));

var _MutualFundSectorExposure = _interopRequireDefault(require("../model/MutualFundSectorExposure"));

var _NewsSentiment = _interopRequireDefault(require("../model/NewsSentiment"));

var _Ownership = _interopRequireDefault(require("../model/Ownership"));

var _PatternRecognition = _interopRequireDefault(require("../model/PatternRecognition"));

var _PressRelease = _interopRequireDefault(require("../model/PressRelease"));

var _PriceMetrics = _interopRequireDefault(require("../model/PriceMetrics"));

var _PriceTarget = _interopRequireDefault(require("../model/PriceTarget"));

var _Quote = _interopRequireDefault(require("../model/Quote"));

var _RecommendationTrend = _interopRequireDefault(require("../model/RecommendationTrend"));

var _RevenueBreakdown = _interopRequireDefault(require("../model/RevenueBreakdown"));

var _RevenueEstimates = _interopRequireDefault(require("../model/RevenueEstimates"));

var _SECSentimentAnalysis = _interopRequireDefault(require("../model/SECSentimentAnalysis"));

var _SectorMetric = _interopRequireDefault(require("../model/SectorMetric"));

var _SimilarityIndex = _interopRequireDefault(require("../model/SimilarityIndex"));

var _SocialSentiment = _interopRequireDefault(require("../model/SocialSentiment"));

var _Split = _interopRequireDefault(require("../model/Split"));

var _StockCandles = _interopRequireDefault(require("../model/StockCandles"));

var _StockSymbol = _interopRequireDefault(require("../model/StockSymbol"));

var _SupplyChainRelationships = _interopRequireDefault(require("../model/SupplyChainRelationships"));

var _SupportResistance = _interopRequireDefault(require("../model/SupportResistance"));

var _SymbolChange = _interopRequireDefault(require("../model/SymbolChange"));

var _SymbolLookup = _interopRequireDefault(require("../model/SymbolLookup"));

var _TickData = _interopRequireDefault(require("../model/TickData"));

var _UpgradeDowngrade = _interopRequireDefault(require("../model/UpgradeDowngrade"));

var _UsaSpendingResult = _interopRequireDefault(require("../model/UsaSpendingResult"));

var _UsptoPatentResult = _interopRequireDefault(require("../model/UsptoPatentResult"));

var _VisaApplicationResult = _interopRequireDefault(require("../model/VisaApplicationResult"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
* Default service.
* @module api/DefaultApi
* @version 1.2.16
*/
var DefaultApi = /*#__PURE__*/function () {
  /**
  * Constructs a new DefaultApi. 
  * @alias module:api/DefaultApi
  * @class
  * @param {module:ApiClient} [apiClient] Optional API client implementation to use,
  * default to {@link module:ApiClient#instance} if unspecified.
  */
  function DefaultApi(apiClient) {
    _classCallCheck(this, DefaultApi);

    this.apiClient = apiClient || _ApiClient["default"].instance;
  }
  /**
   * Callback function to receive the result of the aggregateIndicator operation.
   * @callback module:api/DefaultApi~aggregateIndicatorCallback
   * @param {String} error Error message, if any.
   * @param {module:model/AggregateIndicators} data The data returned by the service call.
   * @param {String} response The complete HTTP response.
   */

  /**
   * Aggregate Indicators
   * Get aggregate signal of multiple technical indicators such as MACD, RSI, Moving Average v.v.
   * @param {String} symbol symbol
   * @param {String} resolution Supported resolution includes <code>1, 5, 15, 30, 60, D, W, M </code>.Some timeframes might not be available depending on the exchange.
   * @param {module:api/DefaultApi~aggregateIndicatorCallback} callback The callback function, accepting three arguments: error, data, response
   * data is of type: {@link module:model/AggregateIndicators}
   */


  _createClass(DefaultApi, [{
    key: "aggregateIndicator",
    value: function aggregateIndicator(symbol, resolution, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling aggregateIndicator");
      } // verify the required parameter 'resolution' is set


      if (resolution === undefined || resolution === null) {
        throw new Error("Missing the required parameter 'resolution' when calling aggregateIndicator");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'resolution': resolution
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _AggregateIndicators["default"];
      return this.apiClient.callApi('/scan/technical-indicator', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the bondPrice operation.
     * @callback module:api/DefaultApi~bondPriceCallback
     * @param {String} error Error message, if any.
     * @param {module:model/BondCandles} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Bond price data
     * <p>Get bond's price data. The following datasets are supported:</p><table class=\"table table-hover\">   <thead>     <tr>       <th>Exchange</th>       <th>Segment</th>       <th>Delay</th>     </tr>   </thead>   <tbody>   <tr>       <td class=\"text-blue\">US Government Bonds</th>       <td>Government Bonds</td>       <td>End-of-day</td>     </tr>     <tr>       <td class=\"text-blue\">FINRA Trace</th>       <td>BTDS: US Corporate Bonds</td>       <td>Delayed 4h</td>     </tr>     <tr>       <td class=\"text-blue\">FINRA Trace</th>       <td>144A Bonds</td>       <td>Delayed 4h</td>     </tr>   </tbody> </table>
     * @param {String} isin ISIN.
     * @param {Number} from UNIX timestamp. Interval initial value.
     * @param {Number} to UNIX timestamp. Interval end value.
     * @param {module:api/DefaultApi~bondPriceCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/BondCandles}
     */

  }, {
    key: "bondPrice",
    value: function bondPrice(isin, from, to, callback) {
      var postBody = null; // verify the required parameter 'isin' is set

      if (isin === undefined || isin === null) {
        throw new Error("Missing the required parameter 'isin' when calling bondPrice");
      } // verify the required parameter 'from' is set


      if (from === undefined || from === null) {
        throw new Error("Missing the required parameter 'from' when calling bondPrice");
      } // verify the required parameter 'to' is set


      if (to === undefined || to === null) {
        throw new Error("Missing the required parameter 'to' when calling bondPrice");
      }

      var pathParams = {};
      var queryParams = {
        'isin': isin,
        'from': from,
        'to': to
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _BondCandles["default"];
      return this.apiClient.callApi('/bond/price', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the bondProfile operation.
     * @callback module:api/DefaultApi~bondProfileCallback
     * @param {String} error Error message, if any.
     * @param {module:model/BondProfile} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Bond Profile
     * Get general information of a bond. You can query by FIGI, ISIN or CUSIP
     * @param {Object} opts Optional parameters
     * @param {String} opts.isin ISIN
     * @param {String} opts.cusip CUSIP
     * @param {String} opts.figi FIGI
     * @param {module:api/DefaultApi~bondProfileCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/BondProfile}
     */

  }, {
    key: "bondProfile",
    value: function bondProfile(opts, callback) {
      opts = opts || {};
      var postBody = null;
      var pathParams = {};
      var queryParams = {
        'isin': opts['isin'],
        'cusip': opts['cusip'],
        'figi': opts['figi']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _BondProfile["default"];
      return this.apiClient.callApi('/bond/profile', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the bondTick operation.
     * @callback module:api/DefaultApi~bondTickCallback
     * @param {String} error Error message, if any.
     * @param {module:model/BondTickData} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Bond Tick Data
     * <p>Get trade-level data for bonds. The following datasets are supported:</p><table class=\"table table-hover\">   <thead>     <tr>       <th>Exchange</th>       <th>Segment</th>       <th>Delay</th>     </tr>   </thead>   <tbody>     <tr>       <td class=\"text-blue\">FINRA Trace</th>       <td>BTDS: US Corporate Bonds</td>       <td>Delayed 4h</td>     </tr>     <tr>       <td class=\"text-blue\">FINRA Trace</th>       <td>144A Bonds</td>       <td>Delayed 4h</td>     </tr>   </tbody> </table>
     * @param {String} isin ISIN.
     * @param {Date} date Date: 2020-04-02.
     * @param {Number} limit Limit number of ticks returned. Maximum value: <code>25000</code>
     * @param {Number} skip Number of ticks to skip. Use this parameter to loop through the entire data.
     * @param {String} exchange Currently support the following values: <code>trace</code>.
     * @param {module:api/DefaultApi~bondTickCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/BondTickData}
     */

  }, {
    key: "bondTick",
    value: function bondTick(isin, date, limit, skip, exchange, callback) {
      var postBody = null; // verify the required parameter 'isin' is set

      if (isin === undefined || isin === null) {
        throw new Error("Missing the required parameter 'isin' when calling bondTick");
      } // verify the required parameter 'date' is set


      if (date === undefined || date === null) {
        throw new Error("Missing the required parameter 'date' when calling bondTick");
      } // verify the required parameter 'limit' is set


      if (limit === undefined || limit === null) {
        throw new Error("Missing the required parameter 'limit' when calling bondTick");
      } // verify the required parameter 'skip' is set


      if (skip === undefined || skip === null) {
        throw new Error("Missing the required parameter 'skip' when calling bondTick");
      } // verify the required parameter 'exchange' is set


      if (exchange === undefined || exchange === null) {
        throw new Error("Missing the required parameter 'exchange' when calling bondTick");
      }

      var pathParams = {};
      var queryParams = {
        'isin': isin,
        'date': date,
        'limit': limit,
        'skip': skip,
        'exchange': exchange
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _BondTickData["default"];
      return this.apiClient.callApi('/bond/tick', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the companyBasicFinancials operation.
     * @callback module:api/DefaultApi~companyBasicFinancialsCallback
     * @param {String} error Error message, if any.
     * @param {module:model/BasicFinancials} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Basic Financials
     * Get company basic financials such as margin, P/E ratio, 52-week high/low etc.
     * @param {String} symbol Symbol of the company: AAPL.
     * @param {String} metric Metric type. Can be 1 of the following values <code>all</code>
     * @param {module:api/DefaultApi~companyBasicFinancialsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/BasicFinancials}
     */

  }, {
    key: "companyBasicFinancials",
    value: function companyBasicFinancials(symbol, metric, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling companyBasicFinancials");
      } // verify the required parameter 'metric' is set


      if (metric === undefined || metric === null) {
        throw new Error("Missing the required parameter 'metric' when calling companyBasicFinancials");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'metric': metric
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _BasicFinancials["default"];
      return this.apiClient.callApi('/stock/metric', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the companyEarnings operation.
     * @callback module:api/DefaultApi~companyEarningsCallback
     * @param {String} error Error message, if any.
     * @param {Array.<module:model/EarningResult>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Earnings Surprises
     * Get company historical quarterly earnings surprise going back to 2000.
     * @param {String} symbol Symbol of the company: AAPL.
     * @param {Object} opts Optional parameters
     * @param {Number} opts.limit Limit number of period returned. Leave blank to get the full history.
     * @param {module:api/DefaultApi~companyEarningsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<module:model/EarningResult>}
     */

  }, {
    key: "companyEarnings",
    value: function companyEarnings(symbol, opts, callback) {
      opts = opts || {};
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling companyEarnings");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'limit': opts['limit']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = [_EarningResult["default"]];
      return this.apiClient.callApi('/stock/earnings', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the companyEarningsQualityScore operation.
     * @callback module:api/DefaultApi~companyEarningsQualityScoreCallback
     * @param {String} error Error message, if any.
     * @param {module:model/CompanyEarningsQualityScore} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Company Earnings Quality Score
     * <p>This endpoint provides Earnings Quality Score for global companies.</p><p> Earnings quality refers to the extent to which current earnings predict future earnings. \"High-quality\" earnings are expected to persist, while \"low-quality\" earnings do not. A higher score means a higher earnings quality</p><p>Finnhub uses a proprietary model which takes into consideration 4 criteria:</p> <ul style=\"list-style-type: unset; margin-left: 30px;\"><li>Profitability</li><li>Growth</li><li>Cash Generation & Capital Allocation</li><li>Leverage</li></ul><br/><p>We then compare the metrics of each company in each category against its peers in the same industry to gauge how quality its earnings is.</p>
     * @param {String} symbol Symbol.
     * @param {String} freq Frequency. Currently support <code>annual</code> and <code>quarterly</code>
     * @param {module:api/DefaultApi~companyEarningsQualityScoreCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/CompanyEarningsQualityScore}
     */

  }, {
    key: "companyEarningsQualityScore",
    value: function companyEarningsQualityScore(symbol, freq, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling companyEarningsQualityScore");
      } // verify the required parameter 'freq' is set


      if (freq === undefined || freq === null) {
        throw new Error("Missing the required parameter 'freq' when calling companyEarningsQualityScore");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'freq': freq
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _CompanyEarningsQualityScore["default"];
      return this.apiClient.callApi('/stock/earnings-quality-score', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the companyEbitEstimates operation.
     * @callback module:api/DefaultApi~companyEbitEstimatesCallback
     * @param {String} error Error message, if any.
     * @param {module:model/EbitEstimates} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * EBIT Estimates
     * Get company's ebit estimates.
     * @param {String} symbol Symbol of the company: AAPL.
     * @param {Object} opts Optional parameters
     * @param {String} opts.freq Can take 1 of the following values: <code>annual, quarterly</code>. Default to <code>quarterly</code>
     * @param {module:api/DefaultApi~companyEbitEstimatesCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/EbitEstimates}
     */

  }, {
    key: "companyEbitEstimates",
    value: function companyEbitEstimates(symbol, opts, callback) {
      opts = opts || {};
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling companyEbitEstimates");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'freq': opts['freq']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _EbitEstimates["default"];
      return this.apiClient.callApi('/stock/ebit-estimate', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the companyEbitdaEstimates operation.
     * @callback module:api/DefaultApi~companyEbitdaEstimatesCallback
     * @param {String} error Error message, if any.
     * @param {module:model/EbitdaEstimates} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * EBITDA Estimates
     * Get company's ebitda estimates.
     * @param {String} symbol Symbol of the company: AAPL.
     * @param {Object} opts Optional parameters
     * @param {String} opts.freq Can take 1 of the following values: <code>annual, quarterly</code>. Default to <code>quarterly</code>
     * @param {module:api/DefaultApi~companyEbitdaEstimatesCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/EbitdaEstimates}
     */

  }, {
    key: "companyEbitdaEstimates",
    value: function companyEbitdaEstimates(symbol, opts, callback) {
      opts = opts || {};
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling companyEbitdaEstimates");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'freq': opts['freq']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _EbitdaEstimates["default"];
      return this.apiClient.callApi('/stock/ebitda-estimate', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the companyEpsEstimates operation.
     * @callback module:api/DefaultApi~companyEpsEstimatesCallback
     * @param {String} error Error message, if any.
     * @param {module:model/EarningsEstimates} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Earnings Estimates
     * Get company's EPS estimates.
     * @param {String} symbol Symbol of the company: AAPL.
     * @param {Object} opts Optional parameters
     * @param {String} opts.freq Can take 1 of the following values: <code>annual, quarterly</code>. Default to <code>quarterly</code>
     * @param {module:api/DefaultApi~companyEpsEstimatesCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/EarningsEstimates}
     */

  }, {
    key: "companyEpsEstimates",
    value: function companyEpsEstimates(symbol, opts, callback) {
      opts = opts || {};
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling companyEpsEstimates");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'freq': opts['freq']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _EarningsEstimates["default"];
      return this.apiClient.callApi('/stock/eps-estimate', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the companyEsgScore operation.
     * @callback module:api/DefaultApi~companyEsgScoreCallback
     * @param {String} error Error message, if any.
     * @param {module:model/CompanyESG} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Company ESG Scores
     * <p>This endpoint provides ESG scores and important indicators for 1000+ global companies. The data is collected through company's public ESG disclosure and public sources.</p><p>Our ESG scoring models takes into account more than 150 different inputs to calculate the level of ESG risks and how well a company is managing them. A higher score means lower ESG risk or better ESG management. ESG scores are in the the range of 0-100. Some key indicators might contain letter-grade score from C- to A+ with C- is the lowest score and A+ is the highest score.</p>
     * @param {String} symbol Symbol.
     * @param {module:api/DefaultApi~companyEsgScoreCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/CompanyESG}
     */

  }, {
    key: "companyEsgScore",
    value: function companyEsgScore(symbol, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling companyEsgScore");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _CompanyESG["default"];
      return this.apiClient.callApi('/stock/esg', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the companyExecutive operation.
     * @callback module:api/DefaultApi~companyExecutiveCallback
     * @param {String} error Error message, if any.
     * @param {module:model/CompanyExecutive} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Company Executive
     * Get a list of company's executives and members of the Board.
     * @param {String} symbol Symbol of the company: AAPL.
     * @param {module:api/DefaultApi~companyExecutiveCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/CompanyExecutive}
     */

  }, {
    key: "companyExecutive",
    value: function companyExecutive(symbol, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling companyExecutive");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _CompanyExecutive["default"];
      return this.apiClient.callApi('/stock/executive', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the companyNews operation.
     * @callback module:api/DefaultApi~companyNewsCallback
     * @param {String} error Error message, if any.
     * @param {Array.<module:model/CompanyNews>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Company News
     * List latest company news by symbol. This endpoint is only available for North American companies.
     * @param {String} symbol Company symbol.
     * @param {Date} from From date <code>YYYY-MM-DD</code>.
     * @param {Date} to To date <code>YYYY-MM-DD</code>.
     * @param {module:api/DefaultApi~companyNewsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<module:model/CompanyNews>}
     */

  }, {
    key: "companyNews",
    value: function companyNews(symbol, from, to, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling companyNews");
      } // verify the required parameter 'from' is set


      if (from === undefined || from === null) {
        throw new Error("Missing the required parameter 'from' when calling companyNews");
      } // verify the required parameter 'to' is set


      if (to === undefined || to === null) {
        throw new Error("Missing the required parameter 'to' when calling companyNews");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'from': from,
        'to': to
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = [_CompanyNews["default"]];
      return this.apiClient.callApi('/company-news', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the companyPeers operation.
     * @callback module:api/DefaultApi~companyPeersCallback
     * @param {String} error Error message, if any.
     * @param {Array.<String>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Peers
     * Get company peers. Return a list of peers operating in the same country and sector/industry.
     * @param {String} symbol Symbol of the company: AAPL.
     * @param {Object} opts Optional parameters
     * @param {String} opts.grouping Specify the grouping criteria for choosing peers.Supporter values: <code>sector</code>, <code>industry</code>, <code>subIndustry</code>. Default to <code>subIndustry</code>.
     * @param {module:api/DefaultApi~companyPeersCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<String>}
     */

  }, {
    key: "companyPeers",
    value: function companyPeers(symbol, opts, callback) {
      opts = opts || {};
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling companyPeers");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'grouping': opts['grouping']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = ['String'];
      return this.apiClient.callApi('/stock/peers', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the companyProfile operation.
     * @callback module:api/DefaultApi~companyProfileCallback
     * @param {String} error Error message, if any.
     * @param {module:model/CompanyProfile} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Company Profile
     * Get general information of a company. You can query by symbol, ISIN or CUSIP
     * @param {Object} opts Optional parameters
     * @param {String} opts.symbol Symbol of the company: AAPL e.g.
     * @param {String} opts.isin ISIN
     * @param {String} opts.cusip CUSIP
     * @param {module:api/DefaultApi~companyProfileCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/CompanyProfile}
     */

  }, {
    key: "companyProfile",
    value: function companyProfile(opts, callback) {
      opts = opts || {};
      var postBody = null;
      var pathParams = {};
      var queryParams = {
        'symbol': opts['symbol'],
        'isin': opts['isin'],
        'cusip': opts['cusip']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _CompanyProfile["default"];
      return this.apiClient.callApi('/stock/profile', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the companyProfile2 operation.
     * @callback module:api/DefaultApi~companyProfile2Callback
     * @param {String} error Error message, if any.
     * @param {module:model/CompanyProfile2} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Company Profile 2
     * Get general information of a company. You can query by symbol, ISIN or CUSIP. This is the free version of <a href=\"#company-profile\">Company Profile</a>.
     * @param {Object} opts Optional parameters
     * @param {String} opts.symbol Symbol of the company: AAPL e.g.
     * @param {String} opts.isin ISIN
     * @param {String} opts.cusip CUSIP
     * @param {module:api/DefaultApi~companyProfile2Callback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/CompanyProfile2}
     */

  }, {
    key: "companyProfile2",
    value: function companyProfile2(opts, callback) {
      opts = opts || {};
      var postBody = null;
      var pathParams = {};
      var queryParams = {
        'symbol': opts['symbol'],
        'isin': opts['isin'],
        'cusip': opts['cusip']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _CompanyProfile2["default"];
      return this.apiClient.callApi('/stock/profile2', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the companyRevenueEstimates operation.
     * @callback module:api/DefaultApi~companyRevenueEstimatesCallback
     * @param {String} error Error message, if any.
     * @param {module:model/RevenueEstimates} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Revenue Estimates
     * Get company's revenue estimates.
     * @param {String} symbol Symbol of the company: AAPL.
     * @param {Object} opts Optional parameters
     * @param {String} opts.freq Can take 1 of the following values: <code>annual, quarterly</code>. Default to <code>quarterly</code>
     * @param {module:api/DefaultApi~companyRevenueEstimatesCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/RevenueEstimates}
     */

  }, {
    key: "companyRevenueEstimates",
    value: function companyRevenueEstimates(symbol, opts, callback) {
      opts = opts || {};
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling companyRevenueEstimates");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'freq': opts['freq']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _RevenueEstimates["default"];
      return this.apiClient.callApi('/stock/revenue-estimate', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the country operation.
     * @callback module:api/DefaultApi~countryCallback
     * @param {String} error Error message, if any.
     * @param {Array.<module:model/CountryMetadata>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Country Metadata
     * List all countries and metadata.
     * @param {module:api/DefaultApi~countryCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<module:model/CountryMetadata>}
     */

  }, {
    key: "country",
    value: function country(callback) {
      var postBody = null;
      var pathParams = {};
      var queryParams = {};
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = [_CountryMetadata["default"]];
      return this.apiClient.callApi('/country', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the covid19 operation.
     * @callback module:api/DefaultApi~covid19Callback
     * @param {String} error Error message, if any.
     * @param {Array.<module:model/CovidInfo>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * COVID-19
     * Get real-time updates on the number of COVID-19 (Corona virus) cases in the US with a state-by-state breakdown. Data is sourced from CDC and reputable sources. You can also access this API <a href=\"https://rapidapi.com/Finnhub/api/finnhub-real-time-covid-19\" target=\"_blank\" rel=\"nofollow\">here</a>
     * @param {module:api/DefaultApi~covid19Callback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<module:model/CovidInfo>}
     */

  }, {
    key: "covid19",
    value: function covid19(callback) {
      var postBody = null;
      var pathParams = {};
      var queryParams = {};
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = [_CovidInfo["default"]];
      return this.apiClient.callApi('/covid19/us', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the cryptoCandles operation.
     * @callback module:api/DefaultApi~cryptoCandlesCallback
     * @param {String} error Error message, if any.
     * @param {module:model/CryptoCandles} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Crypto Candles
     * Get candlestick data for crypto symbols.
     * @param {String} symbol Use symbol returned in <code>/crypto/symbol</code> endpoint for this field.
     * @param {String} resolution Supported resolution includes <code>1, 5, 15, 30, 60, D, W, M </code>.Some timeframes might not be available depending on the exchange.
     * @param {Number} from UNIX timestamp. Interval initial value.
     * @param {Number} to UNIX timestamp. Interval end value.
     * @param {module:api/DefaultApi~cryptoCandlesCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/CryptoCandles}
     */

  }, {
    key: "cryptoCandles",
    value: function cryptoCandles(symbol, resolution, from, to, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling cryptoCandles");
      } // verify the required parameter 'resolution' is set


      if (resolution === undefined || resolution === null) {
        throw new Error("Missing the required parameter 'resolution' when calling cryptoCandles");
      } // verify the required parameter 'from' is set


      if (from === undefined || from === null) {
        throw new Error("Missing the required parameter 'from' when calling cryptoCandles");
      } // verify the required parameter 'to' is set


      if (to === undefined || to === null) {
        throw new Error("Missing the required parameter 'to' when calling cryptoCandles");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'resolution': resolution,
        'from': from,
        'to': to
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _CryptoCandles["default"];
      return this.apiClient.callApi('/crypto/candle', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the cryptoExchanges operation.
     * @callback module:api/DefaultApi~cryptoExchangesCallback
     * @param {String} error Error message, if any.
     * @param {Array.<String>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Crypto Exchanges
     * List supported crypto exchanges
     * @param {module:api/DefaultApi~cryptoExchangesCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<String>}
     */

  }, {
    key: "cryptoExchanges",
    value: function cryptoExchanges(callback) {
      var postBody = null;
      var pathParams = {};
      var queryParams = {};
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = ['String'];
      return this.apiClient.callApi('/crypto/exchange', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the cryptoProfile operation.
     * @callback module:api/DefaultApi~cryptoProfileCallback
     * @param {String} error Error message, if any.
     * @param {module:model/CryptoProfile} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Crypto Profile
     * Get crypto's profile.
     * @param {String} symbol Crypto symbol such as BTC or ETH.
     * @param {module:api/DefaultApi~cryptoProfileCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/CryptoProfile}
     */

  }, {
    key: "cryptoProfile",
    value: function cryptoProfile(symbol, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling cryptoProfile");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _CryptoProfile["default"];
      return this.apiClient.callApi('/crypto/profile', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the cryptoSymbols operation.
     * @callback module:api/DefaultApi~cryptoSymbolsCallback
     * @param {String} error Error message, if any.
     * @param {Array.<module:model/CryptoSymbol>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Crypto Symbol
     * List supported crypto symbols by exchange
     * @param {String} exchange Exchange you want to get the list of symbols from.
     * @param {module:api/DefaultApi~cryptoSymbolsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<module:model/CryptoSymbol>}
     */

  }, {
    key: "cryptoSymbols",
    value: function cryptoSymbols(exchange, callback) {
      var postBody = null; // verify the required parameter 'exchange' is set

      if (exchange === undefined || exchange === null) {
        throw new Error("Missing the required parameter 'exchange' when calling cryptoSymbols");
      }

      var pathParams = {};
      var queryParams = {
        'exchange': exchange
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = [_CryptoSymbol["default"]];
      return this.apiClient.callApi('/crypto/symbol', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the earningsCalendar operation.
     * @callback module:api/DefaultApi~earningsCalendarCallback
     * @param {String} error Error message, if any.
     * @param {module:model/EarningsCalendar} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Earnings Calendar
     * Get historical and coming earnings release. EPS and Revenue in this endpoint are non-GAAP, which means they are adjusted to exclude some one-time or unusual items. This is the same data investors usually react to and talked about on the media. Estimates are sourced from both sell-side and buy-side analysts.
     * @param {Object} opts Optional parameters
     * @param {Date} opts.from From date: 2020-03-15.
     * @param {Date} opts.to To date: 2020-03-16.
     * @param {String} opts.symbol Filter by symbol: AAPL.
     * @param {Boolean} opts.international Set to <code>true</code> to include international markets. Default value is <code>false</code>
     * @param {module:api/DefaultApi~earningsCalendarCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/EarningsCalendar}
     */

  }, {
    key: "earningsCalendar",
    value: function earningsCalendar(opts, callback) {
      opts = opts || {};
      var postBody = null;
      var pathParams = {};
      var queryParams = {
        'from': opts['from'],
        'to': opts['to'],
        'symbol': opts['symbol'],
        'international': opts['international']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _EarningsCalendar["default"];
      return this.apiClient.callApi('/calendar/earnings', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the economicCalendar operation.
     * @callback module:api/DefaultApi~economicCalendarCallback
     * @param {String} error Error message, if any.
     * @param {module:model/EconomicCalendar} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Economic Calendar
     * <p>Get recent and upcoming economic releases.</p><p>Historical events and surprises are available for Enterprise clients.</p>
     * @param {Object} opts Optional parameters
     * @param {Date} opts.from From date <code>YYYY-MM-DD</code>.
     * @param {Date} opts.to To date <code>YYYY-MM-DD</code>.
     * @param {module:api/DefaultApi~economicCalendarCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/EconomicCalendar}
     */

  }, {
    key: "economicCalendar",
    value: function economicCalendar(opts, callback) {
      opts = opts || {};
      var postBody = null;
      var pathParams = {};
      var queryParams = {
        'from': opts['from'],
        'to': opts['to']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _EconomicCalendar["default"];
      return this.apiClient.callApi('/calendar/economic', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the economicCode operation.
     * @callback module:api/DefaultApi~economicCodeCallback
     * @param {String} error Error message, if any.
     * @param {Array.<module:model/EconomicCode>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Economic Code
     * List codes of supported economic data.
     * @param {module:api/DefaultApi~economicCodeCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<module:model/EconomicCode>}
     */

  }, {
    key: "economicCode",
    value: function economicCode(callback) {
      var postBody = null;
      var pathParams = {};
      var queryParams = {};
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = [_EconomicCode["default"]];
      return this.apiClient.callApi('/economic/code', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the economicData operation.
     * @callback module:api/DefaultApi~economicDataCallback
     * @param {String} error Error message, if any.
     * @param {module:model/EconomicData} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Economic Data
     * Get economic data.
     * @param {String} code Economic code.
     * @param {module:api/DefaultApi~economicDataCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/EconomicData}
     */

  }, {
    key: "economicData",
    value: function economicData(code, callback) {
      var postBody = null; // verify the required parameter 'code' is set

      if (code === undefined || code === null) {
        throw new Error("Missing the required parameter 'code' when calling economicData");
      }

      var pathParams = {};
      var queryParams = {
        'code': code
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _EconomicData["default"];
      return this.apiClient.callApi('/economic', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the etfsCountryExposure operation.
     * @callback module:api/DefaultApi~etfsCountryExposureCallback
     * @param {String} error Error message, if any.
     * @param {module:model/ETFsCountryExposure} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * ETFs Country Exposure
     * Get ETF country exposure data.
     * @param {String} symbol ETF symbol.
     * @param {module:api/DefaultApi~etfsCountryExposureCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/ETFsCountryExposure}
     */

  }, {
    key: "etfsCountryExposure",
    value: function etfsCountryExposure(symbol, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling etfsCountryExposure");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _ETFsCountryExposure["default"];
      return this.apiClient.callApi('/etf/country', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the etfsHoldings operation.
     * @callback module:api/DefaultApi~etfsHoldingsCallback
     * @param {String} error Error message, if any.
     * @param {module:model/ETFsHoldings} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * ETFs Holdings
     * Get full ETF holdings/constituents. This endpoint has global coverage. Widget only shows top 10 holdings.
     * @param {Object} opts Optional parameters
     * @param {String} opts.symbol ETF symbol.
     * @param {String} opts.isin ETF isin.
     * @param {Number} opts.skip Skip the first n results. You can use this parameter to query historical constituents data. The latest result is returned if skip=0 or not set.
     * @param {String} opts.date Query holdings by date. You can use either this param or <code>skip</code> param, not both.
     * @param {module:api/DefaultApi~etfsHoldingsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/ETFsHoldings}
     */

  }, {
    key: "etfsHoldings",
    value: function etfsHoldings(opts, callback) {
      opts = opts || {};
      var postBody = null;
      var pathParams = {};
      var queryParams = {
        'symbol': opts['symbol'],
        'isin': opts['isin'],
        'skip': opts['skip'],
        'date': opts['date']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _ETFsHoldings["default"];
      return this.apiClient.callApi('/etf/holdings', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the etfsProfile operation.
     * @callback module:api/DefaultApi~etfsProfileCallback
     * @param {String} error Error message, if any.
     * @param {module:model/ETFsProfile} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * ETFs Profile
     * Get ETF profile information. This endpoint has global coverage.
     * @param {Object} opts Optional parameters
     * @param {String} opts.symbol ETF symbol.
     * @param {String} opts.isin ETF isin.
     * @param {module:api/DefaultApi~etfsProfileCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/ETFsProfile}
     */

  }, {
    key: "etfsProfile",
    value: function etfsProfile(opts, callback) {
      opts = opts || {};
      var postBody = null;
      var pathParams = {};
      var queryParams = {
        'symbol': opts['symbol'],
        'isin': opts['isin']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _ETFsProfile["default"];
      return this.apiClient.callApi('/etf/profile', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the etfsSectorExposure operation.
     * @callback module:api/DefaultApi~etfsSectorExposureCallback
     * @param {String} error Error message, if any.
     * @param {module:model/ETFsSectorExposure} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * ETFs Sector Exposure
     * Get ETF sector exposure data.
     * @param {String} symbol ETF symbol.
     * @param {module:api/DefaultApi~etfsSectorExposureCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/ETFsSectorExposure}
     */

  }, {
    key: "etfsSectorExposure",
    value: function etfsSectorExposure(symbol, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling etfsSectorExposure");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _ETFsSectorExposure["default"];
      return this.apiClient.callApi('/etf/sector', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the fdaCommitteeMeetingCalendar operation.
     * @callback module:api/DefaultApi~fdaCommitteeMeetingCalendarCallback
     * @param {String} error Error message, if any.
     * @param {Array.<module:model/FDAComitteeMeeting>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * FDA Committee Meeting Calendar
     * FDA's advisory committees are established to provide functions which support the agency's mission of protecting and promoting the public health, while meeting the requirements set forth in the Federal Advisory Committee Act. Committees are either mandated by statute or established at the discretion of the Department of Health and Human Services. Each committee is subject to renewal at two-year intervals unless the committee charter states otherwise.
     * @param {module:api/DefaultApi~fdaCommitteeMeetingCalendarCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<module:model/FDAComitteeMeeting>}
     */

  }, {
    key: "fdaCommitteeMeetingCalendar",
    value: function fdaCommitteeMeetingCalendar(callback) {
      var postBody = null;
      var pathParams = {};
      var queryParams = {};
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = [_FDAComitteeMeeting["default"]];
      return this.apiClient.callApi('/fda-advisory-committee-calendar', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the filings operation.
     * @callback module:api/DefaultApi~filingsCallback
     * @param {String} error Error message, if any.
     * @param {Array.<module:model/Filing>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * SEC Filings
     * List company's filing. Limit to 250 documents at a time. This data is available for bulk download on <a href=\"https://www.kaggle.com/finnhub/sec-filings\" target=\"_blank\">Kaggle SEC Filings database</a>.
     * @param {Object} opts Optional parameters
     * @param {String} opts.symbol Symbol. Leave <code>symbol</code>,<code>cik</code> and <code>accessNumber</code> empty to list latest filings.
     * @param {String} opts.cik CIK.
     * @param {String} opts.accessNumber Access number of a specific report you want to retrieve data from.
     * @param {String} opts.form Filter by form. You can use this value <code>NT 10-K</code> to find non-timely filings for a company.
     * @param {Date} opts.from From date: 2020-03-15.
     * @param {Date} opts.to To date: 2020-03-16.
     * @param {module:api/DefaultApi~filingsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<module:model/Filing>}
     */

  }, {
    key: "filings",
    value: function filings(opts, callback) {
      opts = opts || {};
      var postBody = null;
      var pathParams = {};
      var queryParams = {
        'symbol': opts['symbol'],
        'cik': opts['cik'],
        'accessNumber': opts['accessNumber'],
        'form': opts['form'],
        'from': opts['from'],
        'to': opts['to']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = [_Filing["default"]];
      return this.apiClient.callApi('/stock/filings', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the filingsSentiment operation.
     * @callback module:api/DefaultApi~filingsSentimentCallback
     * @param {String} error Error message, if any.
     * @param {module:model/SECSentimentAnalysis} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * SEC Sentiment Analysis
     * Get sentiment analysis of 10-K and 10-Q filings from SEC. An abnormal increase in the number of positive/negative words in filings can signal a significant change in the company's stock price in the upcoming 4 quarters. We make use of <a href= \"https://sraf.nd.edu/textual-analysis/resources/\" target=\"_blank\">Loughran and McDonald Sentiment Word Lists</a> to calculate the sentiment for each filing.
     * @param {String} accessNumber Access number of a specific report you want to retrieve data from.
     * @param {module:api/DefaultApi~filingsSentimentCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/SECSentimentAnalysis}
     */

  }, {
    key: "filingsSentiment",
    value: function filingsSentiment(accessNumber, callback) {
      var postBody = null; // verify the required parameter 'accessNumber' is set

      if (accessNumber === undefined || accessNumber === null) {
        throw new Error("Missing the required parameter 'accessNumber' when calling filingsSentiment");
      }

      var pathParams = {};
      var queryParams = {
        'accessNumber': accessNumber
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _SECSentimentAnalysis["default"];
      return this.apiClient.callApi('/stock/filings-sentiment', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the financials operation.
     * @callback module:api/DefaultApi~financialsCallback
     * @param {String} error Error message, if any.
     * @param {module:model/FinancialStatements} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Financial Statements
     * <p>Get standardized balance sheet, income statement and cash flow for global companies going back 30+ years. Data is sourced from original filings most of which made available through <a href=\"#filings\">SEC Filings</a> and <a href=\"#international-filings\">International Filings</a> endpoints.</p><p><i>Wondering why our standardized data is different from Bloomberg, Reuters, Factset, S&P or Yahoo Finance ? Check out our <a href=\"/faq\">FAQ page</a> to learn more</i></p>
     * @param {String} symbol Symbol of the company: AAPL.
     * @param {String} statement Statement can take 1 of these values <code>bs, ic, cf</code> for Balance Sheet, Income Statement, Cash Flow respectively.
     * @param {String} freq Frequency can take 1 of these values <code>annual, quarterly, ttm, ytd</code>.  TTM (Trailing Twelve Months) option is available for Income Statement and Cash Flow. YTD (Year To Date) option is only available for Cash Flow.
     * @param {module:api/DefaultApi~financialsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/FinancialStatements}
     */

  }, {
    key: "financials",
    value: function financials(symbol, statement, freq, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling financials");
      } // verify the required parameter 'statement' is set


      if (statement === undefined || statement === null) {
        throw new Error("Missing the required parameter 'statement' when calling financials");
      } // verify the required parameter 'freq' is set


      if (freq === undefined || freq === null) {
        throw new Error("Missing the required parameter 'freq' when calling financials");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'statement': statement,
        'freq': freq
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _FinancialStatements["default"];
      return this.apiClient.callApi('/stock/financials', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the financialsReported operation.
     * @callback module:api/DefaultApi~financialsReportedCallback
     * @param {String} error Error message, if any.
     * @param {module:model/FinancialsAsReported} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Financials As Reported
     * Get financials as reported. This data is available for bulk download on <a href=\"https://www.kaggle.com/finnhub/reported-financials\" target=\"_blank\">Kaggle SEC Financials database</a>.
     * @param {Object} opts Optional parameters
     * @param {String} opts.symbol Symbol.
     * @param {String} opts.cik CIK.
     * @param {String} opts.accessNumber Access number of a specific report you want to retrieve financials from.
     * @param {String} opts.freq Frequency. Can be either <code>annual</code> or <code>quarterly</code>. Default to <code>annual</code>.
     * @param {Date} opts.from From date <code>YYYY-MM-DD</code>. Filter for endDate.
     * @param {Date} opts.to To date <code>YYYY-MM-DD</code>. Filter for endDate.
     * @param {module:api/DefaultApi~financialsReportedCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/FinancialsAsReported}
     */

  }, {
    key: "financialsReported",
    value: function financialsReported(opts, callback) {
      opts = opts || {};
      var postBody = null;
      var pathParams = {};
      var queryParams = {
        'symbol': opts['symbol'],
        'cik': opts['cik'],
        'accessNumber': opts['accessNumber'],
        'freq': opts['freq'],
        'from': opts['from'],
        'to': opts['to']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _FinancialsAsReported["default"];
      return this.apiClient.callApi('/stock/financials-reported', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the forexCandles operation.
     * @callback module:api/DefaultApi~forexCandlesCallback
     * @param {String} error Error message, if any.
     * @param {module:model/ForexCandles} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Forex Candles
     * Get candlestick data for forex symbols.
     * @param {String} symbol Use symbol returned in <code>/forex/symbol</code> endpoint for this field.
     * @param {String} resolution Supported resolution includes <code>1, 5, 15, 30, 60, D, W, M </code>.Some timeframes might not be available depending on the exchange.
     * @param {Number} from UNIX timestamp. Interval initial value.
     * @param {Number} to UNIX timestamp. Interval end value.
     * @param {module:api/DefaultApi~forexCandlesCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/ForexCandles}
     */

  }, {
    key: "forexCandles",
    value: function forexCandles(symbol, resolution, from, to, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling forexCandles");
      } // verify the required parameter 'resolution' is set


      if (resolution === undefined || resolution === null) {
        throw new Error("Missing the required parameter 'resolution' when calling forexCandles");
      } // verify the required parameter 'from' is set


      if (from === undefined || from === null) {
        throw new Error("Missing the required parameter 'from' when calling forexCandles");
      } // verify the required parameter 'to' is set


      if (to === undefined || to === null) {
        throw new Error("Missing the required parameter 'to' when calling forexCandles");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'resolution': resolution,
        'from': from,
        'to': to
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _ForexCandles["default"];
      return this.apiClient.callApi('/forex/candle', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the forexExchanges operation.
     * @callback module:api/DefaultApi~forexExchangesCallback
     * @param {String} error Error message, if any.
     * @param {Array.<String>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Forex Exchanges
     * List supported forex exchanges
     * @param {module:api/DefaultApi~forexExchangesCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<String>}
     */

  }, {
    key: "forexExchanges",
    value: function forexExchanges(callback) {
      var postBody = null;
      var pathParams = {};
      var queryParams = {};
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = ['String'];
      return this.apiClient.callApi('/forex/exchange', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the forexRates operation.
     * @callback module:api/DefaultApi~forexRatesCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Forexrates} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Forex rates
     * Get rates for all forex pairs. Ideal for currency conversion
     * @param {Object} opts Optional parameters
     * @param {String} opts.base Base currency. Default to EUR.
     * @param {String} opts.date Date. Leave blank to get the latest data.
     * @param {module:api/DefaultApi~forexRatesCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Forexrates}
     */

  }, {
    key: "forexRates",
    value: function forexRates(opts, callback) {
      opts = opts || {};
      var postBody = null;
      var pathParams = {};
      var queryParams = {
        'base': opts['base'],
        'date': opts['date']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _Forexrates["default"];
      return this.apiClient.callApi('/forex/rates', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the forexSymbols operation.
     * @callback module:api/DefaultApi~forexSymbolsCallback
     * @param {String} error Error message, if any.
     * @param {Array.<module:model/ForexSymbol>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Forex Symbol
     * List supported forex symbols.
     * @param {String} exchange Exchange you want to get the list of symbols from.
     * @param {module:api/DefaultApi~forexSymbolsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<module:model/ForexSymbol>}
     */

  }, {
    key: "forexSymbols",
    value: function forexSymbols(exchange, callback) {
      var postBody = null; // verify the required parameter 'exchange' is set

      if (exchange === undefined || exchange === null) {
        throw new Error("Missing the required parameter 'exchange' when calling forexSymbols");
      }

      var pathParams = {};
      var queryParams = {
        'exchange': exchange
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = [_ForexSymbol["default"]];
      return this.apiClient.callApi('/forex/symbol', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the fundOwnership operation.
     * @callback module:api/DefaultApi~fundOwnershipCallback
     * @param {String} error Error message, if any.
     * @param {module:model/FundOwnership} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Fund Ownership
     * Get a full list fund and institutional investors of a company in descending order of the number of shares held. Data is sourced from <code>13F form</code>, <code>Schedule 13D</code> and <code>13G</code> for US market, <code>UK Share Register</code> for UK market, <code>SEDI</code> for Canadian market and equivalent filings for other international markets.
     * @param {String} symbol Symbol of the company: AAPL.
     * @param {Object} opts Optional parameters
     * @param {Number} opts.limit Limit number of results. Leave empty to get the full list.
     * @param {module:api/DefaultApi~fundOwnershipCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/FundOwnership}
     */

  }, {
    key: "fundOwnership",
    value: function fundOwnership(symbol, opts, callback) {
      opts = opts || {};
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling fundOwnership");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'limit': opts['limit']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _FundOwnership["default"];
      return this.apiClient.callApi('/stock/fund-ownership', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the indicesConstituents operation.
     * @callback module:api/DefaultApi~indicesConstituentsCallback
     * @param {String} error Error message, if any.
     * @param {module:model/IndicesConstituents} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Indices Constituents
     * Get a list of index's constituents. A list of supported indices for this endpoint can be found <a href=\"https://docs.google.com/spreadsheets/d/1Syr2eLielHWsorxkDEZXyc55d6bNx1M3ZeI4vdn7Qzo/edit?usp=sharing\" target=\"_blank\">here</a>.
     * @param {String} symbol symbol
     * @param {module:api/DefaultApi~indicesConstituentsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/IndicesConstituents}
     */

  }, {
    key: "indicesConstituents",
    value: function indicesConstituents(symbol, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling indicesConstituents");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _IndicesConstituents["default"];
      return this.apiClient.callApi('/index/constituents', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the indicesHistoricalConstituents operation.
     * @callback module:api/DefaultApi~indicesHistoricalConstituentsCallback
     * @param {String} error Error message, if any.
     * @param {module:model/IndicesHistoricalConstituents} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Indices Historical Constituents
     * Get full history of index's constituents including symbols and dates of joining and leaving the Index. Currently support <code>^GSPC</code>, <code>^NDX</code>, <code>^DJI</code>
     * @param {String} symbol symbol
     * @param {module:api/DefaultApi~indicesHistoricalConstituentsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/IndicesHistoricalConstituents}
     */

  }, {
    key: "indicesHistoricalConstituents",
    value: function indicesHistoricalConstituents(symbol, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling indicesHistoricalConstituents");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _IndicesHistoricalConstituents["default"];
      return this.apiClient.callApi('/index/historical-constituents', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the insiderSentiment operation.
     * @callback module:api/DefaultApi~insiderSentimentCallback
     * @param {String} error Error message, if any.
     * @param {module:model/InsiderSentiments} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Insider Sentiment
     * Get insider sentiment data for US companies calculated using method discussed <a href=\"https://medium.com/@stock-api/finnhub-insiders-sentiment-analysis-cc43f9f64b3a\" target=\"_blank\">here</a>. The MSPR ranges from -100 for the most negative to 100 for the most positive which can signal price changes in the coming 30-90 days.
     * @param {String} symbol Symbol of the company: AAPL.
     * @param {Date} from From date: 2020-03-15.
     * @param {Date} to To date: 2020-03-16.
     * @param {module:api/DefaultApi~insiderSentimentCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/InsiderSentiments}
     */

  }, {
    key: "insiderSentiment",
    value: function insiderSentiment(symbol, from, to, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling insiderSentiment");
      } // verify the required parameter 'from' is set


      if (from === undefined || from === null) {
        throw new Error("Missing the required parameter 'from' when calling insiderSentiment");
      } // verify the required parameter 'to' is set


      if (to === undefined || to === null) {
        throw new Error("Missing the required parameter 'to' when calling insiderSentiment");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'from': from,
        'to': to
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _InsiderSentiments["default"];
      return this.apiClient.callApi('/stock/insider-sentiment', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the insiderTransactions operation.
     * @callback module:api/DefaultApi~insiderTransactionsCallback
     * @param {String} error Error message, if any.
     * @param {module:model/InsiderTransactions} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Insider Transactions
     * Company insider transactions data sourced from <code>Form 3,4,5</code>. This endpoint only covers US companies at the moment. Limit to 100 transactions per API call.
     * @param {String} symbol Symbol of the company: AAPL. Leave this param blank to get the latest transactions.
     * @param {Object} opts Optional parameters
     * @param {Date} opts.from From date: 2020-03-15.
     * @param {Date} opts.to To date: 2020-03-16.
     * @param {module:api/DefaultApi~insiderTransactionsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/InsiderTransactions}
     */

  }, {
    key: "insiderTransactions",
    value: function insiderTransactions(symbol, opts, callback) {
      opts = opts || {};
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling insiderTransactions");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'from': opts['from'],
        'to': opts['to']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _InsiderTransactions["default"];
      return this.apiClient.callApi('/stock/insider-transactions', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the institutionalOwnership operation.
     * @callback module:api/DefaultApi~institutionalOwnershipCallback
     * @param {String} error Error message, if any.
     * @param {module:model/InstitutionalOwnership} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Institutional Ownership
     * Get a list institutional investors' positions for a particular stock overtime. Data from 13-F filings. Limit to 1 year of data at a time.
     * @param {String} symbol Filter by symbol.
     * @param {String} cusip Filter by CUSIP.
     * @param {String} from From date <code>YYYY-MM-DD</code>.
     * @param {String} to To date <code>YYYY-MM-DD</code>.
     * @param {module:api/DefaultApi~institutionalOwnershipCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/InstitutionalOwnership}
     */

  }, {
    key: "institutionalOwnership",
    value: function institutionalOwnership(symbol, cusip, from, to, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling institutionalOwnership");
      } // verify the required parameter 'cusip' is set


      if (cusip === undefined || cusip === null) {
        throw new Error("Missing the required parameter 'cusip' when calling institutionalOwnership");
      } // verify the required parameter 'from' is set


      if (from === undefined || from === null) {
        throw new Error("Missing the required parameter 'from' when calling institutionalOwnership");
      } // verify the required parameter 'to' is set


      if (to === undefined || to === null) {
        throw new Error("Missing the required parameter 'to' when calling institutionalOwnership");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'cusip': cusip,
        'from': from,
        'to': to
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _InstitutionalOwnership["default"];
      return this.apiClient.callApi('/institutional/ownership', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the institutionalPortfolio operation.
     * @callback module:api/DefaultApi~institutionalPortfolioCallback
     * @param {String} error Error message, if any.
     * @param {module:model/InstitutionalPortfolio} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Institutional Portfolio
     * Get the holdings/portfolio data of institutional investors from 13-F filings. Limit to 1 year of data at a time.
     * @param {String} cik Fund's CIK.
     * @param {String} from From date <code>YYYY-MM-DD</code>.
     * @param {String} to To date <code>YYYY-MM-DD</code>.
     * @param {module:api/DefaultApi~institutionalPortfolioCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/InstitutionalPortfolio}
     */

  }, {
    key: "institutionalPortfolio",
    value: function institutionalPortfolio(cik, from, to, callback) {
      var postBody = null; // verify the required parameter 'cik' is set

      if (cik === undefined || cik === null) {
        throw new Error("Missing the required parameter 'cik' when calling institutionalPortfolio");
      } // verify the required parameter 'from' is set


      if (from === undefined || from === null) {
        throw new Error("Missing the required parameter 'from' when calling institutionalPortfolio");
      } // verify the required parameter 'to' is set


      if (to === undefined || to === null) {
        throw new Error("Missing the required parameter 'to' when calling institutionalPortfolio");
      }

      var pathParams = {};
      var queryParams = {
        'cik': cik,
        'from': from,
        'to': to
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _InstitutionalPortfolio["default"];
      return this.apiClient.callApi('/institutional/portfolio', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the institutionalProfile operation.
     * @callback module:api/DefaultApi~institutionalProfileCallback
     * @param {String} error Error message, if any.
     * @param {module:model/InstitutionalProfile} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Institutional Profile
     * Get a list of well-known institutional investors. Currently support 60+ profiles.
     * @param {Object} opts Optional parameters
     * @param {String} opts.cik Filter by CIK. Leave blank to get the full list.
     * @param {module:api/DefaultApi~institutionalProfileCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/InstitutionalProfile}
     */

  }, {
    key: "institutionalProfile",
    value: function institutionalProfile(opts, callback) {
      opts = opts || {};
      var postBody = null;
      var pathParams = {};
      var queryParams = {
        'cik': opts['cik']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _InstitutionalProfile["default"];
      return this.apiClient.callApi('/institutional/profile', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the internationalFilings operation.
     * @callback module:api/DefaultApi~internationalFilingsCallback
     * @param {String} error Error message, if any.
     * @param {Array.<module:model/InternationalFiling>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * International Filings
     * List filings for international companies. Limit to 250 documents at a time. These are the documents we use to source our fundamental data. Only support SEDAR and UK Companies House for normal usage. Enterprise clients who need access to the full filings for global markets should contact us for the access.
     * @param {Object} opts Optional parameters
     * @param {String} opts.symbol Symbol. Leave empty to list latest filings.
     * @param {String} opts.country Filter by country using country's 2-letter code.
     * @param {module:api/DefaultApi~internationalFilingsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<module:model/InternationalFiling>}
     */

  }, {
    key: "internationalFilings",
    value: function internationalFilings(opts, callback) {
      opts = opts || {};
      var postBody = null;
      var pathParams = {};
      var queryParams = {
        'symbol': opts['symbol'],
        'country': opts['country']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = [_InternationalFiling["default"]];
      return this.apiClient.callApi('/stock/international-filings', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the investmentThemes operation.
     * @callback module:api/DefaultApi~investmentThemesCallback
     * @param {String} error Error message, if any.
     * @param {module:model/InvestmentThemes} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Investment Themes (Thematic Investing)
     * <p>Thematic investing involves creating a portfolio (or portion of a portfolio) by gathering together a collection of companies involved in certain areas that you predict will generate above-market returns over the long term. Themes can be based on a concept such as ageing populations or a sub-sector such as robotics, and drones. Thematic investing focuses on predicted long-term trends rather than specific companies or sectors, enabling investors to access structural, one-off shifts that can change an entire industry.</p><p>This endpoint will help you get portfolios of different investment themes that are changing our life and are the way of the future.</p><p>A full list of themes supported can be found <a target=\"_blank\" href=\"https://docs.google.com/spreadsheets/d/1ULj9xDh4iPoQj279M084adZ2_S852ttRthKKJ7madYc/edit?usp=sharing\">here</a>. The theme coverage and portfolios are updated bi-weekly by our analysts. Our approach excludes penny, super-small cap and illiquid stocks.</p>
     * @param {String} theme Investment theme. A full list of themes supported can be found <a target=\"_blank\" href=\"https://docs.google.com/spreadsheets/d/1ULj9xDh4iPoQj279M084adZ2_S852ttRthKKJ7madYc/edit?usp=sharing\">here</a>.
     * @param {module:api/DefaultApi~investmentThemesCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/InvestmentThemes}
     */

  }, {
    key: "investmentThemes",
    value: function investmentThemes(theme, callback) {
      var postBody = null; // verify the required parameter 'theme' is set

      if (theme === undefined || theme === null) {
        throw new Error("Missing the required parameter 'theme' when calling investmentThemes");
      }

      var pathParams = {};
      var queryParams = {
        'theme': theme
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _InvestmentThemes["default"];
      return this.apiClient.callApi('/stock/investment-theme', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the ipoCalendar operation.
     * @callback module:api/DefaultApi~ipoCalendarCallback
     * @param {String} error Error message, if any.
     * @param {module:model/IPOCalendar} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * IPO Calendar
     * Get recent and upcoming IPO.
     * @param {Date} from From date: 2020-03-15.
     * @param {Date} to To date: 2020-03-16.
     * @param {module:api/DefaultApi~ipoCalendarCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/IPOCalendar}
     */

  }, {
    key: "ipoCalendar",
    value: function ipoCalendar(from, to, callback) {
      var postBody = null; // verify the required parameter 'from' is set

      if (from === undefined || from === null) {
        throw new Error("Missing the required parameter 'from' when calling ipoCalendar");
      } // verify the required parameter 'to' is set


      if (to === undefined || to === null) {
        throw new Error("Missing the required parameter 'to' when calling ipoCalendar");
      }

      var pathParams = {};
      var queryParams = {
        'from': from,
        'to': to
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _IPOCalendar["default"];
      return this.apiClient.callApi('/calendar/ipo', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the isinChange operation.
     * @callback module:api/DefaultApi~isinChangeCallback
     * @param {String} error Error message, if any.
     * @param {module:model/IsinChange} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * ISIN Change
     * Get a list of ISIN changes for EU-listed securities. Limit to 2000 events at a time.
     * @param {String} from From date <code>YYYY-MM-DD</code>.
     * @param {String} to To date <code>YYYY-MM-DD</code>.
     * @param {module:api/DefaultApi~isinChangeCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/IsinChange}
     */

  }, {
    key: "isinChange",
    value: function isinChange(from, to, callback) {
      var postBody = null; // verify the required parameter 'from' is set

      if (from === undefined || from === null) {
        throw new Error("Missing the required parameter 'from' when calling isinChange");
      } // verify the required parameter 'to' is set


      if (to === undefined || to === null) {
        throw new Error("Missing the required parameter 'to' when calling isinChange");
      }

      var pathParams = {};
      var queryParams = {
        'from': from,
        'to': to
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _IsinChange["default"];
      return this.apiClient.callApi('/ca/isin-change', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the marketNews operation.
     * @callback module:api/DefaultApi~marketNewsCallback
     * @param {String} error Error message, if any.
     * @param {Array.<module:model/MarketNews>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Market News
     * Get latest market news.
     * @param {String} category This parameter can be 1 of the following values <code>general, forex, crypto, merger</code>.
     * @param {Object} opts Optional parameters
     * @param {Number} opts.minId Use this field to get only news after this ID. Default to 0
     * @param {module:api/DefaultApi~marketNewsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<module:model/MarketNews>}
     */

  }, {
    key: "marketNews",
    value: function marketNews(category, opts, callback) {
      opts = opts || {};
      var postBody = null; // verify the required parameter 'category' is set

      if (category === undefined || category === null) {
        throw new Error("Missing the required parameter 'category' when calling marketNews");
      }

      var pathParams = {};
      var queryParams = {
        'category': category,
        'minId': opts['minId']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = [_MarketNews["default"]];
      return this.apiClient.callApi('/news', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the mutualFundCountryExposure operation.
     * @callback module:api/DefaultApi~mutualFundCountryExposureCallback
     * @param {String} error Error message, if any.
     * @param {module:model/MutualFundCountryExposure} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Mutual Funds Country Exposure
     * Get Mutual Funds country exposure data.
     * @param {String} symbol Symbol.
     * @param {module:api/DefaultApi~mutualFundCountryExposureCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/MutualFundCountryExposure}
     */

  }, {
    key: "mutualFundCountryExposure",
    value: function mutualFundCountryExposure(symbol, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling mutualFundCountryExposure");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _MutualFundCountryExposure["default"];
      return this.apiClient.callApi('/mutual-fund/country', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the mutualFundHoldings operation.
     * @callback module:api/DefaultApi~mutualFundHoldingsCallback
     * @param {String} error Error message, if any.
     * @param {module:model/MutualFundHoldings} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Mutual Funds Holdings
     * Get full Mutual Funds holdings/constituents. This endpoint covers both US and global mutual funds. For international funds, you must query the data using ISIN.
     * @param {Object} opts Optional parameters
     * @param {String} opts.symbol Fund's symbol.
     * @param {String} opts.isin Fund's isin.
     * @param {Number} opts.skip Skip the first n results. You can use this parameter to query historical constituents data. The latest result is returned if skip=0 or not set.
     * @param {module:api/DefaultApi~mutualFundHoldingsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/MutualFundHoldings}
     */

  }, {
    key: "mutualFundHoldings",
    value: function mutualFundHoldings(opts, callback) {
      opts = opts || {};
      var postBody = null;
      var pathParams = {};
      var queryParams = {
        'symbol': opts['symbol'],
        'isin': opts['isin'],
        'skip': opts['skip']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _MutualFundHoldings["default"];
      return this.apiClient.callApi('/mutual-fund/holdings', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the mutualFundProfile operation.
     * @callback module:api/DefaultApi~mutualFundProfileCallback
     * @param {String} error Error message, if any.
     * @param {module:model/MutualFundProfile} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Mutual Funds Profile
     * Get mutual funds profile information. This endpoint covers both US and global mutual funds. For international funds, you must query the data using ISIN.
     * @param {Object} opts Optional parameters
     * @param {String} opts.symbol Fund's symbol.
     * @param {String} opts.isin Fund's isin.
     * @param {module:api/DefaultApi~mutualFundProfileCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/MutualFundProfile}
     */

  }, {
    key: "mutualFundProfile",
    value: function mutualFundProfile(opts, callback) {
      opts = opts || {};
      var postBody = null;
      var pathParams = {};
      var queryParams = {
        'symbol': opts['symbol'],
        'isin': opts['isin']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _MutualFundProfile["default"];
      return this.apiClient.callApi('/mutual-fund/profile', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the mutualFundSectorExposure operation.
     * @callback module:api/DefaultApi~mutualFundSectorExposureCallback
     * @param {String} error Error message, if any.
     * @param {module:model/MutualFundSectorExposure} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Mutual Funds Sector Exposure
     * Get Mutual Funds sector exposure data.
     * @param {String} symbol Mutual Fund symbol.
     * @param {module:api/DefaultApi~mutualFundSectorExposureCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/MutualFundSectorExposure}
     */

  }, {
    key: "mutualFundSectorExposure",
    value: function mutualFundSectorExposure(symbol, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling mutualFundSectorExposure");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _MutualFundSectorExposure["default"];
      return this.apiClient.callApi('/mutual-fund/sector', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the newsSentiment operation.
     * @callback module:api/DefaultApi~newsSentimentCallback
     * @param {String} error Error message, if any.
     * @param {module:model/NewsSentiment} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * News Sentiment
     * Get company's news sentiment and statistics. This endpoint is only available for US companies.
     * @param {String} symbol Company symbol.
     * @param {module:api/DefaultApi~newsSentimentCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/NewsSentiment}
     */

  }, {
    key: "newsSentiment",
    value: function newsSentiment(symbol, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling newsSentiment");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _NewsSentiment["default"];
      return this.apiClient.callApi('/news-sentiment', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the ownership operation.
     * @callback module:api/DefaultApi~ownershipCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Ownership} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Ownership
     * Get a full list of shareholders of a company in descending order of the number of shares held. Data is sourced from <code>13F form</code>, <code>Schedule 13D</code> and <code>13G</code> for US market, <code>UK Share Register</code> for UK market, <code>SEDI</code> for Canadian market and equivalent filings for other international markets.
     * @param {String} symbol Symbol of the company: AAPL.
     * @param {Object} opts Optional parameters
     * @param {Number} opts.limit Limit number of results. Leave empty to get the full list.
     * @param {module:api/DefaultApi~ownershipCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Ownership}
     */

  }, {
    key: "ownership",
    value: function ownership(symbol, opts, callback) {
      opts = opts || {};
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling ownership");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'limit': opts['limit']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _Ownership["default"];
      return this.apiClient.callApi('/stock/ownership', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the patternRecognition operation.
     * @callback module:api/DefaultApi~patternRecognitionCallback
     * @param {String} error Error message, if any.
     * @param {module:model/PatternRecognition} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Pattern Recognition
     * Run pattern recognition algorithm on a symbol. Support double top/bottom, triple top/bottom, head and shoulders, triangle, wedge, channel, flag, and candlestick patterns.
     * @param {String} symbol Symbol
     * @param {String} resolution Supported resolution includes <code>1, 5, 15, 30, 60, D, W, M </code>.Some timeframes might not be available depending on the exchange.
     * @param {module:api/DefaultApi~patternRecognitionCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/PatternRecognition}
     */

  }, {
    key: "patternRecognition",
    value: function patternRecognition(symbol, resolution, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling patternRecognition");
      } // verify the required parameter 'resolution' is set


      if (resolution === undefined || resolution === null) {
        throw new Error("Missing the required parameter 'resolution' when calling patternRecognition");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'resolution': resolution
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _PatternRecognition["default"];
      return this.apiClient.callApi('/scan/pattern', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the pressReleases operation.
     * @callback module:api/DefaultApi~pressReleasesCallback
     * @param {String} error Error message, if any.
     * @param {module:model/PressRelease} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Major Press Releases
     * <p>Get latest major press releases of a company. This data can be used to highlight the most significant events comprised of mostly press releases sourced from the exchanges, BusinessWire, AccessWire, GlobeNewswire, Newsfile, and PRNewswire.</p><p>Full-text press releases data is available for Enterprise clients. <a href=\"mailto:support@finnhub.io\">Contact Us</a> to learn more.</p>
     * @param {String} symbol Company symbol.
     * @param {Object} opts Optional parameters
     * @param {Date} opts.from From time: 2020-01-01.
     * @param {Date} opts.to To time: 2020-01-05.
     * @param {module:api/DefaultApi~pressReleasesCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/PressRelease}
     */

  }, {
    key: "pressReleases",
    value: function pressReleases(symbol, opts, callback) {
      opts = opts || {};
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling pressReleases");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'from': opts['from'],
        'to': opts['to']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _PressRelease["default"];
      return this.apiClient.callApi('/press-releases', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the priceMetrics operation.
     * @callback module:api/DefaultApi~priceMetricsCallback
     * @param {String} error Error message, if any.
     * @param {module:model/PriceMetrics} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Price Metrics
     * Get company price performance statistics such as 52-week high/low, YTD return and much more.
     * @param {String} symbol Symbol of the company: AAPL.
     * @param {module:api/DefaultApi~priceMetricsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/PriceMetrics}
     */

  }, {
    key: "priceMetrics",
    value: function priceMetrics(symbol, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling priceMetrics");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _PriceMetrics["default"];
      return this.apiClient.callApi('/stock/price-metric', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the priceTarget operation.
     * @callback module:api/DefaultApi~priceTargetCallback
     * @param {String} error Error message, if any.
     * @param {module:model/PriceTarget} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Price Target
     * Get latest price target consensus.
     * @param {String} symbol Symbol of the company: AAPL.
     * @param {module:api/DefaultApi~priceTargetCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/PriceTarget}
     */

  }, {
    key: "priceTarget",
    value: function priceTarget(symbol, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling priceTarget");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _PriceTarget["default"];
      return this.apiClient.callApi('/stock/price-target', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the quote operation.
     * @callback module:api/DefaultApi~quoteCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Quote} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Quote
     * <p>Get real-time quote data for US stocks. Constant polling is not recommended. Use websocket if you need real-time updates.</p><p>Real-time stock prices for international markets are supported for Enterprise clients via our partner's feed. <a href=\"mailto:support@finnhub.io\">Contact Us</a> to learn more.</p>
     * @param {String} symbol Symbol
     * @param {module:api/DefaultApi~quoteCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Quote}
     */

  }, {
    key: "quote",
    value: function quote(symbol, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling quote");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _Quote["default"];
      return this.apiClient.callApi('/quote', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the recommendationTrends operation.
     * @callback module:api/DefaultApi~recommendationTrendsCallback
     * @param {String} error Error message, if any.
     * @param {Array.<module:model/RecommendationTrend>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Recommendation Trends
     * Get latest analyst recommendation trends for a company.
     * @param {String} symbol Symbol of the company: AAPL.
     * @param {module:api/DefaultApi~recommendationTrendsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<module:model/RecommendationTrend>}
     */

  }, {
    key: "recommendationTrends",
    value: function recommendationTrends(symbol, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling recommendationTrends");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = [_RecommendationTrend["default"]];
      return this.apiClient.callApi('/stock/recommendation', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the revenueBreakdown operation.
     * @callback module:api/DefaultApi~revenueBreakdownCallback
     * @param {String} error Error message, if any.
     * @param {module:model/RevenueBreakdown} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Revenue Breakdown
     * Get revenue breakdown by product. This dataset is only available for US companies which disclose their revenue breakdown in the annual or quarterly reports.
     * @param {Object} opts Optional parameters
     * @param {String} opts.symbol Symbol.
     * @param {String} opts.cik CIK.
     * @param {module:api/DefaultApi~revenueBreakdownCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/RevenueBreakdown}
     */

  }, {
    key: "revenueBreakdown",
    value: function revenueBreakdown(opts, callback) {
      opts = opts || {};
      var postBody = null;
      var pathParams = {};
      var queryParams = {
        'symbol': opts['symbol'],
        'cik': opts['cik']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _RevenueBreakdown["default"];
      return this.apiClient.callApi('/stock/revenue-breakdown', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the sectorMetric operation.
     * @callback module:api/DefaultApi~sectorMetricCallback
     * @param {String} error Error message, if any.
     * @param {module:model/SectorMetric} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Sector Metrics
     * Get ratios for different sectors and regions/indices.
     * @param {String} region Region. A list of supported values for this field can be found <a href=\"https://docs.google.com/spreadsheets/d/1afedyv7yWJ-z7pMjaAZK-f6ENY3mI3EBCk95QffpoHw/edit?usp=sharing\" target=\"_blank\">here</a>.
     * @param {module:api/DefaultApi~sectorMetricCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/SectorMetric}
     */

  }, {
    key: "sectorMetric",
    value: function sectorMetric(region, callback) {
      var postBody = null; // verify the required parameter 'region' is set

      if (region === undefined || region === null) {
        throw new Error("Missing the required parameter 'region' when calling sectorMetric");
      }

      var pathParams = {};
      var queryParams = {
        'region': region
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _SectorMetric["default"];
      return this.apiClient.callApi('/sector/metrics', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the similarityIndex operation.
     * @callback module:api/DefaultApi~similarityIndexCallback
     * @param {String} error Error message, if any.
     * @param {module:model/SimilarityIndex} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Similarity Index
     * <p>Calculate the textual difference between a company's 10-K / 10-Q reports and the same type of report in the previous year using Cosine Similarity. For example, this endpoint compares 2019's 10-K with 2018's 10-K. Companies breaking from its routines in disclosure of financial condition and risk analysis section can signal a significant change in the company's stock price in the upcoming 4 quarters.</p>
     * @param {Object} opts Optional parameters
     * @param {String} opts.symbol Symbol. Required if cik is empty
     * @param {String} opts.cik CIK. Required if symbol is empty
     * @param {String} opts.freq <code>annual</code> or <code>quarterly</code>. Default to <code>annual</code>
     * @param {module:api/DefaultApi~similarityIndexCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/SimilarityIndex}
     */

  }, {
    key: "similarityIndex",
    value: function similarityIndex(opts, callback) {
      opts = opts || {};
      var postBody = null;
      var pathParams = {};
      var queryParams = {
        'symbol': opts['symbol'],
        'cik': opts['cik'],
        'freq': opts['freq']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _SimilarityIndex["default"];
      return this.apiClient.callApi('/stock/similarity-index', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the socialSentiment operation.
     * @callback module:api/DefaultApi~socialSentimentCallback
     * @param {String} error Error message, if any.
     * @param {module:model/SocialSentiment} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Social Sentiment
     * <p>Get social sentiment for stocks on Reddit and Twitter. This endpoint is currently in Beta.</p>
     * @param {String} symbol Company symbol.
     * @param {Object} opts Optional parameters
     * @param {Date} opts.from From date <code>YYYY-MM-DD</code>.
     * @param {Date} opts.to To date <code>YYYY-MM-DD</code>.
     * @param {module:api/DefaultApi~socialSentimentCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/SocialSentiment}
     */

  }, {
    key: "socialSentiment",
    value: function socialSentiment(symbol, opts, callback) {
      opts = opts || {};
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling socialSentiment");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'from': opts['from'],
        'to': opts['to']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _SocialSentiment["default"];
      return this.apiClient.callApi('/stock/social-sentiment', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the stockBasicDividends operation.
     * @callback module:api/DefaultApi~stockBasicDividendsCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Dividends2} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Dividends 2 (Basic)
     * Get global dividends data.
     * @param {String} symbol Symbol.
     * @param {module:api/DefaultApi~stockBasicDividendsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Dividends2}
     */

  }, {
    key: "stockBasicDividends",
    value: function stockBasicDividends(symbol, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling stockBasicDividends");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _Dividends2["default"];
      return this.apiClient.callApi('/stock/dividend2', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the stockBidask operation.
     * @callback module:api/DefaultApi~stockBidaskCallback
     * @param {String} error Error message, if any.
     * @param {module:model/LastBidAsk} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Last Bid-Ask
     * Get last bid/ask data for US stocks.
     * @param {String} symbol Symbol.
     * @param {module:api/DefaultApi~stockBidaskCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/LastBidAsk}
     */

  }, {
    key: "stockBidask",
    value: function stockBidask(symbol, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling stockBidask");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _LastBidAsk["default"];
      return this.apiClient.callApi('/stock/bidask', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the stockCandles operation.
     * @callback module:api/DefaultApi~stockCandlesCallback
     * @param {String} error Error message, if any.
     * @param {module:model/StockCandles} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Stock Candles
     * <p>Get candlestick data (OHLCV) for stocks.</p><p>Daily data will be adjusted for Splits. Intraday data will remain unadjusted.</p>
     * @param {String} symbol Symbol.
     * @param {String} resolution Supported resolution includes <code>1, 5, 15, 30, 60, D, W, M </code>.Some timeframes might not be available depending on the exchange.
     * @param {Number} from UNIX timestamp. Interval initial value.
     * @param {Number} to UNIX timestamp. Interval end value.
     * @param {module:api/DefaultApi~stockCandlesCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/StockCandles}
     */

  }, {
    key: "stockCandles",
    value: function stockCandles(symbol, resolution, from, to, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling stockCandles");
      } // verify the required parameter 'resolution' is set


      if (resolution === undefined || resolution === null) {
        throw new Error("Missing the required parameter 'resolution' when calling stockCandles");
      } // verify the required parameter 'from' is set


      if (from === undefined || from === null) {
        throw new Error("Missing the required parameter 'from' when calling stockCandles");
      } // verify the required parameter 'to' is set


      if (to === undefined || to === null) {
        throw new Error("Missing the required parameter 'to' when calling stockCandles");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'resolution': resolution,
        'from': from,
        'to': to
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _StockCandles["default"];
      return this.apiClient.callApi('/stock/candle', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the stockDividends operation.
     * @callback module:api/DefaultApi~stockDividendsCallback
     * @param {String} error Error message, if any.
     * @param {Array.<module:model/Dividends>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Dividends
     * Get dividends data for common stocks going back 30 years.
     * @param {String} symbol Symbol.
     * @param {Date} from YYYY-MM-DD.
     * @param {Date} to YYYY-MM-DD.
     * @param {module:api/DefaultApi~stockDividendsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<module:model/Dividends>}
     */

  }, {
    key: "stockDividends",
    value: function stockDividends(symbol, from, to, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling stockDividends");
      } // verify the required parameter 'from' is set


      if (from === undefined || from === null) {
        throw new Error("Missing the required parameter 'from' when calling stockDividends");
      } // verify the required parameter 'to' is set


      if (to === undefined || to === null) {
        throw new Error("Missing the required parameter 'to' when calling stockDividends");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'from': from,
        'to': to
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = [_Dividends["default"]];
      return this.apiClient.callApi('/stock/dividend', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the stockLobbying operation.
     * @callback module:api/DefaultApi~stockLobbyingCallback
     * @param {String} error Error message, if any.
     * @param {module:model/LobbyingResult} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Senate Lobbying
     * Get a list of reported lobbying activities in the Senate and the House.
     * @param {String} symbol Symbol.
     * @param {Date} from From date <code>YYYY-MM-DD</code>.
     * @param {Date} to To date <code>YYYY-MM-DD</code>.
     * @param {module:api/DefaultApi~stockLobbyingCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/LobbyingResult}
     */

  }, {
    key: "stockLobbying",
    value: function stockLobbying(symbol, from, to, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling stockLobbying");
      } // verify the required parameter 'from' is set


      if (from === undefined || from === null) {
        throw new Error("Missing the required parameter 'from' when calling stockLobbying");
      } // verify the required parameter 'to' is set


      if (to === undefined || to === null) {
        throw new Error("Missing the required parameter 'to' when calling stockLobbying");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'from': from,
        'to': to
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _LobbyingResult["default"];
      return this.apiClient.callApi('/stock/lobbying', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the stockNbbo operation.
     * @callback module:api/DefaultApi~stockNbboCallback
     * @param {String} error Error message, if any.
     * @param {module:model/HistoricalNBBO} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Historical NBBO
     * <p>Get historical best bid and offer for US stocks, LSE, TSX, Euronext and Deutsche Borse.</p><p>For US market, this endpoint only serves historical NBBO from the beginning of 2020. To download more historical data, please visit our bulk download page in the Dashboard <a target=\"_blank\" href=\"/dashboard/download\",>here</a>.</p>
     * @param {String} symbol Symbol.
     * @param {Date} date Date: 2020-04-02.
     * @param {Number} limit Limit number of ticks returned. Maximum value: <code>25000</code>
     * @param {Number} skip Number of ticks to skip. Use this parameter to loop through the entire data.
     * @param {module:api/DefaultApi~stockNbboCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/HistoricalNBBO}
     */

  }, {
    key: "stockNbbo",
    value: function stockNbbo(symbol, date, limit, skip, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling stockNbbo");
      } // verify the required parameter 'date' is set


      if (date === undefined || date === null) {
        throw new Error("Missing the required parameter 'date' when calling stockNbbo");
      } // verify the required parameter 'limit' is set


      if (limit === undefined || limit === null) {
        throw new Error("Missing the required parameter 'limit' when calling stockNbbo");
      } // verify the required parameter 'skip' is set


      if (skip === undefined || skip === null) {
        throw new Error("Missing the required parameter 'skip' when calling stockNbbo");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'date': date,
        'limit': limit,
        'skip': skip
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _HistoricalNBBO["default"];
      return this.apiClient.callApi('/stock/bbo', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the stockSplits operation.
     * @callback module:api/DefaultApi~stockSplitsCallback
     * @param {String} error Error message, if any.
     * @param {Array.<module:model/Split>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Splits
     * Get splits data for stocks.
     * @param {String} symbol Symbol.
     * @param {Date} from YYYY-MM-DD.
     * @param {Date} to YYYY-MM-DD.
     * @param {module:api/DefaultApi~stockSplitsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<module:model/Split>}
     */

  }, {
    key: "stockSplits",
    value: function stockSplits(symbol, from, to, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling stockSplits");
      } // verify the required parameter 'from' is set


      if (from === undefined || from === null) {
        throw new Error("Missing the required parameter 'from' when calling stockSplits");
      } // verify the required parameter 'to' is set


      if (to === undefined || to === null) {
        throw new Error("Missing the required parameter 'to' when calling stockSplits");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'from': from,
        'to': to
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = [_Split["default"]];
      return this.apiClient.callApi('/stock/split', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the stockSymbols operation.
     * @callback module:api/DefaultApi~stockSymbolsCallback
     * @param {String} error Error message, if any.
     * @param {Array.<module:model/StockSymbol>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Stock Symbol
     * List supported stocks. We use the following symbology to identify stocks on Finnhub <code>Exchange_Ticker.Exchange_Code</code>. A list of supported exchange codes can be found <a href=\"https://docs.google.com/spreadsheets/d/1I3pBxjfXB056-g_JYf_6o3Rns3BV2kMGG1nCatb91ls/edit?usp=sharing\" target=\"_blank\">here</a>.
     * @param {String} exchange Exchange you want to get the list of symbols from. List of exchange codes can be found <a href=\"https://docs.google.com/spreadsheets/d/1I3pBxjfXB056-g_JYf_6o3Rns3BV2kMGG1nCatb91ls/edit?usp=sharing\" target=\"_blank\">here</a>.
     * @param {Object} opts Optional parameters
     * @param {String} opts.mic Filter by MIC code.
     * @param {String} opts.securityType Filter by security type used by OpenFigi standard.
     * @param {String} opts.currency Filter by currency.
     * @param {module:api/DefaultApi~stockSymbolsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<module:model/StockSymbol>}
     */

  }, {
    key: "stockSymbols",
    value: function stockSymbols(exchange, opts, callback) {
      opts = opts || {};
      var postBody = null; // verify the required parameter 'exchange' is set

      if (exchange === undefined || exchange === null) {
        throw new Error("Missing the required parameter 'exchange' when calling stockSymbols");
      }

      var pathParams = {};
      var queryParams = {
        'exchange': exchange,
        'mic': opts['mic'],
        'securityType': opts['securityType'],
        'currency': opts['currency']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = [_StockSymbol["default"]];
      return this.apiClient.callApi('/stock/symbol', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the stockTick operation.
     * @callback module:api/DefaultApi~stockTickCallback
     * @param {String} error Error message, if any.
     * @param {module:model/TickData} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Tick Data
     * <p>Get historical tick data for global exchanges. You can send the request directly to our tick server at <a href=\"https://tick.finnhub.io/\">https://tick.finnhub.io/</a> with the same path and parameters or get redirected there if you call our main server.</p><p>For US market, you can visit our bulk download page in the Dashboard <a target=\"_blank\" href=\"/dashboard/download\",>here</a> to speed up the download process.</p><table class=\"table table-hover\">   <thead>     <tr>       <th>Exchange</th>       <th>Segment</th>       <th>Delay</th>     </tr>   </thead>   <tbody>     <tr>       <td class=\"text-blue\">US CTA/UTP</th>       <td>Full SIP</td>       <td>15 minute</td>     </tr>     <tr>       <td class=\"text-blue\">TSX</th>       <td><ul><li>TSX</li><li>TSX Venture</li><li>Index</li></ul></td>       <td>End-of-day</td>     </tr>     <tr>       <td class=\"text-blue\">LSE</th>       <td><ul><li>London Stock Exchange (L)</li><li>LSE International (L)</li><li>LSE European (L)</li></ul></td>       <td>15 minute</td>     </tr>     <tr>       <td class=\"text-blue\">Euronext</th>       <td><ul> <li>Euronext Paris (PA)</li> <li>Euronext Amsterdam (AS)</li> <li>Euronext Lisbon (LS)</li> <li>Euronext Brussels (BR)</li> <li>Euronext Oslo (OL)</li> <li>Euronext London (LN)</li> <li>Euronext Dublin (IR)</li> <li>Index</li> <li>Warrant</li></ul></td>       <td>End-of-day</td>     </tr>     <tr>       <td class=\"text-blue\">Deutsche Börse</th>       <td><ul> <li>Frankfurt (F)</li> <li>Xetra (DE)</li> <li>Duesseldorf (DU)</li> <li>Hamburg (HM)</li> <li>Berlin (BE)</li> <li>Hanover (HA)</li> <li>Stoxx (SX)</li> <li>TradeGate (TG)</li> <li>Zertifikate (SC)</li> <li>Index</li> <li>Warrant</li></ul></td>       <td>End-of-day</td>     </tr>   </tbody> </table>
     * @param {String} symbol Symbol.
     * @param {Date} date Date: 2020-04-02.
     * @param {Number} limit Limit number of ticks returned. Maximum value: <code>25000</code>
     * @param {Number} skip Number of ticks to skip. Use this parameter to loop through the entire data.
     * @param {module:api/DefaultApi~stockTickCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/TickData}
     */

  }, {
    key: "stockTick",
    value: function stockTick(symbol, date, limit, skip, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling stockTick");
      } // verify the required parameter 'date' is set


      if (date === undefined || date === null) {
        throw new Error("Missing the required parameter 'date' when calling stockTick");
      } // verify the required parameter 'limit' is set


      if (limit === undefined || limit === null) {
        throw new Error("Missing the required parameter 'limit' when calling stockTick");
      } // verify the required parameter 'skip' is set


      if (skip === undefined || skip === null) {
        throw new Error("Missing the required parameter 'skip' when calling stockTick");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'date': date,
        'limit': limit,
        'skip': skip
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _TickData["default"];
      return this.apiClient.callApi('/stock/tick', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the stockUsaSpending operation.
     * @callback module:api/DefaultApi~stockUsaSpendingCallback
     * @param {String} error Error message, if any.
     * @param {module:model/UsaSpendingResult} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * USA Spending
     * Get a list of government's spending activities from USASpending dataset for public companies. This dataset can help you identify companies that win big government contracts which is extremely important for industries such as Defense, Aerospace, and Education.
     * @param {String} symbol Symbol.
     * @param {Date} from From date <code>YYYY-MM-DD</code>. Filter for <code>actionDate</code>
     * @param {Date} to To date <code>YYYY-MM-DD</code>. Filter for <code>actionDate</code>
     * @param {module:api/DefaultApi~stockUsaSpendingCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/UsaSpendingResult}
     */

  }, {
    key: "stockUsaSpending",
    value: function stockUsaSpending(symbol, from, to, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling stockUsaSpending");
      } // verify the required parameter 'from' is set


      if (from === undefined || from === null) {
        throw new Error("Missing the required parameter 'from' when calling stockUsaSpending");
      } // verify the required parameter 'to' is set


      if (to === undefined || to === null) {
        throw new Error("Missing the required parameter 'to' when calling stockUsaSpending");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'from': from,
        'to': to
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _UsaSpendingResult["default"];
      return this.apiClient.callApi('/stock/usa-spending', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the stockUsptoPatent operation.
     * @callback module:api/DefaultApi~stockUsptoPatentCallback
     * @param {String} error Error message, if any.
     * @param {module:model/UsptoPatentResult} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * USPTO Patents
     * List USPTO patents for companies. Limit to 250 records per API call.
     * @param {String} symbol Symbol.
     * @param {Date} from From date <code>YYYY-MM-DD</code>.
     * @param {Date} to To date <code>YYYY-MM-DD</code>.
     * @param {module:api/DefaultApi~stockUsptoPatentCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/UsptoPatentResult}
     */

  }, {
    key: "stockUsptoPatent",
    value: function stockUsptoPatent(symbol, from, to, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling stockUsptoPatent");
      } // verify the required parameter 'from' is set


      if (from === undefined || from === null) {
        throw new Error("Missing the required parameter 'from' when calling stockUsptoPatent");
      } // verify the required parameter 'to' is set


      if (to === undefined || to === null) {
        throw new Error("Missing the required parameter 'to' when calling stockUsptoPatent");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'from': from,
        'to': to
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _UsptoPatentResult["default"];
      return this.apiClient.callApi('/stock/uspto-patent', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the stockVisaApplication operation.
     * @callback module:api/DefaultApi~stockVisaApplicationCallback
     * @param {String} error Error message, if any.
     * @param {module:model/VisaApplicationResult} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * H1-B Visa Application
     * Get a list of H1-B and Permanent visa applications for companies from the DOL. The data is updated quarterly.
     * @param {String} symbol Symbol.
     * @param {Date} from From date <code>YYYY-MM-DD</code>. Filter on the <code>beginDate</code> column.
     * @param {Date} to To date <code>YYYY-MM-DD</code>. Filter on the <code>beginDate</code> column.
     * @param {module:api/DefaultApi~stockVisaApplicationCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/VisaApplicationResult}
     */

  }, {
    key: "stockVisaApplication",
    value: function stockVisaApplication(symbol, from, to, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling stockVisaApplication");
      } // verify the required parameter 'from' is set


      if (from === undefined || from === null) {
        throw new Error("Missing the required parameter 'from' when calling stockVisaApplication");
      } // verify the required parameter 'to' is set


      if (to === undefined || to === null) {
        throw new Error("Missing the required parameter 'to' when calling stockVisaApplication");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'from': from,
        'to': to
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _VisaApplicationResult["default"];
      return this.apiClient.callApi('/stock/visa-application', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the supplyChainRelationships operation.
     * @callback module:api/DefaultApi~supplyChainRelationshipsCallback
     * @param {String} error Error message, if any.
     * @param {module:model/SupplyChainRelationships} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Supply Chain Relationships
     * <p>This endpoint provides an overall map of public companies' key customers and suppliers. The data offers a deeper look into a company's supply chain and how products are created. The data will help investors manage risk, limit exposure or generate alpha-generating ideas and trading insights.</p>
     * @param {String} symbol Symbol.
     * @param {module:api/DefaultApi~supplyChainRelationshipsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/SupplyChainRelationships}
     */

  }, {
    key: "supplyChainRelationships",
    value: function supplyChainRelationships(symbol, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling supplyChainRelationships");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _SupplyChainRelationships["default"];
      return this.apiClient.callApi('/stock/supply-chain', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the supportResistance operation.
     * @callback module:api/DefaultApi~supportResistanceCallback
     * @param {String} error Error message, if any.
     * @param {module:model/SupportResistance} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Support/Resistance
     * Get support and resistance levels for a symbol.
     * @param {String} symbol Symbol
     * @param {String} resolution Supported resolution includes <code>1, 5, 15, 30, 60, D, W, M </code>.Some timeframes might not be available depending on the exchange.
     * @param {module:api/DefaultApi~supportResistanceCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/SupportResistance}
     */

  }, {
    key: "supportResistance",
    value: function supportResistance(symbol, resolution, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling supportResistance");
      } // verify the required parameter 'resolution' is set


      if (resolution === undefined || resolution === null) {
        throw new Error("Missing the required parameter 'resolution' when calling supportResistance");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'resolution': resolution
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _SupportResistance["default"];
      return this.apiClient.callApi('/scan/support-resistance', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the symbolChange operation.
     * @callback module:api/DefaultApi~symbolChangeCallback
     * @param {String} error Error message, if any.
     * @param {module:model/SymbolChange} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Symbol Change
     * Get a list of symbol changes for US-listed and EU-listed securities. Limit to 2000 events at a time.
     * @param {String} from From date <code>YYYY-MM-DD</code>.
     * @param {String} to To date <code>YYYY-MM-DD</code>.
     * @param {module:api/DefaultApi~symbolChangeCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/SymbolChange}
     */

  }, {
    key: "symbolChange",
    value: function symbolChange(from, to, callback) {
      var postBody = null; // verify the required parameter 'from' is set

      if (from === undefined || from === null) {
        throw new Error("Missing the required parameter 'from' when calling symbolChange");
      } // verify the required parameter 'to' is set


      if (to === undefined || to === null) {
        throw new Error("Missing the required parameter 'to' when calling symbolChange");
      }

      var pathParams = {};
      var queryParams = {
        'from': from,
        'to': to
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _SymbolChange["default"];
      return this.apiClient.callApi('/ca/symbol-change', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the symbolSearch operation.
     * @callback module:api/DefaultApi~symbolSearchCallback
     * @param {String} error Error message, if any.
     * @param {module:model/SymbolLookup} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Symbol Lookup
     * Search for best-matching symbols based on your query. You can input anything from symbol, security's name to ISIN and Cusip.
     * @param {String} q Query text can be symbol, name, isin, or cusip.
     * @param {module:api/DefaultApi~symbolSearchCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/SymbolLookup}
     */

  }, {
    key: "symbolSearch",
    value: function symbolSearch(q, callback) {
      var postBody = null; // verify the required parameter 'q' is set

      if (q === undefined || q === null) {
        throw new Error("Missing the required parameter 'q' when calling symbolSearch");
      }

      var pathParams = {};
      var queryParams = {
        'q': q
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _SymbolLookup["default"];
      return this.apiClient.callApi('/search', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the technicalIndicator operation.
     * @callback module:api/DefaultApi~technicalIndicatorCallback
     * @param {String} error Error message, if any.
     * @param {Object} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Technical Indicators
     * Return technical indicator with price data. List of supported indicators can be found <a href=\"https://docs.google.com/spreadsheets/d/1ylUvKHVYN2E87WdwIza8ROaCpd48ggEl1k5i5SgA29k/edit?usp=sharing\" target=\"_blank\">here</a>.
     * @param {String} symbol symbol
     * @param {String} resolution Supported resolution includes <code>1, 5, 15, 30, 60, D, W, M </code>.Some timeframes might not be available depending on the exchange.
     * @param {Number} from UNIX timestamp. Interval initial value.
     * @param {Number} to UNIX timestamp. Interval end value.
     * @param {String} indicator Indicator name. Full list can be found <a href=\"https://docs.google.com/spreadsheets/d/1ylUvKHVYN2E87WdwIza8ROaCpd48ggEl1k5i5SgA29k/edit?usp=sharing\" target=\"_blank\">here</a>.
     * @param {Object} opts Optional parameters
     * @param {Object} opts.indicatorFields Check out <a href=\"https://docs.google.com/spreadsheets/d/1ylUvKHVYN2E87WdwIza8ROaCpd48ggEl1k5i5SgA29k/edit?usp=sharing\" target=\"_blank\">this page</a> to see which indicators and params are supported.
     * @param {module:api/DefaultApi~technicalIndicatorCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Object}
     */

  }, {
    key: "technicalIndicator",
    value: function technicalIndicator(symbol, resolution, from, to, indicator, opts, callback) {
      opts = opts || {};
      var postBody = opts['indicatorFields']; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling technicalIndicator");
      } // verify the required parameter 'resolution' is set


      if (resolution === undefined || resolution === null) {
        throw new Error("Missing the required parameter 'resolution' when calling technicalIndicator");
      } // verify the required parameter 'from' is set


      if (from === undefined || from === null) {
        throw new Error("Missing the required parameter 'from' when calling technicalIndicator");
      } // verify the required parameter 'to' is set


      if (to === undefined || to === null) {
        throw new Error("Missing the required parameter 'to' when calling technicalIndicator");
      } // verify the required parameter 'indicator' is set


      if (indicator === undefined || indicator === null) {
        throw new Error("Missing the required parameter 'indicator' when calling technicalIndicator");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol,
        'resolution': resolution,
        'from': from,
        'to': to,
        'indicator': indicator
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Object;
      return this.apiClient.callApi('/indicator', 'POST', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the transcripts operation.
     * @callback module:api/DefaultApi~transcriptsCallback
     * @param {String} error Error message, if any.
     * @param {module:model/EarningsCallTranscripts} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Earnings Call Transcripts
     * <p>Get earnings call transcripts, audio and participants' list. This endpoint is only available for US, UK, and Candian companies. <p>15+ years of data is available with 220,000+ audio which add up to 7TB in size.</p>
     * @param {String} id Transcript's id obtained with <a href=\"#transcripts-list\">Transcripts List endpoint</a>.
     * @param {module:api/DefaultApi~transcriptsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/EarningsCallTranscripts}
     */

  }, {
    key: "transcripts",
    value: function transcripts(id, callback) {
      var postBody = null; // verify the required parameter 'id' is set

      if (id === undefined || id === null) {
        throw new Error("Missing the required parameter 'id' when calling transcripts");
      }

      var pathParams = {};
      var queryParams = {
        'id': id
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _EarningsCallTranscripts["default"];
      return this.apiClient.callApi('/stock/transcripts', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the transcriptsList operation.
     * @callback module:api/DefaultApi~transcriptsListCallback
     * @param {String} error Error message, if any.
     * @param {module:model/EarningsCallTranscriptsList} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Earnings Call Transcripts List
     * List earnings call transcripts' metadata. This endpoint is available for US, UK, European, Australian and Canadian companies.
     * @param {String} symbol Company symbol: AAPL. Leave empty to list the latest transcripts
     * @param {module:api/DefaultApi~transcriptsListCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/EarningsCallTranscriptsList}
     */

  }, {
    key: "transcriptsList",
    value: function transcriptsList(symbol, callback) {
      var postBody = null; // verify the required parameter 'symbol' is set

      if (symbol === undefined || symbol === null) {
        throw new Error("Missing the required parameter 'symbol' when calling transcriptsList");
      }

      var pathParams = {};
      var queryParams = {
        'symbol': symbol
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _EarningsCallTranscriptsList["default"];
      return this.apiClient.callApi('/stock/transcripts/list', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
    /**
     * Callback function to receive the result of the upgradeDowngrade operation.
     * @callback module:api/DefaultApi~upgradeDowngradeCallback
     * @param {String} error Error message, if any.
     * @param {Array.<module:model/UpgradeDowngrade>} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Stock Upgrade/Downgrade
     * Get latest stock upgrade and downgrade.
     * @param {Object} opts Optional parameters
     * @param {String} opts.symbol Symbol of the company: AAPL. If left blank, the API will return latest stock upgrades/downgrades.
     * @param {Date} opts.from From date: 2000-03-15.
     * @param {Date} opts.to To date: 2020-03-16.
     * @param {module:api/DefaultApi~upgradeDowngradeCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link Array.<module:model/UpgradeDowngrade>}
     */

  }, {
    key: "upgradeDowngrade",
    value: function upgradeDowngrade(opts, callback) {
      opts = opts || {};
      var postBody = null;
      var pathParams = {};
      var queryParams = {
        'symbol': opts['symbol'],
        'from': opts['from'],
        'to': opts['to']
      };
      var headerParams = {};
      var formParams = {};
      var authNames = ['api_key'];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = [_UpgradeDowngrade["default"]];
      return this.apiClient.callApi('/stock/upgrade-downgrade', 'GET', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null, callback);
    }
  }]);

  return DefaultApi;
}();

exports["default"] = DefaultApi;
},{"../ApiClient":10,"../model/AggregateIndicators":13,"../model/BasicFinancials":14,"../model/BondCandles":15,"../model/BondProfile":16,"../model/BondTickData":17,"../model/CompanyESG":20,"../model/CompanyEarningsQualityScore":21,"../model/CompanyExecutive":23,"../model/CompanyNews":24,"../model/CompanyProfile":26,"../model/CompanyProfile2":27,"../model/CountryMetadata":28,"../model/CovidInfo":29,"../model/CryptoCandles":30,"../model/CryptoProfile":31,"../model/CryptoSymbol":32,"../model/Dividends":34,"../model/Dividends2":35,"../model/ETFsCountryExposure":41,"../model/ETFsHoldings":42,"../model/ETFsProfile":43,"../model/ETFsSectorExposure":44,"../model/EarningResult":46,"../model/EarningsCalendar":47,"../model/EarningsCallTranscripts":48,"../model/EarningsCallTranscriptsList":49,"../model/EarningsEstimates":50,"../model/EbitEstimates":52,"../model/EbitdaEstimates":54,"../model/EconomicCalendar":56,"../model/EconomicCode":57,"../model/EconomicData":58,"../model/FDAComitteeMeeting":61,"../model/Filing":62,"../model/FinancialStatements":64,"../model/FinancialsAsReported":65,"../model/ForexCandles":66,"../model/ForexSymbol":67,"../model/Forexrates":68,"../model/FundOwnership":69,"../model/HistoricalNBBO":71,"../model/IPOCalendar":72,"../model/IndicesConstituents":76,"../model/IndicesHistoricalConstituents":77,"../model/InsiderSentiments":78,"../model/InsiderTransactions":80,"../model/InstitutionalOwnership":81,"../model/InstitutionalPortfolio":84,"../model/InstitutionalProfile":87,"../model/InternationalFiling":89,"../model/InvestmentThemes":91,"../model/IsinChange":92,"../model/LastBidAsk":95,"../model/LobbyingResult":97,"../model/MarketNews":98,"../model/MutualFundCountryExposure":99,"../model/MutualFundHoldings":101,"../model/MutualFundProfile":103,"../model/MutualFundSectorExposure":105,"../model/NewsSentiment":107,"../model/Ownership":108,"../model/PatternRecognition":110,"../model/PressRelease":111,"../model/PriceMetrics":112,"../model/PriceTarget":113,"../model/Quote":114,"../model/RecommendationTrend":115,"../model/RevenueBreakdown":118,"../model/RevenueEstimates":119,"../model/SECSentimentAnalysis":121,"../model/SectorMetric":122,"../model/SimilarityIndex":125,"../model/SocialSentiment":127,"../model/Split":128,"../model/StockCandles":129,"../model/StockSymbol":130,"../model/SupplyChainRelationships":132,"../model/SupportResistance":133,"../model/SymbolChange":134,"../model/SymbolLookup":136,"../model/TickData":139,"../model/UpgradeDowngrade":145,"../model/UsaSpendingResult":147,"../model/UsptoPatentResult":149,"../model/VisaApplicationResult":151}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "ApiClient", {
  enumerable: true,
  get: function get() {
    return _ApiClient["default"];
  }
});
Object.defineProperty(exports, "AggregateIndicators", {
  enumerable: true,
  get: function get() {
    return _AggregateIndicators["default"];
  }
});
Object.defineProperty(exports, "BasicFinancials", {
  enumerable: true,
  get: function get() {
    return _BasicFinancials["default"];
  }
});
Object.defineProperty(exports, "BondCandles", {
  enumerable: true,
  get: function get() {
    return _BondCandles["default"];
  }
});
Object.defineProperty(exports, "BondProfile", {
  enumerable: true,
  get: function get() {
    return _BondProfile["default"];
  }
});
Object.defineProperty(exports, "BondTickData", {
  enumerable: true,
  get: function get() {
    return _BondTickData["default"];
  }
});
Object.defineProperty(exports, "BreakdownItem", {
  enumerable: true,
  get: function get() {
    return _BreakdownItem["default"];
  }
});
Object.defineProperty(exports, "Company", {
  enumerable: true,
  get: function get() {
    return _Company["default"];
  }
});
Object.defineProperty(exports, "CompanyESG", {
  enumerable: true,
  get: function get() {
    return _CompanyESG["default"];
  }
});
Object.defineProperty(exports, "CompanyEarningsQualityScore", {
  enumerable: true,
  get: function get() {
    return _CompanyEarningsQualityScore["default"];
  }
});
Object.defineProperty(exports, "CompanyEarningsQualityScoreData", {
  enumerable: true,
  get: function get() {
    return _CompanyEarningsQualityScoreData["default"];
  }
});
Object.defineProperty(exports, "CompanyExecutive", {
  enumerable: true,
  get: function get() {
    return _CompanyExecutive["default"];
  }
});
Object.defineProperty(exports, "CompanyNews", {
  enumerable: true,
  get: function get() {
    return _CompanyNews["default"];
  }
});
Object.defineProperty(exports, "CompanyNewsStatistics", {
  enumerable: true,
  get: function get() {
    return _CompanyNewsStatistics["default"];
  }
});
Object.defineProperty(exports, "CompanyProfile", {
  enumerable: true,
  get: function get() {
    return _CompanyProfile["default"];
  }
});
Object.defineProperty(exports, "CompanyProfile2", {
  enumerable: true,
  get: function get() {
    return _CompanyProfile2["default"];
  }
});
Object.defineProperty(exports, "CountryMetadata", {
  enumerable: true,
  get: function get() {
    return _CountryMetadata["default"];
  }
});
Object.defineProperty(exports, "CovidInfo", {
  enumerable: true,
  get: function get() {
    return _CovidInfo["default"];
  }
});
Object.defineProperty(exports, "CryptoCandles", {
  enumerable: true,
  get: function get() {
    return _CryptoCandles["default"];
  }
});
Object.defineProperty(exports, "CryptoProfile", {
  enumerable: true,
  get: function get() {
    return _CryptoProfile["default"];
  }
});
Object.defineProperty(exports, "CryptoSymbol", {
  enumerable: true,
  get: function get() {
    return _CryptoSymbol["default"];
  }
});
Object.defineProperty(exports, "Development", {
  enumerable: true,
  get: function get() {
    return _Development["default"];
  }
});
Object.defineProperty(exports, "Dividends", {
  enumerable: true,
  get: function get() {
    return _Dividends["default"];
  }
});
Object.defineProperty(exports, "Dividends2", {
  enumerable: true,
  get: function get() {
    return _Dividends2["default"];
  }
});
Object.defineProperty(exports, "Dividends2Info", {
  enumerable: true,
  get: function get() {
    return _Dividends2Info["default"];
  }
});
Object.defineProperty(exports, "ETFCountryExposureData", {
  enumerable: true,
  get: function get() {
    return _ETFCountryExposureData["default"];
  }
});
Object.defineProperty(exports, "ETFHoldingsData", {
  enumerable: true,
  get: function get() {
    return _ETFHoldingsData["default"];
  }
});
Object.defineProperty(exports, "ETFProfileData", {
  enumerable: true,
  get: function get() {
    return _ETFProfileData["default"];
  }
});
Object.defineProperty(exports, "ETFSectorExposureData", {
  enumerable: true,
  get: function get() {
    return _ETFSectorExposureData["default"];
  }
});
Object.defineProperty(exports, "ETFsCountryExposure", {
  enumerable: true,
  get: function get() {
    return _ETFsCountryExposure["default"];
  }
});
Object.defineProperty(exports, "ETFsHoldings", {
  enumerable: true,
  get: function get() {
    return _ETFsHoldings["default"];
  }
});
Object.defineProperty(exports, "ETFsProfile", {
  enumerable: true,
  get: function get() {
    return _ETFsProfile["default"];
  }
});
Object.defineProperty(exports, "ETFsSectorExposure", {
  enumerable: true,
  get: function get() {
    return _ETFsSectorExposure["default"];
  }
});
Object.defineProperty(exports, "EarningRelease", {
  enumerable: true,
  get: function get() {
    return _EarningRelease["default"];
  }
});
Object.defineProperty(exports, "EarningResult", {
  enumerable: true,
  get: function get() {
    return _EarningResult["default"];
  }
});
Object.defineProperty(exports, "EarningsCalendar", {
  enumerable: true,
  get: function get() {
    return _EarningsCalendar["default"];
  }
});
Object.defineProperty(exports, "EarningsCallTranscripts", {
  enumerable: true,
  get: function get() {
    return _EarningsCallTranscripts["default"];
  }
});
Object.defineProperty(exports, "EarningsCallTranscriptsList", {
  enumerable: true,
  get: function get() {
    return _EarningsCallTranscriptsList["default"];
  }
});
Object.defineProperty(exports, "EarningsEstimates", {
  enumerable: true,
  get: function get() {
    return _EarningsEstimates["default"];
  }
});
Object.defineProperty(exports, "EarningsEstimatesInfo", {
  enumerable: true,
  get: function get() {
    return _EarningsEstimatesInfo["default"];
  }
});
Object.defineProperty(exports, "EbitEstimates", {
  enumerable: true,
  get: function get() {
    return _EbitEstimates["default"];
  }
});
Object.defineProperty(exports, "EbitEstimatesInfo", {
  enumerable: true,
  get: function get() {
    return _EbitEstimatesInfo["default"];
  }
});
Object.defineProperty(exports, "EbitdaEstimates", {
  enumerable: true,
  get: function get() {
    return _EbitdaEstimates["default"];
  }
});
Object.defineProperty(exports, "EbitdaEstimatesInfo", {
  enumerable: true,
  get: function get() {
    return _EbitdaEstimatesInfo["default"];
  }
});
Object.defineProperty(exports, "EconomicCalendar", {
  enumerable: true,
  get: function get() {
    return _EconomicCalendar["default"];
  }
});
Object.defineProperty(exports, "EconomicCode", {
  enumerable: true,
  get: function get() {
    return _EconomicCode["default"];
  }
});
Object.defineProperty(exports, "EconomicData", {
  enumerable: true,
  get: function get() {
    return _EconomicData["default"];
  }
});
Object.defineProperty(exports, "EconomicDataInfo", {
  enumerable: true,
  get: function get() {
    return _EconomicDataInfo["default"];
  }
});
Object.defineProperty(exports, "EconomicEvent", {
  enumerable: true,
  get: function get() {
    return _EconomicEvent["default"];
  }
});
Object.defineProperty(exports, "FDAComitteeMeeting", {
  enumerable: true,
  get: function get() {
    return _FDAComitteeMeeting["default"];
  }
});
Object.defineProperty(exports, "Filing", {
  enumerable: true,
  get: function get() {
    return _Filing["default"];
  }
});
Object.defineProperty(exports, "FilingSentiment", {
  enumerable: true,
  get: function get() {
    return _FilingSentiment["default"];
  }
});
Object.defineProperty(exports, "FinancialStatements", {
  enumerable: true,
  get: function get() {
    return _FinancialStatements["default"];
  }
});
Object.defineProperty(exports, "FinancialsAsReported", {
  enumerable: true,
  get: function get() {
    return _FinancialsAsReported["default"];
  }
});
Object.defineProperty(exports, "ForexCandles", {
  enumerable: true,
  get: function get() {
    return _ForexCandles["default"];
  }
});
Object.defineProperty(exports, "ForexSymbol", {
  enumerable: true,
  get: function get() {
    return _ForexSymbol["default"];
  }
});
Object.defineProperty(exports, "Forexrates", {
  enumerable: true,
  get: function get() {
    return _Forexrates["default"];
  }
});
Object.defineProperty(exports, "FundOwnership", {
  enumerable: true,
  get: function get() {
    return _FundOwnership["default"];
  }
});
Object.defineProperty(exports, "FundOwnershipInfo", {
  enumerable: true,
  get: function get() {
    return _FundOwnershipInfo["default"];
  }
});
Object.defineProperty(exports, "HistoricalNBBO", {
  enumerable: true,
  get: function get() {
    return _HistoricalNBBO["default"];
  }
});
Object.defineProperty(exports, "IPOCalendar", {
  enumerable: true,
  get: function get() {
    return _IPOCalendar["default"];
  }
});
Object.defineProperty(exports, "IPOEvent", {
  enumerable: true,
  get: function get() {
    return _IPOEvent["default"];
  }
});
Object.defineProperty(exports, "IndexHistoricalConstituent", {
  enumerable: true,
  get: function get() {
    return _IndexHistoricalConstituent["default"];
  }
});
Object.defineProperty(exports, "Indicator", {
  enumerable: true,
  get: function get() {
    return _Indicator["default"];
  }
});
Object.defineProperty(exports, "IndicesConstituents", {
  enumerable: true,
  get: function get() {
    return _IndicesConstituents["default"];
  }
});
Object.defineProperty(exports, "IndicesHistoricalConstituents", {
  enumerable: true,
  get: function get() {
    return _IndicesHistoricalConstituents["default"];
  }
});
Object.defineProperty(exports, "InsiderSentiments", {
  enumerable: true,
  get: function get() {
    return _InsiderSentiments["default"];
  }
});
Object.defineProperty(exports, "InsiderSentimentsData", {
  enumerable: true,
  get: function get() {
    return _InsiderSentimentsData["default"];
  }
});
Object.defineProperty(exports, "InsiderTransactions", {
  enumerable: true,
  get: function get() {
    return _InsiderTransactions["default"];
  }
});
Object.defineProperty(exports, "InstitutionalOwnership", {
  enumerable: true,
  get: function get() {
    return _InstitutionalOwnership["default"];
  }
});
Object.defineProperty(exports, "InstitutionalOwnershipGroup", {
  enumerable: true,
  get: function get() {
    return _InstitutionalOwnershipGroup["default"];
  }
});
Object.defineProperty(exports, "InstitutionalOwnershipInfo", {
  enumerable: true,
  get: function get() {
    return _InstitutionalOwnershipInfo["default"];
  }
});
Object.defineProperty(exports, "InstitutionalPortfolio", {
  enumerable: true,
  get: function get() {
    return _InstitutionalPortfolio["default"];
  }
});
Object.defineProperty(exports, "InstitutionalPortfolioGroup", {
  enumerable: true,
  get: function get() {
    return _InstitutionalPortfolioGroup["default"];
  }
});
Object.defineProperty(exports, "InstitutionalPortfolioInfo", {
  enumerable: true,
  get: function get() {
    return _InstitutionalPortfolioInfo["default"];
  }
});
Object.defineProperty(exports, "InstitutionalProfile", {
  enumerable: true,
  get: function get() {
    return _InstitutionalProfile["default"];
  }
});
Object.defineProperty(exports, "InstitutionalProfileInfo", {
  enumerable: true,
  get: function get() {
    return _InstitutionalProfileInfo["default"];
  }
});
Object.defineProperty(exports, "InternationalFiling", {
  enumerable: true,
  get: function get() {
    return _InternationalFiling["default"];
  }
});
Object.defineProperty(exports, "InvestmentThemePortfolio", {
  enumerable: true,
  get: function get() {
    return _InvestmentThemePortfolio["default"];
  }
});
Object.defineProperty(exports, "InvestmentThemes", {
  enumerable: true,
  get: function get() {
    return _InvestmentThemes["default"];
  }
});
Object.defineProperty(exports, "IsinChange", {
  enumerable: true,
  get: function get() {
    return _IsinChange["default"];
  }
});
Object.defineProperty(exports, "IsinChangeInfo", {
  enumerable: true,
  get: function get() {
    return _IsinChangeInfo["default"];
  }
});
Object.defineProperty(exports, "KeyCustomersSuppliers", {
  enumerable: true,
  get: function get() {
    return _KeyCustomersSuppliers["default"];
  }
});
Object.defineProperty(exports, "LastBidAsk", {
  enumerable: true,
  get: function get() {
    return _LastBidAsk["default"];
  }
});
Object.defineProperty(exports, "LobbyingData", {
  enumerable: true,
  get: function get() {
    return _LobbyingData["default"];
  }
});
Object.defineProperty(exports, "LobbyingResult", {
  enumerable: true,
  get: function get() {
    return _LobbyingResult["default"];
  }
});
Object.defineProperty(exports, "MarketNews", {
  enumerable: true,
  get: function get() {
    return _MarketNews["default"];
  }
});
Object.defineProperty(exports, "MutualFundCountryExposure", {
  enumerable: true,
  get: function get() {
    return _MutualFundCountryExposure["default"];
  }
});
Object.defineProperty(exports, "MutualFundCountryExposureData", {
  enumerable: true,
  get: function get() {
    return _MutualFundCountryExposureData["default"];
  }
});
Object.defineProperty(exports, "MutualFundHoldings", {
  enumerable: true,
  get: function get() {
    return _MutualFundHoldings["default"];
  }
});
Object.defineProperty(exports, "MutualFundHoldingsData", {
  enumerable: true,
  get: function get() {
    return _MutualFundHoldingsData["default"];
  }
});
Object.defineProperty(exports, "MutualFundProfile", {
  enumerable: true,
  get: function get() {
    return _MutualFundProfile["default"];
  }
});
Object.defineProperty(exports, "MutualFundProfileData", {
  enumerable: true,
  get: function get() {
    return _MutualFundProfileData["default"];
  }
});
Object.defineProperty(exports, "MutualFundSectorExposure", {
  enumerable: true,
  get: function get() {
    return _MutualFundSectorExposure["default"];
  }
});
Object.defineProperty(exports, "MutualFundSectorExposureData", {
  enumerable: true,
  get: function get() {
    return _MutualFundSectorExposureData["default"];
  }
});
Object.defineProperty(exports, "NewsSentiment", {
  enumerable: true,
  get: function get() {
    return _NewsSentiment["default"];
  }
});
Object.defineProperty(exports, "Ownership", {
  enumerable: true,
  get: function get() {
    return _Ownership["default"];
  }
});
Object.defineProperty(exports, "OwnershipInfo", {
  enumerable: true,
  get: function get() {
    return _OwnershipInfo["default"];
  }
});
Object.defineProperty(exports, "PatternRecognition", {
  enumerable: true,
  get: function get() {
    return _PatternRecognition["default"];
  }
});
Object.defineProperty(exports, "PressRelease", {
  enumerable: true,
  get: function get() {
    return _PressRelease["default"];
  }
});
Object.defineProperty(exports, "PriceMetrics", {
  enumerable: true,
  get: function get() {
    return _PriceMetrics["default"];
  }
});
Object.defineProperty(exports, "PriceTarget", {
  enumerable: true,
  get: function get() {
    return _PriceTarget["default"];
  }
});
Object.defineProperty(exports, "Quote", {
  enumerable: true,
  get: function get() {
    return _Quote["default"];
  }
});
Object.defineProperty(exports, "RecommendationTrend", {
  enumerable: true,
  get: function get() {
    return _RecommendationTrend["default"];
  }
});
Object.defineProperty(exports, "RedditSentimentContent", {
  enumerable: true,
  get: function get() {
    return _RedditSentimentContent["default"];
  }
});
Object.defineProperty(exports, "Report", {
  enumerable: true,
  get: function get() {
    return _Report["default"];
  }
});
Object.defineProperty(exports, "RevenueBreakdown", {
  enumerable: true,
  get: function get() {
    return _RevenueBreakdown["default"];
  }
});
Object.defineProperty(exports, "RevenueEstimates", {
  enumerable: true,
  get: function get() {
    return _RevenueEstimates["default"];
  }
});
Object.defineProperty(exports, "RevenueEstimatesInfo", {
  enumerable: true,
  get: function get() {
    return _RevenueEstimatesInfo["default"];
  }
});
Object.defineProperty(exports, "SECSentimentAnalysis", {
  enumerable: true,
  get: function get() {
    return _SECSentimentAnalysis["default"];
  }
});
Object.defineProperty(exports, "SectorMetric", {
  enumerable: true,
  get: function get() {
    return _SectorMetric["default"];
  }
});
Object.defineProperty(exports, "SectorMetricData", {
  enumerable: true,
  get: function get() {
    return _SectorMetricData["default"];
  }
});
Object.defineProperty(exports, "Sentiment", {
  enumerable: true,
  get: function get() {
    return _Sentiment["default"];
  }
});
Object.defineProperty(exports, "SimilarityIndex", {
  enumerable: true,
  get: function get() {
    return _SimilarityIndex["default"];
  }
});
Object.defineProperty(exports, "SimilarityIndexInfo", {
  enumerable: true,
  get: function get() {
    return _SimilarityIndexInfo["default"];
  }
});
Object.defineProperty(exports, "SocialSentiment", {
  enumerable: true,
  get: function get() {
    return _SocialSentiment["default"];
  }
});
Object.defineProperty(exports, "Split", {
  enumerable: true,
  get: function get() {
    return _Split["default"];
  }
});
Object.defineProperty(exports, "StockCandles", {
  enumerable: true,
  get: function get() {
    return _StockCandles["default"];
  }
});
Object.defineProperty(exports, "StockSymbol", {
  enumerable: true,
  get: function get() {
    return _StockSymbol["default"];
  }
});
Object.defineProperty(exports, "StockTranscripts", {
  enumerable: true,
  get: function get() {
    return _StockTranscripts["default"];
  }
});
Object.defineProperty(exports, "SupplyChainRelationships", {
  enumerable: true,
  get: function get() {
    return _SupplyChainRelationships["default"];
  }
});
Object.defineProperty(exports, "SupportResistance", {
  enumerable: true,
  get: function get() {
    return _SupportResistance["default"];
  }
});
Object.defineProperty(exports, "SymbolChange", {
  enumerable: true,
  get: function get() {
    return _SymbolChange["default"];
  }
});
Object.defineProperty(exports, "SymbolChangeInfo", {
  enumerable: true,
  get: function get() {
    return _SymbolChangeInfo["default"];
  }
});
Object.defineProperty(exports, "SymbolLookup", {
  enumerable: true,
  get: function get() {
    return _SymbolLookup["default"];
  }
});
Object.defineProperty(exports, "SymbolLookupInfo", {
  enumerable: true,
  get: function get() {
    return _SymbolLookupInfo["default"];
  }
});
Object.defineProperty(exports, "TechnicalAnalysis", {
  enumerable: true,
  get: function get() {
    return _TechnicalAnalysis["default"];
  }
});
Object.defineProperty(exports, "TickData", {
  enumerable: true,
  get: function get() {
    return _TickData["default"];
  }
});
Object.defineProperty(exports, "Transactions", {
  enumerable: true,
  get: function get() {
    return _Transactions["default"];
  }
});
Object.defineProperty(exports, "TranscriptContent", {
  enumerable: true,
  get: function get() {
    return _TranscriptContent["default"];
  }
});
Object.defineProperty(exports, "TranscriptParticipant", {
  enumerable: true,
  get: function get() {
    return _TranscriptParticipant["default"];
  }
});
Object.defineProperty(exports, "Trend", {
  enumerable: true,
  get: function get() {
    return _Trend["default"];
  }
});
Object.defineProperty(exports, "TwitterSentimentContent", {
  enumerable: true,
  get: function get() {
    return _TwitterSentimentContent["default"];
  }
});
Object.defineProperty(exports, "UpgradeDowngrade", {
  enumerable: true,
  get: function get() {
    return _UpgradeDowngrade["default"];
  }
});
Object.defineProperty(exports, "UsaSpending", {
  enumerable: true,
  get: function get() {
    return _UsaSpending["default"];
  }
});
Object.defineProperty(exports, "UsaSpendingResult", {
  enumerable: true,
  get: function get() {
    return _UsaSpendingResult["default"];
  }
});
Object.defineProperty(exports, "UsptoPatent", {
  enumerable: true,
  get: function get() {
    return _UsptoPatent["default"];
  }
});
Object.defineProperty(exports, "UsptoPatentResult", {
  enumerable: true,
  get: function get() {
    return _UsptoPatentResult["default"];
  }
});
Object.defineProperty(exports, "VisaApplication", {
  enumerable: true,
  get: function get() {
    return _VisaApplication["default"];
  }
});
Object.defineProperty(exports, "VisaApplicationResult", {
  enumerable: true,
  get: function get() {
    return _VisaApplicationResult["default"];
  }
});
Object.defineProperty(exports, "DefaultApi", {
  enumerable: true,
  get: function get() {
    return _DefaultApi["default"];
  }
});

var _ApiClient = _interopRequireDefault(require("./ApiClient"));

var _AggregateIndicators = _interopRequireDefault(require("./model/AggregateIndicators"));

var _BasicFinancials = _interopRequireDefault(require("./model/BasicFinancials"));

var _BondCandles = _interopRequireDefault(require("./model/BondCandles"));

var _BondProfile = _interopRequireDefault(require("./model/BondProfile"));

var _BondTickData = _interopRequireDefault(require("./model/BondTickData"));

var _BreakdownItem = _interopRequireDefault(require("./model/BreakdownItem"));

var _Company = _interopRequireDefault(require("./model/Company"));

var _CompanyESG = _interopRequireDefault(require("./model/CompanyESG"));

var _CompanyEarningsQualityScore = _interopRequireDefault(require("./model/CompanyEarningsQualityScore"));

var _CompanyEarningsQualityScoreData = _interopRequireDefault(require("./model/CompanyEarningsQualityScoreData"));

var _CompanyExecutive = _interopRequireDefault(require("./model/CompanyExecutive"));

var _CompanyNews = _interopRequireDefault(require("./model/CompanyNews"));

var _CompanyNewsStatistics = _interopRequireDefault(require("./model/CompanyNewsStatistics"));

var _CompanyProfile = _interopRequireDefault(require("./model/CompanyProfile"));

var _CompanyProfile2 = _interopRequireDefault(require("./model/CompanyProfile2"));

var _CountryMetadata = _interopRequireDefault(require("./model/CountryMetadata"));

var _CovidInfo = _interopRequireDefault(require("./model/CovidInfo"));

var _CryptoCandles = _interopRequireDefault(require("./model/CryptoCandles"));

var _CryptoProfile = _interopRequireDefault(require("./model/CryptoProfile"));

var _CryptoSymbol = _interopRequireDefault(require("./model/CryptoSymbol"));

var _Development = _interopRequireDefault(require("./model/Development"));

var _Dividends = _interopRequireDefault(require("./model/Dividends"));

var _Dividends2 = _interopRequireDefault(require("./model/Dividends2"));

var _Dividends2Info = _interopRequireDefault(require("./model/Dividends2Info"));

var _ETFCountryExposureData = _interopRequireDefault(require("./model/ETFCountryExposureData"));

var _ETFHoldingsData = _interopRequireDefault(require("./model/ETFHoldingsData"));

var _ETFProfileData = _interopRequireDefault(require("./model/ETFProfileData"));

var _ETFSectorExposureData = _interopRequireDefault(require("./model/ETFSectorExposureData"));

var _ETFsCountryExposure = _interopRequireDefault(require("./model/ETFsCountryExposure"));

var _ETFsHoldings = _interopRequireDefault(require("./model/ETFsHoldings"));

var _ETFsProfile = _interopRequireDefault(require("./model/ETFsProfile"));

var _ETFsSectorExposure = _interopRequireDefault(require("./model/ETFsSectorExposure"));

var _EarningRelease = _interopRequireDefault(require("./model/EarningRelease"));

var _EarningResult = _interopRequireDefault(require("./model/EarningResult"));

var _EarningsCalendar = _interopRequireDefault(require("./model/EarningsCalendar"));

var _EarningsCallTranscripts = _interopRequireDefault(require("./model/EarningsCallTranscripts"));

var _EarningsCallTranscriptsList = _interopRequireDefault(require("./model/EarningsCallTranscriptsList"));

var _EarningsEstimates = _interopRequireDefault(require("./model/EarningsEstimates"));

var _EarningsEstimatesInfo = _interopRequireDefault(require("./model/EarningsEstimatesInfo"));

var _EbitEstimates = _interopRequireDefault(require("./model/EbitEstimates"));

var _EbitEstimatesInfo = _interopRequireDefault(require("./model/EbitEstimatesInfo"));

var _EbitdaEstimates = _interopRequireDefault(require("./model/EbitdaEstimates"));

var _EbitdaEstimatesInfo = _interopRequireDefault(require("./model/EbitdaEstimatesInfo"));

var _EconomicCalendar = _interopRequireDefault(require("./model/EconomicCalendar"));

var _EconomicCode = _interopRequireDefault(require("./model/EconomicCode"));

var _EconomicData = _interopRequireDefault(require("./model/EconomicData"));

var _EconomicDataInfo = _interopRequireDefault(require("./model/EconomicDataInfo"));

var _EconomicEvent = _interopRequireDefault(require("./model/EconomicEvent"));

var _FDAComitteeMeeting = _interopRequireDefault(require("./model/FDAComitteeMeeting"));

var _Filing = _interopRequireDefault(require("./model/Filing"));

var _FilingSentiment = _interopRequireDefault(require("./model/FilingSentiment"));

var _FinancialStatements = _interopRequireDefault(require("./model/FinancialStatements"));

var _FinancialsAsReported = _interopRequireDefault(require("./model/FinancialsAsReported"));

var _ForexCandles = _interopRequireDefault(require("./model/ForexCandles"));

var _ForexSymbol = _interopRequireDefault(require("./model/ForexSymbol"));

var _Forexrates = _interopRequireDefault(require("./model/Forexrates"));

var _FundOwnership = _interopRequireDefault(require("./model/FundOwnership"));

var _FundOwnershipInfo = _interopRequireDefault(require("./model/FundOwnershipInfo"));

var _HistoricalNBBO = _interopRequireDefault(require("./model/HistoricalNBBO"));

var _IPOCalendar = _interopRequireDefault(require("./model/IPOCalendar"));

var _IPOEvent = _interopRequireDefault(require("./model/IPOEvent"));

var _IndexHistoricalConstituent = _interopRequireDefault(require("./model/IndexHistoricalConstituent"));

var _Indicator = _interopRequireDefault(require("./model/Indicator"));

var _IndicesConstituents = _interopRequireDefault(require("./model/IndicesConstituents"));

var _IndicesHistoricalConstituents = _interopRequireDefault(require("./model/IndicesHistoricalConstituents"));

var _InsiderSentiments = _interopRequireDefault(require("./model/InsiderSentiments"));

var _InsiderSentimentsData = _interopRequireDefault(require("./model/InsiderSentimentsData"));

var _InsiderTransactions = _interopRequireDefault(require("./model/InsiderTransactions"));

var _InstitutionalOwnership = _interopRequireDefault(require("./model/InstitutionalOwnership"));

var _InstitutionalOwnershipGroup = _interopRequireDefault(require("./model/InstitutionalOwnershipGroup"));

var _InstitutionalOwnershipInfo = _interopRequireDefault(require("./model/InstitutionalOwnershipInfo"));

var _InstitutionalPortfolio = _interopRequireDefault(require("./model/InstitutionalPortfolio"));

var _InstitutionalPortfolioGroup = _interopRequireDefault(require("./model/InstitutionalPortfolioGroup"));

var _InstitutionalPortfolioInfo = _interopRequireDefault(require("./model/InstitutionalPortfolioInfo"));

var _InstitutionalProfile = _interopRequireDefault(require("./model/InstitutionalProfile"));

var _InstitutionalProfileInfo = _interopRequireDefault(require("./model/InstitutionalProfileInfo"));

var _InternationalFiling = _interopRequireDefault(require("./model/InternationalFiling"));

var _InvestmentThemePortfolio = _interopRequireDefault(require("./model/InvestmentThemePortfolio"));

var _InvestmentThemes = _interopRequireDefault(require("./model/InvestmentThemes"));

var _IsinChange = _interopRequireDefault(require("./model/IsinChange"));

var _IsinChangeInfo = _interopRequireDefault(require("./model/IsinChangeInfo"));

var _KeyCustomersSuppliers = _interopRequireDefault(require("./model/KeyCustomersSuppliers"));

var _LastBidAsk = _interopRequireDefault(require("./model/LastBidAsk"));

var _LobbyingData = _interopRequireDefault(require("./model/LobbyingData"));

var _LobbyingResult = _interopRequireDefault(require("./model/LobbyingResult"));

var _MarketNews = _interopRequireDefault(require("./model/MarketNews"));

var _MutualFundCountryExposure = _interopRequireDefault(require("./model/MutualFundCountryExposure"));

var _MutualFundCountryExposureData = _interopRequireDefault(require("./model/MutualFundCountryExposureData"));

var _MutualFundHoldings = _interopRequireDefault(require("./model/MutualFundHoldings"));

var _MutualFundHoldingsData = _interopRequireDefault(require("./model/MutualFundHoldingsData"));

var _MutualFundProfile = _interopRequireDefault(require("./model/MutualFundProfile"));

var _MutualFundProfileData = _interopRequireDefault(require("./model/MutualFundProfileData"));

var _MutualFundSectorExposure = _interopRequireDefault(require("./model/MutualFundSectorExposure"));

var _MutualFundSectorExposureData = _interopRequireDefault(require("./model/MutualFundSectorExposureData"));

var _NewsSentiment = _interopRequireDefault(require("./model/NewsSentiment"));

var _Ownership = _interopRequireDefault(require("./model/Ownership"));

var _OwnershipInfo = _interopRequireDefault(require("./model/OwnershipInfo"));

var _PatternRecognition = _interopRequireDefault(require("./model/PatternRecognition"));

var _PressRelease = _interopRequireDefault(require("./model/PressRelease"));

var _PriceMetrics = _interopRequireDefault(require("./model/PriceMetrics"));

var _PriceTarget = _interopRequireDefault(require("./model/PriceTarget"));

var _Quote = _interopRequireDefault(require("./model/Quote"));

var _RecommendationTrend = _interopRequireDefault(require("./model/RecommendationTrend"));

var _RedditSentimentContent = _interopRequireDefault(require("./model/RedditSentimentContent"));

var _Report = _interopRequireDefault(require("./model/Report"));

var _RevenueBreakdown = _interopRequireDefault(require("./model/RevenueBreakdown"));

var _RevenueEstimates = _interopRequireDefault(require("./model/RevenueEstimates"));

var _RevenueEstimatesInfo = _interopRequireDefault(require("./model/RevenueEstimatesInfo"));

var _SECSentimentAnalysis = _interopRequireDefault(require("./model/SECSentimentAnalysis"));

var _SectorMetric = _interopRequireDefault(require("./model/SectorMetric"));

var _SectorMetricData = _interopRequireDefault(require("./model/SectorMetricData"));

var _Sentiment = _interopRequireDefault(require("./model/Sentiment"));

var _SimilarityIndex = _interopRequireDefault(require("./model/SimilarityIndex"));

var _SimilarityIndexInfo = _interopRequireDefault(require("./model/SimilarityIndexInfo"));

var _SocialSentiment = _interopRequireDefault(require("./model/SocialSentiment"));

var _Split = _interopRequireDefault(require("./model/Split"));

var _StockCandles = _interopRequireDefault(require("./model/StockCandles"));

var _StockSymbol = _interopRequireDefault(require("./model/StockSymbol"));

var _StockTranscripts = _interopRequireDefault(require("./model/StockTranscripts"));

var _SupplyChainRelationships = _interopRequireDefault(require("./model/SupplyChainRelationships"));

var _SupportResistance = _interopRequireDefault(require("./model/SupportResistance"));

var _SymbolChange = _interopRequireDefault(require("./model/SymbolChange"));

var _SymbolChangeInfo = _interopRequireDefault(require("./model/SymbolChangeInfo"));

var _SymbolLookup = _interopRequireDefault(require("./model/SymbolLookup"));

var _SymbolLookupInfo = _interopRequireDefault(require("./model/SymbolLookupInfo"));

var _TechnicalAnalysis = _interopRequireDefault(require("./model/TechnicalAnalysis"));

var _TickData = _interopRequireDefault(require("./model/TickData"));

var _Transactions = _interopRequireDefault(require("./model/Transactions"));

var _TranscriptContent = _interopRequireDefault(require("./model/TranscriptContent"));

var _TranscriptParticipant = _interopRequireDefault(require("./model/TranscriptParticipant"));

var _Trend = _interopRequireDefault(require("./model/Trend"));

var _TwitterSentimentContent = _interopRequireDefault(require("./model/TwitterSentimentContent"));

var _UpgradeDowngrade = _interopRequireDefault(require("./model/UpgradeDowngrade"));

var _UsaSpending = _interopRequireDefault(require("./model/UsaSpending"));

var _UsaSpendingResult = _interopRequireDefault(require("./model/UsaSpendingResult"));

var _UsptoPatent = _interopRequireDefault(require("./model/UsptoPatent"));

var _UsptoPatentResult = _interopRequireDefault(require("./model/UsptoPatentResult"));

var _VisaApplication = _interopRequireDefault(require("./model/VisaApplication"));

var _VisaApplicationResult = _interopRequireDefault(require("./model/VisaApplicationResult"));

var _DefaultApi = _interopRequireDefault(require("./api/DefaultApi"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
},{"./ApiClient":10,"./api/DefaultApi":11,"./model/AggregateIndicators":13,"./model/BasicFinancials":14,"./model/BondCandles":15,"./model/BondProfile":16,"./model/BondTickData":17,"./model/BreakdownItem":18,"./model/Company":19,"./model/CompanyESG":20,"./model/CompanyEarningsQualityScore":21,"./model/CompanyEarningsQualityScoreData":22,"./model/CompanyExecutive":23,"./model/CompanyNews":24,"./model/CompanyNewsStatistics":25,"./model/CompanyProfile":26,"./model/CompanyProfile2":27,"./model/CountryMetadata":28,"./model/CovidInfo":29,"./model/CryptoCandles":30,"./model/CryptoProfile":31,"./model/CryptoSymbol":32,"./model/Development":33,"./model/Dividends":34,"./model/Dividends2":35,"./model/Dividends2Info":36,"./model/ETFCountryExposureData":37,"./model/ETFHoldingsData":38,"./model/ETFProfileData":39,"./model/ETFSectorExposureData":40,"./model/ETFsCountryExposure":41,"./model/ETFsHoldings":42,"./model/ETFsProfile":43,"./model/ETFsSectorExposure":44,"./model/EarningRelease":45,"./model/EarningResult":46,"./model/EarningsCalendar":47,"./model/EarningsCallTranscripts":48,"./model/EarningsCallTranscriptsList":49,"./model/EarningsEstimates":50,"./model/EarningsEstimatesInfo":51,"./model/EbitEstimates":52,"./model/EbitEstimatesInfo":53,"./model/EbitdaEstimates":54,"./model/EbitdaEstimatesInfo":55,"./model/EconomicCalendar":56,"./model/EconomicCode":57,"./model/EconomicData":58,"./model/EconomicDataInfo":59,"./model/EconomicEvent":60,"./model/FDAComitteeMeeting":61,"./model/Filing":62,"./model/FilingSentiment":63,"./model/FinancialStatements":64,"./model/FinancialsAsReported":65,"./model/ForexCandles":66,"./model/ForexSymbol":67,"./model/Forexrates":68,"./model/FundOwnership":69,"./model/FundOwnershipInfo":70,"./model/HistoricalNBBO":71,"./model/IPOCalendar":72,"./model/IPOEvent":73,"./model/IndexHistoricalConstituent":74,"./model/Indicator":75,"./model/IndicesConstituents":76,"./model/IndicesHistoricalConstituents":77,"./model/InsiderSentiments":78,"./model/InsiderSentimentsData":79,"./model/InsiderTransactions":80,"./model/InstitutionalOwnership":81,"./model/InstitutionalOwnershipGroup":82,"./model/InstitutionalOwnershipInfo":83,"./model/InstitutionalPortfolio":84,"./model/InstitutionalPortfolioGroup":85,"./model/InstitutionalPortfolioInfo":86,"./model/InstitutionalProfile":87,"./model/InstitutionalProfileInfo":88,"./model/InternationalFiling":89,"./model/InvestmentThemePortfolio":90,"./model/InvestmentThemes":91,"./model/IsinChange":92,"./model/IsinChangeInfo":93,"./model/KeyCustomersSuppliers":94,"./model/LastBidAsk":95,"./model/LobbyingData":96,"./model/LobbyingResult":97,"./model/MarketNews":98,"./model/MutualFundCountryExposure":99,"./model/MutualFundCountryExposureData":100,"./model/MutualFundHoldings":101,"./model/MutualFundHoldingsData":102,"./model/MutualFundProfile":103,"./model/MutualFundProfileData":104,"./model/MutualFundSectorExposure":105,"./model/MutualFundSectorExposureData":106,"./model/NewsSentiment":107,"./model/Ownership":108,"./model/OwnershipInfo":109,"./model/PatternRecognition":110,"./model/PressRelease":111,"./model/PriceMetrics":112,"./model/PriceTarget":113,"./model/Quote":114,"./model/RecommendationTrend":115,"./model/RedditSentimentContent":116,"./model/Report":117,"./model/RevenueBreakdown":118,"./model/RevenueEstimates":119,"./model/RevenueEstimatesInfo":120,"./model/SECSentimentAnalysis":121,"./model/SectorMetric":122,"./model/SectorMetricData":123,"./model/Sentiment":124,"./model/SimilarityIndex":125,"./model/SimilarityIndexInfo":126,"./model/SocialSentiment":127,"./model/Split":128,"./model/StockCandles":129,"./model/StockSymbol":130,"./model/StockTranscripts":131,"./model/SupplyChainRelationships":132,"./model/SupportResistance":133,"./model/SymbolChange":134,"./model/SymbolChangeInfo":135,"./model/SymbolLookup":136,"./model/SymbolLookupInfo":137,"./model/TechnicalAnalysis":138,"./model/TickData":139,"./model/Transactions":140,"./model/TranscriptContent":141,"./model/TranscriptParticipant":142,"./model/Trend":143,"./model/TwitterSentimentContent":144,"./model/UpgradeDowngrade":145,"./model/UsaSpending":146,"./model/UsaSpendingResult":147,"./model/UsptoPatent":148,"./model/UsptoPatentResult":149,"./model/VisaApplication":150,"./model/VisaApplicationResult":151}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _TechnicalAnalysis = _interopRequireDefault(require("./TechnicalAnalysis"));

var _Trend = _interopRequireDefault(require("./Trend"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The AggregateIndicators model module.
 * @module model/AggregateIndicators
 * @version 1.2.16
 */
var AggregateIndicators = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>AggregateIndicators</code>.
   * @alias module:model/AggregateIndicators
   */
  function AggregateIndicators() {
    _classCallCheck(this, AggregateIndicators);

    AggregateIndicators.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(AggregateIndicators, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>AggregateIndicators</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/AggregateIndicators} obj Optional instance to populate.
     * @return {module:model/AggregateIndicators} The populated <code>AggregateIndicators</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new AggregateIndicators();

        if (data.hasOwnProperty('technicalAnalysis')) {
          obj['technicalAnalysis'] = _TechnicalAnalysis["default"].constructFromObject(data['technicalAnalysis']);
        }

        if (data.hasOwnProperty('trend')) {
          obj['trend'] = _Trend["default"].constructFromObject(data['trend']);
        }
      }

      return obj;
    }
  }]);

  return AggregateIndicators;
}();
/**
 * @member {module:model/TechnicalAnalysis} technicalAnalysis
 */


AggregateIndicators.prototype['technicalAnalysis'] = undefined;
/**
 * @member {module:model/Trend} trend
 */

AggregateIndicators.prototype['trend'] = undefined;
var _default = AggregateIndicators;
exports["default"] = _default;
},{"../ApiClient":10,"./TechnicalAnalysis":138,"./Trend":143}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The BasicFinancials model module.
 * @module model/BasicFinancials
 * @version 1.2.16
 */
var BasicFinancials = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>BasicFinancials</code>.
   * @alias module:model/BasicFinancials
   */
  function BasicFinancials() {
    _classCallCheck(this, BasicFinancials);

    BasicFinancials.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(BasicFinancials, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>BasicFinancials</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/BasicFinancials} obj Optional instance to populate.
     * @return {module:model/BasicFinancials} The populated <code>BasicFinancials</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new BasicFinancials();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('metricType')) {
          obj['metricType'] = _ApiClient["default"].convertToType(data['metricType'], 'String');
        }

        if (data.hasOwnProperty('series')) {
          obj['series'] = _ApiClient["default"].convertToType(data['series'], Object);
        }

        if (data.hasOwnProperty('metric')) {
          obj['metric'] = _ApiClient["default"].convertToType(data['metric'], Object);
        }
      }

      return obj;
    }
  }]);

  return BasicFinancials;
}();
/**
 * Symbol of the company.
 * @member {String} symbol
 */


BasicFinancials.prototype['symbol'] = undefined;
/**
 * Metric type.
 * @member {String} metricType
 */

BasicFinancials.prototype['metricType'] = undefined;
/**
 * @member {Object} series
 */

BasicFinancials.prototype['series'] = undefined;
/**
 * @member {Object} metric
 */

BasicFinancials.prototype['metric'] = undefined;
var _default = BasicFinancials;
exports["default"] = _default;
},{"../ApiClient":10}],15:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The BondCandles model module.
 * @module model/BondCandles
 * @version 1.2.16
 */
var BondCandles = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>BondCandles</code>.
   * @alias module:model/BondCandles
   */
  function BondCandles() {
    _classCallCheck(this, BondCandles);

    BondCandles.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(BondCandles, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>BondCandles</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/BondCandles} obj Optional instance to populate.
     * @return {module:model/BondCandles} The populated <code>BondCandles</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new BondCandles();

        if (data.hasOwnProperty('c')) {
          obj['c'] = _ApiClient["default"].convertToType(data['c'], ['Number']);
        }

        if (data.hasOwnProperty('t')) {
          obj['t'] = _ApiClient["default"].convertToType(data['t'], ['Number']);
        }

        if (data.hasOwnProperty('s')) {
          obj['s'] = _ApiClient["default"].convertToType(data['s'], 'String');
        }
      }

      return obj;
    }
  }]);

  return BondCandles;
}();
/**
 * List of close prices for returned candles.
 * @member {Array.<Number>} c
 */


BondCandles.prototype['c'] = undefined;
/**
 * List of timestamp for returned candles.
 * @member {Array.<Number>} t
 */

BondCandles.prototype['t'] = undefined;
/**
 * Status of the response. This field can either be ok or no_data.
 * @member {String} s
 */

BondCandles.prototype['s'] = undefined;
var _default = BondCandles;
exports["default"] = _default;
},{"../ApiClient":10}],16:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The BondProfile model module.
 * @module model/BondProfile
 * @version 1.2.16
 */
var BondProfile = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>BondProfile</code>.
   * @alias module:model/BondProfile
   */
  function BondProfile() {
    _classCallCheck(this, BondProfile);

    BondProfile.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(BondProfile, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>BondProfile</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/BondProfile} obj Optional instance to populate.
     * @return {module:model/BondProfile} The populated <code>BondProfile</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new BondProfile();

        if (data.hasOwnProperty('isin')) {
          obj['isin'] = _ApiClient["default"].convertToType(data['isin'], 'String');
        }

        if (data.hasOwnProperty('cusip')) {
          obj['cusip'] = _ApiClient["default"].convertToType(data['cusip'], 'String');
        }

        if (data.hasOwnProperty('figi')) {
          obj['figi'] = _ApiClient["default"].convertToType(data['figi'], 'String');
        }

        if (data.hasOwnProperty('coupon')) {
          obj['coupon'] = _ApiClient["default"].convertToType(data['coupon'], 'Number');
        }

        if (data.hasOwnProperty('maturityDate')) {
          obj['maturityDate'] = _ApiClient["default"].convertToType(data['maturityDate'], 'String');
        }

        if (data.hasOwnProperty('offeringPrice')) {
          obj['offeringPrice'] = _ApiClient["default"].convertToType(data['offeringPrice'], 'Number');
        }

        if (data.hasOwnProperty('issueDate')) {
          obj['issueDate'] = _ApiClient["default"].convertToType(data['issueDate'], 'String');
        }

        if (data.hasOwnProperty('bondType')) {
          obj['bondType'] = _ApiClient["default"].convertToType(data['bondType'], 'String');
        }

        if (data.hasOwnProperty('debtType')) {
          obj['debtType'] = _ApiClient["default"].convertToType(data['debtType'], 'String');
        }

        if (data.hasOwnProperty('industryGroup')) {
          obj['industryGroup'] = _ApiClient["default"].convertToType(data['industryGroup'], 'String');
        }

        if (data.hasOwnProperty('industrySubGroup')) {
          obj['industrySubGroup'] = _ApiClient["default"].convertToType(data['industrySubGroup'], 'String');
        }

        if (data.hasOwnProperty('asset')) {
          obj['asset'] = _ApiClient["default"].convertToType(data['asset'], 'String');
        }

        if (data.hasOwnProperty('assetType')) {
          obj['assetType'] = _ApiClient["default"].convertToType(data['assetType'], 'String');
        }

        if (data.hasOwnProperty('datedDate')) {
          obj['datedDate'] = _ApiClient["default"].convertToType(data['datedDate'], 'String');
        }

        if (data.hasOwnProperty('firstCouponDate')) {
          obj['firstCouponDate'] = _ApiClient["default"].convertToType(data['firstCouponDate'], 'String');
        }

        if (data.hasOwnProperty('originalOffering')) {
          obj['originalOffering'] = _ApiClient["default"].convertToType(data['originalOffering'], 'Number');
        }

        if (data.hasOwnProperty('amountOutstanding')) {
          obj['amountOutstanding'] = _ApiClient["default"].convertToType(data['amountOutstanding'], 'Number');
        }

        if (data.hasOwnProperty('paymentFrequency')) {
          obj['paymentFrequency'] = _ApiClient["default"].convertToType(data['paymentFrequency'], 'String');
        }

        if (data.hasOwnProperty('securityLevel')) {
          obj['securityLevel'] = _ApiClient["default"].convertToType(data['securityLevel'], 'String');
        }

        if (data.hasOwnProperty('callable')) {
          obj['callable'] = _ApiClient["default"].convertToType(data['callable'], 'Boolean');
        }

        if (data.hasOwnProperty('couponType')) {
          obj['couponType'] = _ApiClient["default"].convertToType(data['couponType'], 'String');
        }
      }

      return obj;
    }
  }]);

  return BondProfile;
}();
/**
 * ISIN.
 * @member {String} isin
 */


BondProfile.prototype['isin'] = undefined;
/**
 * Cusip.
 * @member {String} cusip
 */

BondProfile.prototype['cusip'] = undefined;
/**
 * FIGI.
 * @member {String} figi
 */

BondProfile.prototype['figi'] = undefined;
/**
 * Coupon.
 * @member {Number} coupon
 */

BondProfile.prototype['coupon'] = undefined;
/**
 * Period.
 * @member {String} maturityDate
 */

BondProfile.prototype['maturityDate'] = undefined;
/**
 * Offering price.
 * @member {Number} offeringPrice
 */

BondProfile.prototype['offeringPrice'] = undefined;
/**
 * Issue date.
 * @member {String} issueDate
 */

BondProfile.prototype['issueDate'] = undefined;
/**
 * Bond type.
 * @member {String} bondType
 */

BondProfile.prototype['bondType'] = undefined;
/**
 * Bond type.
 * @member {String} debtType
 */

BondProfile.prototype['debtType'] = undefined;
/**
 * Industry.
 * @member {String} industryGroup
 */

BondProfile.prototype['industryGroup'] = undefined;
/**
 * Sub-Industry.
 * @member {String} industrySubGroup
 */

BondProfile.prototype['industrySubGroup'] = undefined;
/**
 * Asset.
 * @member {String} asset
 */

BondProfile.prototype['asset'] = undefined;
/**
 * Asset.
 * @member {String} assetType
 */

BondProfile.prototype['assetType'] = undefined;
/**
 * Dated date.
 * @member {String} datedDate
 */

BondProfile.prototype['datedDate'] = undefined;
/**
 * First coupon date.
 * @member {String} firstCouponDate
 */

BondProfile.prototype['firstCouponDate'] = undefined;
/**
 * Offering amount.
 * @member {Number} originalOffering
 */

BondProfile.prototype['originalOffering'] = undefined;
/**
 * Outstanding amount.
 * @member {Number} amountOutstanding
 */

BondProfile.prototype['amountOutstanding'] = undefined;
/**
 * Payment frequency.
 * @member {String} paymentFrequency
 */

BondProfile.prototype['paymentFrequency'] = undefined;
/**
 * Security level.
 * @member {String} securityLevel
 */

BondProfile.prototype['securityLevel'] = undefined;
/**
 * Callable.
 * @member {Boolean} callable
 */

BondProfile.prototype['callable'] = undefined;
/**
 * Coupon type.
 * @member {String} couponType
 */

BondProfile.prototype['couponType'] = undefined;
var _default = BondProfile;
exports["default"] = _default;
},{"../ApiClient":10}],17:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The BondTickData model module.
 * @module model/BondTickData
 * @version 1.2.16
 */
var BondTickData = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>BondTickData</code>.
   * @alias module:model/BondTickData
   */
  function BondTickData() {
    _classCallCheck(this, BondTickData);

    BondTickData.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(BondTickData, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>BondTickData</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/BondTickData} obj Optional instance to populate.
     * @return {module:model/BondTickData} The populated <code>BondTickData</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new BondTickData();

        if (data.hasOwnProperty('skip')) {
          obj['skip'] = _ApiClient["default"].convertToType(data['skip'], 'Number');
        }

        if (data.hasOwnProperty('count')) {
          obj['count'] = _ApiClient["default"].convertToType(data['count'], 'Number');
        }

        if (data.hasOwnProperty('total')) {
          obj['total'] = _ApiClient["default"].convertToType(data['total'], 'Number');
        }

        if (data.hasOwnProperty('v')) {
          obj['v'] = _ApiClient["default"].convertToType(data['v'], ['Number']);
        }

        if (data.hasOwnProperty('p')) {
          obj['p'] = _ApiClient["default"].convertToType(data['p'], ['Number']);
        }

        if (data.hasOwnProperty('t')) {
          obj['t'] = _ApiClient["default"].convertToType(data['t'], ['Number']);
        }

        if (data.hasOwnProperty('si')) {
          obj['si'] = _ApiClient["default"].convertToType(data['si'], ['String']);
        }

        if (data.hasOwnProperty('cp')) {
          obj['cp'] = _ApiClient["default"].convertToType(data['cp'], ['String']);
        }

        if (data.hasOwnProperty('c')) {
          obj['c'] = _ApiClient["default"].convertToType(data['c'], [['String']]);
        }
      }

      return obj;
    }
  }]);

  return BondTickData;
}();
/**
 * Number of ticks skipped.
 * @member {Number} skip
 */


BondTickData.prototype['skip'] = undefined;
/**
 * Number of ticks returned. If <code>count</code> < <code>limit</code>, all data for that date has been returned.
 * @member {Number} count
 */

BondTickData.prototype['count'] = undefined;
/**
 * Total number of ticks for that date.
 * @member {Number} total
 */

BondTickData.prototype['total'] = undefined;
/**
 * List of volume data.
 * @member {Array.<Number>} v
 */

BondTickData.prototype['v'] = undefined;
/**
 * List of price data.
 * @member {Array.<Number>} p
 */

BondTickData.prototype['p'] = undefined;
/**
 * List of timestamp in UNIX ms.
 * @member {Array.<Number>} t
 */

BondTickData.prototype['t'] = undefined;
/**
 * List of values showing the side (Buy/sell) of each trade. List of supported values: <a target=\"_blank\" href=\"https://docs.google.com/spreadsheets/d/1O3aueXSPOqo7Iuyz4PqDG6yZunHsX8BTefZ2kFk5pz4/edit?usp=sharing\",>here</a>
 * @member {Array.<String>} si
 */

BondTickData.prototype['si'] = undefined;
/**
 * List of values showing the counterparty of each trade. List of supported values: <a target=\"_blank\" href=\"https://docs.google.com/spreadsheets/d/1O3aueXSPOqo7Iuyz4PqDG6yZunHsX8BTefZ2kFk5pz4/edit?usp=sharing\",>here</a>
 * @member {Array.<String>} cp
 */

BondTickData.prototype['cp'] = undefined;
/**
 * List of trade conditions. A comprehensive list of trade conditions code can be found <a target=\"_blank\" href=\"https://docs.google.com/spreadsheets/d/1O3aueXSPOqo7Iuyz4PqDG6yZunHsX8BTefZ2kFk5pz4/edit?usp=sharing\">here</a>
 * @member {Array.<Array.<String>>} c
 */

BondTickData.prototype['c'] = undefined;
var _default = BondTickData;
exports["default"] = _default;
},{"../ApiClient":10}],18:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The BreakdownItem model module.
 * @module model/BreakdownItem
 * @version 1.2.16
 */
var BreakdownItem = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>BreakdownItem</code>.
   * @alias module:model/BreakdownItem
   */
  function BreakdownItem() {
    _classCallCheck(this, BreakdownItem);

    BreakdownItem.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(BreakdownItem, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>BreakdownItem</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/BreakdownItem} obj Optional instance to populate.
     * @return {module:model/BreakdownItem} The populated <code>BreakdownItem</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new BreakdownItem();

        if (data.hasOwnProperty('accessNumber')) {
          obj['accessNumber'] = _ApiClient["default"].convertToType(data['accessNumber'], 'String');
        }

        if (data.hasOwnProperty('breakdown')) {
          obj['breakdown'] = _ApiClient["default"].convertToType(data['breakdown'], Object);
        }
      }

      return obj;
    }
  }]);

  return BreakdownItem;
}();
/**
 * Access number of the report from which the data is sourced.
 * @member {String} accessNumber
 */


BreakdownItem.prototype['accessNumber'] = undefined;
/**
 * @member {Object} breakdown
 */

BreakdownItem.prototype['breakdown'] = undefined;
var _default = BreakdownItem;
exports["default"] = _default;
},{"../ApiClient":10}],19:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The Company model module.
 * @module model/Company
 * @version 1.2.16
 */
var Company = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>Company</code>.
   * @alias module:model/Company
   */
  function Company() {
    _classCallCheck(this, Company);

    Company.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(Company, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>Company</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Company} obj Optional instance to populate.
     * @return {module:model/Company} The populated <code>Company</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new Company();

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('age')) {
          obj['age'] = _ApiClient["default"].convertToType(data['age'], 'Number');
        }

        if (data.hasOwnProperty('title')) {
          obj['title'] = _ApiClient["default"].convertToType(data['title'], 'String');
        }

        if (data.hasOwnProperty('since')) {
          obj['since'] = _ApiClient["default"].convertToType(data['since'], 'String');
        }

        if (data.hasOwnProperty('sex')) {
          obj['sex'] = _ApiClient["default"].convertToType(data['sex'], 'String');
        }

        if (data.hasOwnProperty('compensation')) {
          obj['compensation'] = _ApiClient["default"].convertToType(data['compensation'], 'Number');
        }

        if (data.hasOwnProperty('currency')) {
          obj['currency'] = _ApiClient["default"].convertToType(data['currency'], 'String');
        }
      }

      return obj;
    }
  }]);

  return Company;
}();
/**
 * Executive name
 * @member {String} name
 */


Company.prototype['name'] = undefined;
/**
 * Age
 * @member {Number} age
 */

Company.prototype['age'] = undefined;
/**
 * Title
 * @member {String} title
 */

Company.prototype['title'] = undefined;
/**
 * Year first appointed as executive/director of the company
 * @member {String} since
 */

Company.prototype['since'] = undefined;
/**
 * Sex
 * @member {String} sex
 */

Company.prototype['sex'] = undefined;
/**
 * Total compensation
 * @member {Number} compensation
 */

Company.prototype['compensation'] = undefined;
/**
 * Compensation currency
 * @member {String} currency
 */

Company.prototype['currency'] = undefined;
var _default = Company;
exports["default"] = _default;
},{"../ApiClient":10}],20:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The CompanyESG model module.
 * @module model/CompanyESG
 * @version 1.2.16
 */
var CompanyESG = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>CompanyESG</code>.
   * @alias module:model/CompanyESG
   */
  function CompanyESG() {
    _classCallCheck(this, CompanyESG);

    CompanyESG.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(CompanyESG, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>CompanyESG</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/CompanyESG} obj Optional instance to populate.
     * @return {module:model/CompanyESG} The populated <code>CompanyESG</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new CompanyESG();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('totalESGScore')) {
          obj['totalESGScore'] = _ApiClient["default"].convertToType(data['totalESGScore'], 'Number');
        }

        if (data.hasOwnProperty('environmentScore')) {
          obj['environmentScore'] = _ApiClient["default"].convertToType(data['environmentScore'], 'Number');
        }

        if (data.hasOwnProperty('governanceScore')) {
          obj['governanceScore'] = _ApiClient["default"].convertToType(data['governanceScore'], 'Number');
        }

        if (data.hasOwnProperty('socialScore')) {
          obj['socialScore'] = _ApiClient["default"].convertToType(data['socialScore'], 'Number');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], Object);
        }
      }

      return obj;
    }
  }]);

  return CompanyESG;
}();
/**
 * symbol
 * @member {String} symbol
 */


CompanyESG.prototype['symbol'] = undefined;
/**
 * Total ESG Score
 * @member {Number} totalESGScore
 */

CompanyESG.prototype['totalESGScore'] = undefined;
/**
 * Environment Score
 * @member {Number} environmentScore
 */

CompanyESG.prototype['environmentScore'] = undefined;
/**
 * Governance Score
 * @member {Number} governanceScore
 */

CompanyESG.prototype['governanceScore'] = undefined;
/**
 * Social Score
 * @member {Number} socialScore
 */

CompanyESG.prototype['socialScore'] = undefined;
/**
 * @member {Object} data
 */

CompanyESG.prototype['data'] = undefined;
var _default = CompanyESG;
exports["default"] = _default;
},{"../ApiClient":10}],21:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _CompanyEarningsQualityScoreData = _interopRequireDefault(require("./CompanyEarningsQualityScoreData"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The CompanyEarningsQualityScore model module.
 * @module model/CompanyEarningsQualityScore
 * @version 1.2.16
 */
var CompanyEarningsQualityScore = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>CompanyEarningsQualityScore</code>.
   * @alias module:model/CompanyEarningsQualityScore
   */
  function CompanyEarningsQualityScore() {
    _classCallCheck(this, CompanyEarningsQualityScore);

    CompanyEarningsQualityScore.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(CompanyEarningsQualityScore, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>CompanyEarningsQualityScore</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/CompanyEarningsQualityScore} obj Optional instance to populate.
     * @return {module:model/CompanyEarningsQualityScore} The populated <code>CompanyEarningsQualityScore</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new CompanyEarningsQualityScore();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('freq')) {
          obj['freq'] = _ApiClient["default"].convertToType(data['freq'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_CompanyEarningsQualityScoreData["default"]]);
        }
      }

      return obj;
    }
  }]);

  return CompanyEarningsQualityScore;
}();
/**
 * Symbol
 * @member {String} symbol
 */


CompanyEarningsQualityScore.prototype['symbol'] = undefined;
/**
 * Frequency
 * @member {String} freq
 */

CompanyEarningsQualityScore.prototype['freq'] = undefined;
/**
 * Array of earnings quality score.
 * @member {Array.<module:model/CompanyEarningsQualityScoreData>} data
 */

CompanyEarningsQualityScore.prototype['data'] = undefined;
var _default = CompanyEarningsQualityScore;
exports["default"] = _default;
},{"../ApiClient":10,"./CompanyEarningsQualityScoreData":22}],22:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The CompanyEarningsQualityScoreData model module.
 * @module model/CompanyEarningsQualityScoreData
 * @version 1.2.16
 */
var CompanyEarningsQualityScoreData = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>CompanyEarningsQualityScoreData</code>.
   * @alias module:model/CompanyEarningsQualityScoreData
   */
  function CompanyEarningsQualityScoreData() {
    _classCallCheck(this, CompanyEarningsQualityScoreData);

    CompanyEarningsQualityScoreData.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(CompanyEarningsQualityScoreData, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>CompanyEarningsQualityScoreData</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/CompanyEarningsQualityScoreData} obj Optional instance to populate.
     * @return {module:model/CompanyEarningsQualityScoreData} The populated <code>CompanyEarningsQualityScoreData</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new CompanyEarningsQualityScoreData();

        if (data.hasOwnProperty('period')) {
          obj['period'] = _ApiClient["default"].convertToType(data['period'], 'String');
        }

        if (data.hasOwnProperty('growth')) {
          obj['growth'] = _ApiClient["default"].convertToType(data['growth'], 'Number');
        }

        if (data.hasOwnProperty('profitability')) {
          obj['profitability'] = _ApiClient["default"].convertToType(data['profitability'], 'Number');
        }

        if (data.hasOwnProperty('cashGenerationCapitalAllocation')) {
          obj['cashGenerationCapitalAllocation'] = _ApiClient["default"].convertToType(data['cashGenerationCapitalAllocation'], 'Number');
        }

        if (data.hasOwnProperty('leverage')) {
          obj['leverage'] = _ApiClient["default"].convertToType(data['leverage'], 'Number');
        }

        if (data.hasOwnProperty('score')) {
          obj['score'] = _ApiClient["default"].convertToType(data['score'], 'Number');
        }

        if (data.hasOwnProperty('letterScore')) {
          obj['letterScore'] = _ApiClient["default"].convertToType(data['letterScore'], 'String');
        }
      }

      return obj;
    }
  }]);

  return CompanyEarningsQualityScoreData;
}();
/**
 * Period
 * @member {String} period
 */


CompanyEarningsQualityScoreData.prototype['period'] = undefined;
/**
 * Growth Score
 * @member {Number} growth
 */

CompanyEarningsQualityScoreData.prototype['growth'] = undefined;
/**
 * Profitability Score
 * @member {Number} profitability
 */

CompanyEarningsQualityScoreData.prototype['profitability'] = undefined;
/**
 * Cash Generation and Capital Allocation
 * @member {Number} cashGenerationCapitalAllocation
 */

CompanyEarningsQualityScoreData.prototype['cashGenerationCapitalAllocation'] = undefined;
/**
 * Leverage Score
 * @member {Number} leverage
 */

CompanyEarningsQualityScoreData.prototype['leverage'] = undefined;
/**
 * Total Score
 * @member {Number} score
 */

CompanyEarningsQualityScoreData.prototype['score'] = undefined;
/**
 * Letter Score
 * @member {String} letterScore
 */

CompanyEarningsQualityScoreData.prototype['letterScore'] = undefined;
var _default = CompanyEarningsQualityScoreData;
exports["default"] = _default;
},{"../ApiClient":10}],23:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _Company = _interopRequireDefault(require("./Company"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The CompanyExecutive model module.
 * @module model/CompanyExecutive
 * @version 1.2.16
 */
var CompanyExecutive = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>CompanyExecutive</code>.
   * @alias module:model/CompanyExecutive
   */
  function CompanyExecutive() {
    _classCallCheck(this, CompanyExecutive);

    CompanyExecutive.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(CompanyExecutive, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>CompanyExecutive</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/CompanyExecutive} obj Optional instance to populate.
     * @return {module:model/CompanyExecutive} The populated <code>CompanyExecutive</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new CompanyExecutive();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('executive')) {
          obj['executive'] = _ApiClient["default"].convertToType(data['executive'], [_Company["default"]]);
        }
      }

      return obj;
    }
  }]);

  return CompanyExecutive;
}();
/**
 * Company symbol.
 * @member {String} symbol
 */


CompanyExecutive.prototype['symbol'] = undefined;
/**
 * Array of company's executives and members of the Board.
 * @member {Array.<module:model/Company>} executive
 */

CompanyExecutive.prototype['executive'] = undefined;
var _default = CompanyExecutive;
exports["default"] = _default;
},{"../ApiClient":10,"./Company":19}],24:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The CompanyNews model module.
 * @module model/CompanyNews
 * @version 1.2.16
 */
var CompanyNews = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>CompanyNews</code>.
   * @alias module:model/CompanyNews
   */
  function CompanyNews() {
    _classCallCheck(this, CompanyNews);

    CompanyNews.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(CompanyNews, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>CompanyNews</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/CompanyNews} obj Optional instance to populate.
     * @return {module:model/CompanyNews} The populated <code>CompanyNews</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new CompanyNews();

        if (data.hasOwnProperty('category')) {
          obj['category'] = _ApiClient["default"].convertToType(data['category'], 'String');
        }

        if (data.hasOwnProperty('datetime')) {
          obj['datetime'] = _ApiClient["default"].convertToType(data['datetime'], 'Number');
        }

        if (data.hasOwnProperty('headline')) {
          obj['headline'] = _ApiClient["default"].convertToType(data['headline'], 'String');
        }

        if (data.hasOwnProperty('id')) {
          obj['id'] = _ApiClient["default"].convertToType(data['id'], 'Number');
        }

        if (data.hasOwnProperty('image')) {
          obj['image'] = _ApiClient["default"].convertToType(data['image'], 'String');
        }

        if (data.hasOwnProperty('related')) {
          obj['related'] = _ApiClient["default"].convertToType(data['related'], 'String');
        }

        if (data.hasOwnProperty('source')) {
          obj['source'] = _ApiClient["default"].convertToType(data['source'], 'String');
        }

        if (data.hasOwnProperty('summary')) {
          obj['summary'] = _ApiClient["default"].convertToType(data['summary'], 'String');
        }

        if (data.hasOwnProperty('url')) {
          obj['url'] = _ApiClient["default"].convertToType(data['url'], 'String');
        }
      }

      return obj;
    }
  }]);

  return CompanyNews;
}();
/**
 * News category.
 * @member {String} category
 */


CompanyNews.prototype['category'] = undefined;
/**
 * Published time in UNIX timestamp.
 * @member {Number} datetime
 */

CompanyNews.prototype['datetime'] = undefined;
/**
 * News headline.
 * @member {String} headline
 */

CompanyNews.prototype['headline'] = undefined;
/**
 * News ID. This value can be used for <code>minId</code> params to get the latest news only.
 * @member {Number} id
 */

CompanyNews.prototype['id'] = undefined;
/**
 * Thumbnail image URL.
 * @member {String} image
 */

CompanyNews.prototype['image'] = undefined;
/**
 * Related stocks and companies mentioned in the article.
 * @member {String} related
 */

CompanyNews.prototype['related'] = undefined;
/**
 * News source.
 * @member {String} source
 */

CompanyNews.prototype['source'] = undefined;
/**
 * News summary.
 * @member {String} summary
 */

CompanyNews.prototype['summary'] = undefined;
/**
 * URL of the original article.
 * @member {String} url
 */

CompanyNews.prototype['url'] = undefined;
var _default = CompanyNews;
exports["default"] = _default;
},{"../ApiClient":10}],25:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The CompanyNewsStatistics model module.
 * @module model/CompanyNewsStatistics
 * @version 1.2.16
 */
var CompanyNewsStatistics = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>CompanyNewsStatistics</code>.
   * @alias module:model/CompanyNewsStatistics
   */
  function CompanyNewsStatistics() {
    _classCallCheck(this, CompanyNewsStatistics);

    CompanyNewsStatistics.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(CompanyNewsStatistics, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>CompanyNewsStatistics</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/CompanyNewsStatistics} obj Optional instance to populate.
     * @return {module:model/CompanyNewsStatistics} The populated <code>CompanyNewsStatistics</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new CompanyNewsStatistics();

        if (data.hasOwnProperty('articlesInLastWeek')) {
          obj['articlesInLastWeek'] = _ApiClient["default"].convertToType(data['articlesInLastWeek'], 'Number');
        }

        if (data.hasOwnProperty('buzz')) {
          obj['buzz'] = _ApiClient["default"].convertToType(data['buzz'], 'Number');
        }

        if (data.hasOwnProperty('weeklyAverage')) {
          obj['weeklyAverage'] = _ApiClient["default"].convertToType(data['weeklyAverage'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return CompanyNewsStatistics;
}();
/**
 * 
 * @member {Number} articlesInLastWeek
 */


CompanyNewsStatistics.prototype['articlesInLastWeek'] = undefined;
/**
 * 
 * @member {Number} buzz
 */

CompanyNewsStatistics.prototype['buzz'] = undefined;
/**
 * 
 * @member {Number} weeklyAverage
 */

CompanyNewsStatistics.prototype['weeklyAverage'] = undefined;
var _default = CompanyNewsStatistics;
exports["default"] = _default;
},{"../ApiClient":10}],26:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The CompanyProfile model module.
 * @module model/CompanyProfile
 * @version 1.2.16
 */
var CompanyProfile = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>CompanyProfile</code>.
   * @alias module:model/CompanyProfile
   */
  function CompanyProfile() {
    _classCallCheck(this, CompanyProfile);

    CompanyProfile.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(CompanyProfile, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>CompanyProfile</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/CompanyProfile} obj Optional instance to populate.
     * @return {module:model/CompanyProfile} The populated <code>CompanyProfile</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new CompanyProfile();

        if (data.hasOwnProperty('address')) {
          obj['address'] = _ApiClient["default"].convertToType(data['address'], 'String');
        }

        if (data.hasOwnProperty('city')) {
          obj['city'] = _ApiClient["default"].convertToType(data['city'], 'String');
        }

        if (data.hasOwnProperty('country')) {
          obj['country'] = _ApiClient["default"].convertToType(data['country'], 'String');
        }

        if (data.hasOwnProperty('currency')) {
          obj['currency'] = _ApiClient["default"].convertToType(data['currency'], 'String');
        }

        if (data.hasOwnProperty('cusip')) {
          obj['cusip'] = _ApiClient["default"].convertToType(data['cusip'], 'String');
        }

        if (data.hasOwnProperty('sedol')) {
          obj['sedol'] = _ApiClient["default"].convertToType(data['sedol'], 'String');
        }

        if (data.hasOwnProperty('description')) {
          obj['description'] = _ApiClient["default"].convertToType(data['description'], 'String');
        }

        if (data.hasOwnProperty('exchange')) {
          obj['exchange'] = _ApiClient["default"].convertToType(data['exchange'], 'String');
        }

        if (data.hasOwnProperty('ggroup')) {
          obj['ggroup'] = _ApiClient["default"].convertToType(data['ggroup'], 'String');
        }

        if (data.hasOwnProperty('gind')) {
          obj['gind'] = _ApiClient["default"].convertToType(data['gind'], 'String');
        }

        if (data.hasOwnProperty('gsector')) {
          obj['gsector'] = _ApiClient["default"].convertToType(data['gsector'], 'String');
        }

        if (data.hasOwnProperty('gsubind')) {
          obj['gsubind'] = _ApiClient["default"].convertToType(data['gsubind'], 'String');
        }

        if (data.hasOwnProperty('isin')) {
          obj['isin'] = _ApiClient["default"].convertToType(data['isin'], 'String');
        }

        if (data.hasOwnProperty('naicsNationalIndustry')) {
          obj['naicsNationalIndustry'] = _ApiClient["default"].convertToType(data['naicsNationalIndustry'], 'String');
        }

        if (data.hasOwnProperty('naics')) {
          obj['naics'] = _ApiClient["default"].convertToType(data['naics'], 'String');
        }

        if (data.hasOwnProperty('naicsSector')) {
          obj['naicsSector'] = _ApiClient["default"].convertToType(data['naicsSector'], 'String');
        }

        if (data.hasOwnProperty('naicsSubsector')) {
          obj['naicsSubsector'] = _ApiClient["default"].convertToType(data['naicsSubsector'], 'String');
        }

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('phone')) {
          obj['phone'] = _ApiClient["default"].convertToType(data['phone'], 'String');
        }

        if (data.hasOwnProperty('state')) {
          obj['state'] = _ApiClient["default"].convertToType(data['state'], 'String');
        }

        if (data.hasOwnProperty('ticker')) {
          obj['ticker'] = _ApiClient["default"].convertToType(data['ticker'], 'String');
        }

        if (data.hasOwnProperty('weburl')) {
          obj['weburl'] = _ApiClient["default"].convertToType(data['weburl'], 'String');
        }

        if (data.hasOwnProperty('ipo')) {
          obj['ipo'] = _ApiClient["default"].convertToType(data['ipo'], 'Date');
        }

        if (data.hasOwnProperty('marketCapitalization')) {
          obj['marketCapitalization'] = _ApiClient["default"].convertToType(data['marketCapitalization'], 'Number');
        }

        if (data.hasOwnProperty('shareOutstanding')) {
          obj['shareOutstanding'] = _ApiClient["default"].convertToType(data['shareOutstanding'], 'Number');
        }

        if (data.hasOwnProperty('employeeTotal')) {
          obj['employeeTotal'] = _ApiClient["default"].convertToType(data['employeeTotal'], 'Number');
        }

        if (data.hasOwnProperty('logo')) {
          obj['logo'] = _ApiClient["default"].convertToType(data['logo'], 'String');
        }

        if (data.hasOwnProperty('finnhubIndustry')) {
          obj['finnhubIndustry'] = _ApiClient["default"].convertToType(data['finnhubIndustry'], 'String');
        }
      }

      return obj;
    }
  }]);

  return CompanyProfile;
}();
/**
 * Address of company's headquarter.
 * @member {String} address
 */


CompanyProfile.prototype['address'] = undefined;
/**
 * City of company's headquarter.
 * @member {String} city
 */

CompanyProfile.prototype['city'] = undefined;
/**
 * Country of company's headquarter.
 * @member {String} country
 */

CompanyProfile.prototype['country'] = undefined;
/**
 * Currency used in company filings.
 * @member {String} currency
 */

CompanyProfile.prototype['currency'] = undefined;
/**
 * CUSIP number.
 * @member {String} cusip
 */

CompanyProfile.prototype['cusip'] = undefined;
/**
 * Sedol number.
 * @member {String} sedol
 */

CompanyProfile.prototype['sedol'] = undefined;
/**
 * Company business summary.
 * @member {String} description
 */

CompanyProfile.prototype['description'] = undefined;
/**
 * Listed exchange.
 * @member {String} exchange
 */

CompanyProfile.prototype['exchange'] = undefined;
/**
 * Industry group.
 * @member {String} ggroup
 */

CompanyProfile.prototype['ggroup'] = undefined;
/**
 * Industry.
 * @member {String} gind
 */

CompanyProfile.prototype['gind'] = undefined;
/**
 * Sector.
 * @member {String} gsector
 */

CompanyProfile.prototype['gsector'] = undefined;
/**
 * Sub-industry.
 * @member {String} gsubind
 */

CompanyProfile.prototype['gsubind'] = undefined;
/**
 * ISIN number.
 * @member {String} isin
 */

CompanyProfile.prototype['isin'] = undefined;
/**
 * NAICS national industry.
 * @member {String} naicsNationalIndustry
 */

CompanyProfile.prototype['naicsNationalIndustry'] = undefined;
/**
 * NAICS industry.
 * @member {String} naics
 */

CompanyProfile.prototype['naics'] = undefined;
/**
 * NAICS sector.
 * @member {String} naicsSector
 */

CompanyProfile.prototype['naicsSector'] = undefined;
/**
 * NAICS subsector.
 * @member {String} naicsSubsector
 */

CompanyProfile.prototype['naicsSubsector'] = undefined;
/**
 * Company name.
 * @member {String} name
 */

CompanyProfile.prototype['name'] = undefined;
/**
 * Company phone number.
 * @member {String} phone
 */

CompanyProfile.prototype['phone'] = undefined;
/**
 * State of company's headquarter.
 * @member {String} state
 */

CompanyProfile.prototype['state'] = undefined;
/**
 * Company symbol/ticker as used on the listed exchange.
 * @member {String} ticker
 */

CompanyProfile.prototype['ticker'] = undefined;
/**
 * Company website.
 * @member {String} weburl
 */

CompanyProfile.prototype['weburl'] = undefined;
/**
 * IPO date.
 * @member {Date} ipo
 */

CompanyProfile.prototype['ipo'] = undefined;
/**
 * Market Capitalization.
 * @member {Number} marketCapitalization
 */

CompanyProfile.prototype['marketCapitalization'] = undefined;
/**
 * Number of oustanding shares.
 * @member {Number} shareOutstanding
 */

CompanyProfile.prototype['shareOutstanding'] = undefined;
/**
 * Number of employee.
 * @member {Number} employeeTotal
 */

CompanyProfile.prototype['employeeTotal'] = undefined;
/**
 * Logo image.
 * @member {String} logo
 */

CompanyProfile.prototype['logo'] = undefined;
/**
 * Finnhub industry classification.
 * @member {String} finnhubIndustry
 */

CompanyProfile.prototype['finnhubIndustry'] = undefined;
var _default = CompanyProfile;
exports["default"] = _default;
},{"../ApiClient":10}],27:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The CompanyProfile2 model module.
 * @module model/CompanyProfile2
 * @version 1.2.16
 */
var CompanyProfile2 = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>CompanyProfile2</code>.
   * @alias module:model/CompanyProfile2
   */
  function CompanyProfile2() {
    _classCallCheck(this, CompanyProfile2);

    CompanyProfile2.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(CompanyProfile2, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>CompanyProfile2</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/CompanyProfile2} obj Optional instance to populate.
     * @return {module:model/CompanyProfile2} The populated <code>CompanyProfile2</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new CompanyProfile2();

        if (data.hasOwnProperty('country')) {
          obj['country'] = _ApiClient["default"].convertToType(data['country'], 'String');
        }

        if (data.hasOwnProperty('currency')) {
          obj['currency'] = _ApiClient["default"].convertToType(data['currency'], 'String');
        }

        if (data.hasOwnProperty('exchange')) {
          obj['exchange'] = _ApiClient["default"].convertToType(data['exchange'], 'String');
        }

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('ticker')) {
          obj['ticker'] = _ApiClient["default"].convertToType(data['ticker'], 'String');
        }

        if (data.hasOwnProperty('ipo')) {
          obj['ipo'] = _ApiClient["default"].convertToType(data['ipo'], 'Date');
        }

        if (data.hasOwnProperty('marketCapitalization')) {
          obj['marketCapitalization'] = _ApiClient["default"].convertToType(data['marketCapitalization'], 'Number');
        }

        if (data.hasOwnProperty('shareOutstanding')) {
          obj['shareOutstanding'] = _ApiClient["default"].convertToType(data['shareOutstanding'], 'Number');
        }

        if (data.hasOwnProperty('logo')) {
          obj['logo'] = _ApiClient["default"].convertToType(data['logo'], 'String');
        }

        if (data.hasOwnProperty('phone')) {
          obj['phone'] = _ApiClient["default"].convertToType(data['phone'], 'String');
        }

        if (data.hasOwnProperty('weburl')) {
          obj['weburl'] = _ApiClient["default"].convertToType(data['weburl'], 'String');
        }

        if (data.hasOwnProperty('finnhubIndustry')) {
          obj['finnhubIndustry'] = _ApiClient["default"].convertToType(data['finnhubIndustry'], 'String');
        }
      }

      return obj;
    }
  }]);

  return CompanyProfile2;
}();
/**
 * Country of company's headquarter.
 * @member {String} country
 */


CompanyProfile2.prototype['country'] = undefined;
/**
 * Currency used in company filings.
 * @member {String} currency
 */

CompanyProfile2.prototype['currency'] = undefined;
/**
 * Listed exchange.
 * @member {String} exchange
 */

CompanyProfile2.prototype['exchange'] = undefined;
/**
 * Company name.
 * @member {String} name
 */

CompanyProfile2.prototype['name'] = undefined;
/**
 * Company symbol/ticker as used on the listed exchange.
 * @member {String} ticker
 */

CompanyProfile2.prototype['ticker'] = undefined;
/**
 * IPO date.
 * @member {Date} ipo
 */

CompanyProfile2.prototype['ipo'] = undefined;
/**
 * Market Capitalization.
 * @member {Number} marketCapitalization
 */

CompanyProfile2.prototype['marketCapitalization'] = undefined;
/**
 * Number of oustanding shares.
 * @member {Number} shareOutstanding
 */

CompanyProfile2.prototype['shareOutstanding'] = undefined;
/**
 * Logo image.
 * @member {String} logo
 */

CompanyProfile2.prototype['logo'] = undefined;
/**
 * Company phone number.
 * @member {String} phone
 */

CompanyProfile2.prototype['phone'] = undefined;
/**
 * Company website.
 * @member {String} weburl
 */

CompanyProfile2.prototype['weburl'] = undefined;
/**
 * Finnhub industry classification.
 * @member {String} finnhubIndustry
 */

CompanyProfile2.prototype['finnhubIndustry'] = undefined;
var _default = CompanyProfile2;
exports["default"] = _default;
},{"../ApiClient":10}],28:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The CountryMetadata model module.
 * @module model/CountryMetadata
 * @version 1.2.16
 */
var CountryMetadata = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>CountryMetadata</code>.
   * @alias module:model/CountryMetadata
   */
  function CountryMetadata() {
    _classCallCheck(this, CountryMetadata);

    CountryMetadata.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(CountryMetadata, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>CountryMetadata</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/CountryMetadata} obj Optional instance to populate.
     * @return {module:model/CountryMetadata} The populated <code>CountryMetadata</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new CountryMetadata();

        if (data.hasOwnProperty('country')) {
          obj['country'] = _ApiClient["default"].convertToType(data['country'], 'String');
        }

        if (data.hasOwnProperty('code2')) {
          obj['code2'] = _ApiClient["default"].convertToType(data['code2'], 'String');
        }

        if (data.hasOwnProperty('code3')) {
          obj['code3'] = _ApiClient["default"].convertToType(data['code3'], 'String');
        }

        if (data.hasOwnProperty('codeNo')) {
          obj['codeNo'] = _ApiClient["default"].convertToType(data['codeNo'], 'String');
        }

        if (data.hasOwnProperty('currency')) {
          obj['currency'] = _ApiClient["default"].convertToType(data['currency'], 'String');
        }

        if (data.hasOwnProperty('currencyCode')) {
          obj['currencyCode'] = _ApiClient["default"].convertToType(data['currencyCode'], 'String');
        }

        if (data.hasOwnProperty('region')) {
          obj['region'] = _ApiClient["default"].convertToType(data['region'], 'String');
        }

        if (data.hasOwnProperty('subRegion')) {
          obj['subRegion'] = _ApiClient["default"].convertToType(data['subRegion'], 'String');
        }
      }

      return obj;
    }
  }]);

  return CountryMetadata;
}();
/**
 * Country name
 * @member {String} country
 */


CountryMetadata.prototype['country'] = undefined;
/**
 * Alpha 2 code
 * @member {String} code2
 */

CountryMetadata.prototype['code2'] = undefined;
/**
 * Alpha 3 code
 * @member {String} code3
 */

CountryMetadata.prototype['code3'] = undefined;
/**
 * UN code
 * @member {String} codeNo
 */

CountryMetadata.prototype['codeNo'] = undefined;
/**
 * Currency name
 * @member {String} currency
 */

CountryMetadata.prototype['currency'] = undefined;
/**
 * Currency code
 * @member {String} currencyCode
 */

CountryMetadata.prototype['currencyCode'] = undefined;
/**
 * Region
 * @member {String} region
 */

CountryMetadata.prototype['region'] = undefined;
/**
 * Sub-Region
 * @member {String} subRegion
 */

CountryMetadata.prototype['subRegion'] = undefined;
var _default = CountryMetadata;
exports["default"] = _default;
},{"../ApiClient":10}],29:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The CovidInfo model module.
 * @module model/CovidInfo
 * @version 1.2.16
 */
var CovidInfo = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>CovidInfo</code>.
   * @alias module:model/CovidInfo
   */
  function CovidInfo() {
    _classCallCheck(this, CovidInfo);

    CovidInfo.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(CovidInfo, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>CovidInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/CovidInfo} obj Optional instance to populate.
     * @return {module:model/CovidInfo} The populated <code>CovidInfo</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new CovidInfo();

        if (data.hasOwnProperty('state')) {
          obj['state'] = _ApiClient["default"].convertToType(data['state'], 'String');
        }

        if (data.hasOwnProperty('case')) {
          obj['case'] = _ApiClient["default"].convertToType(data['case'], 'Number');
        }

        if (data.hasOwnProperty('death')) {
          obj['death'] = _ApiClient["default"].convertToType(data['death'], 'Number');
        }

        if (data.hasOwnProperty('updated')) {
          obj['updated'] = _ApiClient["default"].convertToType(data['updated'], 'String');
        }
      }

      return obj;
    }
  }]);

  return CovidInfo;
}();
/**
 * State.
 * @member {String} state
 */


CovidInfo.prototype['state'] = undefined;
/**
 * Number of confirmed cases.
 * @member {Number} case
 */

CovidInfo.prototype['case'] = undefined;
/**
 * Number of confirmed deaths.
 * @member {Number} death
 */

CovidInfo.prototype['death'] = undefined;
/**
 * Updated time.
 * @member {String} updated
 */

CovidInfo.prototype['updated'] = undefined;
var _default = CovidInfo;
exports["default"] = _default;
},{"../ApiClient":10}],30:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The CryptoCandles model module.
 * @module model/CryptoCandles
 * @version 1.2.16
 */
var CryptoCandles = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>CryptoCandles</code>.
   * @alias module:model/CryptoCandles
   */
  function CryptoCandles() {
    _classCallCheck(this, CryptoCandles);

    CryptoCandles.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(CryptoCandles, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>CryptoCandles</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/CryptoCandles} obj Optional instance to populate.
     * @return {module:model/CryptoCandles} The populated <code>CryptoCandles</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new CryptoCandles();

        if (data.hasOwnProperty('o')) {
          obj['o'] = _ApiClient["default"].convertToType(data['o'], ['Number']);
        }

        if (data.hasOwnProperty('h')) {
          obj['h'] = _ApiClient["default"].convertToType(data['h'], ['Number']);
        }

        if (data.hasOwnProperty('l')) {
          obj['l'] = _ApiClient["default"].convertToType(data['l'], ['Number']);
        }

        if (data.hasOwnProperty('c')) {
          obj['c'] = _ApiClient["default"].convertToType(data['c'], ['Number']);
        }

        if (data.hasOwnProperty('v')) {
          obj['v'] = _ApiClient["default"].convertToType(data['v'], ['Number']);
        }

        if (data.hasOwnProperty('t')) {
          obj['t'] = _ApiClient["default"].convertToType(data['t'], ['Number']);
        }

        if (data.hasOwnProperty('s')) {
          obj['s'] = _ApiClient["default"].convertToType(data['s'], 'String');
        }
      }

      return obj;
    }
  }]);

  return CryptoCandles;
}();
/**
 * List of open prices for returned candles.
 * @member {Array.<Number>} o
 */


CryptoCandles.prototype['o'] = undefined;
/**
 * List of high prices for returned candles.
 * @member {Array.<Number>} h
 */

CryptoCandles.prototype['h'] = undefined;
/**
 * List of low prices for returned candles.
 * @member {Array.<Number>} l
 */

CryptoCandles.prototype['l'] = undefined;
/**
 * List of close prices for returned candles.
 * @member {Array.<Number>} c
 */

CryptoCandles.prototype['c'] = undefined;
/**
 * List of volume data for returned candles.
 * @member {Array.<Number>} v
 */

CryptoCandles.prototype['v'] = undefined;
/**
 * List of timestamp for returned candles.
 * @member {Array.<Number>} t
 */

CryptoCandles.prototype['t'] = undefined;
/**
 * Status of the response. This field can either be ok or no_data.
 * @member {String} s
 */

CryptoCandles.prototype['s'] = undefined;
var _default = CryptoCandles;
exports["default"] = _default;
},{"../ApiClient":10}],31:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The CryptoProfile model module.
 * @module model/CryptoProfile
 * @version 1.2.16
 */
var CryptoProfile = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>CryptoProfile</code>.
   * @alias module:model/CryptoProfile
   */
  function CryptoProfile() {
    _classCallCheck(this, CryptoProfile);

    CryptoProfile.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(CryptoProfile, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>CryptoProfile</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/CryptoProfile} obj Optional instance to populate.
     * @return {module:model/CryptoProfile} The populated <code>CryptoProfile</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new CryptoProfile();

        if (data.hasOwnProperty('longName')) {
          obj['longName'] = _ApiClient["default"].convertToType(data['longName'], 'String');
        }

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('description')) {
          obj['description'] = _ApiClient["default"].convertToType(data['description'], 'String');
        }

        if (data.hasOwnProperty('website')) {
          obj['website'] = _ApiClient["default"].convertToType(data['website'], 'String');
        }

        if (data.hasOwnProperty('marketCap')) {
          obj['marketCap'] = _ApiClient["default"].convertToType(data['marketCap'], 'Number');
        }

        if (data.hasOwnProperty('totalSupply')) {
          obj['totalSupply'] = _ApiClient["default"].convertToType(data['totalSupply'], 'Number');
        }

        if (data.hasOwnProperty('maxSupply')) {
          obj['maxSupply'] = _ApiClient["default"].convertToType(data['maxSupply'], 'Number');
        }

        if (data.hasOwnProperty('circulatingSupply')) {
          obj['circulatingSupply'] = _ApiClient["default"].convertToType(data['circulatingSupply'], 'Number');
        }

        if (data.hasOwnProperty('logo')) {
          obj['logo'] = _ApiClient["default"].convertToType(data['logo'], 'String');
        }

        if (data.hasOwnProperty('launchDate')) {
          obj['launchDate'] = _ApiClient["default"].convertToType(data['launchDate'], 'String');
        }

        if (data.hasOwnProperty('proofType')) {
          obj['proofType'] = _ApiClient["default"].convertToType(data['proofType'], 'String');
        }
      }

      return obj;
    }
  }]);

  return CryptoProfile;
}();
/**
 * Long name.
 * @member {String} longName
 */


CryptoProfile.prototype['longName'] = undefined;
/**
 * Name.
 * @member {String} name
 */

CryptoProfile.prototype['name'] = undefined;
/**
 * Description.
 * @member {String} description
 */

CryptoProfile.prototype['description'] = undefined;
/**
 * Project's website.
 * @member {String} website
 */

CryptoProfile.prototype['website'] = undefined;
/**
 * Market capitalization.
 * @member {Number} marketCap
 */

CryptoProfile.prototype['marketCap'] = undefined;
/**
 * Total supply.
 * @member {Number} totalSupply
 */

CryptoProfile.prototype['totalSupply'] = undefined;
/**
 * Max supply.
 * @member {Number} maxSupply
 */

CryptoProfile.prototype['maxSupply'] = undefined;
/**
 * Circulating supply.
 * @member {Number} circulatingSupply
 */

CryptoProfile.prototype['circulatingSupply'] = undefined;
/**
 * Logo image.
 * @member {String} logo
 */

CryptoProfile.prototype['logo'] = undefined;
/**
 * Launch date.
 * @member {String} launchDate
 */

CryptoProfile.prototype['launchDate'] = undefined;
/**
 * Proof type.
 * @member {String} proofType
 */

CryptoProfile.prototype['proofType'] = undefined;
var _default = CryptoProfile;
exports["default"] = _default;
},{"../ApiClient":10}],32:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The CryptoSymbol model module.
 * @module model/CryptoSymbol
 * @version 1.2.16
 */
var CryptoSymbol = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>CryptoSymbol</code>.
   * @alias module:model/CryptoSymbol
   */
  function CryptoSymbol() {
    _classCallCheck(this, CryptoSymbol);

    CryptoSymbol.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(CryptoSymbol, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>CryptoSymbol</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/CryptoSymbol} obj Optional instance to populate.
     * @return {module:model/CryptoSymbol} The populated <code>CryptoSymbol</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new CryptoSymbol();

        if (data.hasOwnProperty('description')) {
          obj['description'] = _ApiClient["default"].convertToType(data['description'], 'String');
        }

        if (data.hasOwnProperty('displaySymbol')) {
          obj['displaySymbol'] = _ApiClient["default"].convertToType(data['displaySymbol'], 'String');
        }

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }
      }

      return obj;
    }
  }]);

  return CryptoSymbol;
}();
/**
 * Symbol description
 * @member {String} description
 */


CryptoSymbol.prototype['description'] = undefined;
/**
 * Display symbol name.
 * @member {String} displaySymbol
 */

CryptoSymbol.prototype['displaySymbol'] = undefined;
/**
 * Unique symbol used to identify this symbol used in <code>/crypto/candle</code> endpoint.
 * @member {String} symbol
 */

CryptoSymbol.prototype['symbol'] = undefined;
var _default = CryptoSymbol;
exports["default"] = _default;
},{"../ApiClient":10}],33:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The Development model module.
 * @module model/Development
 * @version 1.2.16
 */
var Development = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>Development</code>.
   * @alias module:model/Development
   */
  function Development() {
    _classCallCheck(this, Development);

    Development.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(Development, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>Development</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Development} obj Optional instance to populate.
     * @return {module:model/Development} The populated <code>Development</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new Development();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('datetime')) {
          obj['datetime'] = _ApiClient["default"].convertToType(data['datetime'], 'String');
        }

        if (data.hasOwnProperty('headline')) {
          obj['headline'] = _ApiClient["default"].convertToType(data['headline'], 'String');
        }

        if (data.hasOwnProperty('description')) {
          obj['description'] = _ApiClient["default"].convertToType(data['description'], 'String');
        }

        if (data.hasOwnProperty('url')) {
          obj['url'] = _ApiClient["default"].convertToType(data['url'], 'String');
        }
      }

      return obj;
    }
  }]);

  return Development;
}();
/**
 * Company symbol.
 * @member {String} symbol
 */


Development.prototype['symbol'] = undefined;
/**
 * Published time in <code>YYYY-MM-DD HH:MM:SS</code> format.
 * @member {String} datetime
 */

Development.prototype['datetime'] = undefined;
/**
 * Development headline.
 * @member {String} headline
 */

Development.prototype['headline'] = undefined;
/**
 * Development description.
 * @member {String} description
 */

Development.prototype['description'] = undefined;
/**
 * URL.
 * @member {String} url
 */

Development.prototype['url'] = undefined;
var _default = Development;
exports["default"] = _default;
},{"../ApiClient":10}],34:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The Dividends model module.
 * @module model/Dividends
 * @version 1.2.16
 */
var Dividends = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>Dividends</code>.
   * @alias module:model/Dividends
   */
  function Dividends() {
    _classCallCheck(this, Dividends);

    Dividends.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(Dividends, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>Dividends</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Dividends} obj Optional instance to populate.
     * @return {module:model/Dividends} The populated <code>Dividends</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new Dividends();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('date')) {
          obj['date'] = _ApiClient["default"].convertToType(data['date'], 'Date');
        }

        if (data.hasOwnProperty('amount')) {
          obj['amount'] = _ApiClient["default"].convertToType(data['amount'], 'Number');
        }

        if (data.hasOwnProperty('adjustedAmount')) {
          obj['adjustedAmount'] = _ApiClient["default"].convertToType(data['adjustedAmount'], 'Number');
        }

        if (data.hasOwnProperty('payDate')) {
          obj['payDate'] = _ApiClient["default"].convertToType(data['payDate'], 'Date');
        }

        if (data.hasOwnProperty('recordDate')) {
          obj['recordDate'] = _ApiClient["default"].convertToType(data['recordDate'], 'Date');
        }

        if (data.hasOwnProperty('declarationDate')) {
          obj['declarationDate'] = _ApiClient["default"].convertToType(data['declarationDate'], 'Date');
        }

        if (data.hasOwnProperty('currency')) {
          obj['currency'] = _ApiClient["default"].convertToType(data['currency'], 'String');
        }
      }

      return obj;
    }
  }]);

  return Dividends;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


Dividends.prototype['symbol'] = undefined;
/**
 * Ex-Dividend date.
 * @member {Date} date
 */

Dividends.prototype['date'] = undefined;
/**
 * Amount in local currency.
 * @member {Number} amount
 */

Dividends.prototype['amount'] = undefined;
/**
 * Adjusted dividend.
 * @member {Number} adjustedAmount
 */

Dividends.prototype['adjustedAmount'] = undefined;
/**
 * Pay date.
 * @member {Date} payDate
 */

Dividends.prototype['payDate'] = undefined;
/**
 * Record date.
 * @member {Date} recordDate
 */

Dividends.prototype['recordDate'] = undefined;
/**
 * Declaration date.
 * @member {Date} declarationDate
 */

Dividends.prototype['declarationDate'] = undefined;
/**
 * Currency.
 * @member {String} currency
 */

Dividends.prototype['currency'] = undefined;
var _default = Dividends;
exports["default"] = _default;
},{"../ApiClient":10}],35:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _Dividends2Info = _interopRequireDefault(require("./Dividends2Info"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The Dividends2 model module.
 * @module model/Dividends2
 * @version 1.2.16
 */
var Dividends2 = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>Dividends2</code>.
   * @alias module:model/Dividends2
   */
  function Dividends2() {
    _classCallCheck(this, Dividends2);

    Dividends2.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(Dividends2, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>Dividends2</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Dividends2} obj Optional instance to populate.
     * @return {module:model/Dividends2} The populated <code>Dividends2</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new Dividends2();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_Dividends2Info["default"]]);
        }
      }

      return obj;
    }
  }]);

  return Dividends2;
}();
/**
 * Symbol
 * @member {String} symbol
 */


Dividends2.prototype['symbol'] = undefined;
/**
 * 
 * @member {Array.<module:model/Dividends2Info>} data
 */

Dividends2.prototype['data'] = undefined;
var _default = Dividends2;
exports["default"] = _default;
},{"../ApiClient":10,"./Dividends2Info":36}],36:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The Dividends2Info model module.
 * @module model/Dividends2Info
 * @version 1.2.16
 */
var Dividends2Info = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>Dividends2Info</code>.
   * @alias module:model/Dividends2Info
   */
  function Dividends2Info() {
    _classCallCheck(this, Dividends2Info);

    Dividends2Info.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(Dividends2Info, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>Dividends2Info</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Dividends2Info} obj Optional instance to populate.
     * @return {module:model/Dividends2Info} The populated <code>Dividends2Info</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new Dividends2Info();

        if (data.hasOwnProperty('exDate')) {
          obj['exDate'] = _ApiClient["default"].convertToType(data['exDate'], 'Date');
        }

        if (data.hasOwnProperty('amount')) {
          obj['amount'] = _ApiClient["default"].convertToType(data['amount'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return Dividends2Info;
}();
/**
 * Ex-Dividend date.
 * @member {Date} exDate
 */


Dividends2Info.prototype['exDate'] = undefined;
/**
 * Amount in local currency.
 * @member {Number} amount
 */

Dividends2Info.prototype['amount'] = undefined;
var _default = Dividends2Info;
exports["default"] = _default;
},{"../ApiClient":10}],37:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The ETFCountryExposureData model module.
 * @module model/ETFCountryExposureData
 * @version 1.2.16
 */
var ETFCountryExposureData = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>ETFCountryExposureData</code>.
   * @alias module:model/ETFCountryExposureData
   */
  function ETFCountryExposureData() {
    _classCallCheck(this, ETFCountryExposureData);

    ETFCountryExposureData.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(ETFCountryExposureData, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>ETFCountryExposureData</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ETFCountryExposureData} obj Optional instance to populate.
     * @return {module:model/ETFCountryExposureData} The populated <code>ETFCountryExposureData</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new ETFCountryExposureData();

        if (data.hasOwnProperty('country')) {
          obj['country'] = _ApiClient["default"].convertToType(data['country'], 'String');
        }

        if (data.hasOwnProperty('exposure')) {
          obj['exposure'] = _ApiClient["default"].convertToType(data['exposure'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return ETFCountryExposureData;
}();
/**
 * Country
 * @member {String} country
 */


ETFCountryExposureData.prototype['country'] = undefined;
/**
 * Percent of exposure.
 * @member {Number} exposure
 */

ETFCountryExposureData.prototype['exposure'] = undefined;
var _default = ETFCountryExposureData;
exports["default"] = _default;
},{"../ApiClient":10}],38:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The ETFHoldingsData model module.
 * @module model/ETFHoldingsData
 * @version 1.2.16
 */
var ETFHoldingsData = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>ETFHoldingsData</code>.
   * @alias module:model/ETFHoldingsData
   */
  function ETFHoldingsData() {
    _classCallCheck(this, ETFHoldingsData);

    ETFHoldingsData.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(ETFHoldingsData, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>ETFHoldingsData</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ETFHoldingsData} obj Optional instance to populate.
     * @return {module:model/ETFHoldingsData} The populated <code>ETFHoldingsData</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new ETFHoldingsData();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('isin')) {
          obj['isin'] = _ApiClient["default"].convertToType(data['isin'], 'String');
        }

        if (data.hasOwnProperty('cusip')) {
          obj['cusip'] = _ApiClient["default"].convertToType(data['cusip'], 'String');
        }

        if (data.hasOwnProperty('share')) {
          obj['share'] = _ApiClient["default"].convertToType(data['share'], 'Number');
        }

        if (data.hasOwnProperty('percent')) {
          obj['percent'] = _ApiClient["default"].convertToType(data['percent'], 'Number');
        }

        if (data.hasOwnProperty('value')) {
          obj['value'] = _ApiClient["default"].convertToType(data['value'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return ETFHoldingsData;
}();
/**
 * Symbol description
 * @member {String} symbol
 */


ETFHoldingsData.prototype['symbol'] = undefined;
/**
 * Security name
 * @member {String} name
 */

ETFHoldingsData.prototype['name'] = undefined;
/**
 * ISIN.
 * @member {String} isin
 */

ETFHoldingsData.prototype['isin'] = undefined;
/**
 * CUSIP.
 * @member {String} cusip
 */

ETFHoldingsData.prototype['cusip'] = undefined;
/**
 * Number of shares owned by the ETF.
 * @member {Number} share
 */

ETFHoldingsData.prototype['share'] = undefined;
/**
 * Portfolio's percent
 * @member {Number} percent
 */

ETFHoldingsData.prototype['percent'] = undefined;
/**
 * Market value
 * @member {Number} value
 */

ETFHoldingsData.prototype['value'] = undefined;
var _default = ETFHoldingsData;
exports["default"] = _default;
},{"../ApiClient":10}],39:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The ETFProfileData model module.
 * @module model/ETFProfileData
 * @version 1.2.16
 */
var ETFProfileData = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>ETFProfileData</code>.
   * @alias module:model/ETFProfileData
   */
  function ETFProfileData() {
    _classCallCheck(this, ETFProfileData);

    ETFProfileData.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(ETFProfileData, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>ETFProfileData</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ETFProfileData} obj Optional instance to populate.
     * @return {module:model/ETFProfileData} The populated <code>ETFProfileData</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new ETFProfileData();

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('assetClass')) {
          obj['assetClass'] = _ApiClient["default"].convertToType(data['assetClass'], 'String');
        }

        if (data.hasOwnProperty('investmentSegment')) {
          obj['investmentSegment'] = _ApiClient["default"].convertToType(data['investmentSegment'], 'String');
        }

        if (data.hasOwnProperty('aum')) {
          obj['aum'] = _ApiClient["default"].convertToType(data['aum'], 'Number');
        }

        if (data.hasOwnProperty('nav')) {
          obj['nav'] = _ApiClient["default"].convertToType(data['nav'], 'Number');
        }

        if (data.hasOwnProperty('navCurrency')) {
          obj['navCurrency'] = _ApiClient["default"].convertToType(data['navCurrency'], 'String');
        }

        if (data.hasOwnProperty('expenseRatio')) {
          obj['expenseRatio'] = _ApiClient["default"].convertToType(data['expenseRatio'], 'Number');
        }

        if (data.hasOwnProperty('trackingIndex')) {
          obj['trackingIndex'] = _ApiClient["default"].convertToType(data['trackingIndex'], 'String');
        }

        if (data.hasOwnProperty('etfCompany')) {
          obj['etfCompany'] = _ApiClient["default"].convertToType(data['etfCompany'], 'String');
        }

        if (data.hasOwnProperty('domicile')) {
          obj['domicile'] = _ApiClient["default"].convertToType(data['domicile'], 'String');
        }

        if (data.hasOwnProperty('inceptionDate')) {
          obj['inceptionDate'] = _ApiClient["default"].convertToType(data['inceptionDate'], 'Date');
        }

        if (data.hasOwnProperty('website')) {
          obj['website'] = _ApiClient["default"].convertToType(data['website'], 'String');
        }

        if (data.hasOwnProperty('isin')) {
          obj['isin'] = _ApiClient["default"].convertToType(data['isin'], 'String');
        }

        if (data.hasOwnProperty('cusip')) {
          obj['cusip'] = _ApiClient["default"].convertToType(data['cusip'], 'String');
        }

        if (data.hasOwnProperty('priceToEarnings')) {
          obj['priceToEarnings'] = _ApiClient["default"].convertToType(data['priceToEarnings'], 'Number');
        }

        if (data.hasOwnProperty('priceToBook')) {
          obj['priceToBook'] = _ApiClient["default"].convertToType(data['priceToBook'], 'Number');
        }

        if (data.hasOwnProperty('avgVolume')) {
          obj['avgVolume'] = _ApiClient["default"].convertToType(data['avgVolume'], 'Number');
        }

        if (data.hasOwnProperty('description')) {
          obj['description'] = _ApiClient["default"].convertToType(data['description'], 'String');
        }

        if (data.hasOwnProperty('isInverse')) {
          obj['isInverse'] = _ApiClient["default"].convertToType(data['isInverse'], 'Boolean');
        }

        if (data.hasOwnProperty('isLeveraged')) {
          obj['isLeveraged'] = _ApiClient["default"].convertToType(data['isLeveraged'], 'Boolean');
        }

        if (data.hasOwnProperty('leverageFactor')) {
          obj['leverageFactor'] = _ApiClient["default"].convertToType(data['leverageFactor'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return ETFProfileData;
}();
/**
 * Name
 * @member {String} name
 */


ETFProfileData.prototype['name'] = undefined;
/**
 * Asset Class.
 * @member {String} assetClass
 */

ETFProfileData.prototype['assetClass'] = undefined;
/**
 * Investment Segment.
 * @member {String} investmentSegment
 */

ETFProfileData.prototype['investmentSegment'] = undefined;
/**
 * AUM.
 * @member {Number} aum
 */

ETFProfileData.prototype['aum'] = undefined;
/**
 * NAV.
 * @member {Number} nav
 */

ETFProfileData.prototype['nav'] = undefined;
/**
 * NAV currency.
 * @member {String} navCurrency
 */

ETFProfileData.prototype['navCurrency'] = undefined;
/**
 * Expense ratio. For non-US funds, this is the <a href=\"https://www.esma.europa.eu/sites/default/files/library/2015/11/09_1028_final_kid_ongoing_charges_methodology_for_publication_u_2_.pdf\" target=\"_blank\">KID ongoing charges<a/>.
 * @member {Number} expenseRatio
 */

ETFProfileData.prototype['expenseRatio'] = undefined;
/**
 * Tracking Index.
 * @member {String} trackingIndex
 */

ETFProfileData.prototype['trackingIndex'] = undefined;
/**
 * ETF issuer.
 * @member {String} etfCompany
 */

ETFProfileData.prototype['etfCompany'] = undefined;
/**
 * ETF domicile.
 * @member {String} domicile
 */

ETFProfileData.prototype['domicile'] = undefined;
/**
 * Inception date.
 * @member {Date} inceptionDate
 */

ETFProfileData.prototype['inceptionDate'] = undefined;
/**
 * ETF's website.
 * @member {String} website
 */

ETFProfileData.prototype['website'] = undefined;
/**
 * ISIN.
 * @member {String} isin
 */

ETFProfileData.prototype['isin'] = undefined;
/**
 * CUSIP.
 * @member {String} cusip
 */

ETFProfileData.prototype['cusip'] = undefined;
/**
 * P/E.
 * @member {Number} priceToEarnings
 */

ETFProfileData.prototype['priceToEarnings'] = undefined;
/**
 * P/B.
 * @member {Number} priceToBook
 */

ETFProfileData.prototype['priceToBook'] = undefined;
/**
 * 30-day average volume.
 * @member {Number} avgVolume
 */

ETFProfileData.prototype['avgVolume'] = undefined;
/**
 * ETF's description.
 * @member {String} description
 */

ETFProfileData.prototype['description'] = undefined;
/**
 * Whether the ETF is inverse
 * @member {Boolean} isInverse
 */

ETFProfileData.prototype['isInverse'] = undefined;
/**
 * Whether the ETF is leveraged
 * @member {Boolean} isLeveraged
 */

ETFProfileData.prototype['isLeveraged'] = undefined;
/**
 * Leverage factor.
 * @member {Number} leverageFactor
 */

ETFProfileData.prototype['leverageFactor'] = undefined;
var _default = ETFProfileData;
exports["default"] = _default;
},{"../ApiClient":10}],40:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The ETFSectorExposureData model module.
 * @module model/ETFSectorExposureData
 * @version 1.2.16
 */
var ETFSectorExposureData = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>ETFSectorExposureData</code>.
   * @alias module:model/ETFSectorExposureData
   */
  function ETFSectorExposureData() {
    _classCallCheck(this, ETFSectorExposureData);

    ETFSectorExposureData.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(ETFSectorExposureData, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>ETFSectorExposureData</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ETFSectorExposureData} obj Optional instance to populate.
     * @return {module:model/ETFSectorExposureData} The populated <code>ETFSectorExposureData</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new ETFSectorExposureData();

        if (data.hasOwnProperty('industry')) {
          obj['industry'] = _ApiClient["default"].convertToType(data['industry'], 'String');
        }

        if (data.hasOwnProperty('exposure')) {
          obj['exposure'] = _ApiClient["default"].convertToType(data['exposure'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return ETFSectorExposureData;
}();
/**
 * Industry
 * @member {String} industry
 */


ETFSectorExposureData.prototype['industry'] = undefined;
/**
 * Percent of exposure.
 * @member {Number} exposure
 */

ETFSectorExposureData.prototype['exposure'] = undefined;
var _default = ETFSectorExposureData;
exports["default"] = _default;
},{"../ApiClient":10}],41:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _ETFCountryExposureData = _interopRequireDefault(require("./ETFCountryExposureData"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The ETFsCountryExposure model module.
 * @module model/ETFsCountryExposure
 * @version 1.2.16
 */
var ETFsCountryExposure = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>ETFsCountryExposure</code>.
   * @alias module:model/ETFsCountryExposure
   */
  function ETFsCountryExposure() {
    _classCallCheck(this, ETFsCountryExposure);

    ETFsCountryExposure.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(ETFsCountryExposure, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>ETFsCountryExposure</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ETFsCountryExposure} obj Optional instance to populate.
     * @return {module:model/ETFsCountryExposure} The populated <code>ETFsCountryExposure</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new ETFsCountryExposure();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('countryExposure')) {
          obj['countryExposure'] = _ApiClient["default"].convertToType(data['countryExposure'], [_ETFCountryExposureData["default"]]);
        }
      }

      return obj;
    }
  }]);

  return ETFsCountryExposure;
}();
/**
 * ETF symbol.
 * @member {String} symbol
 */


ETFsCountryExposure.prototype['symbol'] = undefined;
/**
 * Array of countries and and exposure levels.
 * @member {Array.<module:model/ETFCountryExposureData>} countryExposure
 */

ETFsCountryExposure.prototype['countryExposure'] = undefined;
var _default = ETFsCountryExposure;
exports["default"] = _default;
},{"../ApiClient":10,"./ETFCountryExposureData":37}],42:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _ETFHoldingsData = _interopRequireDefault(require("./ETFHoldingsData"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The ETFsHoldings model module.
 * @module model/ETFsHoldings
 * @version 1.2.16
 */
var ETFsHoldings = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>ETFsHoldings</code>.
   * @alias module:model/ETFsHoldings
   */
  function ETFsHoldings() {
    _classCallCheck(this, ETFsHoldings);

    ETFsHoldings.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(ETFsHoldings, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>ETFsHoldings</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ETFsHoldings} obj Optional instance to populate.
     * @return {module:model/ETFsHoldings} The populated <code>ETFsHoldings</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new ETFsHoldings();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('atDate')) {
          obj['atDate'] = _ApiClient["default"].convertToType(data['atDate'], 'Date');
        }

        if (data.hasOwnProperty('numberOfHoldings')) {
          obj['numberOfHoldings'] = _ApiClient["default"].convertToType(data['numberOfHoldings'], 'Number');
        }

        if (data.hasOwnProperty('holdings')) {
          obj['holdings'] = _ApiClient["default"].convertToType(data['holdings'], [_ETFHoldingsData["default"]]);
        }
      }

      return obj;
    }
  }]);

  return ETFsHoldings;
}();
/**
 * ETF symbol.
 * @member {String} symbol
 */


ETFsHoldings.prototype['symbol'] = undefined;
/**
 * Holdings update date.
 * @member {Date} atDate
 */

ETFsHoldings.prototype['atDate'] = undefined;
/**
 * Number of holdings.
 * @member {Number} numberOfHoldings
 */

ETFsHoldings.prototype['numberOfHoldings'] = undefined;
/**
 * Array of holdings.
 * @member {Array.<module:model/ETFHoldingsData>} holdings
 */

ETFsHoldings.prototype['holdings'] = undefined;
var _default = ETFsHoldings;
exports["default"] = _default;
},{"../ApiClient":10,"./ETFHoldingsData":38}],43:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _ETFProfileData = _interopRequireDefault(require("./ETFProfileData"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The ETFsProfile model module.
 * @module model/ETFsProfile
 * @version 1.2.16
 */
var ETFsProfile = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>ETFsProfile</code>.
   * @alias module:model/ETFsProfile
   */
  function ETFsProfile() {
    _classCallCheck(this, ETFsProfile);

    ETFsProfile.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(ETFsProfile, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>ETFsProfile</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ETFsProfile} obj Optional instance to populate.
     * @return {module:model/ETFsProfile} The populated <code>ETFsProfile</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new ETFsProfile();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('profile')) {
          obj['profile'] = _ETFProfileData["default"].constructFromObject(data['profile']);
        }
      }

      return obj;
    }
  }]);

  return ETFsProfile;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


ETFsProfile.prototype['symbol'] = undefined;
/**
 * @member {module:model/ETFProfileData} profile
 */

ETFsProfile.prototype['profile'] = undefined;
var _default = ETFsProfile;
exports["default"] = _default;
},{"../ApiClient":10,"./ETFProfileData":39}],44:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _ETFSectorExposureData = _interopRequireDefault(require("./ETFSectorExposureData"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The ETFsSectorExposure model module.
 * @module model/ETFsSectorExposure
 * @version 1.2.16
 */
var ETFsSectorExposure = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>ETFsSectorExposure</code>.
   * @alias module:model/ETFsSectorExposure
   */
  function ETFsSectorExposure() {
    _classCallCheck(this, ETFsSectorExposure);

    ETFsSectorExposure.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(ETFsSectorExposure, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>ETFsSectorExposure</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ETFsSectorExposure} obj Optional instance to populate.
     * @return {module:model/ETFsSectorExposure} The populated <code>ETFsSectorExposure</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new ETFsSectorExposure();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('sectorExposure')) {
          obj['sectorExposure'] = _ApiClient["default"].convertToType(data['sectorExposure'], [_ETFSectorExposureData["default"]]);
        }
      }

      return obj;
    }
  }]);

  return ETFsSectorExposure;
}();
/**
 * ETF symbol.
 * @member {String} symbol
 */


ETFsSectorExposure.prototype['symbol'] = undefined;
/**
 * Array of industries and exposure levels.
 * @member {Array.<module:model/ETFSectorExposureData>} sectorExposure
 */

ETFsSectorExposure.prototype['sectorExposure'] = undefined;
var _default = ETFsSectorExposure;
exports["default"] = _default;
},{"../ApiClient":10,"./ETFSectorExposureData":40}],45:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The EarningRelease model module.
 * @module model/EarningRelease
 * @version 1.2.16
 */
var EarningRelease = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>EarningRelease</code>.
   * @alias module:model/EarningRelease
   */
  function EarningRelease() {
    _classCallCheck(this, EarningRelease);

    EarningRelease.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(EarningRelease, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>EarningRelease</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/EarningRelease} obj Optional instance to populate.
     * @return {module:model/EarningRelease} The populated <code>EarningRelease</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new EarningRelease();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('date')) {
          obj['date'] = _ApiClient["default"].convertToType(data['date'], 'Date');
        }

        if (data.hasOwnProperty('hour')) {
          obj['hour'] = _ApiClient["default"].convertToType(data['hour'], 'String');
        }

        if (data.hasOwnProperty('year')) {
          obj['year'] = _ApiClient["default"].convertToType(data['year'], 'Number');
        }

        if (data.hasOwnProperty('quarter')) {
          obj['quarter'] = _ApiClient["default"].convertToType(data['quarter'], 'Number');
        }

        if (data.hasOwnProperty('epsEstimate')) {
          obj['epsEstimate'] = _ApiClient["default"].convertToType(data['epsEstimate'], 'Number');
        }

        if (data.hasOwnProperty('epsActual')) {
          obj['epsActual'] = _ApiClient["default"].convertToType(data['epsActual'], 'Number');
        }

        if (data.hasOwnProperty('revenueEstimate')) {
          obj['revenueEstimate'] = _ApiClient["default"].convertToType(data['revenueEstimate'], 'Number');
        }

        if (data.hasOwnProperty('revenueActual')) {
          obj['revenueActual'] = _ApiClient["default"].convertToType(data['revenueActual'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return EarningRelease;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


EarningRelease.prototype['symbol'] = undefined;
/**
 * Date.
 * @member {Date} date
 */

EarningRelease.prototype['date'] = undefined;
/**
 * Indicates whether the earnings is announced before market open(<code>bmo</code>), after market close(<code>amc</code>), or during market hour(<code>dmh</code>).
 * @member {String} hour
 */

EarningRelease.prototype['hour'] = undefined;
/**
 * Earnings year.
 * @member {Number} year
 */

EarningRelease.prototype['year'] = undefined;
/**
 * Earnings quarter.
 * @member {Number} quarter
 */

EarningRelease.prototype['quarter'] = undefined;
/**
 * EPS estimate.
 * @member {Number} epsEstimate
 */

EarningRelease.prototype['epsEstimate'] = undefined;
/**
 * EPS actual.
 * @member {Number} epsActual
 */

EarningRelease.prototype['epsActual'] = undefined;
/**
 * Revenue estimate including Finnhub's proprietary estimates.
 * @member {Number} revenueEstimate
 */

EarningRelease.prototype['revenueEstimate'] = undefined;
/**
 * Revenue actual.
 * @member {Number} revenueActual
 */

EarningRelease.prototype['revenueActual'] = undefined;
var _default = EarningRelease;
exports["default"] = _default;
},{"../ApiClient":10}],46:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The EarningResult model module.
 * @module model/EarningResult
 * @version 1.2.16
 */
var EarningResult = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>EarningResult</code>.
   * @alias module:model/EarningResult
   */
  function EarningResult() {
    _classCallCheck(this, EarningResult);

    EarningResult.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(EarningResult, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>EarningResult</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/EarningResult} obj Optional instance to populate.
     * @return {module:model/EarningResult} The populated <code>EarningResult</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new EarningResult();

        if (data.hasOwnProperty('actual')) {
          obj['actual'] = _ApiClient["default"].convertToType(data['actual'], 'Number');
        }

        if (data.hasOwnProperty('estimate')) {
          obj['estimate'] = _ApiClient["default"].convertToType(data['estimate'], 'Number');
        }

        if (data.hasOwnProperty('surprise')) {
          obj['surprise'] = _ApiClient["default"].convertToType(data['surprise'], 'Number');
        }

        if (data.hasOwnProperty('surprisePercent')) {
          obj['surprisePercent'] = _ApiClient["default"].convertToType(data['surprisePercent'], 'Number');
        }

        if (data.hasOwnProperty('period')) {
          obj['period'] = _ApiClient["default"].convertToType(data['period'], 'Date');
        }

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }
      }

      return obj;
    }
  }]);

  return EarningResult;
}();
/**
 * Actual earning result.
 * @member {Number} actual
 */


EarningResult.prototype['actual'] = undefined;
/**
 * Estimated earning.
 * @member {Number} estimate
 */

EarningResult.prototype['estimate'] = undefined;
/**
 * Surprise - The difference between actual and estimate.
 * @member {Number} surprise
 */

EarningResult.prototype['surprise'] = undefined;
/**
 * Surprise percent.
 * @member {Number} surprisePercent
 */

EarningResult.prototype['surprisePercent'] = undefined;
/**
 * Reported period.
 * @member {Date} period
 */

EarningResult.prototype['period'] = undefined;
/**
 * Company symbol.
 * @member {String} symbol
 */

EarningResult.prototype['symbol'] = undefined;
var _default = EarningResult;
exports["default"] = _default;
},{"../ApiClient":10}],47:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _EarningRelease = _interopRequireDefault(require("./EarningRelease"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The EarningsCalendar model module.
 * @module model/EarningsCalendar
 * @version 1.2.16
 */
var EarningsCalendar = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>EarningsCalendar</code>.
   * @alias module:model/EarningsCalendar
   */
  function EarningsCalendar() {
    _classCallCheck(this, EarningsCalendar);

    EarningsCalendar.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(EarningsCalendar, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>EarningsCalendar</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/EarningsCalendar} obj Optional instance to populate.
     * @return {module:model/EarningsCalendar} The populated <code>EarningsCalendar</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new EarningsCalendar();

        if (data.hasOwnProperty('earningsCalendar')) {
          obj['earningsCalendar'] = _ApiClient["default"].convertToType(data['earningsCalendar'], [_EarningRelease["default"]]);
        }
      }

      return obj;
    }
  }]);

  return EarningsCalendar;
}();
/**
 * Array of earnings release.
 * @member {Array.<module:model/EarningRelease>} earningsCalendar
 */


EarningsCalendar.prototype['earningsCalendar'] = undefined;
var _default = EarningsCalendar;
exports["default"] = _default;
},{"../ApiClient":10,"./EarningRelease":45}],48:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _TranscriptContent = _interopRequireDefault(require("./TranscriptContent"));

var _TranscriptParticipant = _interopRequireDefault(require("./TranscriptParticipant"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The EarningsCallTranscripts model module.
 * @module model/EarningsCallTranscripts
 * @version 1.2.16
 */
var EarningsCallTranscripts = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>EarningsCallTranscripts</code>.
   * @alias module:model/EarningsCallTranscripts
   */
  function EarningsCallTranscripts() {
    _classCallCheck(this, EarningsCallTranscripts);

    EarningsCallTranscripts.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(EarningsCallTranscripts, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>EarningsCallTranscripts</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/EarningsCallTranscripts} obj Optional instance to populate.
     * @return {module:model/EarningsCallTranscripts} The populated <code>EarningsCallTranscripts</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new EarningsCallTranscripts();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('transcript')) {
          obj['transcript'] = _ApiClient["default"].convertToType(data['transcript'], [_TranscriptContent["default"]]);
        }

        if (data.hasOwnProperty('participant')) {
          obj['participant'] = _ApiClient["default"].convertToType(data['participant'], [_TranscriptParticipant["default"]]);
        }

        if (data.hasOwnProperty('audio')) {
          obj['audio'] = _ApiClient["default"].convertToType(data['audio'], 'String');
        }

        if (data.hasOwnProperty('id')) {
          obj['id'] = _ApiClient["default"].convertToType(data['id'], 'String');
        }

        if (data.hasOwnProperty('title')) {
          obj['title'] = _ApiClient["default"].convertToType(data['title'], 'String');
        }

        if (data.hasOwnProperty('time')) {
          obj['time'] = _ApiClient["default"].convertToType(data['time'], 'String');
        }

        if (data.hasOwnProperty('year')) {
          obj['year'] = _ApiClient["default"].convertToType(data['year'], 'Number');
        }

        if (data.hasOwnProperty('quarter')) {
          obj['quarter'] = _ApiClient["default"].convertToType(data['quarter'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return EarningsCallTranscripts;
}();
/**
 * Company symbol.
 * @member {String} symbol
 */


EarningsCallTranscripts.prototype['symbol'] = undefined;
/**
 * Transcript content.
 * @member {Array.<module:model/TranscriptContent>} transcript
 */

EarningsCallTranscripts.prototype['transcript'] = undefined;
/**
 * Participant list
 * @member {Array.<module:model/TranscriptParticipant>} participant
 */

EarningsCallTranscripts.prototype['participant'] = undefined;
/**
 * Audio link.
 * @member {String} audio
 */

EarningsCallTranscripts.prototype['audio'] = undefined;
/**
 * Transcript's ID.
 * @member {String} id
 */

EarningsCallTranscripts.prototype['id'] = undefined;
/**
 * Title.
 * @member {String} title
 */

EarningsCallTranscripts.prototype['title'] = undefined;
/**
 * Time of the event.
 * @member {String} time
 */

EarningsCallTranscripts.prototype['time'] = undefined;
/**
 * Year of earnings result in the case of earnings call transcript.
 * @member {Number} year
 */

EarningsCallTranscripts.prototype['year'] = undefined;
/**
 * Quarter of earnings result in the case of earnings call transcript.
 * @member {Number} quarter
 */

EarningsCallTranscripts.prototype['quarter'] = undefined;
var _default = EarningsCallTranscripts;
exports["default"] = _default;
},{"../ApiClient":10,"./TranscriptContent":141,"./TranscriptParticipant":142}],49:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _StockTranscripts = _interopRequireDefault(require("./StockTranscripts"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The EarningsCallTranscriptsList model module.
 * @module model/EarningsCallTranscriptsList
 * @version 1.2.16
 */
var EarningsCallTranscriptsList = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>EarningsCallTranscriptsList</code>.
   * @alias module:model/EarningsCallTranscriptsList
   */
  function EarningsCallTranscriptsList() {
    _classCallCheck(this, EarningsCallTranscriptsList);

    EarningsCallTranscriptsList.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(EarningsCallTranscriptsList, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>EarningsCallTranscriptsList</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/EarningsCallTranscriptsList} obj Optional instance to populate.
     * @return {module:model/EarningsCallTranscriptsList} The populated <code>EarningsCallTranscriptsList</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new EarningsCallTranscriptsList();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('transcripts')) {
          obj['transcripts'] = _ApiClient["default"].convertToType(data['transcripts'], [_StockTranscripts["default"]]);
        }
      }

      return obj;
    }
  }]);

  return EarningsCallTranscriptsList;
}();
/**
 * Company symbol.
 * @member {String} symbol
 */


EarningsCallTranscriptsList.prototype['symbol'] = undefined;
/**
 * Array of transcripts' metadata
 * @member {Array.<module:model/StockTranscripts>} transcripts
 */

EarningsCallTranscriptsList.prototype['transcripts'] = undefined;
var _default = EarningsCallTranscriptsList;
exports["default"] = _default;
},{"../ApiClient":10,"./StockTranscripts":131}],50:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _EarningsEstimatesInfo = _interopRequireDefault(require("./EarningsEstimatesInfo"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The EarningsEstimates model module.
 * @module model/EarningsEstimates
 * @version 1.2.16
 */
var EarningsEstimates = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>EarningsEstimates</code>.
   * @alias module:model/EarningsEstimates
   */
  function EarningsEstimates() {
    _classCallCheck(this, EarningsEstimates);

    EarningsEstimates.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(EarningsEstimates, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>EarningsEstimates</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/EarningsEstimates} obj Optional instance to populate.
     * @return {module:model/EarningsEstimates} The populated <code>EarningsEstimates</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new EarningsEstimates();

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_EarningsEstimatesInfo["default"]]);
        }

        if (data.hasOwnProperty('freq')) {
          obj['freq'] = _ApiClient["default"].convertToType(data['freq'], 'String');
        }

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }
      }

      return obj;
    }
  }]);

  return EarningsEstimates;
}();
/**
 * List of estimates
 * @member {Array.<module:model/EarningsEstimatesInfo>} data
 */


EarningsEstimates.prototype['data'] = undefined;
/**
 * Frequency: annual or quarterly.
 * @member {String} freq
 */

EarningsEstimates.prototype['freq'] = undefined;
/**
 * Company symbol.
 * @member {String} symbol
 */

EarningsEstimates.prototype['symbol'] = undefined;
var _default = EarningsEstimates;
exports["default"] = _default;
},{"../ApiClient":10,"./EarningsEstimatesInfo":51}],51:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The EarningsEstimatesInfo model module.
 * @module model/EarningsEstimatesInfo
 * @version 1.2.16
 */
var EarningsEstimatesInfo = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>EarningsEstimatesInfo</code>.
   * @alias module:model/EarningsEstimatesInfo
   */
  function EarningsEstimatesInfo() {
    _classCallCheck(this, EarningsEstimatesInfo);

    EarningsEstimatesInfo.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(EarningsEstimatesInfo, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>EarningsEstimatesInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/EarningsEstimatesInfo} obj Optional instance to populate.
     * @return {module:model/EarningsEstimatesInfo} The populated <code>EarningsEstimatesInfo</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new EarningsEstimatesInfo();

        if (data.hasOwnProperty('epsAvg')) {
          obj['epsAvg'] = _ApiClient["default"].convertToType(data['epsAvg'], 'Number');
        }

        if (data.hasOwnProperty('epsHigh')) {
          obj['epsHigh'] = _ApiClient["default"].convertToType(data['epsHigh'], 'Number');
        }

        if (data.hasOwnProperty('epsLow')) {
          obj['epsLow'] = _ApiClient["default"].convertToType(data['epsLow'], 'Number');
        }

        if (data.hasOwnProperty('numberAnalysts')) {
          obj['numberAnalysts'] = _ApiClient["default"].convertToType(data['numberAnalysts'], 'Number');
        }

        if (data.hasOwnProperty('period')) {
          obj['period'] = _ApiClient["default"].convertToType(data['period'], 'Date');
        }
      }

      return obj;
    }
  }]);

  return EarningsEstimatesInfo;
}();
/**
 * Average EPS estimates including Finnhub's proprietary estimates.
 * @member {Number} epsAvg
 */


EarningsEstimatesInfo.prototype['epsAvg'] = undefined;
/**
 * Highest estimate.
 * @member {Number} epsHigh
 */

EarningsEstimatesInfo.prototype['epsHigh'] = undefined;
/**
 * Lowest estimate.
 * @member {Number} epsLow
 */

EarningsEstimatesInfo.prototype['epsLow'] = undefined;
/**
 * Number of Analysts.
 * @member {Number} numberAnalysts
 */

EarningsEstimatesInfo.prototype['numberAnalysts'] = undefined;
/**
 * Period.
 * @member {Date} period
 */

EarningsEstimatesInfo.prototype['period'] = undefined;
var _default = EarningsEstimatesInfo;
exports["default"] = _default;
},{"../ApiClient":10}],52:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _EbitEstimatesInfo = _interopRequireDefault(require("./EbitEstimatesInfo"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The EbitEstimates model module.
 * @module model/EbitEstimates
 * @version 1.2.16
 */
var EbitEstimates = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>EbitEstimates</code>.
   * @alias module:model/EbitEstimates
   */
  function EbitEstimates() {
    _classCallCheck(this, EbitEstimates);

    EbitEstimates.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(EbitEstimates, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>EbitEstimates</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/EbitEstimates} obj Optional instance to populate.
     * @return {module:model/EbitEstimates} The populated <code>EbitEstimates</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new EbitEstimates();

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_EbitEstimatesInfo["default"]]);
        }

        if (data.hasOwnProperty('freq')) {
          obj['freq'] = _ApiClient["default"].convertToType(data['freq'], 'String');
        }

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }
      }

      return obj;
    }
  }]);

  return EbitEstimates;
}();
/**
 * List of estimates
 * @member {Array.<module:model/EbitEstimatesInfo>} data
 */


EbitEstimates.prototype['data'] = undefined;
/**
 * Frequency: annual or quarterly.
 * @member {String} freq
 */

EbitEstimates.prototype['freq'] = undefined;
/**
 * Company symbol.
 * @member {String} symbol
 */

EbitEstimates.prototype['symbol'] = undefined;
var _default = EbitEstimates;
exports["default"] = _default;
},{"../ApiClient":10,"./EbitEstimatesInfo":53}],53:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The EbitEstimatesInfo model module.
 * @module model/EbitEstimatesInfo
 * @version 1.2.16
 */
var EbitEstimatesInfo = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>EbitEstimatesInfo</code>.
   * @alias module:model/EbitEstimatesInfo
   */
  function EbitEstimatesInfo() {
    _classCallCheck(this, EbitEstimatesInfo);

    EbitEstimatesInfo.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(EbitEstimatesInfo, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>EbitEstimatesInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/EbitEstimatesInfo} obj Optional instance to populate.
     * @return {module:model/EbitEstimatesInfo} The populated <code>EbitEstimatesInfo</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new EbitEstimatesInfo();

        if (data.hasOwnProperty('ebitAvg')) {
          obj['ebitAvg'] = _ApiClient["default"].convertToType(data['ebitAvg'], 'Number');
        }

        if (data.hasOwnProperty('ebitHigh')) {
          obj['ebitHigh'] = _ApiClient["default"].convertToType(data['ebitHigh'], 'Number');
        }

        if (data.hasOwnProperty('ebitLow')) {
          obj['ebitLow'] = _ApiClient["default"].convertToType(data['ebitLow'], 'Number');
        }

        if (data.hasOwnProperty('numberAnalysts')) {
          obj['numberAnalysts'] = _ApiClient["default"].convertToType(data['numberAnalysts'], 'Number');
        }

        if (data.hasOwnProperty('period')) {
          obj['period'] = _ApiClient["default"].convertToType(data['period'], 'Date');
        }
      }

      return obj;
    }
  }]);

  return EbitEstimatesInfo;
}();
/**
 * Average EBIT estimates including Finnhub's proprietary estimates.
 * @member {Number} ebitAvg
 */


EbitEstimatesInfo.prototype['ebitAvg'] = undefined;
/**
 * Highest estimate.
 * @member {Number} ebitHigh
 */

EbitEstimatesInfo.prototype['ebitHigh'] = undefined;
/**
 * Lowest estimate.
 * @member {Number} ebitLow
 */

EbitEstimatesInfo.prototype['ebitLow'] = undefined;
/**
 * Number of Analysts.
 * @member {Number} numberAnalysts
 */

EbitEstimatesInfo.prototype['numberAnalysts'] = undefined;
/**
 * Period.
 * @member {Date} period
 */

EbitEstimatesInfo.prototype['period'] = undefined;
var _default = EbitEstimatesInfo;
exports["default"] = _default;
},{"../ApiClient":10}],54:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _EbitdaEstimatesInfo = _interopRequireDefault(require("./EbitdaEstimatesInfo"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The EbitdaEstimates model module.
 * @module model/EbitdaEstimates
 * @version 1.2.16
 */
var EbitdaEstimates = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>EbitdaEstimates</code>.
   * @alias module:model/EbitdaEstimates
   */
  function EbitdaEstimates() {
    _classCallCheck(this, EbitdaEstimates);

    EbitdaEstimates.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(EbitdaEstimates, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>EbitdaEstimates</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/EbitdaEstimates} obj Optional instance to populate.
     * @return {module:model/EbitdaEstimates} The populated <code>EbitdaEstimates</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new EbitdaEstimates();

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_EbitdaEstimatesInfo["default"]]);
        }

        if (data.hasOwnProperty('freq')) {
          obj['freq'] = _ApiClient["default"].convertToType(data['freq'], 'String');
        }

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }
      }

      return obj;
    }
  }]);

  return EbitdaEstimates;
}();
/**
 * List of estimates
 * @member {Array.<module:model/EbitdaEstimatesInfo>} data
 */


EbitdaEstimates.prototype['data'] = undefined;
/**
 * Frequency: annual or quarterly.
 * @member {String} freq
 */

EbitdaEstimates.prototype['freq'] = undefined;
/**
 * Company symbol.
 * @member {String} symbol
 */

EbitdaEstimates.prototype['symbol'] = undefined;
var _default = EbitdaEstimates;
exports["default"] = _default;
},{"../ApiClient":10,"./EbitdaEstimatesInfo":55}],55:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The EbitdaEstimatesInfo model module.
 * @module model/EbitdaEstimatesInfo
 * @version 1.2.16
 */
var EbitdaEstimatesInfo = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>EbitdaEstimatesInfo</code>.
   * @alias module:model/EbitdaEstimatesInfo
   */
  function EbitdaEstimatesInfo() {
    _classCallCheck(this, EbitdaEstimatesInfo);

    EbitdaEstimatesInfo.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(EbitdaEstimatesInfo, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>EbitdaEstimatesInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/EbitdaEstimatesInfo} obj Optional instance to populate.
     * @return {module:model/EbitdaEstimatesInfo} The populated <code>EbitdaEstimatesInfo</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new EbitdaEstimatesInfo();

        if (data.hasOwnProperty('ebitdaAvg')) {
          obj['ebitdaAvg'] = _ApiClient["default"].convertToType(data['ebitdaAvg'], 'Number');
        }

        if (data.hasOwnProperty('ebitdaHigh')) {
          obj['ebitdaHigh'] = _ApiClient["default"].convertToType(data['ebitdaHigh'], 'Number');
        }

        if (data.hasOwnProperty('ebitdaLow')) {
          obj['ebitdaLow'] = _ApiClient["default"].convertToType(data['ebitdaLow'], 'Number');
        }

        if (data.hasOwnProperty('numberAnalysts')) {
          obj['numberAnalysts'] = _ApiClient["default"].convertToType(data['numberAnalysts'], 'Number');
        }

        if (data.hasOwnProperty('period')) {
          obj['period'] = _ApiClient["default"].convertToType(data['period'], 'Date');
        }
      }

      return obj;
    }
  }]);

  return EbitdaEstimatesInfo;
}();
/**
 * Average EBITDA estimates including Finnhub's proprietary estimates.
 * @member {Number} ebitdaAvg
 */


EbitdaEstimatesInfo.prototype['ebitdaAvg'] = undefined;
/**
 * Highest estimate.
 * @member {Number} ebitdaHigh
 */

EbitdaEstimatesInfo.prototype['ebitdaHigh'] = undefined;
/**
 * Lowest estimate.
 * @member {Number} ebitdaLow
 */

EbitdaEstimatesInfo.prototype['ebitdaLow'] = undefined;
/**
 * Number of Analysts.
 * @member {Number} numberAnalysts
 */

EbitdaEstimatesInfo.prototype['numberAnalysts'] = undefined;
/**
 * Period.
 * @member {Date} period
 */

EbitdaEstimatesInfo.prototype['period'] = undefined;
var _default = EbitdaEstimatesInfo;
exports["default"] = _default;
},{"../ApiClient":10}],56:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _EconomicEvent = _interopRequireDefault(require("./EconomicEvent"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The EconomicCalendar model module.
 * @module model/EconomicCalendar
 * @version 1.2.16
 */
var EconomicCalendar = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>EconomicCalendar</code>.
   * @alias module:model/EconomicCalendar
   */
  function EconomicCalendar() {
    _classCallCheck(this, EconomicCalendar);

    EconomicCalendar.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(EconomicCalendar, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>EconomicCalendar</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/EconomicCalendar} obj Optional instance to populate.
     * @return {module:model/EconomicCalendar} The populated <code>EconomicCalendar</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new EconomicCalendar();

        if (data.hasOwnProperty('economicCalendar')) {
          obj['economicCalendar'] = _ApiClient["default"].convertToType(data['economicCalendar'], [_EconomicEvent["default"]]);
        }
      }

      return obj;
    }
  }]);

  return EconomicCalendar;
}();
/**
 * Array of economic events.
 * @member {Array.<module:model/EconomicEvent>} economicCalendar
 */


EconomicCalendar.prototype['economicCalendar'] = undefined;
var _default = EconomicCalendar;
exports["default"] = _default;
},{"../ApiClient":10,"./EconomicEvent":60}],57:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The EconomicCode model module.
 * @module model/EconomicCode
 * @version 1.2.16
 */
var EconomicCode = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>EconomicCode</code>.
   * @alias module:model/EconomicCode
   */
  function EconomicCode() {
    _classCallCheck(this, EconomicCode);

    EconomicCode.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(EconomicCode, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>EconomicCode</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/EconomicCode} obj Optional instance to populate.
     * @return {module:model/EconomicCode} The populated <code>EconomicCode</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new EconomicCode();

        if (data.hasOwnProperty('code')) {
          obj['code'] = _ApiClient["default"].convertToType(data['code'], 'String');
        }

        if (data.hasOwnProperty('country')) {
          obj['country'] = _ApiClient["default"].convertToType(data['country'], 'String');
        }

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('unit')) {
          obj['unit'] = _ApiClient["default"].convertToType(data['unit'], 'String');
        }
      }

      return obj;
    }
  }]);

  return EconomicCode;
}();
/**
 * Finnhub economic code used to get historical data
 * @member {String} code
 */


EconomicCode.prototype['code'] = undefined;
/**
 * Country
 * @member {String} country
 */

EconomicCode.prototype['country'] = undefined;
/**
 * Indicator name
 * @member {String} name
 */

EconomicCode.prototype['name'] = undefined;
/**
 * Unit
 * @member {String} unit
 */

EconomicCode.prototype['unit'] = undefined;
var _default = EconomicCode;
exports["default"] = _default;
},{"../ApiClient":10}],58:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _EconomicDataInfo = _interopRequireDefault(require("./EconomicDataInfo"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The EconomicData model module.
 * @module model/EconomicData
 * @version 1.2.16
 */
var EconomicData = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>EconomicData</code>.
   * @alias module:model/EconomicData
   */
  function EconomicData() {
    _classCallCheck(this, EconomicData);

    EconomicData.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(EconomicData, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>EconomicData</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/EconomicData} obj Optional instance to populate.
     * @return {module:model/EconomicData} The populated <code>EconomicData</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new EconomicData();

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_EconomicDataInfo["default"]]);
        }

        if (data.hasOwnProperty('code')) {
          obj['code'] = _ApiClient["default"].convertToType(data['code'], 'String');
        }
      }

      return obj;
    }
  }]);

  return EconomicData;
}();
/**
 * Array of economic data for requested code.
 * @member {Array.<module:model/EconomicDataInfo>} data
 */


EconomicData.prototype['data'] = undefined;
/**
 * Finnhub economic code
 * @member {String} code
 */

EconomicData.prototype['code'] = undefined;
var _default = EconomicData;
exports["default"] = _default;
},{"../ApiClient":10,"./EconomicDataInfo":59}],59:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The EconomicDataInfo model module.
 * @module model/EconomicDataInfo
 * @version 1.2.16
 */
var EconomicDataInfo = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>EconomicDataInfo</code>.
   * @alias module:model/EconomicDataInfo
   */
  function EconomicDataInfo() {
    _classCallCheck(this, EconomicDataInfo);

    EconomicDataInfo.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(EconomicDataInfo, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>EconomicDataInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/EconomicDataInfo} obj Optional instance to populate.
     * @return {module:model/EconomicDataInfo} The populated <code>EconomicDataInfo</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new EconomicDataInfo();

        if (data.hasOwnProperty('date')) {
          obj['date'] = _ApiClient["default"].convertToType(data['date'], 'String');
        }

        if (data.hasOwnProperty('value')) {
          obj['value'] = _ApiClient["default"].convertToType(data['value'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return EconomicDataInfo;
}();
/**
 * Date of the reading
 * @member {String} date
 */


EconomicDataInfo.prototype['date'] = undefined;
/**
 * Value
 * @member {Number} value
 */

EconomicDataInfo.prototype['value'] = undefined;
var _default = EconomicDataInfo;
exports["default"] = _default;
},{"../ApiClient":10}],60:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The EconomicEvent model module.
 * @module model/EconomicEvent
 * @version 1.2.16
 */
var EconomicEvent = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>EconomicEvent</code>.
   * @alias module:model/EconomicEvent
   */
  function EconomicEvent() {
    _classCallCheck(this, EconomicEvent);

    EconomicEvent.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(EconomicEvent, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>EconomicEvent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/EconomicEvent} obj Optional instance to populate.
     * @return {module:model/EconomicEvent} The populated <code>EconomicEvent</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new EconomicEvent();

        if (data.hasOwnProperty('actual')) {
          obj['actual'] = _ApiClient["default"].convertToType(data['actual'], 'Number');
        }

        if (data.hasOwnProperty('prev')) {
          obj['prev'] = _ApiClient["default"].convertToType(data['prev'], 'Number');
        }

        if (data.hasOwnProperty('country')) {
          obj['country'] = _ApiClient["default"].convertToType(data['country'], 'String');
        }

        if (data.hasOwnProperty('unit')) {
          obj['unit'] = _ApiClient["default"].convertToType(data['unit'], 'String');
        }

        if (data.hasOwnProperty('estimate')) {
          obj['estimate'] = _ApiClient["default"].convertToType(data['estimate'], 'Number');
        }

        if (data.hasOwnProperty('event')) {
          obj['event'] = _ApiClient["default"].convertToType(data['event'], 'String');
        }

        if (data.hasOwnProperty('impact')) {
          obj['impact'] = _ApiClient["default"].convertToType(data['impact'], 'String');
        }

        if (data.hasOwnProperty('time')) {
          obj['time'] = _ApiClient["default"].convertToType(data['time'], 'String');
        }
      }

      return obj;
    }
  }]);

  return EconomicEvent;
}();
/**
 * Actual release
 * @member {Number} actual
 */


EconomicEvent.prototype['actual'] = undefined;
/**
 * Previous release
 * @member {Number} prev
 */

EconomicEvent.prototype['prev'] = undefined;
/**
 * Country
 * @member {String} country
 */

EconomicEvent.prototype['country'] = undefined;
/**
 * Unit
 * @member {String} unit
 */

EconomicEvent.prototype['unit'] = undefined;
/**
 * Estimate
 * @member {Number} estimate
 */

EconomicEvent.prototype['estimate'] = undefined;
/**
 * Event
 * @member {String} event
 */

EconomicEvent.prototype['event'] = undefined;
/**
 * Impact level
 * @member {String} impact
 */

EconomicEvent.prototype['impact'] = undefined;
/**
 * Release time
 * @member {String} time
 */

EconomicEvent.prototype['time'] = undefined;
var _default = EconomicEvent;
exports["default"] = _default;
},{"../ApiClient":10}],61:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The FDAComitteeMeeting model module.
 * @module model/FDAComitteeMeeting
 * @version 1.2.16
 */
var FDAComitteeMeeting = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>FDAComitteeMeeting</code>.
   * @alias module:model/FDAComitteeMeeting
   */
  function FDAComitteeMeeting() {
    _classCallCheck(this, FDAComitteeMeeting);

    FDAComitteeMeeting.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(FDAComitteeMeeting, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>FDAComitteeMeeting</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/FDAComitteeMeeting} obj Optional instance to populate.
     * @return {module:model/FDAComitteeMeeting} The populated <code>FDAComitteeMeeting</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new FDAComitteeMeeting();

        if (data.hasOwnProperty('fromDate')) {
          obj['fromDate'] = _ApiClient["default"].convertToType(data['fromDate'], 'String');
        }

        if (data.hasOwnProperty('toDate')) {
          obj['toDate'] = _ApiClient["default"].convertToType(data['toDate'], 'String');
        }

        if (data.hasOwnProperty('eventDescription')) {
          obj['eventDescription'] = _ApiClient["default"].convertToType(data['eventDescription'], 'String');
        }

        if (data.hasOwnProperty('url')) {
          obj['url'] = _ApiClient["default"].convertToType(data['url'], 'String');
        }
      }

      return obj;
    }
  }]);

  return FDAComitteeMeeting;
}();
/**
 * Start time of the event in EST.
 * @member {String} fromDate
 */


FDAComitteeMeeting.prototype['fromDate'] = undefined;
/**
 * End time of the event in EST.
 * @member {String} toDate
 */

FDAComitteeMeeting.prototype['toDate'] = undefined;
/**
 * Event's description.
 * @member {String} eventDescription
 */

FDAComitteeMeeting.prototype['eventDescription'] = undefined;
/**
 * URL.
 * @member {String} url
 */

FDAComitteeMeeting.prototype['url'] = undefined;
var _default = FDAComitteeMeeting;
exports["default"] = _default;
},{"../ApiClient":10}],62:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The Filing model module.
 * @module model/Filing
 * @version 1.2.16
 */
var Filing = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>Filing</code>.
   * @alias module:model/Filing
   */
  function Filing() {
    _classCallCheck(this, Filing);

    Filing.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(Filing, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>Filing</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Filing} obj Optional instance to populate.
     * @return {module:model/Filing} The populated <code>Filing</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new Filing();

        if (data.hasOwnProperty('accessNumber')) {
          obj['accessNumber'] = _ApiClient["default"].convertToType(data['accessNumber'], 'String');
        }

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('cik')) {
          obj['cik'] = _ApiClient["default"].convertToType(data['cik'], 'String');
        }

        if (data.hasOwnProperty('form')) {
          obj['form'] = _ApiClient["default"].convertToType(data['form'], 'String');
        }

        if (data.hasOwnProperty('filedDate')) {
          obj['filedDate'] = _ApiClient["default"].convertToType(data['filedDate'], 'String');
        }

        if (data.hasOwnProperty('acceptedDate')) {
          obj['acceptedDate'] = _ApiClient["default"].convertToType(data['acceptedDate'], 'String');
        }

        if (data.hasOwnProperty('reportUrl')) {
          obj['reportUrl'] = _ApiClient["default"].convertToType(data['reportUrl'], 'String');
        }

        if (data.hasOwnProperty('filingUrl')) {
          obj['filingUrl'] = _ApiClient["default"].convertToType(data['filingUrl'], 'String');
        }
      }

      return obj;
    }
  }]);

  return Filing;
}();
/**
 * Access number.
 * @member {String} accessNumber
 */


Filing.prototype['accessNumber'] = undefined;
/**
 * Symbol.
 * @member {String} symbol
 */

Filing.prototype['symbol'] = undefined;
/**
 * CIK.
 * @member {String} cik
 */

Filing.prototype['cik'] = undefined;
/**
 * Form type.
 * @member {String} form
 */

Filing.prototype['form'] = undefined;
/**
 * Filed date <code>%Y-%m-%d %H:%M:%S</code>.
 * @member {String} filedDate
 */

Filing.prototype['filedDate'] = undefined;
/**
 * Accepted date <code>%Y-%m-%d %H:%M:%S</code>.
 * @member {String} acceptedDate
 */

Filing.prototype['acceptedDate'] = undefined;
/**
 * Report's URL.
 * @member {String} reportUrl
 */

Filing.prototype['reportUrl'] = undefined;
/**
 * Filing's URL.
 * @member {String} filingUrl
 */

Filing.prototype['filingUrl'] = undefined;
var _default = Filing;
exports["default"] = _default;
},{"../ApiClient":10}],63:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The FilingSentiment model module.
 * @module model/FilingSentiment
 * @version 1.2.16
 */
var FilingSentiment = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>FilingSentiment</code>.
   * @alias module:model/FilingSentiment
   */
  function FilingSentiment() {
    _classCallCheck(this, FilingSentiment);

    FilingSentiment.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(FilingSentiment, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>FilingSentiment</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/FilingSentiment} obj Optional instance to populate.
     * @return {module:model/FilingSentiment} The populated <code>FilingSentiment</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new FilingSentiment();

        if (data.hasOwnProperty('negative')) {
          obj['negative'] = _ApiClient["default"].convertToType(data['negative'], 'Number');
        }

        if (data.hasOwnProperty('positive')) {
          obj['positive'] = _ApiClient["default"].convertToType(data['positive'], 'Number');
        }

        if (data.hasOwnProperty('polarity')) {
          obj['polarity'] = _ApiClient["default"].convertToType(data['polarity'], 'Number');
        }

        if (data.hasOwnProperty('litigious')) {
          obj['litigious'] = _ApiClient["default"].convertToType(data['litigious'], 'Number');
        }

        if (data.hasOwnProperty('uncertainty')) {
          obj['uncertainty'] = _ApiClient["default"].convertToType(data['uncertainty'], 'Number');
        }

        if (data.hasOwnProperty('constraining')) {
          obj['constraining'] = _ApiClient["default"].convertToType(data['constraining'], 'Number');
        }

        if (data.hasOwnProperty('modal-weak')) {
          obj['modal-weak'] = _ApiClient["default"].convertToType(data['modal-weak'], 'Number');
        }

        if (data.hasOwnProperty('modal-strong')) {
          obj['modal-strong'] = _ApiClient["default"].convertToType(data['modal-strong'], 'Number');
        }

        if (data.hasOwnProperty('modal-moderate')) {
          obj['modal-moderate'] = _ApiClient["default"].convertToType(data['modal-moderate'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return FilingSentiment;
}();
/**
 * % of negative words in the filing.
 * @member {Number} negative
 */


FilingSentiment.prototype['negative'] = undefined;
/**
 * % of positive words in the filing.
 * @member {Number} positive
 */

FilingSentiment.prototype['positive'] = undefined;
/**
 * % of polarity words in the filing.
 * @member {Number} polarity
 */

FilingSentiment.prototype['polarity'] = undefined;
/**
 * % of litigious words in the filing.
 * @member {Number} litigious
 */

FilingSentiment.prototype['litigious'] = undefined;
/**
 * % of uncertainty words in the filing.
 * @member {Number} uncertainty
 */

FilingSentiment.prototype['uncertainty'] = undefined;
/**
 * % of constraining words in the filing.
 * @member {Number} constraining
 */

FilingSentiment.prototype['constraining'] = undefined;
/**
 * % of modal-weak words in the filing.
 * @member {Number} modal-weak
 */

FilingSentiment.prototype['modal-weak'] = undefined;
/**
 * % of modal-strong words in the filing.
 * @member {Number} modal-strong
 */

FilingSentiment.prototype['modal-strong'] = undefined;
/**
 * % of modal-moderate words in the filing.
 * @member {Number} modal-moderate
 */

FilingSentiment.prototype['modal-moderate'] = undefined;
var _default = FilingSentiment;
exports["default"] = _default;
},{"../ApiClient":10}],64:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The FinancialStatements model module.
 * @module model/FinancialStatements
 * @version 1.2.16
 */
var FinancialStatements = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>FinancialStatements</code>.
   * @alias module:model/FinancialStatements
   */
  function FinancialStatements() {
    _classCallCheck(this, FinancialStatements);

    FinancialStatements.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(FinancialStatements, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>FinancialStatements</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/FinancialStatements} obj Optional instance to populate.
     * @return {module:model/FinancialStatements} The populated <code>FinancialStatements</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new FinancialStatements();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('financials')) {
          obj['financials'] = _ApiClient["default"].convertToType(data['financials'], [Object]);
        }
      }

      return obj;
    }
  }]);

  return FinancialStatements;
}();
/**
 * Symbol of the company.
 * @member {String} symbol
 */


FinancialStatements.prototype['symbol'] = undefined;
/**
 * An array of map of key, value pairs containing the data for each period.
 * @member {Array.<Object>} financials
 */

FinancialStatements.prototype['financials'] = undefined;
var _default = FinancialStatements;
exports["default"] = _default;
},{"../ApiClient":10}],65:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _Report = _interopRequireDefault(require("./Report"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The FinancialsAsReported model module.
 * @module model/FinancialsAsReported
 * @version 1.2.16
 */
var FinancialsAsReported = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>FinancialsAsReported</code>.
   * @alias module:model/FinancialsAsReported
   */
  function FinancialsAsReported() {
    _classCallCheck(this, FinancialsAsReported);

    FinancialsAsReported.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(FinancialsAsReported, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>FinancialsAsReported</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/FinancialsAsReported} obj Optional instance to populate.
     * @return {module:model/FinancialsAsReported} The populated <code>FinancialsAsReported</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new FinancialsAsReported();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('cik')) {
          obj['cik'] = _ApiClient["default"].convertToType(data['cik'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_Report["default"]]);
        }
      }

      return obj;
    }
  }]);

  return FinancialsAsReported;
}();
/**
 * Symbol
 * @member {String} symbol
 */


FinancialsAsReported.prototype['symbol'] = undefined;
/**
 * CIK
 * @member {String} cik
 */

FinancialsAsReported.prototype['cik'] = undefined;
/**
 * Array of filings.
 * @member {Array.<module:model/Report>} data
 */

FinancialsAsReported.prototype['data'] = undefined;
var _default = FinancialsAsReported;
exports["default"] = _default;
},{"../ApiClient":10,"./Report":117}],66:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The ForexCandles model module.
 * @module model/ForexCandles
 * @version 1.2.16
 */
var ForexCandles = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>ForexCandles</code>.
   * @alias module:model/ForexCandles
   */
  function ForexCandles() {
    _classCallCheck(this, ForexCandles);

    ForexCandles.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(ForexCandles, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>ForexCandles</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ForexCandles} obj Optional instance to populate.
     * @return {module:model/ForexCandles} The populated <code>ForexCandles</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new ForexCandles();

        if (data.hasOwnProperty('o')) {
          obj['o'] = _ApiClient["default"].convertToType(data['o'], ['Number']);
        }

        if (data.hasOwnProperty('h')) {
          obj['h'] = _ApiClient["default"].convertToType(data['h'], ['Number']);
        }

        if (data.hasOwnProperty('l')) {
          obj['l'] = _ApiClient["default"].convertToType(data['l'], ['Number']);
        }

        if (data.hasOwnProperty('c')) {
          obj['c'] = _ApiClient["default"].convertToType(data['c'], ['Number']);
        }

        if (data.hasOwnProperty('v')) {
          obj['v'] = _ApiClient["default"].convertToType(data['v'], ['Number']);
        }

        if (data.hasOwnProperty('t')) {
          obj['t'] = _ApiClient["default"].convertToType(data['t'], ['Number']);
        }

        if (data.hasOwnProperty('s')) {
          obj['s'] = _ApiClient["default"].convertToType(data['s'], 'String');
        }
      }

      return obj;
    }
  }]);

  return ForexCandles;
}();
/**
 * List of open prices for returned candles.
 * @member {Array.<Number>} o
 */


ForexCandles.prototype['o'] = undefined;
/**
 * List of high prices for returned candles.
 * @member {Array.<Number>} h
 */

ForexCandles.prototype['h'] = undefined;
/**
 * List of low prices for returned candles.
 * @member {Array.<Number>} l
 */

ForexCandles.prototype['l'] = undefined;
/**
 * List of close prices for returned candles.
 * @member {Array.<Number>} c
 */

ForexCandles.prototype['c'] = undefined;
/**
 * List of volume data for returned candles.
 * @member {Array.<Number>} v
 */

ForexCandles.prototype['v'] = undefined;
/**
 * List of timestamp for returned candles.
 * @member {Array.<Number>} t
 */

ForexCandles.prototype['t'] = undefined;
/**
 * Status of the response. This field can either be ok or no_data.
 * @member {String} s
 */

ForexCandles.prototype['s'] = undefined;
var _default = ForexCandles;
exports["default"] = _default;
},{"../ApiClient":10}],67:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The ForexSymbol model module.
 * @module model/ForexSymbol
 * @version 1.2.16
 */
var ForexSymbol = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>ForexSymbol</code>.
   * @alias module:model/ForexSymbol
   */
  function ForexSymbol() {
    _classCallCheck(this, ForexSymbol);

    ForexSymbol.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(ForexSymbol, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>ForexSymbol</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ForexSymbol} obj Optional instance to populate.
     * @return {module:model/ForexSymbol} The populated <code>ForexSymbol</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new ForexSymbol();

        if (data.hasOwnProperty('description')) {
          obj['description'] = _ApiClient["default"].convertToType(data['description'], 'String');
        }

        if (data.hasOwnProperty('displaySymbol')) {
          obj['displaySymbol'] = _ApiClient["default"].convertToType(data['displaySymbol'], 'String');
        }

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }
      }

      return obj;
    }
  }]);

  return ForexSymbol;
}();
/**
 * Symbol description
 * @member {String} description
 */


ForexSymbol.prototype['description'] = undefined;
/**
 * Display symbol name.
 * @member {String} displaySymbol
 */

ForexSymbol.prototype['displaySymbol'] = undefined;
/**
 * Unique symbol used to identify this symbol used in <code>/forex/candle</code> endpoint.
 * @member {String} symbol
 */

ForexSymbol.prototype['symbol'] = undefined;
var _default = ForexSymbol;
exports["default"] = _default;
},{"../ApiClient":10}],68:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The Forexrates model module.
 * @module model/Forexrates
 * @version 1.2.16
 */
var Forexrates = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>Forexrates</code>.
   * @alias module:model/Forexrates
   */
  function Forexrates() {
    _classCallCheck(this, Forexrates);

    Forexrates.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(Forexrates, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>Forexrates</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Forexrates} obj Optional instance to populate.
     * @return {module:model/Forexrates} The populated <code>Forexrates</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new Forexrates();

        if (data.hasOwnProperty('base')) {
          obj['base'] = _ApiClient["default"].convertToType(data['base'], 'String');
        }

        if (data.hasOwnProperty('quote')) {
          obj['quote'] = _ApiClient["default"].convertToType(data['quote'], Object);
        }
      }

      return obj;
    }
  }]);

  return Forexrates;
}();
/**
 * Base currency.
 * @member {String} base
 */


Forexrates.prototype['base'] = undefined;
/**
 * @member {Object} quote
 */

Forexrates.prototype['quote'] = undefined;
var _default = Forexrates;
exports["default"] = _default;
},{"../ApiClient":10}],69:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _FundOwnershipInfo = _interopRequireDefault(require("./FundOwnershipInfo"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The FundOwnership model module.
 * @module model/FundOwnership
 * @version 1.2.16
 */
var FundOwnership = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>FundOwnership</code>.
   * @alias module:model/FundOwnership
   */
  function FundOwnership() {
    _classCallCheck(this, FundOwnership);

    FundOwnership.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(FundOwnership, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>FundOwnership</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/FundOwnership} obj Optional instance to populate.
     * @return {module:model/FundOwnership} The populated <code>FundOwnership</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new FundOwnership();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('ownership')) {
          obj['ownership'] = _ApiClient["default"].convertToType(data['ownership'], [_FundOwnershipInfo["default"]]);
        }
      }

      return obj;
    }
  }]);

  return FundOwnership;
}();
/**
 * Symbol of the company.
 * @member {String} symbol
 */


FundOwnership.prototype['symbol'] = undefined;
/**
 * Array of investors with detailed information about their holdings.
 * @member {Array.<module:model/FundOwnershipInfo>} ownership
 */

FundOwnership.prototype['ownership'] = undefined;
var _default = FundOwnership;
exports["default"] = _default;
},{"../ApiClient":10,"./FundOwnershipInfo":70}],70:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The FundOwnershipInfo model module.
 * @module model/FundOwnershipInfo
 * @version 1.2.16
 */
var FundOwnershipInfo = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>FundOwnershipInfo</code>.
   * @alias module:model/FundOwnershipInfo
   */
  function FundOwnershipInfo() {
    _classCallCheck(this, FundOwnershipInfo);

    FundOwnershipInfo.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(FundOwnershipInfo, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>FundOwnershipInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/FundOwnershipInfo} obj Optional instance to populate.
     * @return {module:model/FundOwnershipInfo} The populated <code>FundOwnershipInfo</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new FundOwnershipInfo();

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('share')) {
          obj['share'] = _ApiClient["default"].convertToType(data['share'], 'Number');
        }

        if (data.hasOwnProperty('change')) {
          obj['change'] = _ApiClient["default"].convertToType(data['change'], 'Number');
        }

        if (data.hasOwnProperty('filingDate')) {
          obj['filingDate'] = _ApiClient["default"].convertToType(data['filingDate'], 'Date');
        }

        if (data.hasOwnProperty('portfolioPercent')) {
          obj['portfolioPercent'] = _ApiClient["default"].convertToType(data['portfolioPercent'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return FundOwnershipInfo;
}();
/**
 * Investor's name.
 * @member {String} name
 */


FundOwnershipInfo.prototype['name'] = undefined;
/**
 * Number of shares held by the investor.
 * @member {Number} share
 */

FundOwnershipInfo.prototype['share'] = undefined;
/**
 * Number of share changed (net buy or sell) from the last period.
 * @member {Number} change
 */

FundOwnershipInfo.prototype['change'] = undefined;
/**
 * Filing date.
 * @member {Date} filingDate
 */

FundOwnershipInfo.prototype['filingDate'] = undefined;
/**
 * Percent of the fund's portfolio comprised of the company's share.
 * @member {Number} portfolioPercent
 */

FundOwnershipInfo.prototype['portfolioPercent'] = undefined;
var _default = FundOwnershipInfo;
exports["default"] = _default;
},{"../ApiClient":10}],71:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The HistoricalNBBO model module.
 * @module model/HistoricalNBBO
 * @version 1.2.16
 */
var HistoricalNBBO = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>HistoricalNBBO</code>.
   * @alias module:model/HistoricalNBBO
   */
  function HistoricalNBBO() {
    _classCallCheck(this, HistoricalNBBO);

    HistoricalNBBO.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(HistoricalNBBO, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>HistoricalNBBO</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/HistoricalNBBO} obj Optional instance to populate.
     * @return {module:model/HistoricalNBBO} The populated <code>HistoricalNBBO</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new HistoricalNBBO();

        if (data.hasOwnProperty('s')) {
          obj['s'] = _ApiClient["default"].convertToType(data['s'], 'String');
        }

        if (data.hasOwnProperty('skip')) {
          obj['skip'] = _ApiClient["default"].convertToType(data['skip'], 'Number');
        }

        if (data.hasOwnProperty('count')) {
          obj['count'] = _ApiClient["default"].convertToType(data['count'], 'Number');
        }

        if (data.hasOwnProperty('total')) {
          obj['total'] = _ApiClient["default"].convertToType(data['total'], 'Number');
        }

        if (data.hasOwnProperty('av')) {
          obj['av'] = _ApiClient["default"].convertToType(data['av'], ['Number']);
        }

        if (data.hasOwnProperty('a')) {
          obj['a'] = _ApiClient["default"].convertToType(data['a'], ['Number']);
        }

        if (data.hasOwnProperty('ax')) {
          obj['ax'] = _ApiClient["default"].convertToType(data['ax'], ['String']);
        }

        if (data.hasOwnProperty('bv')) {
          obj['bv'] = _ApiClient["default"].convertToType(data['bv'], ['Number']);
        }

        if (data.hasOwnProperty('b')) {
          obj['b'] = _ApiClient["default"].convertToType(data['b'], ['Number']);
        }

        if (data.hasOwnProperty('bx')) {
          obj['bx'] = _ApiClient["default"].convertToType(data['bx'], ['String']);
        }

        if (data.hasOwnProperty('t')) {
          obj['t'] = _ApiClient["default"].convertToType(data['t'], ['Number']);
        }

        if (data.hasOwnProperty('c')) {
          obj['c'] = _ApiClient["default"].convertToType(data['c'], [['String']]);
        }
      }

      return obj;
    }
  }]);

  return HistoricalNBBO;
}();
/**
 * Symbol.
 * @member {String} s
 */


HistoricalNBBO.prototype['s'] = undefined;
/**
 * Number of ticks skipped.
 * @member {Number} skip
 */

HistoricalNBBO.prototype['skip'] = undefined;
/**
 * Number of ticks returned. If <code>count</code> < <code>limit</code>, all data for that date has been returned.
 * @member {Number} count
 */

HistoricalNBBO.prototype['count'] = undefined;
/**
 * Total number of ticks for that date.
 * @member {Number} total
 */

HistoricalNBBO.prototype['total'] = undefined;
/**
 * List of Ask volume data.
 * @member {Array.<Number>} av
 */

HistoricalNBBO.prototype['av'] = undefined;
/**
 * List of Ask price data.
 * @member {Array.<Number>} a
 */

HistoricalNBBO.prototype['a'] = undefined;
/**
 * List of venues/exchanges - Ask price. A list of exchange codes can be found <a target=\"_blank\" href=\"https://docs.google.com/spreadsheets/d/1Tj53M1svmr-hfEtbk6_NpVR1yAyGLMaH6ByYU6CG0ZY/edit?usp=sharing\",>here</a>
 * @member {Array.<String>} ax
 */

HistoricalNBBO.prototype['ax'] = undefined;
/**
 * List of Bid volume data.
 * @member {Array.<Number>} bv
 */

HistoricalNBBO.prototype['bv'] = undefined;
/**
 * List of Bid price data.
 * @member {Array.<Number>} b
 */

HistoricalNBBO.prototype['b'] = undefined;
/**
 * List of venues/exchanges - Bid price. A list of exchange codes can be found <a target=\"_blank\" href=\"https://docs.google.com/spreadsheets/d/1Tj53M1svmr-hfEtbk6_NpVR1yAyGLMaH6ByYU6CG0ZY/edit?usp=sharing\",>here</a>
 * @member {Array.<String>} bx
 */

HistoricalNBBO.prototype['bx'] = undefined;
/**
 * List of timestamp in UNIX ms.
 * @member {Array.<Number>} t
 */

HistoricalNBBO.prototype['t'] = undefined;
/**
 * List of quote conditions. A comprehensive list of quote conditions code can be found <a target=\"_blank\" href=\"https://docs.google.com/spreadsheets/d/1iiA6e7Osdtai0oPMOUzgAIKXCsay89dFDmsegz6OpEg/edit?usp=sharing\">here</a>
 * @member {Array.<Array.<String>>} c
 */

HistoricalNBBO.prototype['c'] = undefined;
var _default = HistoricalNBBO;
exports["default"] = _default;
},{"../ApiClient":10}],72:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _IPOEvent = _interopRequireDefault(require("./IPOEvent"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The IPOCalendar model module.
 * @module model/IPOCalendar
 * @version 1.2.16
 */
var IPOCalendar = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>IPOCalendar</code>.
   * @alias module:model/IPOCalendar
   */
  function IPOCalendar() {
    _classCallCheck(this, IPOCalendar);

    IPOCalendar.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(IPOCalendar, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>IPOCalendar</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/IPOCalendar} obj Optional instance to populate.
     * @return {module:model/IPOCalendar} The populated <code>IPOCalendar</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new IPOCalendar();

        if (data.hasOwnProperty('ipoCalendar')) {
          obj['ipoCalendar'] = _ApiClient["default"].convertToType(data['ipoCalendar'], [_IPOEvent["default"]]);
        }
      }

      return obj;
    }
  }]);

  return IPOCalendar;
}();
/**
 * Array of IPO events.
 * @member {Array.<module:model/IPOEvent>} ipoCalendar
 */


IPOCalendar.prototype['ipoCalendar'] = undefined;
var _default = IPOCalendar;
exports["default"] = _default;
},{"../ApiClient":10,"./IPOEvent":73}],73:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The IPOEvent model module.
 * @module model/IPOEvent
 * @version 1.2.16
 */
var IPOEvent = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>IPOEvent</code>.
   * @alias module:model/IPOEvent
   */
  function IPOEvent() {
    _classCallCheck(this, IPOEvent);

    IPOEvent.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(IPOEvent, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>IPOEvent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/IPOEvent} obj Optional instance to populate.
     * @return {module:model/IPOEvent} The populated <code>IPOEvent</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new IPOEvent();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('date')) {
          obj['date'] = _ApiClient["default"].convertToType(data['date'], 'Date');
        }

        if (data.hasOwnProperty('exchange')) {
          obj['exchange'] = _ApiClient["default"].convertToType(data['exchange'], 'String');
        }

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('status')) {
          obj['status'] = _ApiClient["default"].convertToType(data['status'], 'String');
        }

        if (data.hasOwnProperty('price')) {
          obj['price'] = _ApiClient["default"].convertToType(data['price'], 'String');
        }

        if (data.hasOwnProperty('numberOfShares')) {
          obj['numberOfShares'] = _ApiClient["default"].convertToType(data['numberOfShares'], 'Number');
        }

        if (data.hasOwnProperty('totalSharesValue')) {
          obj['totalSharesValue'] = _ApiClient["default"].convertToType(data['totalSharesValue'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return IPOEvent;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


IPOEvent.prototype['symbol'] = undefined;
/**
 * IPO date.
 * @member {Date} date
 */

IPOEvent.prototype['date'] = undefined;
/**
 * Exchange.
 * @member {String} exchange
 */

IPOEvent.prototype['exchange'] = undefined;
/**
 * Company's name.
 * @member {String} name
 */

IPOEvent.prototype['name'] = undefined;
/**
 * IPO status. Can take 1 of the following values: <code>expected</code>,<code>priced</code>,<code>withdrawn</code>,<code>filed</code>
 * @member {String} status
 */

IPOEvent.prototype['status'] = undefined;
/**
 * Projected price or price range.
 * @member {String} price
 */

IPOEvent.prototype['price'] = undefined;
/**
 * Number of shares offered during the IPO.
 * @member {Number} numberOfShares
 */

IPOEvent.prototype['numberOfShares'] = undefined;
/**
 * Total shares value.
 * @member {Number} totalSharesValue
 */

IPOEvent.prototype['totalSharesValue'] = undefined;
var _default = IPOEvent;
exports["default"] = _default;
},{"../ApiClient":10}],74:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The IndexHistoricalConstituent model module.
 * @module model/IndexHistoricalConstituent
 * @version 1.2.16
 */
var IndexHistoricalConstituent = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>IndexHistoricalConstituent</code>.
   * @alias module:model/IndexHistoricalConstituent
   */
  function IndexHistoricalConstituent() {
    _classCallCheck(this, IndexHistoricalConstituent);

    IndexHistoricalConstituent.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(IndexHistoricalConstituent, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>IndexHistoricalConstituent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/IndexHistoricalConstituent} obj Optional instance to populate.
     * @return {module:model/IndexHistoricalConstituent} The populated <code>IndexHistoricalConstituent</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new IndexHistoricalConstituent();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('action')) {
          obj['action'] = _ApiClient["default"].convertToType(data['action'], 'String');
        }

        if (data.hasOwnProperty('date')) {
          obj['date'] = _ApiClient["default"].convertToType(data['date'], 'Date');
        }
      }

      return obj;
    }
  }]);

  return IndexHistoricalConstituent;
}();
/**
 * Symbol
 * @member {String} symbol
 */


IndexHistoricalConstituent.prototype['symbol'] = undefined;
/**
 * <code>add</code> or <code>remove</code>.
 * @member {String} action
 */

IndexHistoricalConstituent.prototype['action'] = undefined;
/**
 * Date of joining or leaving the index.
 * @member {Date} date
 */

IndexHistoricalConstituent.prototype['date'] = undefined;
var _default = IndexHistoricalConstituent;
exports["default"] = _default;
},{"../ApiClient":10}],75:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The Indicator model module.
 * @module model/Indicator
 * @version 1.2.16
 */
var Indicator = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>Indicator</code>.
   * @alias module:model/Indicator
   */
  function Indicator() {
    _classCallCheck(this, Indicator);

    Indicator.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(Indicator, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>Indicator</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Indicator} obj Optional instance to populate.
     * @return {module:model/Indicator} The populated <code>Indicator</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new Indicator();

        if (data.hasOwnProperty('buy')) {
          obj['buy'] = _ApiClient["default"].convertToType(data['buy'], 'Number');
        }

        if (data.hasOwnProperty('neutral')) {
          obj['neutral'] = _ApiClient["default"].convertToType(data['neutral'], 'Number');
        }

        if (data.hasOwnProperty('sell')) {
          obj['sell'] = _ApiClient["default"].convertToType(data['sell'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return Indicator;
}();
/**
 * Number of buy signals
 * @member {Number} buy
 */


Indicator.prototype['buy'] = undefined;
/**
 * Number of neutral signals
 * @member {Number} neutral
 */

Indicator.prototype['neutral'] = undefined;
/**
 * Number of sell signals
 * @member {Number} sell
 */

Indicator.prototype['sell'] = undefined;
var _default = Indicator;
exports["default"] = _default;
},{"../ApiClient":10}],76:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The IndicesConstituents model module.
 * @module model/IndicesConstituents
 * @version 1.2.16
 */
var IndicesConstituents = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>IndicesConstituents</code>.
   * @alias module:model/IndicesConstituents
   */
  function IndicesConstituents() {
    _classCallCheck(this, IndicesConstituents);

    IndicesConstituents.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(IndicesConstituents, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>IndicesConstituents</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/IndicesConstituents} obj Optional instance to populate.
     * @return {module:model/IndicesConstituents} The populated <code>IndicesConstituents</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new IndicesConstituents();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('constituents')) {
          obj['constituents'] = _ApiClient["default"].convertToType(data['constituents'], ['String']);
        }
      }

      return obj;
    }
  }]);

  return IndicesConstituents;
}();
/**
 * Index's symbol.
 * @member {String} symbol
 */


IndicesConstituents.prototype['symbol'] = undefined;
/**
 * Array of constituents.
 * @member {Array.<String>} constituents
 */

IndicesConstituents.prototype['constituents'] = undefined;
var _default = IndicesConstituents;
exports["default"] = _default;
},{"../ApiClient":10}],77:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _IndexHistoricalConstituent = _interopRequireDefault(require("./IndexHistoricalConstituent"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The IndicesHistoricalConstituents model module.
 * @module model/IndicesHistoricalConstituents
 * @version 1.2.16
 */
var IndicesHistoricalConstituents = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>IndicesHistoricalConstituents</code>.
   * @alias module:model/IndicesHistoricalConstituents
   */
  function IndicesHistoricalConstituents() {
    _classCallCheck(this, IndicesHistoricalConstituents);

    IndicesHistoricalConstituents.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(IndicesHistoricalConstituents, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>IndicesHistoricalConstituents</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/IndicesHistoricalConstituents} obj Optional instance to populate.
     * @return {module:model/IndicesHistoricalConstituents} The populated <code>IndicesHistoricalConstituents</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new IndicesHistoricalConstituents();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('historicalConstituents')) {
          obj['historicalConstituents'] = _ApiClient["default"].convertToType(data['historicalConstituents'], [_IndexHistoricalConstituent["default"]]);
        }
      }

      return obj;
    }
  }]);

  return IndicesHistoricalConstituents;
}();
/**
 * Index's symbol.
 * @member {String} symbol
 */


IndicesHistoricalConstituents.prototype['symbol'] = undefined;
/**
 * Array of historical constituents.
 * @member {Array.<module:model/IndexHistoricalConstituent>} historicalConstituents
 */

IndicesHistoricalConstituents.prototype['historicalConstituents'] = undefined;
var _default = IndicesHistoricalConstituents;
exports["default"] = _default;
},{"../ApiClient":10,"./IndexHistoricalConstituent":74}],78:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _InsiderSentimentsData = _interopRequireDefault(require("./InsiderSentimentsData"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The InsiderSentiments model module.
 * @module model/InsiderSentiments
 * @version 1.2.16
 */
var InsiderSentiments = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>InsiderSentiments</code>.
   * @alias module:model/InsiderSentiments
   */
  function InsiderSentiments() {
    _classCallCheck(this, InsiderSentiments);

    InsiderSentiments.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(InsiderSentiments, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>InsiderSentiments</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/InsiderSentiments} obj Optional instance to populate.
     * @return {module:model/InsiderSentiments} The populated <code>InsiderSentiments</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new InsiderSentiments();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_InsiderSentimentsData["default"]]);
        }
      }

      return obj;
    }
  }]);

  return InsiderSentiments;
}();
/**
 * Symbol of the company.
 * @member {String} symbol
 */


InsiderSentiments.prototype['symbol'] = undefined;
/**
 * Array of sentiment data.
 * @member {Array.<module:model/InsiderSentimentsData>} data
 */

InsiderSentiments.prototype['data'] = undefined;
var _default = InsiderSentiments;
exports["default"] = _default;
},{"../ApiClient":10,"./InsiderSentimentsData":79}],79:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The InsiderSentimentsData model module.
 * @module model/InsiderSentimentsData
 * @version 1.2.16
 */
var InsiderSentimentsData = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>InsiderSentimentsData</code>.
   * @alias module:model/InsiderSentimentsData
   */
  function InsiderSentimentsData() {
    _classCallCheck(this, InsiderSentimentsData);

    InsiderSentimentsData.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(InsiderSentimentsData, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>InsiderSentimentsData</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/InsiderSentimentsData} obj Optional instance to populate.
     * @return {module:model/InsiderSentimentsData} The populated <code>InsiderSentimentsData</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new InsiderSentimentsData();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('year')) {
          obj['year'] = _ApiClient["default"].convertToType(data['year'], 'Number');
        }

        if (data.hasOwnProperty('month')) {
          obj['month'] = _ApiClient["default"].convertToType(data['month'], 'Number');
        }

        if (data.hasOwnProperty('change')) {
          obj['change'] = _ApiClient["default"].convertToType(data['change'], 'Number');
        }

        if (data.hasOwnProperty('mspr')) {
          obj['mspr'] = _ApiClient["default"].convertToType(data['mspr'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return InsiderSentimentsData;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


InsiderSentimentsData.prototype['symbol'] = undefined;
/**
 * Year.
 * @member {Number} year
 */

InsiderSentimentsData.prototype['year'] = undefined;
/**
 * Month.
 * @member {Number} month
 */

InsiderSentimentsData.prototype['month'] = undefined;
/**
 * Net buying/selling from all insiders' transactions.
 * @member {Number} change
 */

InsiderSentimentsData.prototype['change'] = undefined;
/**
 * Monthly share purchase ratio.
 * @member {Number} mspr
 */

InsiderSentimentsData.prototype['mspr'] = undefined;
var _default = InsiderSentimentsData;
exports["default"] = _default;
},{"../ApiClient":10}],80:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _Transactions = _interopRequireDefault(require("./Transactions"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The InsiderTransactions model module.
 * @module model/InsiderTransactions
 * @version 1.2.16
 */
var InsiderTransactions = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>InsiderTransactions</code>.
   * @alias module:model/InsiderTransactions
   */
  function InsiderTransactions() {
    _classCallCheck(this, InsiderTransactions);

    InsiderTransactions.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(InsiderTransactions, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>InsiderTransactions</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/InsiderTransactions} obj Optional instance to populate.
     * @return {module:model/InsiderTransactions} The populated <code>InsiderTransactions</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new InsiderTransactions();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_Transactions["default"]]);
        }
      }

      return obj;
    }
  }]);

  return InsiderTransactions;
}();
/**
 * Symbol of the company.
 * @member {String} symbol
 */


InsiderTransactions.prototype['symbol'] = undefined;
/**
 * Array of insider transactions.
 * @member {Array.<module:model/Transactions>} data
 */

InsiderTransactions.prototype['data'] = undefined;
var _default = InsiderTransactions;
exports["default"] = _default;
},{"../ApiClient":10,"./Transactions":140}],81:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _InstitutionalOwnershipGroup = _interopRequireDefault(require("./InstitutionalOwnershipGroup"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The InstitutionalOwnership model module.
 * @module model/InstitutionalOwnership
 * @version 1.2.16
 */
var InstitutionalOwnership = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>InstitutionalOwnership</code>.
   * @alias module:model/InstitutionalOwnership
   */
  function InstitutionalOwnership() {
    _classCallCheck(this, InstitutionalOwnership);

    InstitutionalOwnership.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(InstitutionalOwnership, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>InstitutionalOwnership</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/InstitutionalOwnership} obj Optional instance to populate.
     * @return {module:model/InstitutionalOwnership} The populated <code>InstitutionalOwnership</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new InstitutionalOwnership();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('cusip')) {
          obj['cusip'] = _ApiClient["default"].convertToType(data['cusip'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_InstitutionalOwnershipGroup["default"]]);
        }
      }

      return obj;
    }
  }]);

  return InstitutionalOwnership;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


InstitutionalOwnership.prototype['symbol'] = undefined;
/**
 * Cusip.
 * @member {String} cusip
 */

InstitutionalOwnership.prototype['cusip'] = undefined;
/**
 * Array of institutional investors.
 * @member {Array.<module:model/InstitutionalOwnershipGroup>} data
 */

InstitutionalOwnership.prototype['data'] = undefined;
var _default = InstitutionalOwnership;
exports["default"] = _default;
},{"../ApiClient":10,"./InstitutionalOwnershipGroup":82}],82:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _InstitutionalOwnershipInfo = _interopRequireDefault(require("./InstitutionalOwnershipInfo"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The InstitutionalOwnershipGroup model module.
 * @module model/InstitutionalOwnershipGroup
 * @version 1.2.16
 */
var InstitutionalOwnershipGroup = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>InstitutionalOwnershipGroup</code>.
   * @alias module:model/InstitutionalOwnershipGroup
   */
  function InstitutionalOwnershipGroup() {
    _classCallCheck(this, InstitutionalOwnershipGroup);

    InstitutionalOwnershipGroup.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(InstitutionalOwnershipGroup, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>InstitutionalOwnershipGroup</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/InstitutionalOwnershipGroup} obj Optional instance to populate.
     * @return {module:model/InstitutionalOwnershipGroup} The populated <code>InstitutionalOwnershipGroup</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new InstitutionalOwnershipGroup();

        if (data.hasOwnProperty('reportDate')) {
          obj['reportDate'] = _ApiClient["default"].convertToType(data['reportDate'], 'String');
        }

        if (data.hasOwnProperty('ownership')) {
          obj['ownership'] = _ApiClient["default"].convertToType(data['ownership'], [_InstitutionalOwnershipInfo["default"]]);
        }
      }

      return obj;
    }
  }]);

  return InstitutionalOwnershipGroup;
}();
/**
 * Report date.
 * @member {String} reportDate
 */


InstitutionalOwnershipGroup.prototype['reportDate'] = undefined;
/**
 * Array of institutional investors.
 * @member {Array.<module:model/InstitutionalOwnershipInfo>} ownership
 */

InstitutionalOwnershipGroup.prototype['ownership'] = undefined;
var _default = InstitutionalOwnershipGroup;
exports["default"] = _default;
},{"../ApiClient":10,"./InstitutionalOwnershipInfo":83}],83:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The InstitutionalOwnershipInfo model module.
 * @module model/InstitutionalOwnershipInfo
 * @version 1.2.16
 */
var InstitutionalOwnershipInfo = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>InstitutionalOwnershipInfo</code>.
   * @alias module:model/InstitutionalOwnershipInfo
   */
  function InstitutionalOwnershipInfo() {
    _classCallCheck(this, InstitutionalOwnershipInfo);

    InstitutionalOwnershipInfo.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(InstitutionalOwnershipInfo, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>InstitutionalOwnershipInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/InstitutionalOwnershipInfo} obj Optional instance to populate.
     * @return {module:model/InstitutionalOwnershipInfo} The populated <code>InstitutionalOwnershipInfo</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new InstitutionalOwnershipInfo();

        if (data.hasOwnProperty('cik')) {
          obj['cik'] = _ApiClient["default"].convertToType(data['cik'], 'String');
        }

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('putCall')) {
          obj['putCall'] = _ApiClient["default"].convertToType(data['putCall'], 'String');
        }

        if (data.hasOwnProperty('change')) {
          obj['change'] = _ApiClient["default"].convertToType(data['change'], 'Number');
        }

        if (data.hasOwnProperty('noVoting')) {
          obj['noVoting'] = _ApiClient["default"].convertToType(data['noVoting'], 'Number');
        }

        if (data.hasOwnProperty('percentage')) {
          obj['percentage'] = _ApiClient["default"].convertToType(data['percentage'], 'Number');
        }

        if (data.hasOwnProperty('share')) {
          obj['share'] = _ApiClient["default"].convertToType(data['share'], 'Number');
        }

        if (data.hasOwnProperty('sharedVoting')) {
          obj['sharedVoting'] = _ApiClient["default"].convertToType(data['sharedVoting'], 'Number');
        }

        if (data.hasOwnProperty('soleVoting')) {
          obj['soleVoting'] = _ApiClient["default"].convertToType(data['soleVoting'], 'Number');
        }

        if (data.hasOwnProperty('value')) {
          obj['value'] = _ApiClient["default"].convertToType(data['value'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return InstitutionalOwnershipInfo;
}();
/**
 * Investor's company CIK.
 * @member {String} cik
 */


InstitutionalOwnershipInfo.prototype['cik'] = undefined;
/**
 * Firm's name.
 * @member {String} name
 */

InstitutionalOwnershipInfo.prototype['name'] = undefined;
/**
 * <code>put</code> or <code>call</code> for options.
 * @member {String} putCall
 */

InstitutionalOwnershipInfo.prototype['putCall'] = undefined;
/**
 * Number of shares change.
 * @member {Number} change
 */

InstitutionalOwnershipInfo.prototype['change'] = undefined;
/**
 * Number of shares with no voting rights.
 * @member {Number} noVoting
 */

InstitutionalOwnershipInfo.prototype['noVoting'] = undefined;
/**
 * Percentage of portfolio.
 * @member {Number} percentage
 */

InstitutionalOwnershipInfo.prototype['percentage'] = undefined;
/**
 * News score.
 * @member {Number} share
 */

InstitutionalOwnershipInfo.prototype['share'] = undefined;
/**
 * Number of shares with shared voting rights.
 * @member {Number} sharedVoting
 */

InstitutionalOwnershipInfo.prototype['sharedVoting'] = undefined;
/**
 * Number of shares with sole voting rights.
 * @member {Number} soleVoting
 */

InstitutionalOwnershipInfo.prototype['soleVoting'] = undefined;
/**
 * Position value.
 * @member {Number} value
 */

InstitutionalOwnershipInfo.prototype['value'] = undefined;
var _default = InstitutionalOwnershipInfo;
exports["default"] = _default;
},{"../ApiClient":10}],84:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _InstitutionalPortfolioGroup = _interopRequireDefault(require("./InstitutionalPortfolioGroup"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The InstitutionalPortfolio model module.
 * @module model/InstitutionalPortfolio
 * @version 1.2.16
 */
var InstitutionalPortfolio = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>InstitutionalPortfolio</code>.
   * @alias module:model/InstitutionalPortfolio
   */
  function InstitutionalPortfolio() {
    _classCallCheck(this, InstitutionalPortfolio);

    InstitutionalPortfolio.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(InstitutionalPortfolio, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>InstitutionalPortfolio</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/InstitutionalPortfolio} obj Optional instance to populate.
     * @return {module:model/InstitutionalPortfolio} The populated <code>InstitutionalPortfolio</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new InstitutionalPortfolio();

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('cik')) {
          obj['cik'] = _ApiClient["default"].convertToType(data['cik'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_InstitutionalPortfolioGroup["default"]]);
        }
      }

      return obj;
    }
  }]);

  return InstitutionalPortfolio;
}();
/**
 * Investor's name.
 * @member {String} name
 */


InstitutionalPortfolio.prototype['name'] = undefined;
/**
 * CIK.
 * @member {String} cik
 */

InstitutionalPortfolio.prototype['cik'] = undefined;
/**
 * Array of positions.
 * @member {Array.<module:model/InstitutionalPortfolioGroup>} data
 */

InstitutionalPortfolio.prototype['data'] = undefined;
var _default = InstitutionalPortfolio;
exports["default"] = _default;
},{"../ApiClient":10,"./InstitutionalPortfolioGroup":85}],85:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _InstitutionalPortfolioInfo = _interopRequireDefault(require("./InstitutionalPortfolioInfo"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The InstitutionalPortfolioGroup model module.
 * @module model/InstitutionalPortfolioGroup
 * @version 1.2.16
 */
var InstitutionalPortfolioGroup = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>InstitutionalPortfolioGroup</code>.
   * @alias module:model/InstitutionalPortfolioGroup
   */
  function InstitutionalPortfolioGroup() {
    _classCallCheck(this, InstitutionalPortfolioGroup);

    InstitutionalPortfolioGroup.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(InstitutionalPortfolioGroup, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>InstitutionalPortfolioGroup</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/InstitutionalPortfolioGroup} obj Optional instance to populate.
     * @return {module:model/InstitutionalPortfolioGroup} The populated <code>InstitutionalPortfolioGroup</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new InstitutionalPortfolioGroup();

        if (data.hasOwnProperty('reportDate')) {
          obj['reportDate'] = _ApiClient["default"].convertToType(data['reportDate'], 'String');
        }

        if (data.hasOwnProperty('filingDate')) {
          obj['filingDate'] = _ApiClient["default"].convertToType(data['filingDate'], 'String');
        }

        if (data.hasOwnProperty('portfolio')) {
          obj['portfolio'] = _ApiClient["default"].convertToType(data['portfolio'], [_InstitutionalPortfolioInfo["default"]]);
        }
      }

      return obj;
    }
  }]);

  return InstitutionalPortfolioGroup;
}();
/**
 * Report date.
 * @member {String} reportDate
 */


InstitutionalPortfolioGroup.prototype['reportDate'] = undefined;
/**
 * Filing date.
 * @member {String} filingDate
 */

InstitutionalPortfolioGroup.prototype['filingDate'] = undefined;
/**
 * Array of positions.
 * @member {Array.<module:model/InstitutionalPortfolioInfo>} portfolio
 */

InstitutionalPortfolioGroup.prototype['portfolio'] = undefined;
var _default = InstitutionalPortfolioGroup;
exports["default"] = _default;
},{"../ApiClient":10,"./InstitutionalPortfolioInfo":86}],86:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The InstitutionalPortfolioInfo model module.
 * @module model/InstitutionalPortfolioInfo
 * @version 1.2.16
 */
var InstitutionalPortfolioInfo = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>InstitutionalPortfolioInfo</code>.
   * @alias module:model/InstitutionalPortfolioInfo
   */
  function InstitutionalPortfolioInfo() {
    _classCallCheck(this, InstitutionalPortfolioInfo);

    InstitutionalPortfolioInfo.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(InstitutionalPortfolioInfo, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>InstitutionalPortfolioInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/InstitutionalPortfolioInfo} obj Optional instance to populate.
     * @return {module:model/InstitutionalPortfolioInfo} The populated <code>InstitutionalPortfolioInfo</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new InstitutionalPortfolioInfo();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('cusip')) {
          obj['cusip'] = _ApiClient["default"].convertToType(data['cusip'], 'String');
        }

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('putCall')) {
          obj['putCall'] = _ApiClient["default"].convertToType(data['putCall'], 'String');
        }

        if (data.hasOwnProperty('change')) {
          obj['change'] = _ApiClient["default"].convertToType(data['change'], 'Number');
        }

        if (data.hasOwnProperty('noVoting')) {
          obj['noVoting'] = _ApiClient["default"].convertToType(data['noVoting'], 'Number');
        }

        if (data.hasOwnProperty('percentage')) {
          obj['percentage'] = _ApiClient["default"].convertToType(data['percentage'], 'Number');
        }

        if (data.hasOwnProperty('share')) {
          obj['share'] = _ApiClient["default"].convertToType(data['share'], 'Number');
        }

        if (data.hasOwnProperty('sharedVoting')) {
          obj['sharedVoting'] = _ApiClient["default"].convertToType(data['sharedVoting'], 'Number');
        }

        if (data.hasOwnProperty('soleVoting')) {
          obj['soleVoting'] = _ApiClient["default"].convertToType(data['soleVoting'], 'Number');
        }

        if (data.hasOwnProperty('value')) {
          obj['value'] = _ApiClient["default"].convertToType(data['value'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return InstitutionalPortfolioInfo;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


InstitutionalPortfolioInfo.prototype['symbol'] = undefined;
/**
 * CUSIP.
 * @member {String} cusip
 */

InstitutionalPortfolioInfo.prototype['cusip'] = undefined;
/**
 * Position's name.
 * @member {String} name
 */

InstitutionalPortfolioInfo.prototype['name'] = undefined;
/**
 * <code>put</code> or <code>call</code> for options.
 * @member {String} putCall
 */

InstitutionalPortfolioInfo.prototype['putCall'] = undefined;
/**
 * Number of shares change.
 * @member {Number} change
 */

InstitutionalPortfolioInfo.prototype['change'] = undefined;
/**
 * Number of shares with no voting rights.
 * @member {Number} noVoting
 */

InstitutionalPortfolioInfo.prototype['noVoting'] = undefined;
/**
 * Percentage of portfolio.
 * @member {Number} percentage
 */

InstitutionalPortfolioInfo.prototype['percentage'] = undefined;
/**
 * Number of shares.
 * @member {Number} share
 */

InstitutionalPortfolioInfo.prototype['share'] = undefined;
/**
 * Number of shares with shared voting rights.
 * @member {Number} sharedVoting
 */

InstitutionalPortfolioInfo.prototype['sharedVoting'] = undefined;
/**
 * Number of shares with sole voting rights.
 * @member {Number} soleVoting
 */

InstitutionalPortfolioInfo.prototype['soleVoting'] = undefined;
/**
 * Position value.
 * @member {Number} value
 */

InstitutionalPortfolioInfo.prototype['value'] = undefined;
var _default = InstitutionalPortfolioInfo;
exports["default"] = _default;
},{"../ApiClient":10}],87:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _InstitutionalProfileInfo = _interopRequireDefault(require("./InstitutionalProfileInfo"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The InstitutionalProfile model module.
 * @module model/InstitutionalProfile
 * @version 1.2.16
 */
var InstitutionalProfile = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>InstitutionalProfile</code>.
   * @alias module:model/InstitutionalProfile
   */
  function InstitutionalProfile() {
    _classCallCheck(this, InstitutionalProfile);

    InstitutionalProfile.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(InstitutionalProfile, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>InstitutionalProfile</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/InstitutionalProfile} obj Optional instance to populate.
     * @return {module:model/InstitutionalProfile} The populated <code>InstitutionalProfile</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new InstitutionalProfile();

        if (data.hasOwnProperty('cik')) {
          obj['cik'] = _ApiClient["default"].convertToType(data['cik'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_InstitutionalProfileInfo["default"]]);
        }
      }

      return obj;
    }
  }]);

  return InstitutionalProfile;
}();
/**
 * CIK.
 * @member {String} cik
 */


InstitutionalProfile.prototype['cik'] = undefined;
/**
 * Array of investors.
 * @member {Array.<module:model/InstitutionalProfileInfo>} data
 */

InstitutionalProfile.prototype['data'] = undefined;
var _default = InstitutionalProfile;
exports["default"] = _default;
},{"../ApiClient":10,"./InstitutionalProfileInfo":88}],88:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The InstitutionalProfileInfo model module.
 * @module model/InstitutionalProfileInfo
 * @version 1.2.16
 */
var InstitutionalProfileInfo = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>InstitutionalProfileInfo</code>.
   * @alias module:model/InstitutionalProfileInfo
   */
  function InstitutionalProfileInfo() {
    _classCallCheck(this, InstitutionalProfileInfo);

    InstitutionalProfileInfo.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(InstitutionalProfileInfo, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>InstitutionalProfileInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/InstitutionalProfileInfo} obj Optional instance to populate.
     * @return {module:model/InstitutionalProfileInfo} The populated <code>InstitutionalProfileInfo</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new InstitutionalProfileInfo();

        if (data.hasOwnProperty('cik')) {
          obj['cik'] = _ApiClient["default"].convertToType(data['cik'], 'String');
        }

        if (data.hasOwnProperty('firmType')) {
          obj['firmType'] = _ApiClient["default"].convertToType(data['firmType'], 'String');
        }

        if (data.hasOwnProperty('manager')) {
          obj['manager'] = _ApiClient["default"].convertToType(data['manager'], 'String');
        }

        if (data.hasOwnProperty('philosophy')) {
          obj['philosophy'] = _ApiClient["default"].convertToType(data['philosophy'], 'String');
        }

        if (data.hasOwnProperty('profile')) {
          obj['profile'] = _ApiClient["default"].convertToType(data['profile'], 'String');
        }

        if (data.hasOwnProperty('profileImg')) {
          obj['profileImg'] = _ApiClient["default"].convertToType(data['profileImg'], 'String');
        }
      }

      return obj;
    }
  }]);

  return InstitutionalProfileInfo;
}();
/**
 * Investor's company CIK.
 * @member {String} cik
 */


InstitutionalProfileInfo.prototype['cik'] = undefined;
/**
 * Firm type.
 * @member {String} firmType
 */

InstitutionalProfileInfo.prototype['firmType'] = undefined;
/**
 * Manager.
 * @member {String} manager
 */

InstitutionalProfileInfo.prototype['manager'] = undefined;
/**
 * Investing philosophy.
 * @member {String} philosophy
 */

InstitutionalProfileInfo.prototype['philosophy'] = undefined;
/**
 * Profile info.
 * @member {String} profile
 */

InstitutionalProfileInfo.prototype['profile'] = undefined;
/**
 * Profile image.
 * @member {String} profileImg
 */

InstitutionalProfileInfo.prototype['profileImg'] = undefined;
var _default = InstitutionalProfileInfo;
exports["default"] = _default;
},{"../ApiClient":10}],89:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The InternationalFiling model module.
 * @module model/InternationalFiling
 * @version 1.2.16
 */
var InternationalFiling = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>InternationalFiling</code>.
   * @alias module:model/InternationalFiling
   */
  function InternationalFiling() {
    _classCallCheck(this, InternationalFiling);

    InternationalFiling.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(InternationalFiling, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>InternationalFiling</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/InternationalFiling} obj Optional instance to populate.
     * @return {module:model/InternationalFiling} The populated <code>InternationalFiling</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new InternationalFiling();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('companyName')) {
          obj['companyName'] = _ApiClient["default"].convertToType(data['companyName'], 'String');
        }

        if (data.hasOwnProperty('filedDate')) {
          obj['filedDate'] = _ApiClient["default"].convertToType(data['filedDate'], 'String');
        }

        if (data.hasOwnProperty('category')) {
          obj['category'] = _ApiClient["default"].convertToType(data['category'], 'String');
        }

        if (data.hasOwnProperty('title')) {
          obj['title'] = _ApiClient["default"].convertToType(data['title'], 'String');
        }

        if (data.hasOwnProperty('description')) {
          obj['description'] = _ApiClient["default"].convertToType(data['description'], 'String');
        }

        if (data.hasOwnProperty('url')) {
          obj['url'] = _ApiClient["default"].convertToType(data['url'], 'String');
        }

        if (data.hasOwnProperty('language')) {
          obj['language'] = _ApiClient["default"].convertToType(data['language'], 'String');
        }

        if (data.hasOwnProperty('country')) {
          obj['country'] = _ApiClient["default"].convertToType(data['country'], 'String');
        }
      }

      return obj;
    }
  }]);

  return InternationalFiling;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


InternationalFiling.prototype['symbol'] = undefined;
/**
 * Company name.
 * @member {String} companyName
 */

InternationalFiling.prototype['companyName'] = undefined;
/**
 * Filed date <code>%Y-%m-%d %H:%M:%S</code>.
 * @member {String} filedDate
 */

InternationalFiling.prototype['filedDate'] = undefined;
/**
 * Category.
 * @member {String} category
 */

InternationalFiling.prototype['category'] = undefined;
/**
 * Document's title.
 * @member {String} title
 */

InternationalFiling.prototype['title'] = undefined;
/**
 * Document's description.
 * @member {String} description
 */

InternationalFiling.prototype['description'] = undefined;
/**
 * Url.
 * @member {String} url
 */

InternationalFiling.prototype['url'] = undefined;
/**
 * Language.
 * @member {String} language
 */

InternationalFiling.prototype['language'] = undefined;
/**
 * Country.
 * @member {String} country
 */

InternationalFiling.prototype['country'] = undefined;
var _default = InternationalFiling;
exports["default"] = _default;
},{"../ApiClient":10}],90:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The InvestmentThemePortfolio model module.
 * @module model/InvestmentThemePortfolio
 * @version 1.2.16
 */
var InvestmentThemePortfolio = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>InvestmentThemePortfolio</code>.
   * @alias module:model/InvestmentThemePortfolio
   */
  function InvestmentThemePortfolio() {
    _classCallCheck(this, InvestmentThemePortfolio);

    InvestmentThemePortfolio.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(InvestmentThemePortfolio, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>InvestmentThemePortfolio</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/InvestmentThemePortfolio} obj Optional instance to populate.
     * @return {module:model/InvestmentThemePortfolio} The populated <code>InvestmentThemePortfolio</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new InvestmentThemePortfolio();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }
      }

      return obj;
    }
  }]);

  return InvestmentThemePortfolio;
}();
/**
 * Symbol
 * @member {String} symbol
 */


InvestmentThemePortfolio.prototype['symbol'] = undefined;
var _default = InvestmentThemePortfolio;
exports["default"] = _default;
},{"../ApiClient":10}],91:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _InvestmentThemePortfolio = _interopRequireDefault(require("./InvestmentThemePortfolio"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The InvestmentThemes model module.
 * @module model/InvestmentThemes
 * @version 1.2.16
 */
var InvestmentThemes = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>InvestmentThemes</code>.
   * @alias module:model/InvestmentThemes
   */
  function InvestmentThemes() {
    _classCallCheck(this, InvestmentThemes);

    InvestmentThemes.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(InvestmentThemes, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>InvestmentThemes</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/InvestmentThemes} obj Optional instance to populate.
     * @return {module:model/InvestmentThemes} The populated <code>InvestmentThemes</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new InvestmentThemes();

        if (data.hasOwnProperty('theme')) {
          obj['theme'] = _ApiClient["default"].convertToType(data['theme'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_InvestmentThemePortfolio["default"]]);
        }
      }

      return obj;
    }
  }]);

  return InvestmentThemes;
}();
/**
 * Investment theme
 * @member {String} theme
 */


InvestmentThemes.prototype['theme'] = undefined;
/**
 * Investment theme portfolio.
 * @member {Array.<module:model/InvestmentThemePortfolio>} data
 */

InvestmentThemes.prototype['data'] = undefined;
var _default = InvestmentThemes;
exports["default"] = _default;
},{"../ApiClient":10,"./InvestmentThemePortfolio":90}],92:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _IsinChangeInfo = _interopRequireDefault(require("./IsinChangeInfo"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The IsinChange model module.
 * @module model/IsinChange
 * @version 1.2.16
 */
var IsinChange = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>IsinChange</code>.
   * @alias module:model/IsinChange
   */
  function IsinChange() {
    _classCallCheck(this, IsinChange);

    IsinChange.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(IsinChange, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>IsinChange</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/IsinChange} obj Optional instance to populate.
     * @return {module:model/IsinChange} The populated <code>IsinChange</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new IsinChange();

        if (data.hasOwnProperty('fromDate')) {
          obj['fromDate'] = _ApiClient["default"].convertToType(data['fromDate'], 'String');
        }

        if (data.hasOwnProperty('toDate')) {
          obj['toDate'] = _ApiClient["default"].convertToType(data['toDate'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_IsinChangeInfo["default"]]);
        }
      }

      return obj;
    }
  }]);

  return IsinChange;
}();
/**
 * From date.
 * @member {String} fromDate
 */


IsinChange.prototype['fromDate'] = undefined;
/**
 * To date.
 * @member {String} toDate
 */

IsinChange.prototype['toDate'] = undefined;
/**
 * Array of ISIN change events.
 * @member {Array.<module:model/IsinChangeInfo>} data
 */

IsinChange.prototype['data'] = undefined;
var _default = IsinChange;
exports["default"] = _default;
},{"../ApiClient":10,"./IsinChangeInfo":93}],93:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The IsinChangeInfo model module.
 * @module model/IsinChangeInfo
 * @version 1.2.16
 */
var IsinChangeInfo = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>IsinChangeInfo</code>.
   * @alias module:model/IsinChangeInfo
   */
  function IsinChangeInfo() {
    _classCallCheck(this, IsinChangeInfo);

    IsinChangeInfo.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(IsinChangeInfo, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>IsinChangeInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/IsinChangeInfo} obj Optional instance to populate.
     * @return {module:model/IsinChangeInfo} The populated <code>IsinChangeInfo</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new IsinChangeInfo();

        if (data.hasOwnProperty('atDate')) {
          obj['atDate'] = _ApiClient["default"].convertToType(data['atDate'], 'String');
        }

        if (data.hasOwnProperty('oldIsin')) {
          obj['oldIsin'] = _ApiClient["default"].convertToType(data['oldIsin'], 'String');
        }

        if (data.hasOwnProperty('newIsin')) {
          obj['newIsin'] = _ApiClient["default"].convertToType(data['newIsin'], 'String');
        }
      }

      return obj;
    }
  }]);

  return IsinChangeInfo;
}();
/**
 * Event's date.
 * @member {String} atDate
 */


IsinChangeInfo.prototype['atDate'] = undefined;
/**
 * Old ISIN.
 * @member {String} oldIsin
 */

IsinChangeInfo.prototype['oldIsin'] = undefined;
/**
 * New ISIN.
 * @member {String} newIsin
 */

IsinChangeInfo.prototype['newIsin'] = undefined;
var _default = IsinChangeInfo;
exports["default"] = _default;
},{"../ApiClient":10}],94:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The KeyCustomersSuppliers model module.
 * @module model/KeyCustomersSuppliers
 * @version 1.2.16
 */
var KeyCustomersSuppliers = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>KeyCustomersSuppliers</code>.
   * @alias module:model/KeyCustomersSuppliers
   */
  function KeyCustomersSuppliers() {
    _classCallCheck(this, KeyCustomersSuppliers);

    KeyCustomersSuppliers.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(KeyCustomersSuppliers, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>KeyCustomersSuppliers</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/KeyCustomersSuppliers} obj Optional instance to populate.
     * @return {module:model/KeyCustomersSuppliers} The populated <code>KeyCustomersSuppliers</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new KeyCustomersSuppliers();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('country')) {
          obj['country'] = _ApiClient["default"].convertToType(data['country'], 'String');
        }

        if (data.hasOwnProperty('industry')) {
          obj['industry'] = _ApiClient["default"].convertToType(data['industry'], 'String');
        }

        if (data.hasOwnProperty('customer')) {
          obj['customer'] = _ApiClient["default"].convertToType(data['customer'], 'Boolean');
        }

        if (data.hasOwnProperty('supplier')) {
          obj['supplier'] = _ApiClient["default"].convertToType(data['supplier'], 'Boolean');
        }

        if (data.hasOwnProperty('oneMonthCorrelation')) {
          obj['oneMonthCorrelation'] = _ApiClient["default"].convertToType(data['oneMonthCorrelation'], 'Number');
        }

        if (data.hasOwnProperty('oneYearCorrelation')) {
          obj['oneYearCorrelation'] = _ApiClient["default"].convertToType(data['oneYearCorrelation'], 'Number');
        }

        if (data.hasOwnProperty('sixMonthCorrelation')) {
          obj['sixMonthCorrelation'] = _ApiClient["default"].convertToType(data['sixMonthCorrelation'], 'Number');
        }

        if (data.hasOwnProperty('threeMonthCorrelation')) {
          obj['threeMonthCorrelation'] = _ApiClient["default"].convertToType(data['threeMonthCorrelation'], 'Number');
        }

        if (data.hasOwnProperty('twoWeekCorrelation')) {
          obj['twoWeekCorrelation'] = _ApiClient["default"].convertToType(data['twoWeekCorrelation'], 'Number');
        }

        if (data.hasOwnProperty('twoYearCorrelation')) {
          obj['twoYearCorrelation'] = _ApiClient["default"].convertToType(data['twoYearCorrelation'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return KeyCustomersSuppliers;
}();
/**
 * Symbol
 * @member {String} symbol
 */


KeyCustomersSuppliers.prototype['symbol'] = undefined;
/**
 * Name
 * @member {String} name
 */

KeyCustomersSuppliers.prototype['name'] = undefined;
/**
 * Country
 * @member {String} country
 */

KeyCustomersSuppliers.prototype['country'] = undefined;
/**
 * Industry
 * @member {String} industry
 */

KeyCustomersSuppliers.prototype['industry'] = undefined;
/**
 * Whether the company is a customer.
 * @member {Boolean} customer
 */

KeyCustomersSuppliers.prototype['customer'] = undefined;
/**
 * Whether the company is a supplier
 * @member {Boolean} supplier
 */

KeyCustomersSuppliers.prototype['supplier'] = undefined;
/**
 * 1-month price correlation
 * @member {Number} oneMonthCorrelation
 */

KeyCustomersSuppliers.prototype['oneMonthCorrelation'] = undefined;
/**
 * 1-year price correlation
 * @member {Number} oneYearCorrelation
 */

KeyCustomersSuppliers.prototype['oneYearCorrelation'] = undefined;
/**
 * 6-month price correlation
 * @member {Number} sixMonthCorrelation
 */

KeyCustomersSuppliers.prototype['sixMonthCorrelation'] = undefined;
/**
 * 3-month price correlation
 * @member {Number} threeMonthCorrelation
 */

KeyCustomersSuppliers.prototype['threeMonthCorrelation'] = undefined;
/**
 * 2-week price correlation
 * @member {Number} twoWeekCorrelation
 */

KeyCustomersSuppliers.prototype['twoWeekCorrelation'] = undefined;
/**
 * 2-year price correlation
 * @member {Number} twoYearCorrelation
 */

KeyCustomersSuppliers.prototype['twoYearCorrelation'] = undefined;
var _default = KeyCustomersSuppliers;
exports["default"] = _default;
},{"../ApiClient":10}],95:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The LastBidAsk model module.
 * @module model/LastBidAsk
 * @version 1.2.16
 */
var LastBidAsk = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>LastBidAsk</code>.
   * @alias module:model/LastBidAsk
   */
  function LastBidAsk() {
    _classCallCheck(this, LastBidAsk);

    LastBidAsk.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(LastBidAsk, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>LastBidAsk</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/LastBidAsk} obj Optional instance to populate.
     * @return {module:model/LastBidAsk} The populated <code>LastBidAsk</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new LastBidAsk();

        if (data.hasOwnProperty('b')) {
          obj['b'] = _ApiClient["default"].convertToType(data['b'], 'Number');
        }

        if (data.hasOwnProperty('a')) {
          obj['a'] = _ApiClient["default"].convertToType(data['a'], 'Number');
        }

        if (data.hasOwnProperty('bv')) {
          obj['bv'] = _ApiClient["default"].convertToType(data['bv'], 'Number');
        }

        if (data.hasOwnProperty('av')) {
          obj['av'] = _ApiClient["default"].convertToType(data['av'], 'Number');
        }

        if (data.hasOwnProperty('t')) {
          obj['t'] = _ApiClient["default"].convertToType(data['t'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return LastBidAsk;
}();
/**
 * Bid price.
 * @member {Number} b
 */


LastBidAsk.prototype['b'] = undefined;
/**
 * Ask price.
 * @member {Number} a
 */

LastBidAsk.prototype['a'] = undefined;
/**
 * Bid volume.
 * @member {Number} bv
 */

LastBidAsk.prototype['bv'] = undefined;
/**
 * Ask volume.
 * @member {Number} av
 */

LastBidAsk.prototype['av'] = undefined;
/**
 * Reference UNIX timestamp in ms.
 * @member {Number} t
 */

LastBidAsk.prototype['t'] = undefined;
var _default = LastBidAsk;
exports["default"] = _default;
},{"../ApiClient":10}],96:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The LobbyingData model module.
 * @module model/LobbyingData
 * @version 1.2.16
 */
var LobbyingData = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>LobbyingData</code>.
   * @alias module:model/LobbyingData
   */
  function LobbyingData() {
    _classCallCheck(this, LobbyingData);

    LobbyingData.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(LobbyingData, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>LobbyingData</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/LobbyingData} obj Optional instance to populate.
     * @return {module:model/LobbyingData} The populated <code>LobbyingData</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new LobbyingData();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('description')) {
          obj['description'] = _ApiClient["default"].convertToType(data['description'], 'String');
        }

        if (data.hasOwnProperty('country')) {
          obj['country'] = _ApiClient["default"].convertToType(data['country'], 'String');
        }

        if (data.hasOwnProperty('year')) {
          obj['year'] = _ApiClient["default"].convertToType(data['year'], 'Number');
        }

        if (data.hasOwnProperty('period')) {
          obj['period'] = _ApiClient["default"].convertToType(data['period'], 'String');
        }

        if (data.hasOwnProperty('income')) {
          obj['income'] = _ApiClient["default"].convertToType(data['income'], 'Number');
        }

        if (data.hasOwnProperty('expenses')) {
          obj['expenses'] = _ApiClient["default"].convertToType(data['expenses'], 'Number');
        }

        if (data.hasOwnProperty('documentUrl')) {
          obj['documentUrl'] = _ApiClient["default"].convertToType(data['documentUrl'], 'String');
        }

        if (data.hasOwnProperty('postedName')) {
          obj['postedName'] = _ApiClient["default"].convertToType(data['postedName'], 'String');
        }

        if (data.hasOwnProperty('date')) {
          obj['date'] = _ApiClient["default"].convertToType(data['date'], 'String');
        }

        if (data.hasOwnProperty('clientId')) {
          obj['clientId'] = _ApiClient["default"].convertToType(data['clientId'], 'String');
        }

        if (data.hasOwnProperty('registrantId')) {
          obj['registrantId'] = _ApiClient["default"].convertToType(data['registrantId'], 'String');
        }

        if (data.hasOwnProperty('senateId')) {
          obj['senateId'] = _ApiClient["default"].convertToType(data['senateId'], 'String');
        }

        if (data.hasOwnProperty('houseregistrantId')) {
          obj['houseregistrantId'] = _ApiClient["default"].convertToType(data['houseregistrantId'], 'String');
        }
      }

      return obj;
    }
  }]);

  return LobbyingData;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


LobbyingData.prototype['symbol'] = undefined;
/**
 * Company's name.
 * @member {String} name
 */

LobbyingData.prototype['name'] = undefined;
/**
 * Description.
 * @member {String} description
 */

LobbyingData.prototype['description'] = undefined;
/**
 * Country.
 * @member {String} country
 */

LobbyingData.prototype['country'] = undefined;
/**
 * Year.
 * @member {Number} year
 */

LobbyingData.prototype['year'] = undefined;
/**
 * Period.
 * @member {String} period
 */

LobbyingData.prototype['period'] = undefined;
/**
 * Income reported by lobbying firms.
 * @member {Number} income
 */

LobbyingData.prototype['income'] = undefined;
/**
 * Expenses reported by the company.
 * @member {Number} expenses
 */

LobbyingData.prototype['expenses'] = undefined;
/**
 * Document's URL.
 * @member {String} documentUrl
 */

LobbyingData.prototype['documentUrl'] = undefined;
/**
 * Posted name.
 * @member {String} postedName
 */

LobbyingData.prototype['postedName'] = undefined;
/**
 * Date.
 * @member {String} date
 */

LobbyingData.prototype['date'] = undefined;
/**
 * Client ID.
 * @member {String} clientId
 */

LobbyingData.prototype['clientId'] = undefined;
/**
 * Registrant ID.
 * @member {String} registrantId
 */

LobbyingData.prototype['registrantId'] = undefined;
/**
 * Senate ID.
 * @member {String} senateId
 */

LobbyingData.prototype['senateId'] = undefined;
/**
 * House registrant ID.
 * @member {String} houseregistrantId
 */

LobbyingData.prototype['houseregistrantId'] = undefined;
var _default = LobbyingData;
exports["default"] = _default;
},{"../ApiClient":10}],97:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _LobbyingData = _interopRequireDefault(require("./LobbyingData"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The LobbyingResult model module.
 * @module model/LobbyingResult
 * @version 1.2.16
 */
var LobbyingResult = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>LobbyingResult</code>.
   * @alias module:model/LobbyingResult
   */
  function LobbyingResult() {
    _classCallCheck(this, LobbyingResult);

    LobbyingResult.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(LobbyingResult, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>LobbyingResult</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/LobbyingResult} obj Optional instance to populate.
     * @return {module:model/LobbyingResult} The populated <code>LobbyingResult</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new LobbyingResult();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_LobbyingData["default"]]);
        }
      }

      return obj;
    }
  }]);

  return LobbyingResult;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


LobbyingResult.prototype['symbol'] = undefined;
/**
 * Array of lobbying activities.
 * @member {Array.<module:model/LobbyingData>} data
 */

LobbyingResult.prototype['data'] = undefined;
var _default = LobbyingResult;
exports["default"] = _default;
},{"../ApiClient":10,"./LobbyingData":96}],98:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The MarketNews model module.
 * @module model/MarketNews
 * @version 1.2.16
 */
var MarketNews = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>MarketNews</code>.
   * @alias module:model/MarketNews
   */
  function MarketNews() {
    _classCallCheck(this, MarketNews);

    MarketNews.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(MarketNews, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>MarketNews</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/MarketNews} obj Optional instance to populate.
     * @return {module:model/MarketNews} The populated <code>MarketNews</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new MarketNews();

        if (data.hasOwnProperty('category')) {
          obj['category'] = _ApiClient["default"].convertToType(data['category'], 'String');
        }

        if (data.hasOwnProperty('datetime')) {
          obj['datetime'] = _ApiClient["default"].convertToType(data['datetime'], 'Number');
        }

        if (data.hasOwnProperty('headline')) {
          obj['headline'] = _ApiClient["default"].convertToType(data['headline'], 'String');
        }

        if (data.hasOwnProperty('id')) {
          obj['id'] = _ApiClient["default"].convertToType(data['id'], 'Number');
        }

        if (data.hasOwnProperty('image')) {
          obj['image'] = _ApiClient["default"].convertToType(data['image'], 'String');
        }

        if (data.hasOwnProperty('related')) {
          obj['related'] = _ApiClient["default"].convertToType(data['related'], 'String');
        }

        if (data.hasOwnProperty('source')) {
          obj['source'] = _ApiClient["default"].convertToType(data['source'], 'String');
        }

        if (data.hasOwnProperty('summary')) {
          obj['summary'] = _ApiClient["default"].convertToType(data['summary'], 'String');
        }

        if (data.hasOwnProperty('url')) {
          obj['url'] = _ApiClient["default"].convertToType(data['url'], 'String');
        }
      }

      return obj;
    }
  }]);

  return MarketNews;
}();
/**
 * News category.
 * @member {String} category
 */


MarketNews.prototype['category'] = undefined;
/**
 * Published time in UNIX timestamp.
 * @member {Number} datetime
 */

MarketNews.prototype['datetime'] = undefined;
/**
 * News headline.
 * @member {String} headline
 */

MarketNews.prototype['headline'] = undefined;
/**
 * News ID. This value can be used for <code>minId</code> params to get the latest news only.
 * @member {Number} id
 */

MarketNews.prototype['id'] = undefined;
/**
 * Thumbnail image URL.
 * @member {String} image
 */

MarketNews.prototype['image'] = undefined;
/**
 * Related stocks and companies mentioned in the article.
 * @member {String} related
 */

MarketNews.prototype['related'] = undefined;
/**
 * News source.
 * @member {String} source
 */

MarketNews.prototype['source'] = undefined;
/**
 * News summary.
 * @member {String} summary
 */

MarketNews.prototype['summary'] = undefined;
/**
 * URL of the original article.
 * @member {String} url
 */

MarketNews.prototype['url'] = undefined;
var _default = MarketNews;
exports["default"] = _default;
},{"../ApiClient":10}],99:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _MutualFundCountryExposureData = _interopRequireDefault(require("./MutualFundCountryExposureData"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The MutualFundCountryExposure model module.
 * @module model/MutualFundCountryExposure
 * @version 1.2.16
 */
var MutualFundCountryExposure = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>MutualFundCountryExposure</code>.
   * @alias module:model/MutualFundCountryExposure
   */
  function MutualFundCountryExposure() {
    _classCallCheck(this, MutualFundCountryExposure);

    MutualFundCountryExposure.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(MutualFundCountryExposure, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>MutualFundCountryExposure</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/MutualFundCountryExposure} obj Optional instance to populate.
     * @return {module:model/MutualFundCountryExposure} The populated <code>MutualFundCountryExposure</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new MutualFundCountryExposure();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('countryExposure')) {
          obj['countryExposure'] = _ApiClient["default"].convertToType(data['countryExposure'], [_MutualFundCountryExposureData["default"]]);
        }
      }

      return obj;
    }
  }]);

  return MutualFundCountryExposure;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


MutualFundCountryExposure.prototype['symbol'] = undefined;
/**
 * Array of countries and and exposure levels.
 * @member {Array.<module:model/MutualFundCountryExposureData>} countryExposure
 */

MutualFundCountryExposure.prototype['countryExposure'] = undefined;
var _default = MutualFundCountryExposure;
exports["default"] = _default;
},{"../ApiClient":10,"./MutualFundCountryExposureData":100}],100:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The MutualFundCountryExposureData model module.
 * @module model/MutualFundCountryExposureData
 * @version 1.2.16
 */
var MutualFundCountryExposureData = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>MutualFundCountryExposureData</code>.
   * @alias module:model/MutualFundCountryExposureData
   */
  function MutualFundCountryExposureData() {
    _classCallCheck(this, MutualFundCountryExposureData);

    MutualFundCountryExposureData.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(MutualFundCountryExposureData, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>MutualFundCountryExposureData</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/MutualFundCountryExposureData} obj Optional instance to populate.
     * @return {module:model/MutualFundCountryExposureData} The populated <code>MutualFundCountryExposureData</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new MutualFundCountryExposureData();

        if (data.hasOwnProperty('country')) {
          obj['country'] = _ApiClient["default"].convertToType(data['country'], 'String');
        }

        if (data.hasOwnProperty('exposure')) {
          obj['exposure'] = _ApiClient["default"].convertToType(data['exposure'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return MutualFundCountryExposureData;
}();
/**
 * Country
 * @member {String} country
 */


MutualFundCountryExposureData.prototype['country'] = undefined;
/**
 * Percent of exposure.
 * @member {Number} exposure
 */

MutualFundCountryExposureData.prototype['exposure'] = undefined;
var _default = MutualFundCountryExposureData;
exports["default"] = _default;
},{"../ApiClient":10}],101:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _MutualFundHoldingsData = _interopRequireDefault(require("./MutualFundHoldingsData"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The MutualFundHoldings model module.
 * @module model/MutualFundHoldings
 * @version 1.2.16
 */
var MutualFundHoldings = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>MutualFundHoldings</code>.
   * @alias module:model/MutualFundHoldings
   */
  function MutualFundHoldings() {
    _classCallCheck(this, MutualFundHoldings);

    MutualFundHoldings.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(MutualFundHoldings, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>MutualFundHoldings</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/MutualFundHoldings} obj Optional instance to populate.
     * @return {module:model/MutualFundHoldings} The populated <code>MutualFundHoldings</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new MutualFundHoldings();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('atDate')) {
          obj['atDate'] = _ApiClient["default"].convertToType(data['atDate'], 'Date');
        }

        if (data.hasOwnProperty('numberOfHoldings')) {
          obj['numberOfHoldings'] = _ApiClient["default"].convertToType(data['numberOfHoldings'], 'Number');
        }

        if (data.hasOwnProperty('holdings')) {
          obj['holdings'] = _ApiClient["default"].convertToType(data['holdings'], [_MutualFundHoldingsData["default"]]);
        }
      }

      return obj;
    }
  }]);

  return MutualFundHoldings;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


MutualFundHoldings.prototype['symbol'] = undefined;
/**
 * Holdings update date.
 * @member {Date} atDate
 */

MutualFundHoldings.prototype['atDate'] = undefined;
/**
 * Number of holdings.
 * @member {Number} numberOfHoldings
 */

MutualFundHoldings.prototype['numberOfHoldings'] = undefined;
/**
 * Array of holdings.
 * @member {Array.<module:model/MutualFundHoldingsData>} holdings
 */

MutualFundHoldings.prototype['holdings'] = undefined;
var _default = MutualFundHoldings;
exports["default"] = _default;
},{"../ApiClient":10,"./MutualFundHoldingsData":102}],102:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The MutualFundHoldingsData model module.
 * @module model/MutualFundHoldingsData
 * @version 1.2.16
 */
var MutualFundHoldingsData = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>MutualFundHoldingsData</code>.
   * @alias module:model/MutualFundHoldingsData
   */
  function MutualFundHoldingsData() {
    _classCallCheck(this, MutualFundHoldingsData);

    MutualFundHoldingsData.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(MutualFundHoldingsData, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>MutualFundHoldingsData</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/MutualFundHoldingsData} obj Optional instance to populate.
     * @return {module:model/MutualFundHoldingsData} The populated <code>MutualFundHoldingsData</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new MutualFundHoldingsData();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('isin')) {
          obj['isin'] = _ApiClient["default"].convertToType(data['isin'], 'String');
        }

        if (data.hasOwnProperty('cusip')) {
          obj['cusip'] = _ApiClient["default"].convertToType(data['cusip'], 'String');
        }

        if (data.hasOwnProperty('share')) {
          obj['share'] = _ApiClient["default"].convertToType(data['share'], 'Number');
        }

        if (data.hasOwnProperty('percent')) {
          obj['percent'] = _ApiClient["default"].convertToType(data['percent'], 'Number');
        }

        if (data.hasOwnProperty('value')) {
          obj['value'] = _ApiClient["default"].convertToType(data['value'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return MutualFundHoldingsData;
}();
/**
 * Symbol description
 * @member {String} symbol
 */


MutualFundHoldingsData.prototype['symbol'] = undefined;
/**
 * Security name
 * @member {String} name
 */

MutualFundHoldingsData.prototype['name'] = undefined;
/**
 * ISIN.
 * @member {String} isin
 */

MutualFundHoldingsData.prototype['isin'] = undefined;
/**
 * CUSIP.
 * @member {String} cusip
 */

MutualFundHoldingsData.prototype['cusip'] = undefined;
/**
 * Number of shares.
 * @member {Number} share
 */

MutualFundHoldingsData.prototype['share'] = undefined;
/**
 * Portfolio's percent
 * @member {Number} percent
 */

MutualFundHoldingsData.prototype['percent'] = undefined;
/**
 * Market value
 * @member {Number} value
 */

MutualFundHoldingsData.prototype['value'] = undefined;
var _default = MutualFundHoldingsData;
exports["default"] = _default;
},{"../ApiClient":10}],103:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _MutualFundProfileData = _interopRequireDefault(require("./MutualFundProfileData"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The MutualFundProfile model module.
 * @module model/MutualFundProfile
 * @version 1.2.16
 */
var MutualFundProfile = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>MutualFundProfile</code>.
   * @alias module:model/MutualFundProfile
   */
  function MutualFundProfile() {
    _classCallCheck(this, MutualFundProfile);

    MutualFundProfile.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(MutualFundProfile, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>MutualFundProfile</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/MutualFundProfile} obj Optional instance to populate.
     * @return {module:model/MutualFundProfile} The populated <code>MutualFundProfile</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new MutualFundProfile();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('profile')) {
          obj['profile'] = _MutualFundProfileData["default"].constructFromObject(data['profile']);
        }
      }

      return obj;
    }
  }]);

  return MutualFundProfile;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


MutualFundProfile.prototype['symbol'] = undefined;
/**
 * @member {module:model/MutualFundProfileData} profile
 */

MutualFundProfile.prototype['profile'] = undefined;
var _default = MutualFundProfile;
exports["default"] = _default;
},{"../ApiClient":10,"./MutualFundProfileData":104}],104:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The MutualFundProfileData model module.
 * @module model/MutualFundProfileData
 * @version 1.2.16
 */
var MutualFundProfileData = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>MutualFundProfileData</code>.
   * @alias module:model/MutualFundProfileData
   */
  function MutualFundProfileData() {
    _classCallCheck(this, MutualFundProfileData);

    MutualFundProfileData.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(MutualFundProfileData, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>MutualFundProfileData</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/MutualFundProfileData} obj Optional instance to populate.
     * @return {module:model/MutualFundProfileData} The populated <code>MutualFundProfileData</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new MutualFundProfileData();

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('category')) {
          obj['category'] = _ApiClient["default"].convertToType(data['category'], 'String');
        }

        if (data.hasOwnProperty('investmentSegment')) {
          obj['investmentSegment'] = _ApiClient["default"].convertToType(data['investmentSegment'], 'String');
        }

        if (data.hasOwnProperty('totalNav')) {
          obj['totalNav'] = _ApiClient["default"].convertToType(data['totalNav'], 'Number');
        }

        if (data.hasOwnProperty('expenseRatio')) {
          obj['expenseRatio'] = _ApiClient["default"].convertToType(data['expenseRatio'], 'Number');
        }

        if (data.hasOwnProperty('benchmark')) {
          obj['benchmark'] = _ApiClient["default"].convertToType(data['benchmark'], 'String');
        }

        if (data.hasOwnProperty('inceptionDate')) {
          obj['inceptionDate'] = _ApiClient["default"].convertToType(data['inceptionDate'], 'Date');
        }

        if (data.hasOwnProperty('description')) {
          obj['description'] = _ApiClient["default"].convertToType(data['description'], 'String');
        }

        if (data.hasOwnProperty('fundFamily')) {
          obj['fundFamily'] = _ApiClient["default"].convertToType(data['fundFamily'], 'String');
        }

        if (data.hasOwnProperty('manager')) {
          obj['manager'] = _ApiClient["default"].convertToType(data['manager'], 'String');
        }

        if (data.hasOwnProperty('status')) {
          obj['status'] = _ApiClient["default"].convertToType(data['status'], 'String');
        }

        if (data.hasOwnProperty('beta')) {
          obj['beta'] = _ApiClient["default"].convertToType(data['beta'], 'Number');
        }

        if (data.hasOwnProperty('deferredLoad')) {
          obj['deferredLoad'] = _ApiClient["default"].convertToType(data['deferredLoad'], 'Number');
        }

        if (data.hasOwnProperty('fee12b1')) {
          obj['fee12b1'] = _ApiClient["default"].convertToType(data['fee12b1'], 'Number');
        }

        if (data.hasOwnProperty('frontLoad')) {
          obj['frontLoad'] = _ApiClient["default"].convertToType(data['frontLoad'], 'Number');
        }

        if (data.hasOwnProperty('iraMinInvestment')) {
          obj['iraMinInvestment'] = _ApiClient["default"].convertToType(data['iraMinInvestment'], 'Number');
        }

        if (data.hasOwnProperty('isin')) {
          obj['isin'] = _ApiClient["default"].convertToType(data['isin'], 'String');
        }

        if (data.hasOwnProperty('cusip')) {
          obj['cusip'] = _ApiClient["default"].convertToType(data['cusip'], 'String');
        }

        if (data.hasOwnProperty('maxRedemptionFee')) {
          obj['maxRedemptionFee'] = _ApiClient["default"].convertToType(data['maxRedemptionFee'], 'Number');
        }

        if (data.hasOwnProperty('standardMinInvestment')) {
          obj['standardMinInvestment'] = _ApiClient["default"].convertToType(data['standardMinInvestment'], 'Number');
        }

        if (data.hasOwnProperty('turnover')) {
          obj['turnover'] = _ApiClient["default"].convertToType(data['turnover'], 'Number');
        }

        if (data.hasOwnProperty('seriesId')) {
          obj['seriesId'] = _ApiClient["default"].convertToType(data['seriesId'], 'String');
        }

        if (data.hasOwnProperty('seriesName')) {
          obj['seriesName'] = _ApiClient["default"].convertToType(data['seriesName'], 'String');
        }

        if (data.hasOwnProperty('classId')) {
          obj['classId'] = _ApiClient["default"].convertToType(data['classId'], 'String');
        }

        if (data.hasOwnProperty('className')) {
          obj['className'] = _ApiClient["default"].convertToType(data['className'], 'String');
        }

        if (data.hasOwnProperty('sfdrClassification')) {
          obj['sfdrClassification'] = _ApiClient["default"].convertToType(data['sfdrClassification'], 'String');
        }

        if (data.hasOwnProperty('currency')) {
          obj['currency'] = _ApiClient["default"].convertToType(data['currency'], 'String');
        }
      }

      return obj;
    }
  }]);

  return MutualFundProfileData;
}();
/**
 * Name
 * @member {String} name
 */


MutualFundProfileData.prototype['name'] = undefined;
/**
 * Fund's category.
 * @member {String} category
 */

MutualFundProfileData.prototype['category'] = undefined;
/**
 * Investment Segment.
 * @member {String} investmentSegment
 */

MutualFundProfileData.prototype['investmentSegment'] = undefined;
/**
 * NAV.
 * @member {Number} totalNav
 */

MutualFundProfileData.prototype['totalNav'] = undefined;
/**
 * Expense ratio.
 * @member {Number} expenseRatio
 */

MutualFundProfileData.prototype['expenseRatio'] = undefined;
/**
 * Index benchmark.
 * @member {String} benchmark
 */

MutualFundProfileData.prototype['benchmark'] = undefined;
/**
 * Inception date.
 * @member {Date} inceptionDate
 */

MutualFundProfileData.prototype['inceptionDate'] = undefined;
/**
 * Fund's description.
 * @member {String} description
 */

MutualFundProfileData.prototype['description'] = undefined;
/**
 * Fund Family.
 * @member {String} fundFamily
 */

MutualFundProfileData.prototype['fundFamily'] = undefined;
/**
 * Fund's managers.
 * @member {String} manager
 */

MutualFundProfileData.prototype['manager'] = undefined;
/**
 * Status.
 * @member {String} status
 */

MutualFundProfileData.prototype['status'] = undefined;
/**
 * Beta.
 * @member {Number} beta
 */

MutualFundProfileData.prototype['beta'] = undefined;
/**
 * Deferred load.
 * @member {Number} deferredLoad
 */

MutualFundProfileData.prototype['deferredLoad'] = undefined;
/**
 * 12B-1 fee.
 * @member {Number} fee12b1
 */

MutualFundProfileData.prototype['fee12b1'] = undefined;
/**
 * Front Load.
 * @member {Number} frontLoad
 */

MutualFundProfileData.prototype['frontLoad'] = undefined;
/**
 * IRA minimum investment.
 * @member {Number} iraMinInvestment
 */

MutualFundProfileData.prototype['iraMinInvestment'] = undefined;
/**
 * ISIN.
 * @member {String} isin
 */

MutualFundProfileData.prototype['isin'] = undefined;
/**
 * CUSIP.
 * @member {String} cusip
 */

MutualFundProfileData.prototype['cusip'] = undefined;
/**
 * Max redemption fee.
 * @member {Number} maxRedemptionFee
 */

MutualFundProfileData.prototype['maxRedemptionFee'] = undefined;
/**
 * Minimum investment for standard accounts.
 * @member {Number} standardMinInvestment
 */

MutualFundProfileData.prototype['standardMinInvestment'] = undefined;
/**
 * Turnover.
 * @member {Number} turnover
 */

MutualFundProfileData.prototype['turnover'] = undefined;
/**
 * Fund's series ID. This field can be used to group multiple share classes into 1 unique fund.
 * @member {String} seriesId
 */

MutualFundProfileData.prototype['seriesId'] = undefined;
/**
 * Fund's series name.
 * @member {String} seriesName
 */

MutualFundProfileData.prototype['seriesName'] = undefined;
/**
 * Class ID.
 * @member {String} classId
 */

MutualFundProfileData.prototype['classId'] = undefined;
/**
 * Class name.
 * @member {String} className
 */

MutualFundProfileData.prototype['className'] = undefined;
/**
 * SFDR classification for EU funds. Under the new classifications, a fund's strategy will labeled under either Article 6, 8 or 9. Article 6 covers funds which do not integrate any kind of sustainability into the investment process. Article 8, also known as ‘environmental and socially promoting’, applies “… where a financial product promotes, among other characteristics, environmental or social characteristics, or a combination of those characteristics, provided that the companies in which the investments are made follow good governance practices.”. Article 9, also known as ‘products targeting sustainable investments’, covers products targeting bespoke sustainable investments and applies “… where a financial product has sustainable investment as its objective and an index has been designated as a reference benchmark.”
 * @member {String} sfdrClassification
 */

MutualFundProfileData.prototype['sfdrClassification'] = undefined;
/**
 * Fund's currency
 * @member {String} currency
 */

MutualFundProfileData.prototype['currency'] = undefined;
var _default = MutualFundProfileData;
exports["default"] = _default;
},{"../ApiClient":10}],105:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _MutualFundSectorExposureData = _interopRequireDefault(require("./MutualFundSectorExposureData"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The MutualFundSectorExposure model module.
 * @module model/MutualFundSectorExposure
 * @version 1.2.16
 */
var MutualFundSectorExposure = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>MutualFundSectorExposure</code>.
   * @alias module:model/MutualFundSectorExposure
   */
  function MutualFundSectorExposure() {
    _classCallCheck(this, MutualFundSectorExposure);

    MutualFundSectorExposure.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(MutualFundSectorExposure, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>MutualFundSectorExposure</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/MutualFundSectorExposure} obj Optional instance to populate.
     * @return {module:model/MutualFundSectorExposure} The populated <code>MutualFundSectorExposure</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new MutualFundSectorExposure();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('sectorExposure')) {
          obj['sectorExposure'] = _ApiClient["default"].convertToType(data['sectorExposure'], [_MutualFundSectorExposureData["default"]]);
        }
      }

      return obj;
    }
  }]);

  return MutualFundSectorExposure;
}();
/**
 * Mutual symbol.
 * @member {String} symbol
 */


MutualFundSectorExposure.prototype['symbol'] = undefined;
/**
 * Array of sector and exposure levels.
 * @member {Array.<module:model/MutualFundSectorExposureData>} sectorExposure
 */

MutualFundSectorExposure.prototype['sectorExposure'] = undefined;
var _default = MutualFundSectorExposure;
exports["default"] = _default;
},{"../ApiClient":10,"./MutualFundSectorExposureData":106}],106:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The MutualFundSectorExposureData model module.
 * @module model/MutualFundSectorExposureData
 * @version 1.2.16
 */
var MutualFundSectorExposureData = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>MutualFundSectorExposureData</code>.
   * @alias module:model/MutualFundSectorExposureData
   */
  function MutualFundSectorExposureData() {
    _classCallCheck(this, MutualFundSectorExposureData);

    MutualFundSectorExposureData.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(MutualFundSectorExposureData, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>MutualFundSectorExposureData</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/MutualFundSectorExposureData} obj Optional instance to populate.
     * @return {module:model/MutualFundSectorExposureData} The populated <code>MutualFundSectorExposureData</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new MutualFundSectorExposureData();

        if (data.hasOwnProperty('sector')) {
          obj['sector'] = _ApiClient["default"].convertToType(data['sector'], 'String');
        }

        if (data.hasOwnProperty('exposure')) {
          obj['exposure'] = _ApiClient["default"].convertToType(data['exposure'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return MutualFundSectorExposureData;
}();
/**
 * Sector
 * @member {String} sector
 */


MutualFundSectorExposureData.prototype['sector'] = undefined;
/**
 * Percent of exposure.
 * @member {Number} exposure
 */

MutualFundSectorExposureData.prototype['exposure'] = undefined;
var _default = MutualFundSectorExposureData;
exports["default"] = _default;
},{"../ApiClient":10}],107:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _CompanyNewsStatistics = _interopRequireDefault(require("./CompanyNewsStatistics"));

var _Sentiment = _interopRequireDefault(require("./Sentiment"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The NewsSentiment model module.
 * @module model/NewsSentiment
 * @version 1.2.16
 */
var NewsSentiment = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>NewsSentiment</code>.
   * @alias module:model/NewsSentiment
   */
  function NewsSentiment() {
    _classCallCheck(this, NewsSentiment);

    NewsSentiment.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(NewsSentiment, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>NewsSentiment</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/NewsSentiment} obj Optional instance to populate.
     * @return {module:model/NewsSentiment} The populated <code>NewsSentiment</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new NewsSentiment();

        if (data.hasOwnProperty('buzz')) {
          obj['buzz'] = _CompanyNewsStatistics["default"].constructFromObject(data['buzz']);
        }

        if (data.hasOwnProperty('companyNewsScore')) {
          obj['companyNewsScore'] = _ApiClient["default"].convertToType(data['companyNewsScore'], 'Number');
        }

        if (data.hasOwnProperty('sectorAverageBullishPercent')) {
          obj['sectorAverageBullishPercent'] = _ApiClient["default"].convertToType(data['sectorAverageBullishPercent'], 'Number');
        }

        if (data.hasOwnProperty('sectorAverageNewsScore')) {
          obj['sectorAverageNewsScore'] = _ApiClient["default"].convertToType(data['sectorAverageNewsScore'], 'Number');
        }

        if (data.hasOwnProperty('sentiment')) {
          obj['sentiment'] = _Sentiment["default"].constructFromObject(data['sentiment']);
        }

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }
      }

      return obj;
    }
  }]);

  return NewsSentiment;
}();
/**
 * @member {module:model/CompanyNewsStatistics} buzz
 */


NewsSentiment.prototype['buzz'] = undefined;
/**
 * News score.
 * @member {Number} companyNewsScore
 */

NewsSentiment.prototype['companyNewsScore'] = undefined;
/**
 * Sector average bullish percent.
 * @member {Number} sectorAverageBullishPercent
 */

NewsSentiment.prototype['sectorAverageBullishPercent'] = undefined;
/**
 * Sectore average score.
 * @member {Number} sectorAverageNewsScore
 */

NewsSentiment.prototype['sectorAverageNewsScore'] = undefined;
/**
 * @member {module:model/Sentiment} sentiment
 */

NewsSentiment.prototype['sentiment'] = undefined;
/**
 * Requested symbol.
 * @member {String} symbol
 */

NewsSentiment.prototype['symbol'] = undefined;
var _default = NewsSentiment;
exports["default"] = _default;
},{"../ApiClient":10,"./CompanyNewsStatistics":25,"./Sentiment":124}],108:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _OwnershipInfo = _interopRequireDefault(require("./OwnershipInfo"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The Ownership model module.
 * @module model/Ownership
 * @version 1.2.16
 */
var Ownership = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>Ownership</code>.
   * @alias module:model/Ownership
   */
  function Ownership() {
    _classCallCheck(this, Ownership);

    Ownership.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(Ownership, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>Ownership</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Ownership} obj Optional instance to populate.
     * @return {module:model/Ownership} The populated <code>Ownership</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new Ownership();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('ownership')) {
          obj['ownership'] = _ApiClient["default"].convertToType(data['ownership'], [_OwnershipInfo["default"]]);
        }
      }

      return obj;
    }
  }]);

  return Ownership;
}();
/**
 * Symbol of the company.
 * @member {String} symbol
 */


Ownership.prototype['symbol'] = undefined;
/**
 * Array of investors with detailed information about their holdings.
 * @member {Array.<module:model/OwnershipInfo>} ownership
 */

Ownership.prototype['ownership'] = undefined;
var _default = Ownership;
exports["default"] = _default;
},{"../ApiClient":10,"./OwnershipInfo":109}],109:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The OwnershipInfo model module.
 * @module model/OwnershipInfo
 * @version 1.2.16
 */
var OwnershipInfo = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>OwnershipInfo</code>.
   * @alias module:model/OwnershipInfo
   */
  function OwnershipInfo() {
    _classCallCheck(this, OwnershipInfo);

    OwnershipInfo.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(OwnershipInfo, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>OwnershipInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/OwnershipInfo} obj Optional instance to populate.
     * @return {module:model/OwnershipInfo} The populated <code>OwnershipInfo</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new OwnershipInfo();

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('share')) {
          obj['share'] = _ApiClient["default"].convertToType(data['share'], 'Number');
        }

        if (data.hasOwnProperty('change')) {
          obj['change'] = _ApiClient["default"].convertToType(data['change'], 'Number');
        }

        if (data.hasOwnProperty('filingDate')) {
          obj['filingDate'] = _ApiClient["default"].convertToType(data['filingDate'], 'Date');
        }
      }

      return obj;
    }
  }]);

  return OwnershipInfo;
}();
/**
 * Investor's name.
 * @member {String} name
 */


OwnershipInfo.prototype['name'] = undefined;
/**
 * Number of shares held by the investor.
 * @member {Number} share
 */

OwnershipInfo.prototype['share'] = undefined;
/**
 * Number of share changed (net buy or sell) from the last period.
 * @member {Number} change
 */

OwnershipInfo.prototype['change'] = undefined;
/**
 * Filing date.
 * @member {Date} filingDate
 */

OwnershipInfo.prototype['filingDate'] = undefined;
var _default = OwnershipInfo;
exports["default"] = _default;
},{"../ApiClient":10}],110:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The PatternRecognition model module.
 * @module model/PatternRecognition
 * @version 1.2.16
 */
var PatternRecognition = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>PatternRecognition</code>.
   * @alias module:model/PatternRecognition
   */
  function PatternRecognition() {
    _classCallCheck(this, PatternRecognition);

    PatternRecognition.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(PatternRecognition, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>PatternRecognition</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/PatternRecognition} obj Optional instance to populate.
     * @return {module:model/PatternRecognition} The populated <code>PatternRecognition</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new PatternRecognition();

        if (data.hasOwnProperty('points')) {
          obj['points'] = _ApiClient["default"].convertToType(data['points'], [Object]);
        }
      }

      return obj;
    }
  }]);

  return PatternRecognition;
}();
/**
 * Array of patterns.
 * @member {Array.<Object>} points
 */


PatternRecognition.prototype['points'] = undefined;
var _default = PatternRecognition;
exports["default"] = _default;
},{"../ApiClient":10}],111:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _Development = _interopRequireDefault(require("./Development"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The PressRelease model module.
 * @module model/PressRelease
 * @version 1.2.16
 */
var PressRelease = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>PressRelease</code>.
   * @alias module:model/PressRelease
   */
  function PressRelease() {
    _classCallCheck(this, PressRelease);

    PressRelease.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(PressRelease, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>PressRelease</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/PressRelease} obj Optional instance to populate.
     * @return {module:model/PressRelease} The populated <code>PressRelease</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new PressRelease();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('majorDevelopment')) {
          obj['majorDevelopment'] = _ApiClient["default"].convertToType(data['majorDevelopment'], [_Development["default"]]);
        }
      }

      return obj;
    }
  }]);

  return PressRelease;
}();
/**
 * Company symbol.
 * @member {String} symbol
 */


PressRelease.prototype['symbol'] = undefined;
/**
 * Array of major developments.
 * @member {Array.<module:model/Development>} majorDevelopment
 */

PressRelease.prototype['majorDevelopment'] = undefined;
var _default = PressRelease;
exports["default"] = _default;
},{"../ApiClient":10,"./Development":33}],112:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The PriceMetrics model module.
 * @module model/PriceMetrics
 * @version 1.2.16
 */
var PriceMetrics = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>PriceMetrics</code>.
   * @alias module:model/PriceMetrics
   */
  function PriceMetrics() {
    _classCallCheck(this, PriceMetrics);

    PriceMetrics.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(PriceMetrics, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>PriceMetrics</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/PriceMetrics} obj Optional instance to populate.
     * @return {module:model/PriceMetrics} The populated <code>PriceMetrics</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new PriceMetrics();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], Object);
        }
      }

      return obj;
    }
  }]);

  return PriceMetrics;
}();
/**
 * Symbol of the company.
 * @member {String} symbol
 */


PriceMetrics.prototype['symbol'] = undefined;
/**
 * @member {Object} data
 */

PriceMetrics.prototype['data'] = undefined;
var _default = PriceMetrics;
exports["default"] = _default;
},{"../ApiClient":10}],113:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The PriceTarget model module.
 * @module model/PriceTarget
 * @version 1.2.16
 */
var PriceTarget = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>PriceTarget</code>.
   * @alias module:model/PriceTarget
   */
  function PriceTarget() {
    _classCallCheck(this, PriceTarget);

    PriceTarget.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(PriceTarget, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>PriceTarget</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/PriceTarget} obj Optional instance to populate.
     * @return {module:model/PriceTarget} The populated <code>PriceTarget</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new PriceTarget();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('targetHigh')) {
          obj['targetHigh'] = _ApiClient["default"].convertToType(data['targetHigh'], 'Number');
        }

        if (data.hasOwnProperty('targetLow')) {
          obj['targetLow'] = _ApiClient["default"].convertToType(data['targetLow'], 'Number');
        }

        if (data.hasOwnProperty('targetMean')) {
          obj['targetMean'] = _ApiClient["default"].convertToType(data['targetMean'], 'Number');
        }

        if (data.hasOwnProperty('targetMedian')) {
          obj['targetMedian'] = _ApiClient["default"].convertToType(data['targetMedian'], 'Number');
        }

        if (data.hasOwnProperty('lastUpdated')) {
          obj['lastUpdated'] = _ApiClient["default"].convertToType(data['lastUpdated'], 'String');
        }
      }

      return obj;
    }
  }]);

  return PriceTarget;
}();
/**
 * Company symbol.
 * @member {String} symbol
 */


PriceTarget.prototype['symbol'] = undefined;
/**
 * Highes analysts' target.
 * @member {Number} targetHigh
 */

PriceTarget.prototype['targetHigh'] = undefined;
/**
 * Lowest analysts' target.
 * @member {Number} targetLow
 */

PriceTarget.prototype['targetLow'] = undefined;
/**
 * Mean of all analysts' targets.
 * @member {Number} targetMean
 */

PriceTarget.prototype['targetMean'] = undefined;
/**
 * Median of all analysts' targets.
 * @member {Number} targetMedian
 */

PriceTarget.prototype['targetMedian'] = undefined;
/**
 * Updated time of the data
 * @member {String} lastUpdated
 */

PriceTarget.prototype['lastUpdated'] = undefined;
var _default = PriceTarget;
exports["default"] = _default;
},{"../ApiClient":10}],114:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The Quote model module.
 * @module model/Quote
 * @version 1.2.16
 */
var Quote = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>Quote</code>.
   * @alias module:model/Quote
   */
  function Quote() {
    _classCallCheck(this, Quote);

    Quote.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(Quote, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>Quote</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Quote} obj Optional instance to populate.
     * @return {module:model/Quote} The populated <code>Quote</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new Quote();

        if (data.hasOwnProperty('o')) {
          obj['o'] = _ApiClient["default"].convertToType(data['o'], 'Number');
        }

        if (data.hasOwnProperty('h')) {
          obj['h'] = _ApiClient["default"].convertToType(data['h'], 'Number');
        }

        if (data.hasOwnProperty('l')) {
          obj['l'] = _ApiClient["default"].convertToType(data['l'], 'Number');
        }

        if (data.hasOwnProperty('c')) {
          obj['c'] = _ApiClient["default"].convertToType(data['c'], 'Number');
        }

        if (data.hasOwnProperty('pc')) {
          obj['pc'] = _ApiClient["default"].convertToType(data['pc'], 'Number');
        }

        if (data.hasOwnProperty('d')) {
          obj['d'] = _ApiClient["default"].convertToType(data['d'], 'Number');
        }

        if (data.hasOwnProperty('dp')) {
          obj['dp'] = _ApiClient["default"].convertToType(data['dp'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return Quote;
}();
/**
 * Open price of the day
 * @member {Number} o
 */


Quote.prototype['o'] = undefined;
/**
 * High price of the day
 * @member {Number} h
 */

Quote.prototype['h'] = undefined;
/**
 * Low price of the day
 * @member {Number} l
 */

Quote.prototype['l'] = undefined;
/**
 * Current price
 * @member {Number} c
 */

Quote.prototype['c'] = undefined;
/**
 * Previous close price
 * @member {Number} pc
 */

Quote.prototype['pc'] = undefined;
/**
 * Change
 * @member {Number} d
 */

Quote.prototype['d'] = undefined;
/**
 * Percent change
 * @member {Number} dp
 */

Quote.prototype['dp'] = undefined;
var _default = Quote;
exports["default"] = _default;
},{"../ApiClient":10}],115:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The RecommendationTrend model module.
 * @module model/RecommendationTrend
 * @version 1.2.16
 */
var RecommendationTrend = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>RecommendationTrend</code>.
   * @alias module:model/RecommendationTrend
   */
  function RecommendationTrend() {
    _classCallCheck(this, RecommendationTrend);

    RecommendationTrend.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(RecommendationTrend, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>RecommendationTrend</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/RecommendationTrend} obj Optional instance to populate.
     * @return {module:model/RecommendationTrend} The populated <code>RecommendationTrend</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new RecommendationTrend();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('buy')) {
          obj['buy'] = _ApiClient["default"].convertToType(data['buy'], 'Number');
        }

        if (data.hasOwnProperty('hold')) {
          obj['hold'] = _ApiClient["default"].convertToType(data['hold'], 'Number');
        }

        if (data.hasOwnProperty('period')) {
          obj['period'] = _ApiClient["default"].convertToType(data['period'], 'String');
        }

        if (data.hasOwnProperty('sell')) {
          obj['sell'] = _ApiClient["default"].convertToType(data['sell'], 'Number');
        }

        if (data.hasOwnProperty('strongBuy')) {
          obj['strongBuy'] = _ApiClient["default"].convertToType(data['strongBuy'], 'Number');
        }

        if (data.hasOwnProperty('strongSell')) {
          obj['strongSell'] = _ApiClient["default"].convertToType(data['strongSell'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return RecommendationTrend;
}();
/**
 * Company symbol.
 * @member {String} symbol
 */


RecommendationTrend.prototype['symbol'] = undefined;
/**
 * Number of recommendations that fall into the Buy category
 * @member {Number} buy
 */

RecommendationTrend.prototype['buy'] = undefined;
/**
 * Number of recommendations that fall into the Hold category
 * @member {Number} hold
 */

RecommendationTrend.prototype['hold'] = undefined;
/**
 * Updated period
 * @member {String} period
 */

RecommendationTrend.prototype['period'] = undefined;
/**
 * Number of recommendations that fall into the Sell category
 * @member {Number} sell
 */

RecommendationTrend.prototype['sell'] = undefined;
/**
 * Number of recommendations that fall into the Strong Buy category
 * @member {Number} strongBuy
 */

RecommendationTrend.prototype['strongBuy'] = undefined;
/**
 * Number of recommendations that fall into the Strong Sell category
 * @member {Number} strongSell
 */

RecommendationTrend.prototype['strongSell'] = undefined;
var _default = RecommendationTrend;
exports["default"] = _default;
},{"../ApiClient":10}],116:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The RedditSentimentContent model module.
 * @module model/RedditSentimentContent
 * @version 1.2.16
 */
var RedditSentimentContent = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>RedditSentimentContent</code>.
   * @alias module:model/RedditSentimentContent
   */
  function RedditSentimentContent() {
    _classCallCheck(this, RedditSentimentContent);

    RedditSentimentContent.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(RedditSentimentContent, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>RedditSentimentContent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/RedditSentimentContent} obj Optional instance to populate.
     * @return {module:model/RedditSentimentContent} The populated <code>RedditSentimentContent</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new RedditSentimentContent();

        if (data.hasOwnProperty('mention')) {
          obj['mention'] = _ApiClient["default"].convertToType(data['mention'], 'Number');
        }

        if (data.hasOwnProperty('positiveMention')) {
          obj['positiveMention'] = _ApiClient["default"].convertToType(data['positiveMention'], 'Number');
        }

        if (data.hasOwnProperty('negativeMention')) {
          obj['negativeMention'] = _ApiClient["default"].convertToType(data['negativeMention'], 'Number');
        }

        if (data.hasOwnProperty('positiveScore')) {
          obj['positiveScore'] = _ApiClient["default"].convertToType(data['positiveScore'], 'Number');
        }

        if (data.hasOwnProperty('negativeScore')) {
          obj['negativeScore'] = _ApiClient["default"].convertToType(data['negativeScore'], 'Number');
        }

        if (data.hasOwnProperty('score')) {
          obj['score'] = _ApiClient["default"].convertToType(data['score'], 'Number');
        }

        if (data.hasOwnProperty('atTime')) {
          obj['atTime'] = _ApiClient["default"].convertToType(data['atTime'], 'String');
        }
      }

      return obj;
    }
  }]);

  return RedditSentimentContent;
}();
/**
 * Number of mentions
 * @member {Number} mention
 */


RedditSentimentContent.prototype['mention'] = undefined;
/**
 * Number of positive mentions
 * @member {Number} positiveMention
 */

RedditSentimentContent.prototype['positiveMention'] = undefined;
/**
 * Number of negative mentions
 * @member {Number} negativeMention
 */

RedditSentimentContent.prototype['negativeMention'] = undefined;
/**
 * Positive score. Range 0-1
 * @member {Number} positiveScore
 */

RedditSentimentContent.prototype['positiveScore'] = undefined;
/**
 * Negative score. Range 0-1
 * @member {Number} negativeScore
 */

RedditSentimentContent.prototype['negativeScore'] = undefined;
/**
 * Final score. Range: -1 to 1 with 1 is very positive and -1 is very negative
 * @member {Number} score
 */

RedditSentimentContent.prototype['score'] = undefined;
/**
 * Period.
 * @member {String} atTime
 */

RedditSentimentContent.prototype['atTime'] = undefined;
var _default = RedditSentimentContent;
exports["default"] = _default;
},{"../ApiClient":10}],117:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The Report model module.
 * @module model/Report
 * @version 1.2.16
 */
var Report = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>Report</code>.
   * @alias module:model/Report
   */
  function Report() {
    _classCallCheck(this, Report);

    Report.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(Report, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>Report</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Report} obj Optional instance to populate.
     * @return {module:model/Report} The populated <code>Report</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new Report();

        if (data.hasOwnProperty('accessNumber')) {
          obj['accessNumber'] = _ApiClient["default"].convertToType(data['accessNumber'], 'String');
        }

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('cik')) {
          obj['cik'] = _ApiClient["default"].convertToType(data['cik'], 'String');
        }

        if (data.hasOwnProperty('year')) {
          obj['year'] = _ApiClient["default"].convertToType(data['year'], 'Number');
        }

        if (data.hasOwnProperty('quarter')) {
          obj['quarter'] = _ApiClient["default"].convertToType(data['quarter'], 'Number');
        }

        if (data.hasOwnProperty('form')) {
          obj['form'] = _ApiClient["default"].convertToType(data['form'], 'String');
        }

        if (data.hasOwnProperty('startDate')) {
          obj['startDate'] = _ApiClient["default"].convertToType(data['startDate'], 'String');
        }

        if (data.hasOwnProperty('endDate')) {
          obj['endDate'] = _ApiClient["default"].convertToType(data['endDate'], 'String');
        }

        if (data.hasOwnProperty('filedDate')) {
          obj['filedDate'] = _ApiClient["default"].convertToType(data['filedDate'], 'String');
        }

        if (data.hasOwnProperty('acceptedDate')) {
          obj['acceptedDate'] = _ApiClient["default"].convertToType(data['acceptedDate'], 'String');
        }

        if (data.hasOwnProperty('report')) {
          obj['report'] = _ApiClient["default"].convertToType(data['report'], Object);
        }
      }

      return obj;
    }
  }]);

  return Report;
}();
/**
 * Access number.
 * @member {String} accessNumber
 */


Report.prototype['accessNumber'] = undefined;
/**
 * Symbol.
 * @member {String} symbol
 */

Report.prototype['symbol'] = undefined;
/**
 * CIK.
 * @member {String} cik
 */

Report.prototype['cik'] = undefined;
/**
 * Year.
 * @member {Number} year
 */

Report.prototype['year'] = undefined;
/**
 * Quarter.
 * @member {Number} quarter
 */

Report.prototype['quarter'] = undefined;
/**
 * Form type.
 * @member {String} form
 */

Report.prototype['form'] = undefined;
/**
 * Period start date <code>%Y-%m-%d %H:%M:%S</code>.
 * @member {String} startDate
 */

Report.prototype['startDate'] = undefined;
/**
 * Period end date <code>%Y-%m-%d %H:%M:%S</code>.
 * @member {String} endDate
 */

Report.prototype['endDate'] = undefined;
/**
 * Filed date <code>%Y-%m-%d %H:%M:%S</code>.
 * @member {String} filedDate
 */

Report.prototype['filedDate'] = undefined;
/**
 * Accepted date <code>%Y-%m-%d %H:%M:%S</code>.
 * @member {String} acceptedDate
 */

Report.prototype['acceptedDate'] = undefined;
/**
 * @member {Object} report
 */

Report.prototype['report'] = undefined;
var _default = Report;
exports["default"] = _default;
},{"../ApiClient":10}],118:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _BreakdownItem = _interopRequireDefault(require("./BreakdownItem"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The RevenueBreakdown model module.
 * @module model/RevenueBreakdown
 * @version 1.2.16
 */
var RevenueBreakdown = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>RevenueBreakdown</code>.
   * @alias module:model/RevenueBreakdown
   */
  function RevenueBreakdown() {
    _classCallCheck(this, RevenueBreakdown);

    RevenueBreakdown.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(RevenueBreakdown, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>RevenueBreakdown</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/RevenueBreakdown} obj Optional instance to populate.
     * @return {module:model/RevenueBreakdown} The populated <code>RevenueBreakdown</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new RevenueBreakdown();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('cik')) {
          obj['cik'] = _ApiClient["default"].convertToType(data['cik'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_BreakdownItem["default"]]);
        }
      }

      return obj;
    }
  }]);

  return RevenueBreakdown;
}();
/**
 * Symbol
 * @member {String} symbol
 */


RevenueBreakdown.prototype['symbol'] = undefined;
/**
 * CIK
 * @member {String} cik
 */

RevenueBreakdown.prototype['cik'] = undefined;
/**
 * Array of revenue breakdown over multiple periods.
 * @member {Array.<module:model/BreakdownItem>} data
 */

RevenueBreakdown.prototype['data'] = undefined;
var _default = RevenueBreakdown;
exports["default"] = _default;
},{"../ApiClient":10,"./BreakdownItem":18}],119:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _RevenueEstimatesInfo = _interopRequireDefault(require("./RevenueEstimatesInfo"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The RevenueEstimates model module.
 * @module model/RevenueEstimates
 * @version 1.2.16
 */
var RevenueEstimates = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>RevenueEstimates</code>.
   * @alias module:model/RevenueEstimates
   */
  function RevenueEstimates() {
    _classCallCheck(this, RevenueEstimates);

    RevenueEstimates.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(RevenueEstimates, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>RevenueEstimates</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/RevenueEstimates} obj Optional instance to populate.
     * @return {module:model/RevenueEstimates} The populated <code>RevenueEstimates</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new RevenueEstimates();

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_RevenueEstimatesInfo["default"]]);
        }

        if (data.hasOwnProperty('freq')) {
          obj['freq'] = _ApiClient["default"].convertToType(data['freq'], 'String');
        }

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }
      }

      return obj;
    }
  }]);

  return RevenueEstimates;
}();
/**
 * List of estimates
 * @member {Array.<module:model/RevenueEstimatesInfo>} data
 */


RevenueEstimates.prototype['data'] = undefined;
/**
 * Frequency: annual or quarterly.
 * @member {String} freq
 */

RevenueEstimates.prototype['freq'] = undefined;
/**
 * Company symbol.
 * @member {String} symbol
 */

RevenueEstimates.prototype['symbol'] = undefined;
var _default = RevenueEstimates;
exports["default"] = _default;
},{"../ApiClient":10,"./RevenueEstimatesInfo":120}],120:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The RevenueEstimatesInfo model module.
 * @module model/RevenueEstimatesInfo
 * @version 1.2.16
 */
var RevenueEstimatesInfo = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>RevenueEstimatesInfo</code>.
   * @alias module:model/RevenueEstimatesInfo
   */
  function RevenueEstimatesInfo() {
    _classCallCheck(this, RevenueEstimatesInfo);

    RevenueEstimatesInfo.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(RevenueEstimatesInfo, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>RevenueEstimatesInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/RevenueEstimatesInfo} obj Optional instance to populate.
     * @return {module:model/RevenueEstimatesInfo} The populated <code>RevenueEstimatesInfo</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new RevenueEstimatesInfo();

        if (data.hasOwnProperty('revenueAvg')) {
          obj['revenueAvg'] = _ApiClient["default"].convertToType(data['revenueAvg'], 'Number');
        }

        if (data.hasOwnProperty('revenueHigh')) {
          obj['revenueHigh'] = _ApiClient["default"].convertToType(data['revenueHigh'], 'Number');
        }

        if (data.hasOwnProperty('revenueLow')) {
          obj['revenueLow'] = _ApiClient["default"].convertToType(data['revenueLow'], 'Number');
        }

        if (data.hasOwnProperty('numberAnalysts')) {
          obj['numberAnalysts'] = _ApiClient["default"].convertToType(data['numberAnalysts'], 'Number');
        }

        if (data.hasOwnProperty('period')) {
          obj['period'] = _ApiClient["default"].convertToType(data['period'], 'Date');
        }
      }

      return obj;
    }
  }]);

  return RevenueEstimatesInfo;
}();
/**
 * Average revenue estimates including Finnhub's proprietary estimates.
 * @member {Number} revenueAvg
 */


RevenueEstimatesInfo.prototype['revenueAvg'] = undefined;
/**
 * Highest estimate.
 * @member {Number} revenueHigh
 */

RevenueEstimatesInfo.prototype['revenueHigh'] = undefined;
/**
 * Lowest estimate.
 * @member {Number} revenueLow
 */

RevenueEstimatesInfo.prototype['revenueLow'] = undefined;
/**
 * Number of Analysts.
 * @member {Number} numberAnalysts
 */

RevenueEstimatesInfo.prototype['numberAnalysts'] = undefined;
/**
 * Period.
 * @member {Date} period
 */

RevenueEstimatesInfo.prototype['period'] = undefined;
var _default = RevenueEstimatesInfo;
exports["default"] = _default;
},{"../ApiClient":10}],121:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _FilingSentiment = _interopRequireDefault(require("./FilingSentiment"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The SECSentimentAnalysis model module.
 * @module model/SECSentimentAnalysis
 * @version 1.2.16
 */
var SECSentimentAnalysis = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>SECSentimentAnalysis</code>.
   * @alias module:model/SECSentimentAnalysis
   */
  function SECSentimentAnalysis() {
    _classCallCheck(this, SECSentimentAnalysis);

    SECSentimentAnalysis.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(SECSentimentAnalysis, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>SECSentimentAnalysis</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/SECSentimentAnalysis} obj Optional instance to populate.
     * @return {module:model/SECSentimentAnalysis} The populated <code>SECSentimentAnalysis</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new SECSentimentAnalysis();

        if (data.hasOwnProperty('accessNumber')) {
          obj['accessNumber'] = _ApiClient["default"].convertToType(data['accessNumber'], 'String');
        }

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('cik')) {
          obj['cik'] = _ApiClient["default"].convertToType(data['cik'], 'String');
        }

        if (data.hasOwnProperty('sentiment')) {
          obj['sentiment'] = _FilingSentiment["default"].constructFromObject(data['sentiment']);
        }
      }

      return obj;
    }
  }]);

  return SECSentimentAnalysis;
}();
/**
 * Access number.
 * @member {String} accessNumber
 */


SECSentimentAnalysis.prototype['accessNumber'] = undefined;
/**
 * Symbol.
 * @member {String} symbol
 */

SECSentimentAnalysis.prototype['symbol'] = undefined;
/**
 * CIK.
 * @member {String} cik
 */

SECSentimentAnalysis.prototype['cik'] = undefined;
/**
 * @member {module:model/FilingSentiment} sentiment
 */

SECSentimentAnalysis.prototype['sentiment'] = undefined;
var _default = SECSentimentAnalysis;
exports["default"] = _default;
},{"../ApiClient":10,"./FilingSentiment":63}],122:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _SectorMetricData = _interopRequireDefault(require("./SectorMetricData"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The SectorMetric model module.
 * @module model/SectorMetric
 * @version 1.2.16
 */
var SectorMetric = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>SectorMetric</code>.
   * @alias module:model/SectorMetric
   */
  function SectorMetric() {
    _classCallCheck(this, SectorMetric);

    SectorMetric.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(SectorMetric, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>SectorMetric</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/SectorMetric} obj Optional instance to populate.
     * @return {module:model/SectorMetric} The populated <code>SectorMetric</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new SectorMetric();

        if (data.hasOwnProperty('region')) {
          obj['region'] = _ApiClient["default"].convertToType(data['region'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_SectorMetricData["default"]]);
        }
      }

      return obj;
    }
  }]);

  return SectorMetric;
}();
/**
 * Region.
 * @member {String} region
 */


SectorMetric.prototype['region'] = undefined;
/**
 * Metrics for each sector.
 * @member {Array.<module:model/SectorMetricData>} data
 */

SectorMetric.prototype['data'] = undefined;
var _default = SectorMetric;
exports["default"] = _default;
},{"../ApiClient":10,"./SectorMetricData":123}],123:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The SectorMetricData model module.
 * @module model/SectorMetricData
 * @version 1.2.16
 */
var SectorMetricData = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>SectorMetricData</code>.
   * @alias module:model/SectorMetricData
   */
  function SectorMetricData() {
    _classCallCheck(this, SectorMetricData);

    SectorMetricData.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(SectorMetricData, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>SectorMetricData</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/SectorMetricData} obj Optional instance to populate.
     * @return {module:model/SectorMetricData} The populated <code>SectorMetricData</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new SectorMetricData();

        if (data.hasOwnProperty('sector')) {
          obj['sector'] = _ApiClient["default"].convertToType(data['sector'], 'String');
        }

        if (data.hasOwnProperty('metrics')) {
          obj['metrics'] = _ApiClient["default"].convertToType(data['metrics'], Object);
        }
      }

      return obj;
    }
  }]);

  return SectorMetricData;
}();
/**
 * Sector
 * @member {String} sector
 */


SectorMetricData.prototype['sector'] = undefined;
/**
 * Metrics data in key-value format. <code>a</code> and <code>m</code> fields are for average and median respectively.
 * @member {Object} metrics
 */

SectorMetricData.prototype['metrics'] = undefined;
var _default = SectorMetricData;
exports["default"] = _default;
},{"../ApiClient":10}],124:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The Sentiment model module.
 * @module model/Sentiment
 * @version 1.2.16
 */
var Sentiment = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>Sentiment</code>.
   * @alias module:model/Sentiment
   */
  function Sentiment() {
    _classCallCheck(this, Sentiment);

    Sentiment.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(Sentiment, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>Sentiment</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Sentiment} obj Optional instance to populate.
     * @return {module:model/Sentiment} The populated <code>Sentiment</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new Sentiment();

        if (data.hasOwnProperty('bearishPercent')) {
          obj['bearishPercent'] = _ApiClient["default"].convertToType(data['bearishPercent'], 'Number');
        }

        if (data.hasOwnProperty('bullishPercent')) {
          obj['bullishPercent'] = _ApiClient["default"].convertToType(data['bullishPercent'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return Sentiment;
}();
/**
 * 
 * @member {Number} bearishPercent
 */


Sentiment.prototype['bearishPercent'] = undefined;
/**
 * 
 * @member {Number} bullishPercent
 */

Sentiment.prototype['bullishPercent'] = undefined;
var _default = Sentiment;
exports["default"] = _default;
},{"../ApiClient":10}],125:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _SimilarityIndexInfo = _interopRequireDefault(require("./SimilarityIndexInfo"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The SimilarityIndex model module.
 * @module model/SimilarityIndex
 * @version 1.2.16
 */
var SimilarityIndex = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>SimilarityIndex</code>.
   * @alias module:model/SimilarityIndex
   */
  function SimilarityIndex() {
    _classCallCheck(this, SimilarityIndex);

    SimilarityIndex.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(SimilarityIndex, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>SimilarityIndex</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/SimilarityIndex} obj Optional instance to populate.
     * @return {module:model/SimilarityIndex} The populated <code>SimilarityIndex</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new SimilarityIndex();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('cik')) {
          obj['cik'] = _ApiClient["default"].convertToType(data['cik'], 'String');
        }

        if (data.hasOwnProperty('similarity')) {
          obj['similarity'] = _ApiClient["default"].convertToType(data['similarity'], [_SimilarityIndexInfo["default"]]);
        }
      }

      return obj;
    }
  }]);

  return SimilarityIndex;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


SimilarityIndex.prototype['symbol'] = undefined;
/**
 * CIK.
 * @member {String} cik
 */

SimilarityIndex.prototype['cik'] = undefined;
/**
 * Array of filings with its cosine similarity compared to the same report of the previous year.
 * @member {Array.<module:model/SimilarityIndexInfo>} similarity
 */

SimilarityIndex.prototype['similarity'] = undefined;
var _default = SimilarityIndex;
exports["default"] = _default;
},{"../ApiClient":10,"./SimilarityIndexInfo":126}],126:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The SimilarityIndexInfo model module.
 * @module model/SimilarityIndexInfo
 * @version 1.2.16
 */
var SimilarityIndexInfo = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>SimilarityIndexInfo</code>.
   * @alias module:model/SimilarityIndexInfo
   */
  function SimilarityIndexInfo() {
    _classCallCheck(this, SimilarityIndexInfo);

    SimilarityIndexInfo.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(SimilarityIndexInfo, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>SimilarityIndexInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/SimilarityIndexInfo} obj Optional instance to populate.
     * @return {module:model/SimilarityIndexInfo} The populated <code>SimilarityIndexInfo</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new SimilarityIndexInfo();

        if (data.hasOwnProperty('cik')) {
          obj['cik'] = _ApiClient["default"].convertToType(data['cik'], 'String');
        }

        if (data.hasOwnProperty('item1')) {
          obj['item1'] = _ApiClient["default"].convertToType(data['item1'], 'Number');
        }

        if (data.hasOwnProperty('item1a')) {
          obj['item1a'] = _ApiClient["default"].convertToType(data['item1a'], 'Number');
        }

        if (data.hasOwnProperty('item2')) {
          obj['item2'] = _ApiClient["default"].convertToType(data['item2'], 'Number');
        }

        if (data.hasOwnProperty('item7')) {
          obj['item7'] = _ApiClient["default"].convertToType(data['item7'], 'Number');
        }

        if (data.hasOwnProperty('item7a')) {
          obj['item7a'] = _ApiClient["default"].convertToType(data['item7a'], 'Number');
        }

        if (data.hasOwnProperty('accessNumber')) {
          obj['accessNumber'] = _ApiClient["default"].convertToType(data['accessNumber'], 'String');
        }

        if (data.hasOwnProperty('form')) {
          obj['form'] = _ApiClient["default"].convertToType(data['form'], 'String');
        }

        if (data.hasOwnProperty('filedDate')) {
          obj['filedDate'] = _ApiClient["default"].convertToType(data['filedDate'], 'String');
        }

        if (data.hasOwnProperty('acceptedDate')) {
          obj['acceptedDate'] = _ApiClient["default"].convertToType(data['acceptedDate'], 'String');
        }

        if (data.hasOwnProperty('reportUrl')) {
          obj['reportUrl'] = _ApiClient["default"].convertToType(data['reportUrl'], 'String');
        }

        if (data.hasOwnProperty('filingUrl')) {
          obj['filingUrl'] = _ApiClient["default"].convertToType(data['filingUrl'], 'String');
        }
      }

      return obj;
    }
  }]);

  return SimilarityIndexInfo;
}();
/**
 * CIK.
 * @member {String} cik
 */


SimilarityIndexInfo.prototype['cik'] = undefined;
/**
 * Cosine similarity of Item 1 (Business). This number is only available for Annual reports.
 * @member {Number} item1
 */

SimilarityIndexInfo.prototype['item1'] = undefined;
/**
 * Cosine similarity of Item 1A (Risk Factors). This number is available for both Annual and Quarterly reports.
 * @member {Number} item1a
 */

SimilarityIndexInfo.prototype['item1a'] = undefined;
/**
 * Cosine similarity of Item 2 (Management’s Discussion and Analysis of Financial Condition and Results of Operations). This number is only available for Quarterly reports.
 * @member {Number} item2
 */

SimilarityIndexInfo.prototype['item2'] = undefined;
/**
 * Cosine similarity of Item 7 (Management’s Discussion and Analysis of Financial Condition and Results of Operations). This number is only available for Annual reports.
 * @member {Number} item7
 */

SimilarityIndexInfo.prototype['item7'] = undefined;
/**
 * Cosine similarity of Item 7A (Quantitative and Qualitative Disclosures About Market Risk). This number is only available for Annual reports.
 * @member {Number} item7a
 */

SimilarityIndexInfo.prototype['item7a'] = undefined;
/**
 * Access number.
 * @member {String} accessNumber
 */

SimilarityIndexInfo.prototype['accessNumber'] = undefined;
/**
 * Form type.
 * @member {String} form
 */

SimilarityIndexInfo.prototype['form'] = undefined;
/**
 * Filed date <code>%Y-%m-%d %H:%M:%S</code>.
 * @member {String} filedDate
 */

SimilarityIndexInfo.prototype['filedDate'] = undefined;
/**
 * Accepted date <code>%Y-%m-%d %H:%M:%S</code>.
 * @member {String} acceptedDate
 */

SimilarityIndexInfo.prototype['acceptedDate'] = undefined;
/**
 * Report's URL.
 * @member {String} reportUrl
 */

SimilarityIndexInfo.prototype['reportUrl'] = undefined;
/**
 * Filing's URL.
 * @member {String} filingUrl
 */

SimilarityIndexInfo.prototype['filingUrl'] = undefined;
var _default = SimilarityIndexInfo;
exports["default"] = _default;
},{"../ApiClient":10}],127:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _RedditSentimentContent = _interopRequireDefault(require("./RedditSentimentContent"));

var _TwitterSentimentContent = _interopRequireDefault(require("./TwitterSentimentContent"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The SocialSentiment model module.
 * @module model/SocialSentiment
 * @version 1.2.16
 */
var SocialSentiment = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>SocialSentiment</code>.
   * @alias module:model/SocialSentiment
   */
  function SocialSentiment() {
    _classCallCheck(this, SocialSentiment);

    SocialSentiment.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(SocialSentiment, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>SocialSentiment</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/SocialSentiment} obj Optional instance to populate.
     * @return {module:model/SocialSentiment} The populated <code>SocialSentiment</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new SocialSentiment();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('reddit')) {
          obj['reddit'] = _ApiClient["default"].convertToType(data['reddit'], [_RedditSentimentContent["default"]]);
        }

        if (data.hasOwnProperty('twitter')) {
          obj['twitter'] = _ApiClient["default"].convertToType(data['twitter'], [_TwitterSentimentContent["default"]]);
        }
      }

      return obj;
    }
  }]);

  return SocialSentiment;
}();
/**
 * Company symbol.
 * @member {String} symbol
 */


SocialSentiment.prototype['symbol'] = undefined;
/**
 * Reddit sentiment.
 * @member {Array.<module:model/RedditSentimentContent>} reddit
 */

SocialSentiment.prototype['reddit'] = undefined;
/**
 * Twitter sentiment.
 * @member {Array.<module:model/TwitterSentimentContent>} twitter
 */

SocialSentiment.prototype['twitter'] = undefined;
var _default = SocialSentiment;
exports["default"] = _default;
},{"../ApiClient":10,"./RedditSentimentContent":116,"./TwitterSentimentContent":144}],128:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The Split model module.
 * @module model/Split
 * @version 1.2.16
 */
var Split = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>Split</code>.
   * @alias module:model/Split
   */
  function Split() {
    _classCallCheck(this, Split);

    Split.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(Split, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>Split</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Split} obj Optional instance to populate.
     * @return {module:model/Split} The populated <code>Split</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new Split();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('date')) {
          obj['date'] = _ApiClient["default"].convertToType(data['date'], 'Date');
        }

        if (data.hasOwnProperty('fromFactor')) {
          obj['fromFactor'] = _ApiClient["default"].convertToType(data['fromFactor'], 'Number');
        }

        if (data.hasOwnProperty('toFactor')) {
          obj['toFactor'] = _ApiClient["default"].convertToType(data['toFactor'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return Split;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


Split.prototype['symbol'] = undefined;
/**
 * Split date.
 * @member {Date} date
 */

Split.prototype['date'] = undefined;
/**
 * From factor.
 * @member {Number} fromFactor
 */

Split.prototype['fromFactor'] = undefined;
/**
 * To factor.
 * @member {Number} toFactor
 */

Split.prototype['toFactor'] = undefined;
var _default = Split;
exports["default"] = _default;
},{"../ApiClient":10}],129:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The StockCandles model module.
 * @module model/StockCandles
 * @version 1.2.16
 */
var StockCandles = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>StockCandles</code>.
   * @alias module:model/StockCandles
   */
  function StockCandles() {
    _classCallCheck(this, StockCandles);

    StockCandles.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(StockCandles, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>StockCandles</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/StockCandles} obj Optional instance to populate.
     * @return {module:model/StockCandles} The populated <code>StockCandles</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new StockCandles();

        if (data.hasOwnProperty('o')) {
          obj['o'] = _ApiClient["default"].convertToType(data['o'], ['Number']);
        }

        if (data.hasOwnProperty('h')) {
          obj['h'] = _ApiClient["default"].convertToType(data['h'], ['Number']);
        }

        if (data.hasOwnProperty('l')) {
          obj['l'] = _ApiClient["default"].convertToType(data['l'], ['Number']);
        }

        if (data.hasOwnProperty('c')) {
          obj['c'] = _ApiClient["default"].convertToType(data['c'], ['Number']);
        }

        if (data.hasOwnProperty('v')) {
          obj['v'] = _ApiClient["default"].convertToType(data['v'], ['Number']);
        }

        if (data.hasOwnProperty('t')) {
          obj['t'] = _ApiClient["default"].convertToType(data['t'], ['Number']);
        }

        if (data.hasOwnProperty('s')) {
          obj['s'] = _ApiClient["default"].convertToType(data['s'], 'String');
        }
      }

      return obj;
    }
  }]);

  return StockCandles;
}();
/**
 * List of open prices for returned candles.
 * @member {Array.<Number>} o
 */


StockCandles.prototype['o'] = undefined;
/**
 * List of high prices for returned candles.
 * @member {Array.<Number>} h
 */

StockCandles.prototype['h'] = undefined;
/**
 * List of low prices for returned candles.
 * @member {Array.<Number>} l
 */

StockCandles.prototype['l'] = undefined;
/**
 * List of close prices for returned candles.
 * @member {Array.<Number>} c
 */

StockCandles.prototype['c'] = undefined;
/**
 * List of volume data for returned candles.
 * @member {Array.<Number>} v
 */

StockCandles.prototype['v'] = undefined;
/**
 * List of timestamp for returned candles.
 * @member {Array.<Number>} t
 */

StockCandles.prototype['t'] = undefined;
/**
 * Status of the response. This field can either be ok or no_data.
 * @member {String} s
 */

StockCandles.prototype['s'] = undefined;
var _default = StockCandles;
exports["default"] = _default;
},{"../ApiClient":10}],130:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The StockSymbol model module.
 * @module model/StockSymbol
 * @version 1.2.16
 */
var StockSymbol = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>StockSymbol</code>.
   * @alias module:model/StockSymbol
   */
  function StockSymbol() {
    _classCallCheck(this, StockSymbol);

    StockSymbol.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(StockSymbol, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>StockSymbol</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/StockSymbol} obj Optional instance to populate.
     * @return {module:model/StockSymbol} The populated <code>StockSymbol</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new StockSymbol();

        if (data.hasOwnProperty('description')) {
          obj['description'] = _ApiClient["default"].convertToType(data['description'], 'String');
        }

        if (data.hasOwnProperty('displaySymbol')) {
          obj['displaySymbol'] = _ApiClient["default"].convertToType(data['displaySymbol'], 'String');
        }

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('type')) {
          obj['type'] = _ApiClient["default"].convertToType(data['type'], 'String');
        }

        if (data.hasOwnProperty('mic')) {
          obj['mic'] = _ApiClient["default"].convertToType(data['mic'], 'String');
        }

        if (data.hasOwnProperty('figi')) {
          obj['figi'] = _ApiClient["default"].convertToType(data['figi'], 'String');
        }

        if (data.hasOwnProperty('shareClassFIGI')) {
          obj['shareClassFIGI'] = _ApiClient["default"].convertToType(data['shareClassFIGI'], 'String');
        }

        if (data.hasOwnProperty('currency')) {
          obj['currency'] = _ApiClient["default"].convertToType(data['currency'], 'String');
        }

        if (data.hasOwnProperty('symbol2')) {
          obj['symbol2'] = _ApiClient["default"].convertToType(data['symbol2'], 'String');
        }

        if (data.hasOwnProperty('isin')) {
          obj['isin'] = _ApiClient["default"].convertToType(data['isin'], 'String');
        }
      }

      return obj;
    }
  }]);

  return StockSymbol;
}();
/**
 * Symbol description
 * @member {String} description
 */


StockSymbol.prototype['description'] = undefined;
/**
 * Display symbol name.
 * @member {String} displaySymbol
 */

StockSymbol.prototype['displaySymbol'] = undefined;
/**
 * Unique symbol used to identify this symbol used in <code>/stock/candle</code> endpoint.
 * @member {String} symbol
 */

StockSymbol.prototype['symbol'] = undefined;
/**
 * Security type.
 * @member {String} type
 */

StockSymbol.prototype['type'] = undefined;
/**
 * Primary exchange's MIC.
 * @member {String} mic
 */

StockSymbol.prototype['mic'] = undefined;
/**
 * FIGI identifier.
 * @member {String} figi
 */

StockSymbol.prototype['figi'] = undefined;
/**
 * Global Share Class FIGI.
 * @member {String} shareClassFIGI
 */

StockSymbol.prototype['shareClassFIGI'] = undefined;
/**
 * Price's currency. This might be different from the reporting currency of fundamental data.
 * @member {String} currency
 */

StockSymbol.prototype['currency'] = undefined;
/**
 * Alternative ticker for exchanges with multiple tickers for 1 stock such as BSE.
 * @member {String} symbol2
 */

StockSymbol.prototype['symbol2'] = undefined;
/**
 * ISIN. This field is only available for EU stocks and selected Asian markets. Entitlement from Finnhub is required to access this field.
 * @member {String} isin
 */

StockSymbol.prototype['isin'] = undefined;
var _default = StockSymbol;
exports["default"] = _default;
},{"../ApiClient":10}],131:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The StockTranscripts model module.
 * @module model/StockTranscripts
 * @version 1.2.16
 */
var StockTranscripts = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>StockTranscripts</code>.
   * @alias module:model/StockTranscripts
   */
  function StockTranscripts() {
    _classCallCheck(this, StockTranscripts);

    StockTranscripts.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(StockTranscripts, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>StockTranscripts</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/StockTranscripts} obj Optional instance to populate.
     * @return {module:model/StockTranscripts} The populated <code>StockTranscripts</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new StockTranscripts();

        if (data.hasOwnProperty('id')) {
          obj['id'] = _ApiClient["default"].convertToType(data['id'], 'String');
        }

        if (data.hasOwnProperty('title')) {
          obj['title'] = _ApiClient["default"].convertToType(data['title'], 'String');
        }

        if (data.hasOwnProperty('time')) {
          obj['time'] = _ApiClient["default"].convertToType(data['time'], 'String');
        }

        if (data.hasOwnProperty('year')) {
          obj['year'] = _ApiClient["default"].convertToType(data['year'], 'Number');
        }

        if (data.hasOwnProperty('quarter')) {
          obj['quarter'] = _ApiClient["default"].convertToType(data['quarter'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return StockTranscripts;
}();
/**
 * Transcript's ID used to get the <a href=\"#transcripts\">full transcript</a>.
 * @member {String} id
 */


StockTranscripts.prototype['id'] = undefined;
/**
 * Title.
 * @member {String} title
 */

StockTranscripts.prototype['title'] = undefined;
/**
 * Time of the event.
 * @member {String} time
 */

StockTranscripts.prototype['time'] = undefined;
/**
 * Year of earnings result in the case of earnings call transcript.
 * @member {Number} year
 */

StockTranscripts.prototype['year'] = undefined;
/**
 * Quarter of earnings result in the case of earnings call transcript.
 * @member {Number} quarter
 */

StockTranscripts.prototype['quarter'] = undefined;
var _default = StockTranscripts;
exports["default"] = _default;
},{"../ApiClient":10}],132:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _KeyCustomersSuppliers = _interopRequireDefault(require("./KeyCustomersSuppliers"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The SupplyChainRelationships model module.
 * @module model/SupplyChainRelationships
 * @version 1.2.16
 */
var SupplyChainRelationships = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>SupplyChainRelationships</code>.
   * @alias module:model/SupplyChainRelationships
   */
  function SupplyChainRelationships() {
    _classCallCheck(this, SupplyChainRelationships);

    SupplyChainRelationships.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(SupplyChainRelationships, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>SupplyChainRelationships</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/SupplyChainRelationships} obj Optional instance to populate.
     * @return {module:model/SupplyChainRelationships} The populated <code>SupplyChainRelationships</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new SupplyChainRelationships();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_KeyCustomersSuppliers["default"]]);
        }
      }

      return obj;
    }
  }]);

  return SupplyChainRelationships;
}();
/**
 * symbol
 * @member {String} symbol
 */


SupplyChainRelationships.prototype['symbol'] = undefined;
/**
 * Key customers and suppliers.
 * @member {Array.<module:model/KeyCustomersSuppliers>} data
 */

SupplyChainRelationships.prototype['data'] = undefined;
var _default = SupplyChainRelationships;
exports["default"] = _default;
},{"../ApiClient":10,"./KeyCustomersSuppliers":94}],133:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The SupportResistance model module.
 * @module model/SupportResistance
 * @version 1.2.16
 */
var SupportResistance = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>SupportResistance</code>.
   * @alias module:model/SupportResistance
   */
  function SupportResistance() {
    _classCallCheck(this, SupportResistance);

    SupportResistance.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(SupportResistance, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>SupportResistance</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/SupportResistance} obj Optional instance to populate.
     * @return {module:model/SupportResistance} The populated <code>SupportResistance</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new SupportResistance();

        if (data.hasOwnProperty('levels')) {
          obj['levels'] = _ApiClient["default"].convertToType(data['levels'], ['Number']);
        }
      }

      return obj;
    }
  }]);

  return SupportResistance;
}();
/**
 * Array of support and resistance levels.
 * @member {Array.<Number>} levels
 */


SupportResistance.prototype['levels'] = undefined;
var _default = SupportResistance;
exports["default"] = _default;
},{"../ApiClient":10}],134:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _SymbolChangeInfo = _interopRequireDefault(require("./SymbolChangeInfo"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The SymbolChange model module.
 * @module model/SymbolChange
 * @version 1.2.16
 */
var SymbolChange = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>SymbolChange</code>.
   * @alias module:model/SymbolChange
   */
  function SymbolChange() {
    _classCallCheck(this, SymbolChange);

    SymbolChange.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(SymbolChange, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>SymbolChange</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/SymbolChange} obj Optional instance to populate.
     * @return {module:model/SymbolChange} The populated <code>SymbolChange</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new SymbolChange();

        if (data.hasOwnProperty('fromDate')) {
          obj['fromDate'] = _ApiClient["default"].convertToType(data['fromDate'], 'String');
        }

        if (data.hasOwnProperty('toDate')) {
          obj['toDate'] = _ApiClient["default"].convertToType(data['toDate'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_SymbolChangeInfo["default"]]);
        }
      }

      return obj;
    }
  }]);

  return SymbolChange;
}();
/**
 * From date.
 * @member {String} fromDate
 */


SymbolChange.prototype['fromDate'] = undefined;
/**
 * To date.
 * @member {String} toDate
 */

SymbolChange.prototype['toDate'] = undefined;
/**
 * Array of symbol change events.
 * @member {Array.<module:model/SymbolChangeInfo>} data
 */

SymbolChange.prototype['data'] = undefined;
var _default = SymbolChange;
exports["default"] = _default;
},{"../ApiClient":10,"./SymbolChangeInfo":135}],135:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The SymbolChangeInfo model module.
 * @module model/SymbolChangeInfo
 * @version 1.2.16
 */
var SymbolChangeInfo = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>SymbolChangeInfo</code>.
   * @alias module:model/SymbolChangeInfo
   */
  function SymbolChangeInfo() {
    _classCallCheck(this, SymbolChangeInfo);

    SymbolChangeInfo.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(SymbolChangeInfo, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>SymbolChangeInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/SymbolChangeInfo} obj Optional instance to populate.
     * @return {module:model/SymbolChangeInfo} The populated <code>SymbolChangeInfo</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new SymbolChangeInfo();

        if (data.hasOwnProperty('atDate')) {
          obj['atDate'] = _ApiClient["default"].convertToType(data['atDate'], 'String');
        }

        if (data.hasOwnProperty('oldSymbol')) {
          obj['oldSymbol'] = _ApiClient["default"].convertToType(data['oldSymbol'], 'String');
        }

        if (data.hasOwnProperty('newSymbol')) {
          obj['newSymbol'] = _ApiClient["default"].convertToType(data['newSymbol'], 'String');
        }
      }

      return obj;
    }
  }]);

  return SymbolChangeInfo;
}();
/**
 * Event's date.
 * @member {String} atDate
 */


SymbolChangeInfo.prototype['atDate'] = undefined;
/**
 * Old symbol.
 * @member {String} oldSymbol
 */

SymbolChangeInfo.prototype['oldSymbol'] = undefined;
/**
 * New symbol.
 * @member {String} newSymbol
 */

SymbolChangeInfo.prototype['newSymbol'] = undefined;
var _default = SymbolChangeInfo;
exports["default"] = _default;
},{"../ApiClient":10}],136:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _SymbolLookupInfo = _interopRequireDefault(require("./SymbolLookupInfo"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The SymbolLookup model module.
 * @module model/SymbolLookup
 * @version 1.2.16
 */
var SymbolLookup = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>SymbolLookup</code>.
   * @alias module:model/SymbolLookup
   */
  function SymbolLookup() {
    _classCallCheck(this, SymbolLookup);

    SymbolLookup.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(SymbolLookup, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>SymbolLookup</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/SymbolLookup} obj Optional instance to populate.
     * @return {module:model/SymbolLookup} The populated <code>SymbolLookup</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new SymbolLookup();

        if (data.hasOwnProperty('result')) {
          obj['result'] = _ApiClient["default"].convertToType(data['result'], [_SymbolLookupInfo["default"]]);
        }

        if (data.hasOwnProperty('count')) {
          obj['count'] = _ApiClient["default"].convertToType(data['count'], 'Number');
        }
      }

      return obj;
    }
  }]);

  return SymbolLookup;
}();
/**
 * Array of search results.
 * @member {Array.<module:model/SymbolLookupInfo>} result
 */


SymbolLookup.prototype['result'] = undefined;
/**
 * Number of results.
 * @member {Number} count
 */

SymbolLookup.prototype['count'] = undefined;
var _default = SymbolLookup;
exports["default"] = _default;
},{"../ApiClient":10,"./SymbolLookupInfo":137}],137:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The SymbolLookupInfo model module.
 * @module model/SymbolLookupInfo
 * @version 1.2.16
 */
var SymbolLookupInfo = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>SymbolLookupInfo</code>.
   * @alias module:model/SymbolLookupInfo
   */
  function SymbolLookupInfo() {
    _classCallCheck(this, SymbolLookupInfo);

    SymbolLookupInfo.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(SymbolLookupInfo, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>SymbolLookupInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/SymbolLookupInfo} obj Optional instance to populate.
     * @return {module:model/SymbolLookupInfo} The populated <code>SymbolLookupInfo</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new SymbolLookupInfo();

        if (data.hasOwnProperty('description')) {
          obj['description'] = _ApiClient["default"].convertToType(data['description'], 'String');
        }

        if (data.hasOwnProperty('displaySymbol')) {
          obj['displaySymbol'] = _ApiClient["default"].convertToType(data['displaySymbol'], 'String');
        }

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('type')) {
          obj['type'] = _ApiClient["default"].convertToType(data['type'], 'String');
        }
      }

      return obj;
    }
  }]);

  return SymbolLookupInfo;
}();
/**
 * Symbol description
 * @member {String} description
 */


SymbolLookupInfo.prototype['description'] = undefined;
/**
 * Display symbol name.
 * @member {String} displaySymbol
 */

SymbolLookupInfo.prototype['displaySymbol'] = undefined;
/**
 * Unique symbol used to identify this symbol used in <code>/stock/candle</code> endpoint.
 * @member {String} symbol
 */

SymbolLookupInfo.prototype['symbol'] = undefined;
/**
 * Security type.
 * @member {String} type
 */

SymbolLookupInfo.prototype['type'] = undefined;
var _default = SymbolLookupInfo;
exports["default"] = _default;
},{"../ApiClient":10}],138:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _Indicator = _interopRequireDefault(require("./Indicator"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The TechnicalAnalysis model module.
 * @module model/TechnicalAnalysis
 * @version 1.2.16
 */
var TechnicalAnalysis = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>TechnicalAnalysis</code>.
   * @alias module:model/TechnicalAnalysis
   */
  function TechnicalAnalysis() {
    _classCallCheck(this, TechnicalAnalysis);

    TechnicalAnalysis.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(TechnicalAnalysis, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>TechnicalAnalysis</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/TechnicalAnalysis} obj Optional instance to populate.
     * @return {module:model/TechnicalAnalysis} The populated <code>TechnicalAnalysis</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new TechnicalAnalysis();

        if (data.hasOwnProperty('count')) {
          obj['count'] = _Indicator["default"].constructFromObject(data['count']);
        }

        if (data.hasOwnProperty('signal')) {
          obj['signal'] = _ApiClient["default"].convertToType(data['signal'], 'String');
        }
      }

      return obj;
    }
  }]);

  return TechnicalAnalysis;
}();
/**
 * @member {module:model/Indicator} count
 */


TechnicalAnalysis.prototype['count'] = undefined;
/**
 * Aggregate Signal
 * @member {String} signal
 */

TechnicalAnalysis.prototype['signal'] = undefined;
var _default = TechnicalAnalysis;
exports["default"] = _default;
},{"../ApiClient":10,"./Indicator":75}],139:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The TickData model module.
 * @module model/TickData
 * @version 1.2.16
 */
var TickData = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>TickData</code>.
   * @alias module:model/TickData
   */
  function TickData() {
    _classCallCheck(this, TickData);

    TickData.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(TickData, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>TickData</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/TickData} obj Optional instance to populate.
     * @return {module:model/TickData} The populated <code>TickData</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new TickData();

        if (data.hasOwnProperty('s')) {
          obj['s'] = _ApiClient["default"].convertToType(data['s'], 'String');
        }

        if (data.hasOwnProperty('skip')) {
          obj['skip'] = _ApiClient["default"].convertToType(data['skip'], 'Number');
        }

        if (data.hasOwnProperty('count')) {
          obj['count'] = _ApiClient["default"].convertToType(data['count'], 'Number');
        }

        if (data.hasOwnProperty('total')) {
          obj['total'] = _ApiClient["default"].convertToType(data['total'], 'Number');
        }

        if (data.hasOwnProperty('v')) {
          obj['v'] = _ApiClient["default"].convertToType(data['v'], ['Number']);
        }

        if (data.hasOwnProperty('p')) {
          obj['p'] = _ApiClient["default"].convertToType(data['p'], ['Number']);
        }

        if (data.hasOwnProperty('t')) {
          obj['t'] = _ApiClient["default"].convertToType(data['t'], ['Number']);
        }

        if (data.hasOwnProperty('x')) {
          obj['x'] = _ApiClient["default"].convertToType(data['x'], ['String']);
        }

        if (data.hasOwnProperty('c')) {
          obj['c'] = _ApiClient["default"].convertToType(data['c'], [['String']]);
        }
      }

      return obj;
    }
  }]);

  return TickData;
}();
/**
 * Symbol.
 * @member {String} s
 */


TickData.prototype['s'] = undefined;
/**
 * Number of ticks skipped.
 * @member {Number} skip
 */

TickData.prototype['skip'] = undefined;
/**
 * Number of ticks returned. If <code>count</code> < <code>limit</code>, all data for that date has been returned.
 * @member {Number} count
 */

TickData.prototype['count'] = undefined;
/**
 * Total number of ticks for that date.
 * @member {Number} total
 */

TickData.prototype['total'] = undefined;
/**
 * List of volume data.
 * @member {Array.<Number>} v
 */

TickData.prototype['v'] = undefined;
/**
 * List of price data.
 * @member {Array.<Number>} p
 */

TickData.prototype['p'] = undefined;
/**
 * List of timestamp in UNIX ms.
 * @member {Array.<Number>} t
 */

TickData.prototype['t'] = undefined;
/**
 * List of venues/exchanges. A list of exchange codes can be found <a target=\"_blank\" href=\"https://docs.google.com/spreadsheets/d/1Tj53M1svmr-hfEtbk6_NpVR1yAyGLMaH6ByYU6CG0ZY/edit?usp=sharing\",>here</a>
 * @member {Array.<String>} x
 */

TickData.prototype['x'] = undefined;
/**
 * List of trade conditions. A comprehensive list of trade conditions code can be found <a target=\"_blank\" href=\"https://docs.google.com/spreadsheets/d/1PUxiSWPHSODbaTaoL2Vef6DgU-yFtlRGZf19oBb9Hp0/edit?usp=sharing\">here</a>
 * @member {Array.<Array.<String>>} c
 */

TickData.prototype['c'] = undefined;
var _default = TickData;
exports["default"] = _default;
},{"../ApiClient":10}],140:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The Transactions model module.
 * @module model/Transactions
 * @version 1.2.16
 */
var Transactions = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>Transactions</code>.
   * @alias module:model/Transactions
   */
  function Transactions() {
    _classCallCheck(this, Transactions);

    Transactions.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(Transactions, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>Transactions</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Transactions} obj Optional instance to populate.
     * @return {module:model/Transactions} The populated <code>Transactions</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new Transactions();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('share')) {
          obj['share'] = _ApiClient["default"].convertToType(data['share'], 'Number');
        }

        if (data.hasOwnProperty('change')) {
          obj['change'] = _ApiClient["default"].convertToType(data['change'], 'Number');
        }

        if (data.hasOwnProperty('filingDate')) {
          obj['filingDate'] = _ApiClient["default"].convertToType(data['filingDate'], 'Date');
        }

        if (data.hasOwnProperty('transactionDate')) {
          obj['transactionDate'] = _ApiClient["default"].convertToType(data['transactionDate'], 'Date');
        }

        if (data.hasOwnProperty('transactionPrice')) {
          obj['transactionPrice'] = _ApiClient["default"].convertToType(data['transactionPrice'], 'Number');
        }

        if (data.hasOwnProperty('transactionCode')) {
          obj['transactionCode'] = _ApiClient["default"].convertToType(data['transactionCode'], 'String');
        }
      }

      return obj;
    }
  }]);

  return Transactions;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


Transactions.prototype['symbol'] = undefined;
/**
 * Insider's name.
 * @member {String} name
 */

Transactions.prototype['name'] = undefined;
/**
 * Number of shares held after the transaction.
 * @member {Number} share
 */

Transactions.prototype['share'] = undefined;
/**
 * Number of share changed from the last period. A positive value suggests a <code>BUY</code> transaction. A negative value suggests a <code>SELL</code> transaction.
 * @member {Number} change
 */

Transactions.prototype['change'] = undefined;
/**
 * Filing date.
 * @member {Date} filingDate
 */

Transactions.prototype['filingDate'] = undefined;
/**
 * Transaction date.
 * @member {Date} transactionDate
 */

Transactions.prototype['transactionDate'] = undefined;
/**
 * Average transaction price.
 * @member {Number} transactionPrice
 */

Transactions.prototype['transactionPrice'] = undefined;
/**
 * Transaction code. A list of codes and their meanings can be found <a href=\"https://www.sec.gov/about/forms/form4data.pdf\" target=\"_blank\" rel=\"noopener\">here</a>.
 * @member {String} transactionCode
 */

Transactions.prototype['transactionCode'] = undefined;
var _default = Transactions;
exports["default"] = _default;
},{"../ApiClient":10}],141:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The TranscriptContent model module.
 * @module model/TranscriptContent
 * @version 1.2.16
 */
var TranscriptContent = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>TranscriptContent</code>.
   * @alias module:model/TranscriptContent
   */
  function TranscriptContent() {
    _classCallCheck(this, TranscriptContent);

    TranscriptContent.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(TranscriptContent, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>TranscriptContent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/TranscriptContent} obj Optional instance to populate.
     * @return {module:model/TranscriptContent} The populated <code>TranscriptContent</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new TranscriptContent();

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('speech')) {
          obj['speech'] = _ApiClient["default"].convertToType(data['speech'], ['String']);
        }

        if (data.hasOwnProperty('session')) {
          obj['session'] = _ApiClient["default"].convertToType(data['session'], 'String');
        }
      }

      return obj;
    }
  }]);

  return TranscriptContent;
}();
/**
 * Speaker's name
 * @member {String} name
 */


TranscriptContent.prototype['name'] = undefined;
/**
 * Speaker's speech
 * @member {Array.<String>} speech
 */

TranscriptContent.prototype['speech'] = undefined;
/**
 * Earnings calls section (management discussion or Q&A)
 * @member {String} session
 */

TranscriptContent.prototype['session'] = undefined;
var _default = TranscriptContent;
exports["default"] = _default;
},{"../ApiClient":10}],142:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The TranscriptParticipant model module.
 * @module model/TranscriptParticipant
 * @version 1.2.16
 */
var TranscriptParticipant = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>TranscriptParticipant</code>.
   * @alias module:model/TranscriptParticipant
   */
  function TranscriptParticipant() {
    _classCallCheck(this, TranscriptParticipant);

    TranscriptParticipant.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(TranscriptParticipant, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>TranscriptParticipant</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/TranscriptParticipant} obj Optional instance to populate.
     * @return {module:model/TranscriptParticipant} The populated <code>TranscriptParticipant</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new TranscriptParticipant();

        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }

        if (data.hasOwnProperty('description')) {
          obj['description'] = _ApiClient["default"].convertToType(data['description'], 'String');
        }

        if (data.hasOwnProperty('role')) {
          obj['role'] = _ApiClient["default"].convertToType(data['role'], 'String');
        }
      }

      return obj;
    }
  }]);

  return TranscriptParticipant;
}();
/**
 * Participant's name
 * @member {String} name
 */


TranscriptParticipant.prototype['name'] = undefined;
/**
 * Participant's description
 * @member {String} description
 */

TranscriptParticipant.prototype['description'] = undefined;
/**
 * Whether the speak is a company's executive or an analyst
 * @member {String} role
 */

TranscriptParticipant.prototype['role'] = undefined;
var _default = TranscriptParticipant;
exports["default"] = _default;
},{"../ApiClient":10}],143:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The Trend model module.
 * @module model/Trend
 * @version 1.2.16
 */
var Trend = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>Trend</code>.
   * @alias module:model/Trend
   */
  function Trend() {
    _classCallCheck(this, Trend);

    Trend.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(Trend, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>Trend</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Trend} obj Optional instance to populate.
     * @return {module:model/Trend} The populated <code>Trend</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new Trend();

        if (data.hasOwnProperty('adx')) {
          obj['adx'] = _ApiClient["default"].convertToType(data['adx'], 'Number');
        }

        if (data.hasOwnProperty('trending')) {
          obj['trending'] = _ApiClient["default"].convertToType(data['trending'], 'Boolean');
        }
      }

      return obj;
    }
  }]);

  return Trend;
}();
/**
 * ADX reading
 * @member {Number} adx
 */


Trend.prototype['adx'] = undefined;
/**
 * Whether market is trending or going sideway
 * @member {Boolean} trending
 */

Trend.prototype['trending'] = undefined;
var _default = Trend;
exports["default"] = _default;
},{"../ApiClient":10}],144:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The TwitterSentimentContent model module.
 * @module model/TwitterSentimentContent
 * @version 1.2.16
 */
var TwitterSentimentContent = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>TwitterSentimentContent</code>.
   * @alias module:model/TwitterSentimentContent
   */
  function TwitterSentimentContent() {
    _classCallCheck(this, TwitterSentimentContent);

    TwitterSentimentContent.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(TwitterSentimentContent, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>TwitterSentimentContent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/TwitterSentimentContent} obj Optional instance to populate.
     * @return {module:model/TwitterSentimentContent} The populated <code>TwitterSentimentContent</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new TwitterSentimentContent();

        if (data.hasOwnProperty('mention')) {
          obj['mention'] = _ApiClient["default"].convertToType(data['mention'], 'Number');
        }

        if (data.hasOwnProperty('positiveMention')) {
          obj['positiveMention'] = _ApiClient["default"].convertToType(data['positiveMention'], 'Number');
        }

        if (data.hasOwnProperty('negativeMention')) {
          obj['negativeMention'] = _ApiClient["default"].convertToType(data['negativeMention'], 'Number');
        }

        if (data.hasOwnProperty('positiveScore')) {
          obj['positiveScore'] = _ApiClient["default"].convertToType(data['positiveScore'], 'Number');
        }

        if (data.hasOwnProperty('negativeScore')) {
          obj['negativeScore'] = _ApiClient["default"].convertToType(data['negativeScore'], 'Number');
        }

        if (data.hasOwnProperty('score')) {
          obj['score'] = _ApiClient["default"].convertToType(data['score'], 'Number');
        }

        if (data.hasOwnProperty('atTime')) {
          obj['atTime'] = _ApiClient["default"].convertToType(data['atTime'], 'String');
        }
      }

      return obj;
    }
  }]);

  return TwitterSentimentContent;
}();
/**
 * Number of mentions
 * @member {Number} mention
 */


TwitterSentimentContent.prototype['mention'] = undefined;
/**
 * Number of positive mentions
 * @member {Number} positiveMention
 */

TwitterSentimentContent.prototype['positiveMention'] = undefined;
/**
 * Number of negative mentions
 * @member {Number} negativeMention
 */

TwitterSentimentContent.prototype['negativeMention'] = undefined;
/**
 * Positive score. Range 0-1
 * @member {Number} positiveScore
 */

TwitterSentimentContent.prototype['positiveScore'] = undefined;
/**
 * Negative score. Range 0-1
 * @member {Number} negativeScore
 */

TwitterSentimentContent.prototype['negativeScore'] = undefined;
/**
 * Final score. Range: -1 to 1 with 1 is very positive and -1 is very negative
 * @member {Number} score
 */

TwitterSentimentContent.prototype['score'] = undefined;
/**
 * Period.
 * @member {String} atTime
 */

TwitterSentimentContent.prototype['atTime'] = undefined;
var _default = TwitterSentimentContent;
exports["default"] = _default;
},{"../ApiClient":10}],145:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The UpgradeDowngrade model module.
 * @module model/UpgradeDowngrade
 * @version 1.2.16
 */
var UpgradeDowngrade = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>UpgradeDowngrade</code>.
   * @alias module:model/UpgradeDowngrade
   */
  function UpgradeDowngrade() {
    _classCallCheck(this, UpgradeDowngrade);

    UpgradeDowngrade.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(UpgradeDowngrade, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>UpgradeDowngrade</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/UpgradeDowngrade} obj Optional instance to populate.
     * @return {module:model/UpgradeDowngrade} The populated <code>UpgradeDowngrade</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new UpgradeDowngrade();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('gradeTime')) {
          obj['gradeTime'] = _ApiClient["default"].convertToType(data['gradeTime'], 'Number');
        }

        if (data.hasOwnProperty('fromGrade')) {
          obj['fromGrade'] = _ApiClient["default"].convertToType(data['fromGrade'], 'String');
        }

        if (data.hasOwnProperty('toGrade')) {
          obj['toGrade'] = _ApiClient["default"].convertToType(data['toGrade'], 'String');
        }

        if (data.hasOwnProperty('company')) {
          obj['company'] = _ApiClient["default"].convertToType(data['company'], 'String');
        }

        if (data.hasOwnProperty('action')) {
          obj['action'] = _ApiClient["default"].convertToType(data['action'], 'String');
        }
      }

      return obj;
    }
  }]);

  return UpgradeDowngrade;
}();
/**
 * Company symbol.
 * @member {String} symbol
 */


UpgradeDowngrade.prototype['symbol'] = undefined;
/**
 * Upgrade/downgrade time in UNIX timestamp.
 * @member {Number} gradeTime
 */

UpgradeDowngrade.prototype['gradeTime'] = undefined;
/**
 * From grade.
 * @member {String} fromGrade
 */

UpgradeDowngrade.prototype['fromGrade'] = undefined;
/**
 * To grade.
 * @member {String} toGrade
 */

UpgradeDowngrade.prototype['toGrade'] = undefined;
/**
 * Company/analyst who did the upgrade/downgrade.
 * @member {String} company
 */

UpgradeDowngrade.prototype['company'] = undefined;
/**
 * Action can take any of the following values: <code>up(upgrade), down(downgrade), main(maintains), init(initiate), reit(reiterate)</code>.
 * @member {String} action
 */

UpgradeDowngrade.prototype['action'] = undefined;
var _default = UpgradeDowngrade;
exports["default"] = _default;
},{"../ApiClient":10}],146:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The UsaSpending model module.
 * @module model/UsaSpending
 * @version 1.2.16
 */
var UsaSpending = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>UsaSpending</code>.
   * @alias module:model/UsaSpending
   */
  function UsaSpending() {
    _classCallCheck(this, UsaSpending);

    UsaSpending.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(UsaSpending, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>UsaSpending</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/UsaSpending} obj Optional instance to populate.
     * @return {module:model/UsaSpending} The populated <code>UsaSpending</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new UsaSpending();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('recipientName')) {
          obj['recipientName'] = _ApiClient["default"].convertToType(data['recipientName'], 'String');
        }

        if (data.hasOwnProperty('recipientParentName')) {
          obj['recipientParentName'] = _ApiClient["default"].convertToType(data['recipientParentName'], 'String');
        }

        if (data.hasOwnProperty('awardDescription')) {
          obj['awardDescription'] = _ApiClient["default"].convertToType(data['awardDescription'], 'String');
        }

        if (data.hasOwnProperty('country')) {
          obj['country'] = _ApiClient["default"].convertToType(data['country'], 'String');
        }

        if (data.hasOwnProperty('actionDate')) {
          obj['actionDate'] = _ApiClient["default"].convertToType(data['actionDate'], 'String');
        }

        if (data.hasOwnProperty('totalValue')) {
          obj['totalValue'] = _ApiClient["default"].convertToType(data['totalValue'], 'Number');
        }

        if (data.hasOwnProperty('performanceStartDate')) {
          obj['performanceStartDate'] = _ApiClient["default"].convertToType(data['performanceStartDate'], 'String');
        }

        if (data.hasOwnProperty('performanceEndDate')) {
          obj['performanceEndDate'] = _ApiClient["default"].convertToType(data['performanceEndDate'], 'String');
        }

        if (data.hasOwnProperty('awardingAgencyName')) {
          obj['awardingAgencyName'] = _ApiClient["default"].convertToType(data['awardingAgencyName'], 'String');
        }

        if (data.hasOwnProperty('awardingSubAgencyName')) {
          obj['awardingSubAgencyName'] = _ApiClient["default"].convertToType(data['awardingSubAgencyName'], 'String');
        }

        if (data.hasOwnProperty('awardingOfficeName')) {
          obj['awardingOfficeName'] = _ApiClient["default"].convertToType(data['awardingOfficeName'], 'String');
        }

        if (data.hasOwnProperty('performanceCountry')) {
          obj['performanceCountry'] = _ApiClient["default"].convertToType(data['performanceCountry'], 'String');
        }

        if (data.hasOwnProperty('performanceCity')) {
          obj['performanceCity'] = _ApiClient["default"].convertToType(data['performanceCity'], 'String');
        }

        if (data.hasOwnProperty('performanceCounty')) {
          obj['performanceCounty'] = _ApiClient["default"].convertToType(data['performanceCounty'], 'String');
        }

        if (data.hasOwnProperty('performanceState')) {
          obj['performanceState'] = _ApiClient["default"].convertToType(data['performanceState'], 'String');
        }

        if (data.hasOwnProperty('performanceZipCode')) {
          obj['performanceZipCode'] = _ApiClient["default"].convertToType(data['performanceZipCode'], 'String');
        }

        if (data.hasOwnProperty('performanceCongressionalDistrict')) {
          obj['performanceCongressionalDistrict'] = _ApiClient["default"].convertToType(data['performanceCongressionalDistrict'], 'String');
        }

        if (data.hasOwnProperty('naicsCode')) {
          obj['naicsCode'] = _ApiClient["default"].convertToType(data['naicsCode'], 'String');
        }

        if (data.hasOwnProperty('permalink')) {
          obj['permalink'] = _ApiClient["default"].convertToType(data['permalink'], 'String');
        }
      }

      return obj;
    }
  }]);

  return UsaSpending;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


UsaSpending.prototype['symbol'] = undefined;
/**
 * Company's name.
 * @member {String} recipientName
 */

UsaSpending.prototype['recipientName'] = undefined;
/**
 * Company's name.
 * @member {String} recipientParentName
 */

UsaSpending.prototype['recipientParentName'] = undefined;
/**
 * Description.
 * @member {String} awardDescription
 */

UsaSpending.prototype['awardDescription'] = undefined;
/**
 * Recipient's country.
 * @member {String} country
 */

UsaSpending.prototype['country'] = undefined;
/**
 * Period.
 * @member {String} actionDate
 */

UsaSpending.prototype['actionDate'] = undefined;
/**
 * Income reported by lobbying firms.
 * @member {Number} totalValue
 */

UsaSpending.prototype['totalValue'] = undefined;
/**
 * Performance start date.
 * @member {String} performanceStartDate
 */

UsaSpending.prototype['performanceStartDate'] = undefined;
/**
 * Performance end date.
 * @member {String} performanceEndDate
 */

UsaSpending.prototype['performanceEndDate'] = undefined;
/**
 * Award agency.
 * @member {String} awardingAgencyName
 */

UsaSpending.prototype['awardingAgencyName'] = undefined;
/**
 * Award sub-agency.
 * @member {String} awardingSubAgencyName
 */

UsaSpending.prototype['awardingSubAgencyName'] = undefined;
/**
 * Award office name.
 * @member {String} awardingOfficeName
 */

UsaSpending.prototype['awardingOfficeName'] = undefined;
/**
 * Performance country.
 * @member {String} performanceCountry
 */

UsaSpending.prototype['performanceCountry'] = undefined;
/**
 * Performance city.
 * @member {String} performanceCity
 */

UsaSpending.prototype['performanceCity'] = undefined;
/**
 * Performance county.
 * @member {String} performanceCounty
 */

UsaSpending.prototype['performanceCounty'] = undefined;
/**
 * Performance state.
 * @member {String} performanceState
 */

UsaSpending.prototype['performanceState'] = undefined;
/**
 * Performance zip code.
 * @member {String} performanceZipCode
 */

UsaSpending.prototype['performanceZipCode'] = undefined;
/**
 * Performance congressional district.
 * @member {String} performanceCongressionalDistrict
 */

UsaSpending.prototype['performanceCongressionalDistrict'] = undefined;
/**
 * NAICS code.
 * @member {String} naicsCode
 */

UsaSpending.prototype['naicsCode'] = undefined;
/**
 * Permalink.
 * @member {String} permalink
 */

UsaSpending.prototype['permalink'] = undefined;
var _default = UsaSpending;
exports["default"] = _default;
},{"../ApiClient":10}],147:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _UsaSpending = _interopRequireDefault(require("./UsaSpending"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The UsaSpendingResult model module.
 * @module model/UsaSpendingResult
 * @version 1.2.16
 */
var UsaSpendingResult = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>UsaSpendingResult</code>.
   * @alias module:model/UsaSpendingResult
   */
  function UsaSpendingResult() {
    _classCallCheck(this, UsaSpendingResult);

    UsaSpendingResult.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(UsaSpendingResult, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>UsaSpendingResult</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/UsaSpendingResult} obj Optional instance to populate.
     * @return {module:model/UsaSpendingResult} The populated <code>UsaSpendingResult</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new UsaSpendingResult();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_UsaSpending["default"]]);
        }
      }

      return obj;
    }
  }]);

  return UsaSpendingResult;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


UsaSpendingResult.prototype['symbol'] = undefined;
/**
 * Array of government's spending data points.
 * @member {Array.<module:model/UsaSpending>} data
 */

UsaSpendingResult.prototype['data'] = undefined;
var _default = UsaSpendingResult;
exports["default"] = _default;
},{"../ApiClient":10,"./UsaSpending":146}],148:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The UsptoPatent model module.
 * @module model/UsptoPatent
 * @version 1.2.16
 */
var UsptoPatent = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>UsptoPatent</code>.
   * @alias module:model/UsptoPatent
   */
  function UsptoPatent() {
    _classCallCheck(this, UsptoPatent);

    UsptoPatent.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(UsptoPatent, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>UsptoPatent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/UsptoPatent} obj Optional instance to populate.
     * @return {module:model/UsptoPatent} The populated <code>UsptoPatent</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new UsptoPatent();

        if (data.hasOwnProperty('applicationNumber')) {
          obj['applicationNumber'] = _ApiClient["default"].convertToType(data['applicationNumber'], 'String');
        }

        if (data.hasOwnProperty('companyFilingName')) {
          obj['companyFilingName'] = _ApiClient["default"].convertToType(data['companyFilingName'], ['String']);
        }

        if (data.hasOwnProperty('filingDate')) {
          obj['filingDate'] = _ApiClient["default"].convertToType(data['filingDate'], 'String');
        }

        if (data.hasOwnProperty('description')) {
          obj['description'] = _ApiClient["default"].convertToType(data['description'], 'String');
        }

        if (data.hasOwnProperty('filingStatus')) {
          obj['filingStatus'] = _ApiClient["default"].convertToType(data['filingStatus'], 'String');
        }

        if (data.hasOwnProperty('patentNumber')) {
          obj['patentNumber'] = _ApiClient["default"].convertToType(data['patentNumber'], 'String');
        }

        if (data.hasOwnProperty('publicationDate')) {
          obj['publicationDate'] = _ApiClient["default"].convertToType(data['publicationDate'], 'String');
        }

        if (data.hasOwnProperty('patentType')) {
          obj['patentType'] = _ApiClient["default"].convertToType(data['patentType'], 'String');
        }

        if (data.hasOwnProperty('url')) {
          obj['url'] = _ApiClient["default"].convertToType(data['url'], 'String');
        }
      }

      return obj;
    }
  }]);

  return UsptoPatent;
}();
/**
 * Application Number.
 * @member {String} applicationNumber
 */


UsptoPatent.prototype['applicationNumber'] = undefined;
/**
 * Array of companies' name on the patent.
 * @member {Array.<String>} companyFilingName
 */

UsptoPatent.prototype['companyFilingName'] = undefined;
/**
 * Filing date.
 * @member {String} filingDate
 */

UsptoPatent.prototype['filingDate'] = undefined;
/**
 * Description.
 * @member {String} description
 */

UsptoPatent.prototype['description'] = undefined;
/**
 * Filing status.
 * @member {String} filingStatus
 */

UsptoPatent.prototype['filingStatus'] = undefined;
/**
 * Patent number.
 * @member {String} patentNumber
 */

UsptoPatent.prototype['patentNumber'] = undefined;
/**
 * Publication date.
 * @member {String} publicationDate
 */

UsptoPatent.prototype['publicationDate'] = undefined;
/**
 * Patent's type.
 * @member {String} patentType
 */

UsptoPatent.prototype['patentType'] = undefined;
/**
 * URL of the original article.
 * @member {String} url
 */

UsptoPatent.prototype['url'] = undefined;
var _default = UsptoPatent;
exports["default"] = _default;
},{"../ApiClient":10}],149:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _UsptoPatent = _interopRequireDefault(require("./UsptoPatent"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The UsptoPatentResult model module.
 * @module model/UsptoPatentResult
 * @version 1.2.16
 */
var UsptoPatentResult = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>UsptoPatentResult</code>.
   * @alias module:model/UsptoPatentResult
   */
  function UsptoPatentResult() {
    _classCallCheck(this, UsptoPatentResult);

    UsptoPatentResult.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(UsptoPatentResult, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>UsptoPatentResult</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/UsptoPatentResult} obj Optional instance to populate.
     * @return {module:model/UsptoPatentResult} The populated <code>UsptoPatentResult</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new UsptoPatentResult();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_UsptoPatent["default"]]);
        }
      }

      return obj;
    }
  }]);

  return UsptoPatentResult;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


UsptoPatentResult.prototype['symbol'] = undefined;
/**
 * Array of patents.
 * @member {Array.<module:model/UsptoPatent>} data
 */

UsptoPatentResult.prototype['data'] = undefined;
var _default = UsptoPatentResult;
exports["default"] = _default;
},{"../ApiClient":10,"./UsptoPatent":148}],150:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The VisaApplication model module.
 * @module model/VisaApplication
 * @version 1.2.16
 */
var VisaApplication = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>VisaApplication</code>.
   * @alias module:model/VisaApplication
   */
  function VisaApplication() {
    _classCallCheck(this, VisaApplication);

    VisaApplication.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(VisaApplication, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>VisaApplication</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/VisaApplication} obj Optional instance to populate.
     * @return {module:model/VisaApplication} The populated <code>VisaApplication</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new VisaApplication();

        if (data.hasOwnProperty('year')) {
          obj['year'] = _ApiClient["default"].convertToType(data['year'], 'Number');
        }

        if (data.hasOwnProperty('quarter')) {
          obj['quarter'] = _ApiClient["default"].convertToType(data['quarter'], 'Number');
        }

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('caseNumber')) {
          obj['caseNumber'] = _ApiClient["default"].convertToType(data['caseNumber'], 'String');
        }

        if (data.hasOwnProperty('caseStatus')) {
          obj['caseStatus'] = _ApiClient["default"].convertToType(data['caseStatus'], 'String');
        }

        if (data.hasOwnProperty('receivedDate')) {
          obj['receivedDate'] = _ApiClient["default"].convertToType(data['receivedDate'], 'String');
        }

        if (data.hasOwnProperty('visaClass')) {
          obj['visaClass'] = _ApiClient["default"].convertToType(data['visaClass'], 'String');
        }

        if (data.hasOwnProperty('jobTitle')) {
          obj['jobTitle'] = _ApiClient["default"].convertToType(data['jobTitle'], 'String');
        }

        if (data.hasOwnProperty('socCode')) {
          obj['socCode'] = _ApiClient["default"].convertToType(data['socCode'], 'String');
        }

        if (data.hasOwnProperty('fullTimePosition')) {
          obj['fullTimePosition'] = _ApiClient["default"].convertToType(data['fullTimePosition'], 'String');
        }

        if (data.hasOwnProperty('beginDate')) {
          obj['beginDate'] = _ApiClient["default"].convertToType(data['beginDate'], 'String');
        }

        if (data.hasOwnProperty('endDate')) {
          obj['endDate'] = _ApiClient["default"].convertToType(data['endDate'], 'String');
        }

        if (data.hasOwnProperty('employerName')) {
          obj['employerName'] = _ApiClient["default"].convertToType(data['employerName'], 'String');
        }

        if (data.hasOwnProperty('worksiteAddress')) {
          obj['worksiteAddress'] = _ApiClient["default"].convertToType(data['worksiteAddress'], 'String');
        }

        if (data.hasOwnProperty('worksiteCity')) {
          obj['worksiteCity'] = _ApiClient["default"].convertToType(data['worksiteCity'], 'String');
        }

        if (data.hasOwnProperty('worksiteCounty')) {
          obj['worksiteCounty'] = _ApiClient["default"].convertToType(data['worksiteCounty'], 'String');
        }

        if (data.hasOwnProperty('worksiteState')) {
          obj['worksiteState'] = _ApiClient["default"].convertToType(data['worksiteState'], 'String');
        }

        if (data.hasOwnProperty('worksitePostalCode')) {
          obj['worksitePostalCode'] = _ApiClient["default"].convertToType(data['worksitePostalCode'], 'String');
        }

        if (data.hasOwnProperty('wageRangeFrom')) {
          obj['wageRangeFrom'] = _ApiClient["default"].convertToType(data['wageRangeFrom'], 'Number');
        }

        if (data.hasOwnProperty('wageRangeTo')) {
          obj['wageRangeTo'] = _ApiClient["default"].convertToType(data['wageRangeTo'], 'Number');
        }

        if (data.hasOwnProperty('wageUnitOfPay')) {
          obj['wageUnitOfPay'] = _ApiClient["default"].convertToType(data['wageUnitOfPay'], 'String');
        }

        if (data.hasOwnProperty('wageLevel')) {
          obj['wageLevel'] = _ApiClient["default"].convertToType(data['wageLevel'], 'String');
        }

        if (data.hasOwnProperty('h1bDependent')) {
          obj['h1bDependent'] = _ApiClient["default"].convertToType(data['h1bDependent'], 'String');
        }
      }

      return obj;
    }
  }]);

  return VisaApplication;
}();
/**
 * Year.
 * @member {Number} year
 */


VisaApplication.prototype['year'] = undefined;
/**
 * Quarter.
 * @member {Number} quarter
 */

VisaApplication.prototype['quarter'] = undefined;
/**
 * Symbol.
 * @member {String} symbol
 */

VisaApplication.prototype['symbol'] = undefined;
/**
 * Case number.
 * @member {String} caseNumber
 */

VisaApplication.prototype['caseNumber'] = undefined;
/**
 * Case status.
 * @member {String} caseStatus
 */

VisaApplication.prototype['caseStatus'] = undefined;
/**
 * Received date.
 * @member {String} receivedDate
 */

VisaApplication.prototype['receivedDate'] = undefined;
/**
 * Visa class.
 * @member {String} visaClass
 */

VisaApplication.prototype['visaClass'] = undefined;
/**
 * Job Title.
 * @member {String} jobTitle
 */

VisaApplication.prototype['jobTitle'] = undefined;
/**
 * SOC Code. A list of SOC code can be found <a href=\"https://www.bls.gov/oes/current/oes_stru.htm\" target=\"_blank\">here</a>.
 * @member {String} socCode
 */

VisaApplication.prototype['socCode'] = undefined;
/**
 * Full-time position flag.
 * @member {String} fullTimePosition
 */

VisaApplication.prototype['fullTimePosition'] = undefined;
/**
 * Job's start date.
 * @member {String} beginDate
 */

VisaApplication.prototype['beginDate'] = undefined;
/**
 * Job's end date.
 * @member {String} endDate
 */

VisaApplication.prototype['endDate'] = undefined;
/**
 * Company's name.
 * @member {String} employerName
 */

VisaApplication.prototype['employerName'] = undefined;
/**
 * Worksite address.
 * @member {String} worksiteAddress
 */

VisaApplication.prototype['worksiteAddress'] = undefined;
/**
 * Worksite city.
 * @member {String} worksiteCity
 */

VisaApplication.prototype['worksiteCity'] = undefined;
/**
 * Worksite county.
 * @member {String} worksiteCounty
 */

VisaApplication.prototype['worksiteCounty'] = undefined;
/**
 * Worksite state.
 * @member {String} worksiteState
 */

VisaApplication.prototype['worksiteState'] = undefined;
/**
 * Worksite postal code.
 * @member {String} worksitePostalCode
 */

VisaApplication.prototype['worksitePostalCode'] = undefined;
/**
 * Wage range from.
 * @member {Number} wageRangeFrom
 */

VisaApplication.prototype['wageRangeFrom'] = undefined;
/**
 * Wage range to.
 * @member {Number} wageRangeTo
 */

VisaApplication.prototype['wageRangeTo'] = undefined;
/**
 * Wage unit of pay.
 * @member {String} wageUnitOfPay
 */

VisaApplication.prototype['wageUnitOfPay'] = undefined;
/**
 * Wage level.
 * @member {String} wageLevel
 */

VisaApplication.prototype['wageLevel'] = undefined;
/**
 * H1B dependent flag.
 * @member {String} h1bDependent
 */

VisaApplication.prototype['h1bDependent'] = undefined;
var _default = VisaApplication;
exports["default"] = _default;
},{"../ApiClient":10}],151:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ApiClient = _interopRequireDefault(require("../ApiClient"));

var _VisaApplication = _interopRequireDefault(require("./VisaApplication"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * The VisaApplicationResult model module.
 * @module model/VisaApplicationResult
 * @version 1.2.16
 */
var VisaApplicationResult = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>VisaApplicationResult</code>.
   * @alias module:model/VisaApplicationResult
   */
  function VisaApplicationResult() {
    _classCallCheck(this, VisaApplicationResult);

    VisaApplicationResult.initialize(this);
  }
  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */


  _createClass(VisaApplicationResult, null, [{
    key: "initialize",
    value: function initialize(obj) {}
    /**
     * Constructs a <code>VisaApplicationResult</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/VisaApplicationResult} obj Optional instance to populate.
     * @return {module:model/VisaApplicationResult} The populated <code>VisaApplicationResult</code> instance.
     */

  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new VisaApplicationResult();

        if (data.hasOwnProperty('symbol')) {
          obj['symbol'] = _ApiClient["default"].convertToType(data['symbol'], 'String');
        }

        if (data.hasOwnProperty('data')) {
          obj['data'] = _ApiClient["default"].convertToType(data['data'], [_VisaApplication["default"]]);
        }
      }

      return obj;
    }
  }]);

  return VisaApplicationResult;
}();
/**
 * Symbol.
 * @member {String} symbol
 */


VisaApplicationResult.prototype['symbol'] = undefined;
/**
 * Array of H1b and Permanent visa applications.
 * @member {Array.<module:model/VisaApplication>} data
 */

VisaApplicationResult.prototype['data'] = undefined;
var _default = VisaApplicationResult;
exports["default"] = _default;
},{"../ApiClient":10,"./VisaApplication":150}],152:[function(require,module,exports){
"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function Agent() {
  this._defaults = [];
}

['use', 'on', 'once', 'set', 'query', 'type', 'accept', 'auth', 'withCredentials', 'sortQuery', 'retry', 'ok', 'redirects', 'timeout', 'buffer', 'serialize', 'parse', 'ca', 'key', 'pfx', 'cert', 'disableTLSCerts'].forEach(function (fn) {
  // Default setting for all requests from this agent
  Agent.prototype[fn] = function () {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    this._defaults.push({
      fn: fn,
      args: args
    });

    return this;
  };
});

Agent.prototype._setDefaults = function (req) {
  this._defaults.forEach(function (def) {
    req[def.fn].apply(req, _toConsumableArray(def.args));
  });
};

module.exports = Agent;

},{}],153:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/**
 * Root reference for iframes.
 */
var root;

if (typeof window !== 'undefined') {
  // Browser window
  root = window;
} else if (typeof self === 'undefined') {
  // Other environments
  console.warn('Using browser-only version of superagent in non-browser environment');
  root = void 0;
} else {
  // Web Worker
  root = self;
}

var Emitter = require('component-emitter');

var safeStringify = require('fast-safe-stringify');

var RequestBase = require('./request-base');

var isObject = require('./is-object');

var ResponseBase = require('./response-base');

var Agent = require('./agent-base');
/**
 * Noop.
 */


function noop() {}
/**
 * Expose `request`.
 */


module.exports = function (method, url) {
  // callback
  if (typeof url === 'function') {
    return new exports.Request('GET', method).end(url);
  } // url first


  if (arguments.length === 1) {
    return new exports.Request('GET', method);
  }

  return new exports.Request(method, url);
};

exports = module.exports;
var request = exports;
exports.Request = Request;
/**
 * Determine XHR.
 */

request.getXHR = function () {
  if (root.XMLHttpRequest && (!root.location || root.location.protocol !== 'file:' || !root.ActiveXObject)) {
    return new XMLHttpRequest();
  }

  try {
    return new ActiveXObject('Microsoft.XMLHTTP');
  } catch (_unused) {}

  try {
    return new ActiveXObject('Msxml2.XMLHTTP.6.0');
  } catch (_unused2) {}

  try {
    return new ActiveXObject('Msxml2.XMLHTTP.3.0');
  } catch (_unused3) {}

  try {
    return new ActiveXObject('Msxml2.XMLHTTP');
  } catch (_unused4) {}

  throw new Error('Browser-only version of superagent could not find XHR');
};
/**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */


var trim = ''.trim ? function (s) {
  return s.trim();
} : function (s) {
  return s.replace(/(^\s*|\s*$)/g, '');
};
/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function serialize(obj) {
  if (!isObject(obj)) return obj;
  var pairs = [];

  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) pushEncodedKeyValuePair(pairs, key, obj[key]);
  }

  return pairs.join('&');
}
/**
 * Helps 'serialize' with serializing arrays.
 * Mutates the pairs array.
 *
 * @param {Array} pairs
 * @param {String} key
 * @param {Mixed} val
 */


function pushEncodedKeyValuePair(pairs, key, val) {
  if (val === undefined) return;

  if (val === null) {
    pairs.push(encodeURI(key));
    return;
  }

  if (Array.isArray(val)) {
    val.forEach(function (v) {
      pushEncodedKeyValuePair(pairs, key, v);
    });
  } else if (isObject(val)) {
    for (var subkey in val) {
      if (Object.prototype.hasOwnProperty.call(val, subkey)) pushEncodedKeyValuePair(pairs, "".concat(key, "[").concat(subkey, "]"), val[subkey]);
    }
  } else {
    pairs.push(encodeURI(key) + '=' + encodeURIComponent(val));
  }
}
/**
 * Expose serialization method.
 */


request.serializeObject = serialize;
/**
 * Parse the given x-www-form-urlencoded `str`.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseString(str) {
  var obj = {};
  var pairs = str.split('&');
  var pair;
  var pos;

  for (var i = 0, len = pairs.length; i < len; ++i) {
    pair = pairs[i];
    pos = pair.indexOf('=');

    if (pos === -1) {
      obj[decodeURIComponent(pair)] = '';
    } else {
      obj[decodeURIComponent(pair.slice(0, pos))] = decodeURIComponent(pair.slice(pos + 1));
    }
  }

  return obj;
}
/**
 * Expose parser.
 */


request.parseString = parseString;
/**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */

request.types = {
  html: 'text/html',
  json: 'application/json',
  xml: 'text/xml',
  urlencoded: 'application/x-www-form-urlencoded',
  form: 'application/x-www-form-urlencoded',
  'form-data': 'application/x-www-form-urlencoded'
};
/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

request.serialize = {
  'application/x-www-form-urlencoded': serialize,
  'application/json': safeStringify
};
/**
 * Default parsers.
 *
 *     superagent.parse['application/xml'] = function(str){
 *       return { object parsed from str };
 *     };
 *
 */

request.parse = {
  'application/x-www-form-urlencoded': parseString,
  'application/json': JSON.parse
};
/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseHeader(str) {
  var lines = str.split(/\r?\n/);
  var fields = {};
  var index;
  var line;
  var field;
  var val;

  for (var i = 0, len = lines.length; i < len; ++i) {
    line = lines[i];
    index = line.indexOf(':');

    if (index === -1) {
      // could be empty line, just skip it
      continue;
    }

    field = line.slice(0, index).toLowerCase();
    val = trim(line.slice(index + 1));
    fields[field] = val;
  }

  return fields;
}
/**
 * Check if `mime` is json or has +json structured syntax suffix.
 *
 * @param {String} mime
 * @return {Boolean}
 * @api private
 */


function isJSON(mime) {
  // should match /json or +json
  // but not /json-seq
  return /[/+]json($|[^-\w])/.test(mime);
}
/**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */


function Response(req) {
  this.req = req;
  this.xhr = this.req.xhr; // responseText is accessible only if responseType is '' or 'text' and on older browsers

  this.text = this.req.method !== 'HEAD' && (this.xhr.responseType === '' || this.xhr.responseType === 'text') || typeof this.xhr.responseType === 'undefined' ? this.xhr.responseText : null;
  this.statusText = this.req.xhr.statusText;
  var status = this.xhr.status; // handle IE9 bug: http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request

  if (status === 1223) {
    status = 204;
  }

  this._setStatusProperties(status);

  this.headers = parseHeader(this.xhr.getAllResponseHeaders());
  this.header = this.headers; // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
  // getResponseHeader still works. so we get content-type even if getting
  // other headers fails.

  this.header['content-type'] = this.xhr.getResponseHeader('content-type');

  this._setHeaderProperties(this.header);

  if (this.text === null && req._responseType) {
    this.body = this.xhr.response;
  } else {
    this.body = this.req.method === 'HEAD' ? null : this._parseBody(this.text ? this.text : this.xhr.response);
  }
} // eslint-disable-next-line new-cap


ResponseBase(Response.prototype);
/**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */

Response.prototype._parseBody = function (str) {
  var parse = request.parse[this.type];

  if (this.req._parser) {
    return this.req._parser(this, str);
  }

  if (!parse && isJSON(this.type)) {
    parse = request.parse['application/json'];
  }

  return parse && str && (str.length > 0 || str instanceof Object) ? parse(str) : null;
};
/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */


Response.prototype.toError = function () {
  var req = this.req;
  var method = req.method;
  var url = req.url;
  var msg = "cannot ".concat(method, " ").concat(url, " (").concat(this.status, ")");
  var err = new Error(msg);
  err.status = this.status;
  err.method = method;
  err.url = url;
  return err;
};
/**
 * Expose `Response`.
 */


request.Response = Response;
/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */

function Request(method, url) {
  var self = this;
  this._query = this._query || [];
  this.method = method;
  this.url = url;
  this.header = {}; // preserves header name case

  this._header = {}; // coerces header names to lowercase

  this.on('end', function () {
    var err = null;
    var res = null;

    try {
      res = new Response(self);
    } catch (err_) {
      err = new Error('Parser is unable to parse the response');
      err.parse = true;
      err.original = err_; // issue #675: return the raw response if the response parsing fails

      if (self.xhr) {
        // ie9 doesn't have 'response' property
        err.rawResponse = typeof self.xhr.responseType === 'undefined' ? self.xhr.responseText : self.xhr.response; // issue #876: return the http status code if the response parsing fails

        err.status = self.xhr.status ? self.xhr.status : null;
        err.statusCode = err.status; // backwards-compat only
      } else {
        err.rawResponse = null;
        err.status = null;
      }

      return self.callback(err);
    }

    self.emit('response', res);
    var new_err;

    try {
      if (!self._isResponseOK(res)) {
        new_err = new Error(res.statusText || res.text || 'Unsuccessful HTTP response');
      }
    } catch (err_) {
      new_err = err_; // ok() callback can throw
    } // #1000 don't catch errors from the callback to avoid double calling it


    if (new_err) {
      new_err.original = err;
      new_err.response = res;
      new_err.status = res.status;
      self.callback(new_err, res);
    } else {
      self.callback(null, res);
    }
  });
}
/**
 * Mixin `Emitter` and `RequestBase`.
 */
// eslint-disable-next-line new-cap


Emitter(Request.prototype); // eslint-disable-next-line new-cap

RequestBase(Request.prototype);
/**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function (type) {
  this.set('Content-Type', request.types[type] || type);
  return this;
};
/**
 * Set Accept to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.json = 'application/json';
 *
 *      request.get('/agent')
 *        .accept('json')
 *        .end(callback);
 *
 *      request.get('/agent')
 *        .accept('application/json')
 *        .end(callback);
 *
 * @param {String} accept
 * @return {Request} for chaining
 * @api public
 */


Request.prototype.accept = function (type) {
  this.set('Accept', request.types[type] || type);
  return this;
};
/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} [pass] optional in case of using 'bearer' as type
 * @param {Object} options with 'type' property 'auto', 'basic' or 'bearer' (default 'basic')
 * @return {Request} for chaining
 * @api public
 */


Request.prototype.auth = function (user, pass, options) {
  if (arguments.length === 1) pass = '';

  if (_typeof(pass) === 'object' && pass !== null) {
    // pass is optional and can be replaced with options
    options = pass;
    pass = '';
  }

  if (!options) {
    options = {
      type: typeof btoa === 'function' ? 'basic' : 'auto'
    };
  }

  var encoder = function encoder(string) {
    if (typeof btoa === 'function') {
      return btoa(string);
    }

    throw new Error('Cannot use basic auth, btoa is not a function');
  };

  return this._auth(user, pass, options, encoder);
};
/**
 * Add query-string `val`.
 *
 * Examples:
 *
 *   request.get('/shoes')
 *     .query('size=10')
 *     .query({ color: 'blue' })
 *
 * @param {Object|String} val
 * @return {Request} for chaining
 * @api public
 */


Request.prototype.query = function (val) {
  if (typeof val !== 'string') val = serialize(val);
  if (val) this._query.push(val);
  return this;
};
/**
 * Queue the given `file` as an attachment to the specified `field`,
 * with optional `options` (or filename).
 *
 * ``` js
 * request.post('/upload')
 *   .attach('content', new Blob(['<a id="a"><b id="b">hey!</b></a>'], { type: "text/html"}))
 *   .end(callback);
 * ```
 *
 * @param {String} field
 * @param {Blob|File} file
 * @param {String|Object} options
 * @return {Request} for chaining
 * @api public
 */


Request.prototype.attach = function (field, file, options) {
  if (file) {
    if (this._data) {
      throw new Error("superagent can't mix .send() and .attach()");
    }

    this._getFormData().append(field, file, options || file.name);
  }

  return this;
};

Request.prototype._getFormData = function () {
  if (!this._formData) {
    this._formData = new root.FormData();
  }

  return this._formData;
};
/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */


Request.prototype.callback = function (err, res) {
  if (this._shouldRetry(err, res)) {
    return this._retry();
  }

  var fn = this._callback;
  this.clearTimeout();

  if (err) {
    if (this._maxRetries) err.retries = this._retries - 1;
    this.emit('error', err);
  }

  fn(err, res);
};
/**
 * Invoke callback with x-domain error.
 *
 * @api private
 */


Request.prototype.crossDomainError = function () {
  var err = new Error('Request has been terminated\nPossible causes: the network is offline, Origin is not allowed by Access-Control-Allow-Origin, the page is being unloaded, etc.');
  err.crossDomain = true;
  err.status = this.status;
  err.method = this.method;
  err.url = this.url;
  this.callback(err);
}; // This only warns, because the request is still likely to work


Request.prototype.agent = function () {
  console.warn('This is not supported in browser version of superagent');
  return this;
};

Request.prototype.ca = Request.prototype.agent;
Request.prototype.buffer = Request.prototype.ca; // This throws, because it can't send/receive data as expected

Request.prototype.write = function () {
  throw new Error('Streaming is not supported in browser version of superagent');
};

Request.prototype.pipe = Request.prototype.write;
/**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * @param {Object} obj host object
 * @return {Boolean} is a host object
 * @api private
 */

Request.prototype._isHost = function (obj) {
  // Native objects stringify to [object File], [object Blob], [object FormData], etc.
  return obj && _typeof(obj) === 'object' && !Array.isArray(obj) && Object.prototype.toString.call(obj) !== '[object Object]';
};
/**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */


Request.prototype.end = function (fn) {
  if (this._endCalled) {
    console.warn('Warning: .end() was called twice. This is not supported in superagent');
  }

  this._endCalled = true; // store callback

  this._callback = fn || noop; // querystring

  this._finalizeQueryString();

  this._end();
};

Request.prototype._setUploadTimeout = function () {
  var self = this; // upload timeout it's wokrs only if deadline timeout is off

  if (this._uploadTimeout && !this._uploadTimeoutTimer) {
    this._uploadTimeoutTimer = setTimeout(function () {
      self._timeoutError('Upload timeout of ', self._uploadTimeout, 'ETIMEDOUT');
    }, this._uploadTimeout);
  }
}; // eslint-disable-next-line complexity


Request.prototype._end = function () {
  if (this._aborted) return this.callback(new Error('The request has been aborted even before .end() was called'));
  var self = this;
  this.xhr = request.getXHR();
  var xhr = this.xhr;
  var data = this._formData || this._data;

  this._setTimeouts(); // state change


  xhr.onreadystatechange = function () {
    var readyState = xhr.readyState;

    if (readyState >= 2 && self._responseTimeoutTimer) {
      clearTimeout(self._responseTimeoutTimer);
    }

    if (readyState !== 4) {
      return;
    } // In IE9, reads to any property (e.g. status) off of an aborted XHR will
    // result in the error "Could not complete the operation due to error c00c023f"


    var status;

    try {
      status = xhr.status;
    } catch (_unused5) {
      status = 0;
    }

    if (!status) {
      if (self.timedout || self._aborted) return;
      return self.crossDomainError();
    }

    self.emit('end');
  }; // progress


  var handleProgress = function handleProgress(direction, e) {
    if (e.total > 0) {
      e.percent = e.loaded / e.total * 100;

      if (e.percent === 100) {
        clearTimeout(self._uploadTimeoutTimer);
      }
    }

    e.direction = direction;
    self.emit('progress', e);
  };

  if (this.hasListeners('progress')) {
    try {
      xhr.addEventListener('progress', handleProgress.bind(null, 'download'));

      if (xhr.upload) {
        xhr.upload.addEventListener('progress', handleProgress.bind(null, 'upload'));
      }
    } catch (_unused6) {// Accessing xhr.upload fails in IE from a web worker, so just pretend it doesn't exist.
      // Reported here:
      // https://connect.microsoft.com/IE/feedback/details/837245/xmlhttprequest-upload-throws-invalid-argument-when-used-from-web-worker-context
    }
  }

  if (xhr.upload) {
    this._setUploadTimeout();
  } // initiate request


  try {
    if (this.username && this.password) {
      xhr.open(this.method, this.url, true, this.username, this.password);
    } else {
      xhr.open(this.method, this.url, true);
    }
  } catch (err) {
    // see #1149
    return this.callback(err);
  } // CORS


  if (this._withCredentials) xhr.withCredentials = true; // body

  if (!this._formData && this.method !== 'GET' && this.method !== 'HEAD' && typeof data !== 'string' && !this._isHost(data)) {
    // serialize stuff
    var contentType = this._header['content-type'];

    var _serialize = this._serializer || request.serialize[contentType ? contentType.split(';')[0] : ''];

    if (!_serialize && isJSON(contentType)) {
      _serialize = request.serialize['application/json'];
    }

    if (_serialize) data = _serialize(data);
  } // set header fields


  for (var field in this.header) {
    if (this.header[field] === null) continue;
    if (Object.prototype.hasOwnProperty.call(this.header, field)) xhr.setRequestHeader(field, this.header[field]);
  }

  if (this._responseType) {
    xhr.responseType = this._responseType;
  } // send stuff


  this.emit('request', this); // IE11 xhr.send(undefined) sends 'undefined' string as POST payload (instead of nothing)
  // We need null here if data is undefined

  xhr.send(typeof data === 'undefined' ? null : data);
};

request.agent = function () {
  return new Agent();
};

['GET', 'POST', 'OPTIONS', 'PATCH', 'PUT', 'DELETE'].forEach(function (method) {
  Agent.prototype[method.toLowerCase()] = function (url, fn) {
    var req = new request.Request(method, url);

    this._setDefaults(req);

    if (fn) {
      req.end(fn);
    }

    return req;
  };
});
Agent.prototype.del = Agent.prototype.delete;
/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.get = function (url, data, fn) {
  var req = request('GET', url);

  if (typeof data === 'function') {
    fn = data;
    data = null;
  }

  if (data) req.query(data);
  if (fn) req.end(fn);
  return req;
};
/**
 * HEAD `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */


request.head = function (url, data, fn) {
  var req = request('HEAD', url);

  if (typeof data === 'function') {
    fn = data;
    data = null;
  }

  if (data) req.query(data);
  if (fn) req.end(fn);
  return req;
};
/**
 * OPTIONS query to `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */


request.options = function (url, data, fn) {
  var req = request('OPTIONS', url);

  if (typeof data === 'function') {
    fn = data;
    data = null;
  }

  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};
/**
 * DELETE `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} [data]
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */


function del(url, data, fn) {
  var req = request('DELETE', url);

  if (typeof data === 'function') {
    fn = data;
    data = null;
  }

  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
}

request.del = del;
request.delete = del;
/**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} [data]
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.patch = function (url, data, fn) {
  var req = request('PATCH', url);

  if (typeof data === 'function') {
    fn = data;
    data = null;
  }

  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};
/**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} [data]
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */


request.post = function (url, data, fn) {
  var req = request('POST', url);

  if (typeof data === 'function') {
    fn = data;
    data = null;
  }

  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};
/**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */


request.put = function (url, data, fn) {
  var req = request('PUT', url);

  if (typeof data === 'function') {
    fn = data;
    data = null;
  }

  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

},{"./agent-base":152,"./is-object":154,"./request-base":155,"./response-base":156,"component-emitter":8,"fast-safe-stringify":9}],154:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */
function isObject(obj) {
  return obj !== null && _typeof(obj) === 'object';
}

module.exports = isObject;

},{}],155:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/**
 * Module of mixed-in functions shared between node and client code
 */
var isObject = require('./is-object');
/**
 * Expose `RequestBase`.
 */


module.exports = RequestBase;
/**
 * Initialize a new `RequestBase`.
 *
 * @api public
 */

function RequestBase(obj) {
  if (obj) return mixin(obj);
}
/**
 * Mixin the prototype properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */


function mixin(obj) {
  for (var key in RequestBase.prototype) {
    if (Object.prototype.hasOwnProperty.call(RequestBase.prototype, key)) obj[key] = RequestBase.prototype[key];
  }

  return obj;
}
/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */


RequestBase.prototype.clearTimeout = function () {
  clearTimeout(this._timer);
  clearTimeout(this._responseTimeoutTimer);
  clearTimeout(this._uploadTimeoutTimer);
  delete this._timer;
  delete this._responseTimeoutTimer;
  delete this._uploadTimeoutTimer;
  return this;
};
/**
 * Override default response body parser
 *
 * This function will be called to convert incoming data into request.body
 *
 * @param {Function}
 * @api public
 */


RequestBase.prototype.parse = function (fn) {
  this._parser = fn;
  return this;
};
/**
 * Set format of binary response body.
 * In browser valid formats are 'blob' and 'arraybuffer',
 * which return Blob and ArrayBuffer, respectively.
 *
 * In Node all values result in Buffer.
 *
 * Examples:
 *
 *      req.get('/')
 *        .responseType('blob')
 *        .end(callback);
 *
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */


RequestBase.prototype.responseType = function (val) {
  this._responseType = val;
  return this;
};
/**
 * Override default request body serializer
 *
 * This function will be called to convert data set via .send or .attach into payload to send
 *
 * @param {Function}
 * @api public
 */


RequestBase.prototype.serialize = function (fn) {
  this._serializer = fn;
  return this;
};
/**
 * Set timeouts.
 *
 * - response timeout is time between sending request and receiving the first byte of the response. Includes DNS and connection time.
 * - deadline is the time from start of the request to receiving response body in full. If the deadline is too short large files may not load at all on slow connections.
 * - upload is the time  since last bit of data was sent or received. This timeout works only if deadline timeout is off
 *
 * Value of 0 or false means no timeout.
 *
 * @param {Number|Object} ms or {response, deadline}
 * @return {Request} for chaining
 * @api public
 */


RequestBase.prototype.timeout = function (options) {
  if (!options || _typeof(options) !== 'object') {
    this._timeout = options;
    this._responseTimeout = 0;
    this._uploadTimeout = 0;
    return this;
  }

  for (var option in options) {
    if (Object.prototype.hasOwnProperty.call(options, option)) {
      switch (option) {
        case 'deadline':
          this._timeout = options.deadline;
          break;

        case 'response':
          this._responseTimeout = options.response;
          break;

        case 'upload':
          this._uploadTimeout = options.upload;
          break;

        default:
          console.warn('Unknown timeout option', option);
      }
    }
  }

  return this;
};
/**
 * Set number of retry attempts on error.
 *
 * Failed requests will be retried 'count' times if timeout or err.code >= 500.
 *
 * @param {Number} count
 * @param {Function} [fn]
 * @return {Request} for chaining
 * @api public
 */


RequestBase.prototype.retry = function (count, fn) {
  // Default to 1 if no count passed or true
  if (arguments.length === 0 || count === true) count = 1;
  if (count <= 0) count = 0;
  this._maxRetries = count;
  this._retries = 0;
  this._retryCallback = fn;
  return this;
};

var ERROR_CODES = ['ECONNRESET', 'ETIMEDOUT', 'EADDRINFO', 'ESOCKETTIMEDOUT'];
/**
 * Determine if a request should be retried.
 * (Borrowed from segmentio/superagent-retry)
 *
 * @param {Error} err an error
 * @param {Response} [res] response
 * @returns {Boolean} if segment should be retried
 */

RequestBase.prototype._shouldRetry = function (err, res) {
  if (!this._maxRetries || this._retries++ >= this._maxRetries) {
    return false;
  }

  if (this._retryCallback) {
    try {
      var override = this._retryCallback(err, res);

      if (override === true) return true;
      if (override === false) return false; // undefined falls back to defaults
    } catch (err_) {
      console.error(err_);
    }
  }

  if (res && res.status && res.status >= 500 && res.status !== 501) return true;

  if (err) {
    if (err.code && ERROR_CODES.includes(err.code)) return true; // Superagent timeout

    if (err.timeout && err.code === 'ECONNABORTED') return true;
    if (err.crossDomain) return true;
  }

  return false;
};
/**
 * Retry request
 *
 * @return {Request} for chaining
 * @api private
 */


RequestBase.prototype._retry = function () {
  this.clearTimeout(); // node

  if (this.req) {
    this.req = null;
    this.req = this.request();
  }

  this._aborted = false;
  this.timedout = false;
  this.timedoutError = null;
  return this._end();
};
/**
 * Promise support
 *
 * @param {Function} resolve
 * @param {Function} [reject]
 * @return {Request}
 */


RequestBase.prototype.then = function (resolve, reject) {
  var _this = this;

  if (!this._fullfilledPromise) {
    var self = this;

    if (this._endCalled) {
      console.warn('Warning: superagent request was sent twice, because both .end() and .then() were called. Never call .end() if you use promises');
    }

    this._fullfilledPromise = new Promise(function (resolve, reject) {
      self.on('abort', function () {
        if (_this._maxRetries && _this._maxRetries > _this._retries) {
          return;
        }

        if (_this.timedout && _this.timedoutError) {
          reject(_this.timedoutError);
          return;
        }

        var err = new Error('Aborted');
        err.code = 'ABORTED';
        err.status = _this.status;
        err.method = _this.method;
        err.url = _this.url;
        reject(err);
      });
      self.end(function (err, res) {
        if (err) reject(err);else resolve(res);
      });
    });
  }

  return this._fullfilledPromise.then(resolve, reject);
};

RequestBase.prototype.catch = function (cb) {
  return this.then(undefined, cb);
};
/**
 * Allow for extension
 */


RequestBase.prototype.use = function (fn) {
  fn(this);
  return this;
};

RequestBase.prototype.ok = function (cb) {
  if (typeof cb !== 'function') throw new Error('Callback required');
  this._okCallback = cb;
  return this;
};

RequestBase.prototype._isResponseOK = function (res) {
  if (!res) {
    return false;
  }

  if (this._okCallback) {
    return this._okCallback(res);
  }

  return res.status >= 200 && res.status < 300;
};
/**
 * Get request header `field`.
 * Case-insensitive.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */


RequestBase.prototype.get = function (field) {
  return this._header[field.toLowerCase()];
};
/**
 * Get case-insensitive header `field` value.
 * This is a deprecated internal API. Use `.get(field)` instead.
 *
 * (getHeader is no longer used internally by the superagent code base)
 *
 * @param {String} field
 * @return {String}
 * @api private
 * @deprecated
 */


RequestBase.prototype.getHeader = RequestBase.prototype.get;
/**
 * Set header `field` to `val`, or multiple fields with one object.
 * Case-insensitive.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.set = function (field, val) {
  if (isObject(field)) {
    for (var key in field) {
      if (Object.prototype.hasOwnProperty.call(field, key)) this.set(key, field[key]);
    }

    return this;
  }

  this._header[field.toLowerCase()] = val;
  this.header[field] = val;
  return this;
};
/**
 * Remove header `field`.
 * Case-insensitive.
 *
 * Example:
 *
 *      req.get('/')
 *        .unset('User-Agent')
 *        .end(callback);
 *
 * @param {String} field field name
 */


RequestBase.prototype.unset = function (field) {
  delete this._header[field.toLowerCase()];
  delete this.header[field];
  return this;
};
/**
 * Write the field `name` and `val`, or multiple fields with one object
 * for "multipart/form-data" request bodies.
 *
 * ``` js
 * request.post('/upload')
 *   .field('foo', 'bar')
 *   .end(callback);
 *
 * request.post('/upload')
 *   .field({ foo: 'bar', baz: 'qux' })
 *   .end(callback);
 * ```
 *
 * @param {String|Object} name name of field
 * @param {String|Blob|File|Buffer|fs.ReadStream} val value of field
 * @return {Request} for chaining
 * @api public
 */


RequestBase.prototype.field = function (name, val) {
  // name should be either a string or an object.
  if (name === null || undefined === name) {
    throw new Error('.field(name, val) name can not be empty');
  }

  if (this._data) {
    throw new Error(".field() can't be used if .send() is used. Please use only .send() or only .field() & .attach()");
  }

  if (isObject(name)) {
    for (var key in name) {
      if (Object.prototype.hasOwnProperty.call(name, key)) this.field(key, name[key]);
    }

    return this;
  }

  if (Array.isArray(val)) {
    for (var i in val) {
      if (Object.prototype.hasOwnProperty.call(val, i)) this.field(name, val[i]);
    }

    return this;
  } // val should be defined now


  if (val === null || undefined === val) {
    throw new Error('.field(name, val) val can not be empty');
  }

  if (typeof val === 'boolean') {
    val = String(val);
  }

  this._getFormData().append(name, val);

  return this;
};
/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request} request
 * @api public
 */


RequestBase.prototype.abort = function () {
  if (this._aborted) {
    return this;
  }

  this._aborted = true;
  if (this.xhr) this.xhr.abort(); // browser

  if (this.req) this.req.abort(); // node

  this.clearTimeout();
  this.emit('abort');
  return this;
};

RequestBase.prototype._auth = function (user, pass, options, base64Encoder) {
  switch (options.type) {
    case 'basic':
      this.set('Authorization', "Basic ".concat(base64Encoder("".concat(user, ":").concat(pass))));
      break;

    case 'auto':
      this.username = user;
      this.password = pass;
      break;

    case 'bearer':
      // usage would be .auth(accessToken, { type: 'bearer' })
      this.set('Authorization', "Bearer ".concat(user));
      break;

    default:
      break;
  }

  return this;
};
/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */


RequestBase.prototype.withCredentials = function (on) {
  // This is browser-only functionality. Node side is no-op.
  if (on === undefined) on = true;
  this._withCredentials = on;
  return this;
};
/**
 * Set the max redirects to `n`. Does nothing in browser XHR implementation.
 *
 * @param {Number} n
 * @return {Request} for chaining
 * @api public
 */


RequestBase.prototype.redirects = function (n) {
  this._maxRedirects = n;
  return this;
};
/**
 * Maximum size of buffered response body, in bytes. Counts uncompressed size.
 * Default 200MB.
 *
 * @param {Number} n number of bytes
 * @return {Request} for chaining
 */


RequestBase.prototype.maxResponseSize = function (n) {
  if (typeof n !== 'number') {
    throw new TypeError('Invalid argument');
  }

  this._maxResponseSize = n;
  return this;
};
/**
 * Convert to a plain javascript object (not JSON string) of scalar properties.
 * Note as this method is designed to return a useful non-this value,
 * it cannot be chained.
 *
 * @return {Object} describing method, url, and data of this request
 * @api public
 */


RequestBase.prototype.toJSON = function () {
  return {
    method: this.method,
    url: this.url,
    data: this._data,
    headers: this._header
  };
};
/**
 * Send `data` as the request body, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"}')
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
 *      request.post('/user')
 *        .send('name=tobi')
 *        .send('species=ferret')
 *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */
// eslint-disable-next-line complexity


RequestBase.prototype.send = function (data) {
  var isObj = isObject(data);
  var type = this._header['content-type'];

  if (this._formData) {
    throw new Error(".send() can't be used if .attach() or .field() is used. Please use only .send() or only .field() & .attach()");
  }

  if (isObj && !this._data) {
    if (Array.isArray(data)) {
      this._data = [];
    } else if (!this._isHost(data)) {
      this._data = {};
    }
  } else if (data && this._data && this._isHost(this._data)) {
    throw new Error("Can't merge these send calls");
  } // merge


  if (isObj && isObject(this._data)) {
    for (var key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) this._data[key] = data[key];
    }
  } else if (typeof data === 'string') {
    // default to x-www-form-urlencoded
    if (!type) this.type('form');
    type = this._header['content-type'];

    if (type === 'application/x-www-form-urlencoded') {
      this._data = this._data ? "".concat(this._data, "&").concat(data) : data;
    } else {
      this._data = (this._data || '') + data;
    }
  } else {
    this._data = data;
  }

  if (!isObj || this._isHost(data)) {
    return this;
  } // default to json


  if (!type) this.type('json');
  return this;
};
/**
 * Sort `querystring` by the sort function
 *
 *
 * Examples:
 *
 *       // default order
 *       request.get('/user')
 *         .query('name=Nick')
 *         .query('search=Manny')
 *         .sortQuery()
 *         .end(callback)
 *
 *       // customized sort function
 *       request.get('/user')
 *         .query('name=Nick')
 *         .query('search=Manny')
 *         .sortQuery(function(a, b){
 *           return a.length - b.length;
 *         })
 *         .end(callback)
 *
 *
 * @param {Function} sort
 * @return {Request} for chaining
 * @api public
 */


RequestBase.prototype.sortQuery = function (sort) {
  // _sort default to true but otherwise can be a function or boolean
  this._sort = typeof sort === 'undefined' ? true : sort;
  return this;
};
/**
 * Compose querystring to append to req.url
 *
 * @api private
 */


RequestBase.prototype._finalizeQueryString = function () {
  var query = this._query.join('&');

  if (query) {
    this.url += (this.url.includes('?') ? '&' : '?') + query;
  }

  this._query.length = 0; // Makes the call idempotent

  if (this._sort) {
    var index = this.url.indexOf('?');

    if (index >= 0) {
      var queryArr = this.url.slice(index + 1).split('&');

      if (typeof this._sort === 'function') {
        queryArr.sort(this._sort);
      } else {
        queryArr.sort();
      }

      this.url = this.url.slice(0, index) + '?' + queryArr.join('&');
    }
  }
}; // For backwards compat only


RequestBase.prototype._appendQueryString = function () {
  console.warn('Unsupported');
};
/**
 * Invoke callback with timeout error.
 *
 * @api private
 */


RequestBase.prototype._timeoutError = function (reason, timeout, errno) {
  if (this._aborted) {
    return;
  }

  var err = new Error("".concat(reason + timeout, "ms exceeded"));
  err.timeout = timeout;
  err.code = 'ECONNABORTED';
  err.errno = errno;
  this.timedout = true;
  this.timedoutError = err;
  this.abort();
  this.callback(err);
};

RequestBase.prototype._setTimeouts = function () {
  var self = this; // deadline

  if (this._timeout && !this._timer) {
    this._timer = setTimeout(function () {
      self._timeoutError('Timeout of ', self._timeout, 'ETIME');
    }, this._timeout);
  } // response timeout


  if (this._responseTimeout && !this._responseTimeoutTimer) {
    this._responseTimeoutTimer = setTimeout(function () {
      self._timeoutError('Response timeout of ', self._responseTimeout, 'ETIMEDOUT');
    }, this._responseTimeout);
  }
};

},{"./is-object":154}],156:[function(require,module,exports){
"use strict";

/**
 * Module dependencies.
 */
var utils = require('./utils');
/**
 * Expose `ResponseBase`.
 */


module.exports = ResponseBase;
/**
 * Initialize a new `ResponseBase`.
 *
 * @api public
 */

function ResponseBase(obj) {
  if (obj) return mixin(obj);
}
/**
 * Mixin the prototype properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */


function mixin(obj) {
  for (var key in ResponseBase.prototype) {
    if (Object.prototype.hasOwnProperty.call(ResponseBase.prototype, key)) obj[key] = ResponseBase.prototype[key];
  }

  return obj;
}
/**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */


ResponseBase.prototype.get = function (field) {
  return this.header[field.toLowerCase()];
};
/**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */


ResponseBase.prototype._setHeaderProperties = function (header) {
  // TODO: moar!
  // TODO: make this a util
  // content-type
  var ct = header['content-type'] || '';
  this.type = utils.type(ct); // params

  var params = utils.params(ct);

  for (var key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) this[key] = params[key];
  }

  this.links = {}; // links

  try {
    if (header.link) {
      this.links = utils.parseLinks(header.link);
    }
  } catch (_unused) {// ignore
  }
};
/**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */


ResponseBase.prototype._setStatusProperties = function (status) {
  var type = status / 100 | 0; // status / class

  this.statusCode = status;
  this.status = this.statusCode;
  this.statusType = type; // basics

  this.info = type === 1;
  this.ok = type === 2;
  this.redirect = type === 3;
  this.clientError = type === 4;
  this.serverError = type === 5;
  this.error = type === 4 || type === 5 ? this.toError() : false; // sugar

  this.created = status === 201;
  this.accepted = status === 202;
  this.noContent = status === 204;
  this.badRequest = status === 400;
  this.unauthorized = status === 401;
  this.notAcceptable = status === 406;
  this.forbidden = status === 403;
  this.notFound = status === 404;
  this.unprocessableEntity = status === 422;
};

},{"./utils":157}],157:[function(require,module,exports){
"use strict";

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */
exports.type = function (str) {
  return str.split(/ *; */).shift();
};
/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */


exports.params = function (str) {
  return str.split(/ *; */).reduce(function (obj, str) {
    var parts = str.split(/ *= */);
    var key = parts.shift();
    var val = parts.shift();
    if (key && val) obj[key] = val;
    return obj;
  }, {});
};
/**
 * Parse Link header fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */


exports.parseLinks = function (str) {
  return str.split(/ *, */).reduce(function (obj, str) {
    var parts = str.split(/ *; */);
    var url = parts[0].slice(1, -1);
    var rel = parts[1].split(/ *= */)[1].slice(1, -1);
    obj[rel] = url;
    return obj;
  }, {});
};
/**
 * Strip content related fields from `header`.
 *
 * @param {Object} header
 * @return {Object} header
 * @api private
 */


exports.cleanHeader = function (header, changesOrigin) {
  delete header['content-type'];
  delete header['content-length'];
  delete header['transfer-encoding'];
  delete header.host; // secuirty

  if (changesOrigin) {
    delete header.authorization;
    delete header.cookie;
  }

  return header;
};

},{}],158:[function(require,module,exports){
const finnhub = require("finnhub");
const api_key = finnhub.ApiClient.instance.authentications["api_key"];
api_key.apiKey = "cedmv5iad3i32ebrltggcedmv5iad3i32ebrlth0";
const finnhubClient = new finnhub.DefaultApi();

// DOM Elements
const elemCompany = document.getElementById("company-name");
const elemTicker = document.getElementById("company-ticker");
const elemIndustry = document.getElementById("company-industry");
const elemExchange = document.getElementById("company-exchange");
const elemCurrency = document.getElementById("price-currency");
const elemCurrentPrice = document.getElementById("price-current");
const elemPriceShift = document.getElementById("price-shift");
const elemPriceShiftPercentage = document.getElementById("price-shift-percentage");
const elemPriceHigh = document.getElementById("price-high");
const elemPriceLow = document.getElementById("price-low");
const elemPriceOpen = document.getElementById("price-open");
const elemPriceClose = document.getElementById("price-close");
const elemPETTMPeriod = document.getElementById("PETTMPeriod");
const elemPETTMV = document.getElementById("PETTMV");
const elemEPSPeriod = document.getElementById("EPSPeriod");
const elemEPSV = document.getElementById("EPSV");
const elemNPMTTM = document.getElementById("npmTTM");
const elemMarketCap = document.getElementById("market-cap");


// Buttons
const buttonSearch = document.getElementById("button-search");
const buttonFavorite = document.getElementById("button-search");

buttonSearch.addEventListener("click", searchStocks);

function searchStocks() {
    event.preventDefault();

    const input = document.getElementById("stock-search").value.toUpperCase();

    getCompanyProfile(input)
    getQuote(input);
    getBasicFinancials(input);
}

function getCompanyProfile(input) {
    finnhubClient.companyProfile2({'symbol': `${input}`}, (error, data, response) => {
        if (error) {
            console.log("Error: ", error);
        } else {
            loadCompanyProfile(data);
        }
    });
}

function getQuote(input) {
    finnhubClient.quote(`${input}`, (error, data, response) => {
        if (error) {
            console.log("Error: ", error);
        } else {
            loadQuote(data);
        }
    });
}

function getBasicFinancials(input) {
    finnhubClient.companyBasicFinancials(`${input}`, "all", (error, data, response) => {
        if (error) {
            console.log("Error: ", error);
        } else {
            loadBasicFinancials(data);
        }
    });
}

function loadCompanyProfile (profile) {
    // Load information from API
    company = profile.name;
    ticker = profile.ticker;
    industry = profile.finnhubIndustry;
    exchange = profile.exchange;
    currency = profile.currency;

    elemCompany.innerText = company;
    elemTicker.innerText = ticker;
    elemIndustry.innerText = industry;
    elemExchange.innerText = exchange
    elemCurrency.innerText = currency;
}

function loadQuote(quote) {
    // Load information from API
    currentPrice = quote.c;
    priceChange = quote.d;
    priceChangePercentage = quote.dp;
    priceHigh = quote.h;
    priceLow = quote.l;
    priceOpen = quote.o;
    priceClose = quote.pc;

    elemCurrentPrice.innerText = currentPrice;
    elemPriceShift.innerText = priceChange;
    elemPriceShiftPercentage.innerText = `(${priceChangePercentage}%)`;
    elemPriceHigh.innerText = `$${priceHigh}`;
    elemPriceLow.innerText = `$${priceLow}`;
    elemPriceOpen.innerText = `$${priceOpen}`;
    elemPriceClose.innerText = `$${priceClose}`;
}

function loadBasicFinancials(financials) {
    // Load information from API
    const peTTMPeriod = financials.series.quarterly.peTTM[0].period;
    const peTTMV = financials.series.quarterly.peTTM[0].v;
    const epsPeriod = financials.series.quarterly.eps[0].period;
    const epsV = financials.series.quarterly.eps[0].v;
    const NPMTTM = financials.metric.netProfitMarginTTM;
    const marketCap = financials.metric.marketCapitalization;

    elemPETTMPeriod.innerText = peTTMPeriod;
    elemPETTMV.innerText = peTTMV;
    elemEPSPeriod.innerText = epsPeriod;
    elemEPSV.innerText = epsV;
    elemNPMTTM.innerText = NPMTTM;
    elemMarketCap.innerText = marketCap;
}

window.addEventListener("load", (e) => {
    getCompanyProfile("AAPL")
    getQuote("AAPL");
    getBasicFinancials("AAPL");
})
},{"finnhub":12}]},{},[158]);
