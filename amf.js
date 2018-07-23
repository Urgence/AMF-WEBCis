/*
amf.js - An AMF library in JavaScript
Copyright (c) 2010, James Ward - www.jamesward.com
All rights reserved.
Redistribution and use in source and binary forms, with or without modification, are
permitted provided that the following conditions are met:
   1. Redistributions of source code must retain the above copyright notice, this list of
      conditions and the following disclaimer.
   2. Redistributions in binary form must reproduce the above copyright notice, this list
      of conditions and the following disclaimer in the documentation and/or other materials
      provided with the distribution.
THIS SOFTWARE IS PROVIDED BY JAMES WARD ''AS IS'' AND ANY EXPRESS OR IMPLIED
WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JAMES WARD OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
The views and conclusions contained in the software and documentation are those of the
authors and should not be interpreted as representing official policies, either expressed
or implied, of James Ward.
*/
const decodeAMF = (data) => {
    let bytes = new a3d.ByteArray(data, a3d.Endian.BIG);
    //console.log(dumpHex(bytes));
    let version = bytes.readUnsignedShort();
    bytes.objectEncoding = a3d.ObjectEncoding.AMF0;
    let response = new a3d.AMFPacket();

    // Headers
    let headerCount = bytes.readUnsignedShort();
    for (let h = 0; h < headerCount; h++) {
        let headerName = bytes.readUTF();
        let mustUnderstand = bytes.readBoolean();
        bytes.readInt(); // Consume header length...
        // Handle AVM+ type marker
        if (version == a3d.ObjectEncoding.AMF3) {
            let typeMarker = bytes.readByte();
            if (typeMarker == a3d.Amf0Types.kAvmPlusObjectType)
                bytes.objectEncoding = a3d.ObjectEncoding.AMF3;
            else
                bytes.pos = bytes.pos - 1;
        }
        let headerValue = bytes.readObject();
        /*
          // Read off the remaining bytes to account for the reset of
          // the by-reference index on each header value
          remainingBytes = new a3d.ByteArray();
          remainingBytes.objectEncoding = bytes.objectEncoding;
          bytes.readBytes(remainingBytes, 0, bytes.length - bytes.pos);
          bytes = remainingBytes;
          remainingBytes = null;
          */
        let header = new a3d.AMFHeader(headerName, mustUnderstand, headerValue);
        response.headers.push(header);
        // Reset to AMF0 for next header
        bytes.objectEncoding = a3d.ObjectEncoding.AMF0;
    }
    // Message Bodies
    let messageCount = bytes.readUnsignedShort();
    for (let m = 0; m < messageCount; m++) {
        let targetURI = bytes.readUTF();
        let responseURI = bytes.readUTF();
        bytes.readInt(); // Consume message body length...
        // Handle AVM+ type marker
        if (version == a3d.ObjectEncoding.AMF3) {
            let typeMarker = bytes.readByte();
            if (typeMarker == a3d.Amf0Types.kAvmPlusObjectType)
                bytes.objectEncoding = a3d.ObjectEncoding.AMF3;
            else
                bytes.pos = bytes.pos - 1;
        }
        let messageBody = bytes.readObject();
        let message = new a3d.AMFMessage(targetURI, responseURI, messageBody);
        response.messages.push(message);
        bytes.objectEncoding = a3d.ObjectEncoding.AMF0;
    }
    return response;
};

const dumpHex = (bytes) => {
    let s = "";
    let i = 0;
    let chunk = [];
    while (i < bytes.length) {
        if (((i % 16) == 0) && (i != 0)) {
            s += writeChunk(chunk, 16) + "\n";
            chunk = [];
        }
        chunk.push(bytes.readUnsignedByte());
        i++;
    }
    s += writeChunk(chunk, 16);
    bytes.pos = 0;
    return s;
};

const writeChunk = (chunk, width) => {
    let s = "";
    for (let i = 0; i < chunk.length; i++) {
        if (((i % 4) == 0) && (i != 0)) {
            s += " ";
        }
        let b = chunk[i];
        let ss = b.toString(16) + " ";
        if (ss.length == 2) {
            ss = "0" + ss;
        }
        s += ss;
    }
    for (let i = 0; i < (width - chunk.length); i++) {
        s += "   ";
    }
    let j = Math.floor((width - chunk.length) / 4);
    for (let i = 0; i < j; i++) {
        s += " ";
    }
    s += "   ";
    for (let i = 0; i < chunk.length; i++) {
        let b = chunk[i];

        if ((b <= 126) && (b > 32)) {
            let ss = String.fromCharCode(b);
            s += ss;
        }
        else {
            s += ".";
        }
    }
    return s;
};


/**
 * @preserve
 * Adamia 3D Engine v0.1
 * Copyright (c) 2010 Adam R. Smith
 * Licensed under the new BSD License:
 * http://www.opensource.org/licenses/bsd-license.php
 *
 * Project home: http://code.google.com/p/adamia-3d/
 *
 * Date: 01/12/2010
 */


/** @namespace */
a3d = {};

// Taken from http://ejohn.org/blog/simple-javascript-inheritance/
// Inspired by base2 and Prototype
(function () {
    let initializing = false, fnTest = /xyz/.test(function () {
        xyz;
    }) ? /\b_super\b/ : /.*/;

    // The base Class implementation (does nothing)
    /** @class */
    this.Class = function () {
    };

    // Create a new Class that inherits from this class
    Class.extend = function (prop) {
        let _super = this.prototype;

        // Instantiate a base class (but only create the instance,
        // don't run the init constructor)
        initializing = true;
        let prototype = new this();
        initializing = false;

        // Copy the properties over onto the new prototype
        for (let name in prop) {
            // Check if we're overwriting an existing function
            prototype[name] = typeof prop[name] == "function" &&
            typeof _super[name] == "function" && fnTest.test(prop[name]) ?
                (function (name, fn) {
                    return function () {
                        let tmp = this._super;

                        // Add a new ._super() method that is the same method
                        // but on the super-class
                        this._super = _super[name];

                        // The method only need to be bound temporarily, so we
                        // remove it when we're done executing
                        let ret = fn.apply(this, arguments);
                        this._super = tmp;

                        return ret;
                    };
                })(name, prop[name]) :
                prop[name];
        }

        // The dummy class constructor
        function Class() {
            // All construction is actually done in the init method
            if (!initializing && this.init)
                this.init.apply(this, arguments);
        }

        // Populate our constructed prototype object
        Class.prototype = prototype;

        // Enforce the constructor to be what we expect
        Class.constructor = Class;

        // And make this class extendable
        Class.extend = arguments.callee;

        return Class;
    };
})();
/**
 * Enum for big or little endian.
 * @enum {number}
 */
a3d.Endian = {
    BIG: 0
    , LITTLE: 1
};

a3d.ObjectEncoding = {
    AMF0: 0
    , AMF3: 3
};

a3d.Amf0Types = {
    kNumberType: 0
    , kBooleanType: 1
    , kStringType: 2
    , kObjectType: 3
    , kMovieClipType: 4
    , kNullType: 5
    , kUndefinedType: 6
    , kReferenceType: 7
    , kECMAArrayType: 8
    , kObjectEndType: 9
    , kStrictArrayType: 10
    , kDateType: 11
    , kLongStringType: 12
    , kUnsupportedType: 13
    , kRecordsetType: 14
    , kXMLObjectType: 15
    , kTypedObjectType: 16
    , kAvmPlusObjectType: 17
};

a3d.Amf3Types = {
    kUndefinedType: 0
    , kNullType: 1
    , kFalseType: 2
    , kTrueType: 3
    , kIntegerType: 4
    , kDoubleType: 5
    , kStringType: 6
    , kXMLType: 7
    , kDateType: 8
    , kArrayType: 9
    , kObjectType: 10
    , kAvmPlusXmlType: 11
    , kByteArrayType: 12
};


a3d.AMFMessage = Class.extend({
    targetURL: ""
    , responseURI: ""
    , body: {}

    , init: function (targetURL, responseURI, body) {
        this.targetURL = targetURL;
        this.responseURI = responseURI;
        this.body = body;
    }
});

a3d.AMFPacket = Class.extend({
    version: 0
    , headers: []
    , messages: []

    , init: function (version) {
        this.version = (version !== undefined) ? version : 0;
        this.headers = [];
        this.messages = [];
    }
});

a3d.AMFHeader = Class.extend({
    name: ""
    , mustUnderstand: false
    , data: {}

    , init: function (name, mustUnderstand, data) {
        this.name = name;
        this.mustUnderstand = (mustUnderstand != undefined) ? mustUnderstand : false;
        this.data = data;
    }
});

/**
 * Attempt to imitate AS3's ByteArray as very high-performance javascript.
 * I aliased the functions to have shorter names, like ReadUInt32 as well as ReadUnsignedInt.
 * I used some code from http://fhtr.blogspot.com/2009/12/3d-models-and-parsing-binary-data-with.html
 * to kick-start it, but I added optimizations and support both big and little endian.
 * Note that you cannot change the endianness after construction.
 * @extends Class
 */
a3d.ByteArray = Class.extend({
    data: []
    , length: 0
    , pos: 0
    , pow: Math.pow
    , endian: a3d.Endian.BIG
    , TWOeN23: Math.pow(2, -23)
    , TWOeN52: Math.pow(2, -52)
    , objectEncoding: a3d.ObjectEncoding.AMF0
    , stringTable: []
    , objectTable: []
    , traitTable: []

    /** @constructor */
    , init: function (data, endian) {
        if (typeof data == "string") {
            data = data.split("").map(function (c) {
                return c.charCodeAt(0);
            });
        }

        this.data = (data !== undefined) ? data : [];
        if (endian !== undefined) this.endian = endian;
        this.length = data.length;

        this.stringTable = [];
        this.objectTable = [];
        this.traitTable = [];

        // Cache the function pointers based on endianness.
        // This avoids doing an if-statement in every function call.
        let funcExt = (endian == a3d.Endian.BIG) ? 'BE' : 'LE';
        let funcs = ['readInt32', 'readInt16', 'readUInt30', 'readUInt32', 'readUInt16', 'readFloat32', 'readFloat64'];
        for (let func in funcs) {
            this[funcs[func]] = this[funcs[func] + funcExt];
        }

        // Add redundant members that match actionscript for compatibility
        let funcMap = {
            readUnsignedByte: 'readByte',
            readUnsignedInt: 'readUInt32',
            readFloat: 'readFloat32',
            readDouble: 'readFloat64',
            readShort: 'readInt16',
            readUnsignedShort: 'readUInt16',
            readBoolean: 'readBool',
            readInt: 'readInt32'
        };
        for (let func in funcMap) {
            this[func] = this[funcMap[func]];
        }
    }

    , readByte: function () {
        let cc = this.data[this.pos++];
        return (cc & 0xFF);
    }

    , writeByte: function (byte) {
        this.data.push(byte);
    }

    , readBool: function () {
        return (this.data[this.pos++] & 0xFF) ? true : false;
    }

    , readUInt30BE: function () {
        let ch1 = readByte();
        let ch2 = readByte();
        let ch3 = readByte();
        let ch4 = readByte();

        if (ch1 >= 64)
            return undefined;

        return ch4 | (ch3 << 8) | (ch2 << 16) | (ch1 << 24);
    }

    , readUInt32BE: function () {
        let data = this.data, pos = (this.pos += 4) - 4;
        return ((data[pos] & 0xFF) << 24) |
            ((data[++pos] & 0xFF) << 16) |
            ((data[++pos] & 0xFF) << 8) |
            (data[++pos] & 0xFF);
    }
    , readInt32BE: function () {
        let data = this.data, pos = (this.pos += 4) - 4;
        let x = ((data[pos] & 0xFF) << 24) |
            ((data[++pos] & 0xFF) << 16) |
            ((data[++pos] & 0xFF) << 8) |
            (data[++pos] & 0xFF);
        return (x >= 2147483648) ? x - 4294967296 : x;
    }

    , readUInt16BE: function () {
        let data = this.data, pos = (this.pos += 2) - 2;
        return ((data[pos] & 0xFF) << 8) |
            (data[++pos] & 0xFF);
    }
    , readInt16BE: function () {
        let data = this.data, pos = (this.pos += 2) - 2;
        let x = ((data[pos] & 0xFF) << 8) |
            (data[++pos] & 0xFF);
        return (x >= 32768) ? x - 65536 : x;
    }

    , readFloat32BE: function () {
        let data = this.data, pos = (this.pos += 4) - 4;
        let b1 = data[pos] & 0xFF,
            b2 = data[++pos] & 0xFF,
            b3 = data[++pos] & 0xFF,
            b4 = data[++pos] & 0xFF;
        let sign = 1 - ((b1 >> 7) << 1);                   // sign = bit 0
        let exp = (((b1 << 1) & 0xFF) | (b2 >> 7)) - 127;  // exponent = bits 1..8
        let sig = ((b2 & 0x7F) << 16) | (b3 << 8) | b4;    // significand = bits 9..31
        if (sig == 0 && exp == -127)
            return 0.0;
        return sign * (1 + this.TWOeN23 * sig) * this.pow(2, exp);
    }

    , readFloat64BE: function () {
        let b1 = this.readByte();
        let b2 = this.readByte();
        let b3 = this.readByte();
        let b4 = this.readByte();
        let b5 = this.readByte();
        let b6 = this.readByte();
        let b7 = this.readByte();
        let b8 = this.readByte();

        let sign = 1 - ((b1 >> 7) << 1);									// sign = bit 0
        let exp = (((b1 << 4) & 0x7FF) | (b2 >> 4)) - 1023;					// exponent = bits 1..11

        // This crazy toString() stuff works around the fact that js ints are
        // only 32 bits and signed, giving us 31 bits to work with
        let sig = (((b2 & 0xF) << 16) | (b3 << 8) | b4).toString(2) +
            ((b5 >> 7) ? '1' : '0') +
            (((b5 & 0x7F) << 24) | (b6 << 16) | (b7 << 8) | b8).toString(2);	// significand = bits 12..63

        sig = parseInt(sig, 2);

        if (sig == 0 && exp == -1023)
            return 0.0;

        return sign * (1.0 + this.TWOeN52 * sig) * this.pow(2, exp);
        /*
        let sig = (((b2 & 0xF) << 16) | (b3 << 8) | b4).toString(2) +
                  (((b5 & 0xF) << 16) | (b6 << 8) | b7).toString(2) +
                  (b8).toString(2);
        // should have 52 bits here
        console.log(sig.length);
        // this doesn't work   sig = parseInt(sig, 2);

        let newSig = 0;
        for (let i = 0; i < sig.length; i++)
        {
          let binaryPlace = this.pow(2, sig.length - i - 1);
          let binaryValue = parseInt(sig.charAt(i));
          newSig += binaryPlace * binaryValue;
        }
        if (newSig == 0 && exp == -1023)
          return 0.0;
        let mantissa = this.TWOeN52 * newSig;
        return sign * (1.0 + mantissa) * this.pow(2, exp);
        */
    }

    , readUInt29: function () {
        let value;

        // Each byte must be treated as unsigned
        let b = this.readByte() & 0xFF;

        if (b < 128)
            return b;

        value = (b & 0x7F) << 7;
        b = this.readByte() & 0xFF;

        if (b < 128)
            return (value | b);

        value = (value | (b & 0x7F)) << 7;
        b = this.readByte() & 0xFF;

        if (b < 128)
            return (value | b);

        value = (value | (b & 0x7F)) << 8;
        b = this.readByte() & 0xFF;

        return (value | b);
    }

    , readUInt30LE: function () {
        let ch1 = readByte();
        let ch2 = readByte();
        let ch3 = readByte();
        let ch4 = readByte();

        if (ch4 >= 64)
            return undefined;

        return ch1 | (ch2 << 8) | (ch3 << 16) | (ch4 << 24);
    }

    , readUInt32LE: function () {
        let data = this.data, pos = (this.pos += 4);
        return ((data[--pos] & 0xFF) << 24) |
            ((data[--pos] & 0xFF) << 16) |
            ((data[--pos] & 0xFF) << 8) |
            (data[--pos] & 0xFF);
    }
    , readInt32LE: function () {
        let data = this.data, pos = (this.pos += 4);
        let x = ((data[--pos] & 0xFF) << 24) |
            ((data[--pos] & 0xFF) << 16) |
            ((data[--pos] & 0xFF) << 8) |
            (data[--pos] & 0xFF);
        return (x >= 2147483648) ? x - 4294967296 : x;
    }

    , readUInt16LE: function () {
        let data = this.data, pos = (this.pos += 2);
        return ((data[--pos] & 0xFF) << 8) |
            (data[--pos] & 0xFF);
    }
    , readInt16LE: function () {
        let data = this.data, pos = (this.pos += 2);
        let x = ((data[--pos] & 0xFF) << 8) |
            (data[--pos] & 0xFF);
        return (x >= 32768) ? x - 65536 : x;
    }

    , readFloat32LE: function () {
        let data = this.data, pos = (this.pos += 4);
        let b1 = data[--pos] & 0xFF,
            b2 = data[--pos] & 0xFF,
            b3 = data[--pos] & 0xFF,
            b4 = data[--pos] & 0xFF;
        let sign = 1 - ((b1 >> 7) << 1);                   // sign = bit 0
        let exp = (((b1 << 1) & 0xFF) | (b2 >> 7)) - 127;  // exponent = bits 1..8
        let sig = ((b2 & 0x7F) << 16) | (b3 << 8) | b4;    // significand = bits 9..31
        if (sig == 0 && exp == -127)
            return 0.0;
        return sign * (1 + this.TWOeN23 * sig) * this.pow(2, exp);
    }

    , readFloat64LE: function () {
        let data = this.data, pos = (this.pos += 8);
        let b1 = data[--pos] & 0xFF,
            b2 = data[--pos] & 0xFF,
            b3 = data[--pos] & 0xFF,
            b4 = data[--pos] & 0xFF,
            b5 = data[--pos] & 0xFF,
            b6 = data[--pos] & 0xFF,
            b7 = data[--pos] & 0xFF,
            b8 = data[--pos] & 0xFF;
        let sign = 1 - ((b1 >> 7) << 1);									// sign = bit 0
        let exp = (((b1 << 4) & 0x7FF) | (b2 >> 4)) - 1023;					// exponent = bits 1..11

        // This crazy toString() stuff works around the fact that js ints are
        // only 32 bits and signed, giving us 31 bits to work with
        let sig = (((b2 & 0xF) << 16) | (b3 << 8) | b4).toString(2) +
            ((b5 >> 7) ? '1' : '0') +
            (((b5 & 0x7F) << 24) | (b6 << 16) | (b7 << 8) | b8).toString(2);	// significand = bits 12..63

        sig = parseInt(sig, 2);
        if (sig == 0 && exp == -1023)
            return 0.0;
        return sign * (1.0 + this.TWOeN52 * sig) * this.pow(2, exp);
    }

    , readDate: function () {
        let time_ms = this.readDouble();
        let tz_min = this.readUInt16();
        return new Date(time_ms + tz_min * 60 * 1000);
    }

    , readString: function (len) {
        let str = "";

        while (len > 0) {
            str += String.fromCharCode(this.readUnsignedByte());
            len--;
        }
        return str;
    }

    , readUTF: function () {
        return this.readString(this.readUnsignedShort());
    }

    , readLongUTF: function () {
        return this.readString(this.readUInt30());
    }

    , stringToXML: function (str) {
        let xmlDoc;

        if (window.DOMParser) {
            let parser = new DOMParser();
            xmlDoc = parser.parseFromString(str, "text/xml");
        }
        else // IE
        {
            xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
            xmlDoc.async = false;
            xmlDoc.loadXML(stc);
        }

        return xmlDoc;
    }

    , readXML: function () {
        let xml = this.readLongUTF();

        return this.stringToXML(xml);
    }

    , readStringAMF3: function () {
        let ref = this.readUInt29();

        if ((ref & 1) == 0) // This is a reference
            return this.stringTable[(ref >> 1)];

        let len = (ref >> 1);

        if (0 == len)
            return "";

        let str = this.readString(len);

        this.stringTable.push(str);

        return str;
    }

    , readTraits: function (ref) {
        let traitInfo = {};
        traitInfo.properties = [];

        if ((ref & 3) == 1)
            return this.traitTable[(ref >> 2)];

        traitInfo.externalizable = ((ref & 4) == 4);

        traitInfo.dynamic = ((ref & 8) == 8);

        traitInfo.count = (ref >> 4);
        traitInfo.className = this.readStringAMF3();

        this.traitTable.push(traitInfo);

        for (let i = 0; i < traitInfo.count; i++) {
            let propName = this.readStringAMF3();
            traitInfo.properties.push(propName);
        }

        return traitInfo;
    }

    , readExternalizable: function (className) {
        return this.readObject();
    }

    , readObject: function () {
        if (this.objectEncoding == a3d.ObjectEncoding.AMF0) {
            return this.readAMF0Object();
        }
        else if (this.objectEncoding == a3d.ObjectEncoding.AMF3) {
            return this.readAMF3Object();
        }
    }

    , readAMF0Object: function () {
        let marker = this.readByte();

        if (marker == a3d.Amf0Types.kNumberType) {
            return this.readDouble();
        }
        else if (marker == a3d.Amf0Types.kBooleanType) {
            return this.readBoolean();
        }
        else if (marker == a3d.Amf0Types.kStringType) {
            return this.readUTF();
        }
        else if ((marker == a3d.Amf0Types.kObjectType) || (marker == a3d.Amf0Types.kECMAArrayType)) {
            let o = {};

            let ismixed = (marker == a3d.Amf0Types.kECMAArrayType);

            let size = null;
            if (ismixed)
                this.readUInt30();

            while (true) {
                let c1 = this.readByte();
                let c2 = this.readByte();
                let name = this.readString((c1 << 8) | c2);
                let k = this.readByte();
                if (k == a3d.Amf0Types.kObjectEndType)
                    break;

                this.pos--;

                o[name] = this.readObject();
            }

            return o;
        }
        else if (marker == a3d.Amf0Types.kStrictArrayType) {
            let size = this.readInt();

            let a = [];

            for (let i = 0; i < size; ++i) {
                a.push(this.readObject());
            }

            return a;
        }
        else if (marker == a3d.Amf0Types.kTypedObjectType) {
            let o = {};

            let typeName = this.readUTF();

            let propertyName = this.readUTF();
            let type = this.readByte();
            while (type != kObjectEndType) {
                let value = this.readObject();
                o[propertyName] = value;

                propertyName = this.readUTF();
                type = this.readByte();
            }

            return o;
        }
        else if (marker == a3d.Amf0Types.kAvmPlusObjectType) {
            return this.readAMF3Object();
        }
        else if (marker == a3d.Amf0Types.kNullType) {
            return null;
        }
        else if (marker == a3d.Amf0Types.kUndefinedType) {
            return undefined;
        }
        else if (marker == a3d.Amf0Types.kReferenceType) {
            let refNum = this.readUnsignedShort();

            let value = this.objectTable[refNum];

            return value;
        }
        else if (marker == a3d.Amf0Types.kDateType) {
            return this.readDate();
        }
        else if (marker == a3d.Amf0Types.kLongStringType) {
            return this.readLongUTF();
        }
        else if (marker == a3d.Amf0Types.kXMLObjectType) {
            return this.readXML();
        }
    }

    , readAMF3Object: function () {
        let marker = this.readByte();

        if (marker == a3d.Amf3Types.kUndefinedType) {
            return undefined;
        }
        else if (marker == a3d.Amf3Types.kNullType) {
            return null;
        }
        else if (marker == a3d.Amf3Types.kFalseType) {
            return false;
        }
        else if (marker == a3d.Amf3Types.kTrueType) {
            return true;
        }
        else if (marker == a3d.Amf3Types.kIntegerType) {
            let i = this.readUInt29();

            return i;
        }
        else if (marker == a3d.Amf3Types.kDoubleType) {
            return this.readDouble();
        }
        else if (marker == a3d.Amf3Types.kStringType) {
            return this.readStringAMF3();
        }
        else if (marker == a3d.Amf3Types.kXMLType) {
            return this.readXML();
        }
        else if (marker == a3d.Amf3Types.kDateType) {
            let ref = this.readUInt29();

            if ((ref & 1) == 0)
                return this.objectTable[(ref >> 1)];

            let d = this.readDouble();
            let value = new Date(d);
            this.objectTable.push(value);

            return value;
        }
        else if (marker == a3d.Amf3Types.kArrayType) {
            let ref = this.readUInt29();

            if ((ref & 1) == 0)
                return this.objectTable[(ref >> 1)];

            let len = (ref >> 1);

            let key = this.readStringAMF3();

            if (key == "") {
                let a = [];

                for (let i = 0; i < len; i++) {
                    let value = this.readObject();

                    a.push(value);
                }

                return a;
            }

            // mixed array
            let result = {};

            while (key != "") {
                result[key] = this.readObject();
                key = this.readStringAMF3();
            }

            for (let i = 0; i < len; i++) {
                result[i] = this.readObject();
            }

            return result;
        }
        else if (marker == a3d.Amf3Types.kObjectType) {
            let o = {};

            this.objectTable.push(o);

            let ref = this.readUInt29();

            if ((ref & 1) == 0)
                return this.objectTable[(ref >> 1)];

            let ti = this.readTraits(ref);
            let className = ti.className;
            let externalizable = ti.externalizable;

            if (externalizable) {
                o = this.readExternalizable(className);
            }
            else {
                let len = ti.properties.length;

                for (let i = 0; i < len; i++) {
                    let propName = ti.properties[i];

                    let value = this.readObject();

                    o[propName] = value;
                }

                if (ti.dynamic) {
                    for (; ;) {
                        let name = this.readStringAMF3();
                        if (name == null || name.length == 0) break;

                        let value = this.readObject();
                        o[name] = value;
                    }
                }
            }

            return o;
        }
        else if (marker == a3d.Amf3Types.kAvmPlusXmlType) {
            let ref = this.readUInt29();

            if ((ref & 1) == 0)
                return this.stringToXML(this.objectTable[(ref >> 1)]);

            let len = (ref >> 1);

            if (0 == len)
                return null;


            let str = this.readString(len);

            let xml = this.stringToXML(str);

            this.objectTable.push(xml);

            return xml;
        }
        else if (marker == a3d.Amf3Types.kByteArrayType) {
            let ref = this.readUInt29();
            if ((ref & 1) == 0)
                return this.objectTable[(ref >> 1)];

            let len = (ref >> 1);

            let ba = new a3d.ByteArray();

            this.objectTable.push(ba);

            for (let i = 0; i < len; i++) {
                ba.writeByte(this.readByte());
            }

            return ba;
        }

    }
});

module.exports = {decodeAMF};