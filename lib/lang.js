'use strict';

var //---------------
    //    Imports
    //---------------

    arrayProto = Array.prototype,
    booleanProto = Boolean.prototype,
    functionProto = Function.prototype,
    numberProto = Number.prototype,
    objectProto = Object.prototype,
    regexProto = RegExp.prototype,
    stringProto = String.prototype,

    functionCall = functionProto.call,

    //-----------------
    //    Constants
    //-----------------

    undef = void 0,

    //-----------------
    //    Functions
    //-----------------

    unbind = function(fn) {
        return functionCall.bind(fn);
    },

    call = unbind(functionProto.call),
    apply = unbind(functionProto.apply),
    invoke = function(fn, args) {
        return apply(fn, undef, args);
    },

    bind = unbind(functionProto.bind),
    partial = function(fn) {
        var args = slice(arguments, 1);

        return function() {
            return apply(fn, this, concat(args, slice(arguments)));
        };
    },

    destructure = function(values, fn) {
        return invoke(fn, values);
    },
    destructured = function(fn) {
        return function(values) {
            return destructure(values, fn);
        };
    },

    complement = function(fn) {
        return function() {
            return !invoke(fn, arguments);
        };
    },

    //---------------
    //    Objects
    //---------------

    keys = Object.keys,
    owns = unbind(objectProto.hasOwnProperty),
    typeString = unbind(objectProto.toString),
    isType = function(type) {
        type = '[object ' + type + ']';
        return function(value) {
            return typeString(value) === type;
        };
    },
    isBoolean = isType('Boolean'),
    isFunction = isType('Function'),
    isNumber = isType('Number'),
    isRegex = isType('RegExp'),
    isString = isType('String'),
    isArray = Array.isArray,
    isObject = function(value) {
        return Object(value) === value;
    },
    isNaN = Number.isNaN,
    isInfinity = function(value) {
        return value === Infinity;
    },
    isNil = function(value) {
        return value === null;
    },
    isUndef = function(value) {
        return value === undef;
    },
    isDef = complement(isUndef),
    len = function(value) {
        return (
            isArray(value) ||
            isString(value) ||
            isFunction(value) ?
                value.length :
                keys(value).length);
    },

    //--------------
    //    Arrays
    //--------------

    concat = unbind(arrayProto.concat),
    join = unbind(arrayProto.join),
    push = unbind(arrayProto.push),
    slice = unbind(arrayProto.slice),
    first = function(values) {
        return values && values[0];
    },
    butfirst = function(values) {
        return slice(values, 1);
    },
    last = function(values) {
        return values && values[values.length - 1];
    },
    butlast = function(values) {
        return slice(values, 0, -1);
    },
    reduce = function(values, fn, accumulator) {
        var i,
            length;

        for (i = 0, length = values.length; i < length; i+= 1) {
            accumulator = fn(accumulator, values[i], i, values);
        }
        return accumulator;
    },
    each = function(values, fn) {
        reduce(
            function(accumulator, value, i, values) {
                fn(value, i, values);
            });
    },
    map = function(values, fn) {
        return (
            reduce(
                values,
                function(output, value, i, values) {
                    push(output, fn(value, i, values));
                    return output;
                },
                []));
    },
    filter = function(values, fn) {
        return (
            reduce(
                values,
                function(output, value, i, values) {
                    if (fn(value, i, values)) {
                        push(output, value);
                    }
                    return output;
                },
                []));
    },


    //---------------------------
    //    Regular Expressions
    //---------------------------

    test = unbind(regexProto.test);

module.exports = {

    // Constants
    undef: undef,

    // Functions
    apply: apply,
    bind: bind,
    call: call,
    complement: complement,
    destructure: destructure,
    destructured: destructured,
    invoke: invoke,
    join: join,
    partial: partial,
    unbind: unbind,

    // Objects
    is: {
        array: isArray,
        boolean: isBoolean,
        def: isDef,
        fn: isFunction,
        infinity: isInfinity,
        nan: isNaN,
        nil: isNil,
        number: isNumber,
        object: isObject,
        regex: isRegex,
        string: isString,
        undef: isUndef
    },
    keys: keys,
    len: len,
    owns: owns,

    // Arrays
    butfirst: butfirst,
    butlast: butlast,
    concat: concat,
    each: each,
    filter: filter,
    first: first,
    last: last,
    map: map,
    push: push,
    reduce: reduce,
    slice: slice,

    // Regular Expressions
    test: test
};
