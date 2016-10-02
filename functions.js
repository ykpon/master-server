var db = require('./db.js');

var funcs = {
    send_reply: function(p, r, s) {
        var prepare = "";
        if (Array.isArray(p)) {
            prepare += p[0];
            var addr = p[1].split(":");
            prepare += funcs.inet_pton(addr[0]);
            prepare += funcs.pack('n*', addr[1]);
        } else {
            prepare = p;
        }
        var reply = new Buffer(prepare, 'ascii');
        s.send(reply, 0, reply.length, r.port, r.address, function(err, bytes) {
            if (err) {
                //console.error("Error sending OK buffer to client", err);
            } else {
                //console.log("OK sent to client: " + bytes);
            }
        });
    },
    get_servers: function(a, callback) {
        switch (a) {
            case 'all':
                db.query('SELECT * FROM `ms_servers`', function(err, rows) {
                    if (err) throw err;
                    var r = "";
                    for (i = 0; i < rows.length; i++) {
                        var addr = rows[i].addr.split(":");
                        r += funcs.inet_pton(addr[0]);
                        r += funcs.pack('n*', addr[1]);
                    }
                    console.log("Обновление списка обычных серверов. Всего: " + rows.length);
                    callback(null, r);
                });
                break;
            case 'boost':
                db.query('SELECT * FROM `ms_boost` ORDER BY `id` DESC', function(err, rows) {
                    if (err) throw err;
                    var r = [];
                    for (i = 0; i < rows.length; i++) {
                        r[r.length] = rows[i].addr;
                    }
                    console.log("Обновление списка boost серверов. Всего: " + rows.length);
                    callback(null, r);
                });
                break;
        }
    },
    inet_pton: function(a) {
        var m
        var f = String.fromCharCode
        m = a.match(/^(?:\d{1,3}(?:\.|$)){4}/)
        if (m) {
            m = m[0].split('.')
            m = f(m[0]) + f(m[1]) + f(m[2]) + f(m[3])
                // Return if 4 bytes, otherwise false.
            return m.length === 4 ? m : false
        }
        return false
    },
    pack: function(format) {
        var formatPointer = 0
        var argumentPointer = 1
        var result = ''
        var argument = ''
        var i = 0
        var r = []
        var instruction, quantifier, word, precisionBits, exponentBits, extraNullCount

        // vars used by float encoding
        var bias
        var minExp
        var maxExp
        var minUnnormExp
        var status
        var exp
        var len
        var bin
        var signal
        var n
        var intPart
        var floatPart
        var lastBit
        var rounded
        var j
        var k
        var tmpResult

        while (formatPointer < format.length) {
            instruction = format.charAt(formatPointer)
            quantifier = ''
            formatPointer++
            while ((formatPointer < format.length) && (format.charAt(formatPointer)
                    .match(/[\d\*]/) !== null)) {
                quantifier += format.charAt(formatPointer)
                formatPointer++
            }
            if (quantifier === '') {
                quantifier = '1'
            }

            // Now pack variables: 'quantifier' times 'instruction'
            switch (instruction) {
                case 'a':
                case 'A':
                    // NUL-padded string
                    // SPACE-padded string
                    if (typeof arguments[argumentPointer] === 'undefined') {
                        throw new Error('Warning:  pack() Type ' + instruction + ': not enough arguments')
                    } else {
                        argument = String(arguments[argumentPointer])
                    }
                    if (quantifier === '*') {
                        quantifier = argument.length
                    }
                    for (i = 0; i < quantifier; i++) {
                        if (typeof argument[i] === 'undefined') {
                            if (instruction === 'a') {
                                result += String.fromCharCode(0)
                            } else {
                                result += ' '
                            }
                        } else {
                            result += argument[i]
                        }
                    }
                    argumentPointer++
                    break
                case 'h':
                case 'H':
                    // Hex string, low nibble first
                    // Hex string, high nibble first
                    if (typeof arguments[argumentPointer] === 'undefined') {
                        throw new Error('Warning: pack() Type ' + instruction + ': not enough arguments')
                    } else {
                        argument = arguments[argumentPointer]
                    }
                    if (quantifier === '*') {
                        quantifier = argument.length
                    }
                    if (quantifier > argument.length) {
                        var msg = 'Warning: pack() Type ' + instruction + ': not enough characters in string'
                        throw new Error(msg)
                    }

                    for (i = 0; i < quantifier; i += 2) {
                        // Always get per 2 bytes...
                        word = argument[i]
                        if (((i + 1) >= quantifier) || typeof argument[i + 1] === 'undefined') {
                            word += '0'
                        } else {
                            word += argument[i + 1]
                        }
                        // The fastest way to reverse?
                        if (instruction === 'h') {
                            word = word[1] + word[0]
                        }
                        result += String.fromCharCode(parseInt(word, 16))
                    }
                    argumentPointer++
                    break

                case 'c':
                case 'C':
                    // signed char
                    // unsigned char
                    // c and C is the same in pack
                    if (quantifier === '*') {
                        quantifier = arguments.length - argumentPointer
                    }
                    if (quantifier > (arguments.length - argumentPointer)) {
                        throw new Error('Warning:  pack() Type ' + instruction + ': too few arguments')
                    }

                    for (i = 0; i < quantifier; i++) {
                        result += String.fromCharCode(arguments[argumentPointer])
                        argumentPointer++
                    }
                    break

                case 's':
                case 'S':
                case 'v':
                    // signed short (always 16 bit, machine byte order)
                    // unsigned short (always 16 bit, machine byte order)
                    // s and S is the same in pack
                    if (quantifier === '*') {
                        quantifier = arguments.length - argumentPointer
                    }
                    if (quantifier > (arguments.length - argumentPointer)) {
                        throw new Error('Warning:  pack() Type ' + instruction + ': too few arguments')
                    }

                    for (i = 0; i < quantifier; i++) {
                        result += String.fromCharCode(arguments[argumentPointer] & 0xFF)
                        result += String.fromCharCode(arguments[argumentPointer] >> 8 & 0xFF)
                        argumentPointer++
                    }
                    break

                case 'n':
                    // unsigned short (always 16 bit, big endian byte order)
                    if (quantifier === '*') {
                        quantifier = arguments.length - argumentPointer
                    }
                    if (quantifier > (arguments.length - argumentPointer)) {
                        throw new Error('Warning: pack() Type ' + instruction + ': too few arguments')
                    }

                    for (i = 0; i < quantifier; i++) {
                        result += String.fromCharCode(arguments[argumentPointer] >> 8 & 0xFF)
                        result += String.fromCharCode(arguments[argumentPointer] & 0xFF)
                        argumentPointer++
                    }
                    break

                case 'i':
                case 'I':
                case 'l':
                case 'L':
                case 'V':
                    // signed integer (machine dependent size and byte order)
                    // unsigned integer (machine dependent size and byte order)
                    // signed long (always 32 bit, machine byte order)
                    // unsigned long (always 32 bit, machine byte order)
                    // unsigned long (always 32 bit, little endian byte order)
                    if (quantifier === '*') {
                        quantifier = arguments.length - argumentPointer
                    }
                    if (quantifier > (arguments.length - argumentPointer)) {
                        throw new Error('Warning:  pack() Type ' + instruction + ': too few arguments')
                    }

                    for (i = 0; i < quantifier; i++) {
                        result += String.fromCharCode(arguments[argumentPointer] & 0xFF)
                        result += String.fromCharCode(arguments[argumentPointer] >> 8 & 0xFF)
                        result += String.fromCharCode(arguments[argumentPointer] >> 16 & 0xFF)
                        result += String.fromCharCode(arguments[argumentPointer] >> 24 & 0xFF)
                        argumentPointer++
                    }

                    break
                case 'N':
                    // unsigned long (always 32 bit, big endian byte order)
                    if (quantifier === '*') {
                        quantifier = arguments.length - argumentPointer
                    }
                    if (quantifier > (arguments.length - argumentPointer)) {
                        throw new Error('Warning:  pack() Type ' + instruction + ': too few arguments')
                    }

                    for (i = 0; i < quantifier; i++) {
                        result += String.fromCharCode(arguments[argumentPointer] >> 24 & 0xFF)
                        result += String.fromCharCode(arguments[argumentPointer] >> 16 & 0xFF)
                        result += String.fromCharCode(arguments[argumentPointer] >> 8 & 0xFF)
                        result += String.fromCharCode(arguments[argumentPointer] & 0xFF)
                        argumentPointer++
                    }
                    break

                case 'f':
                case 'd':
                    // float (machine dependent size and representation)
                    // double (machine dependent size and representation)
                    // version based on IEEE754
                    precisionBits = 23
                    exponentBits = 8
                    if (instruction === 'd') {
                        precisionBits = 52
                        exponentBits = 11
                    }

                    if (quantifier === '*') {
                        quantifier = arguments.length - argumentPointer
                    }
                    if (quantifier > (arguments.length - argumentPointer)) {
                        throw new Error('Warning:  pack() Type ' + instruction + ': too few arguments')
                    }
                    for (i = 0; i < quantifier; i++) {
                        argument = arguments[argumentPointer]
                        bias = Math.pow(2, exponentBits - 1) - 1
                        minExp = -bias + 1
                        maxExp = bias
                        minUnnormExp = minExp - precisionBits
                        status = isNaN(n = parseFloat(argument)) || n === -Infinity || n === +Infinity ? n : 0
                        exp = 0
                        len = 2 * bias + 1 + precisionBits + 3
                        bin = new Array(len)
                        signal = (n = status !== 0 ? 0 : n) < 0
                        n = Math.abs(n)
                        intPart = Math.floor(n)
                        floatPart = n - intPart

                        for (k = len; k;) {
                            bin[--k] = 0
                        }
                        for (k = bias + 2; intPart && k;) {
                            bin[--k] = intPart % 2
                            intPart = Math.floor(intPart / 2)
                        }
                        for (k = bias + 1; floatPart > 0 && k; --floatPart) {
                            (bin[++k] = ((floatPart *= 2) >= 1) - 0)
                        }
                        for (k = -1; ++k < len && !bin[k];) {}

                        // @todo: Make this more readable:
                        var key = (lastBit = precisionBits - 1 +
                            (k =
                                (exp = bias + 1 - k) >= minExp &&
                                exp <= maxExp ? k + 1 : bias + 1 - (exp = minExp - 1))) + 1

                        if (bin[key]) {
                            if (!(rounded = bin[lastBit])) {
                                for (j = lastBit + 2; !rounded && j < len; rounded = bin[j++]) {}
                            }
                            for (j = lastBit + 1; rounded && --j >= 0;
                                (bin[j] = !bin[j] - 0) && (rounded = 0)) {}
                        }

                        for (k = k - 2 < 0 ? -1 : k - 3; ++k < len && !bin[k];) {}

                        if ((exp = bias + 1 - k) >= minExp && exp <= maxExp) {
                            ++k
                        } else {
                            if (exp < minExp) {
                                if (exp !== bias + 1 - len && exp < minUnnormExp) {
                                    // "encodeFloat::float underflow"
                                }
                                k = bias + 1 - (exp = minExp - 1)
                            }
                        }

                        if (intPart || status !== 0) {
                            exp = maxExp + 1
                            k = bias + 2
                            if (status === -Infinity) {
                                signal = 1
                            } else if (isNaN(status)) {
                                bin[k] = 1
                            }
                        }

                        n = Math.abs(exp + bias)
                        tmpResult = ''

                        for (j = exponentBits + 1; --j;) {
                            tmpResult = (n % 2) + tmpResult
                            n = n >>= 1
                        }

                        n = 0
                        j = 0
                        k = (tmpResult = (signal ? '1' : '0') + tmpResult + (bin
                            .slice(k, k + precisionBits)
                            .join(''))).length
                        r = []

                        for (; k;) {
                            n += (1 << j) * tmpResult.charAt(--k)
                            if (j === 7) {
                                r[r.length] = String.fromCharCode(n)
                                n = 0
                            }
                            j = (j + 1) % 8
                        }

                        r[r.length] = n ? String.fromCharCode(n) : ''
                        result += r.join('')
                        argumentPointer++
                    }
                    break

                case 'x':
                    // NUL byte
                    if (quantifier === '*') {
                        throw new Error('Warning: pack(): Type x: \'*\' ignored')
                    }
                    for (i = 0; i < quantifier; i++) {
                        result += String.fromCharCode(0)
                    }
                    break

                case 'X':
                    // Back up one byte
                    if (quantifier === '*') {
                        throw new Error('Warning: pack(): Type X: \'*\' ignored')
                    }
                    for (i = 0; i < quantifier; i++) {
                        if (result.length === 0) {
                            throw new Error('Warning: pack(): Type X:' + ' outside of string')
                        } else {
                            result = result.substring(0, result.length - 1)
                        }
                    }
                    break

                case '@':
                    // NUL-fill to absolute position
                    if (quantifier === '*') {
                        throw new Error('Warning: pack(): Type X: \'*\' ignored')
                    }
                    if (quantifier > result.length) {
                        extraNullCount = quantifier - result.length
                        for (i = 0; i < extraNullCount; i++) {
                            result += String.fromCharCode(0)
                        }
                    }
                    if (quantifier < result.length) {
                        result = result.substring(0, quantifier)
                    }
                    break

                default:
                    throw new Error('Warning: pack() Type ' + instruction + ': unknown format code')
            }
        }
        if (argumentPointer < arguments.length) {
            var msg2 = 'Warning: pack(): ' + (arguments.length - argumentPointer) + ' arguments unused'
            throw new Error(msg2)
        }

        return result
    },
    an: function(f) {
        return function() {
            f.apply(f, arguments);
            return f;
        }
    }
};

module.exports = funcs;