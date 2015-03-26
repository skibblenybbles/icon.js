'use strict';

var //---------------
    //    Imports
    //---------------

    lang = require('./lang'),

    invoke = lang.invoke,
    is = lang.is,
    map = lang.map,
    partial = lang.partial,
    push = lang.push,
    reduce = lang.reduce,
    slice = lang.slice,
    test = lang.test,

    //---------------
    //    Symbols
    //---------------

    // Is the given value a legal sym name?
    isSym = function(value) {
        return (
            is.string(value) &&
            test(/^[_$a-z][_$a-z0-9]*$/i, value));
    },

    // Symbols are variable names.
    // ['sym', <string>]
    $ = function(name) {
        return [
            'sym',
            name
        ];
    },

    //----------------------
    //    Literal Values
    //----------------------

    // Is the given value a literal boolean, number, string, null or undefined?
    isVal = function(value) {
        return (
            is.boolean(value) ||
            is.nil(value) ||
            is.number(value) ||
            is.string(value) ||
            is.undef(value));
    },

    // Values are literal, native values like strings and integers that can
    // be quoted literally using JSON.stringify().
    // ['val', <boolean|number|null|string|undefined>]
    $val = function(value) {
        return [
            'val',
            is.undef(value) ?
                'undefined' :
                is.nan(value) ?
                    'NaN' :
                    is.infinity(value) ?
                        'Infinity' :
                        JSON.stringify(value)
        ];
    },
    $null = partial($val, null),
    $undefined = partial($val, void 0),
    $true = partial($val, true),
    $false = partial($val, false),
    $nan = partial($val, NaN),
    $infinity = partial($val, Infinity),

    //------------------------------
    //    Complex Literal Values
    //------------------------------

    // Arrays are literal, native arrays filled with expressions.
    // ['array', [<expr1>, <expr2>, ..., <exprN>]]
    $array = function() {
        return [
            'array',
            map(slice(arguments), function(value) {
                return (
                    isVal(value) ?
                        $val(value) :
                        value);
            })
        ];
    },

    // Objects are literal, native objects filled with native symbol or string
    // keys and expression values.
    // [
    //     'object',
    //     [
    //         [<sym1|val1>, <expr1>],
    //         [<sym2|val2>, <expr2>],
    //         ...,
    //         [<symN|valN>, <exprN>]
    //     ]
    // ]
    $object = function() {
        return [
            'object',
            reduce(
                slice(arguments),
                function(output, key, i, args) {
                    var value;

                    if (i % 2 === 0) {
                        value = args[i + 1];
                        push(
                            output,
                            [
                                isSym(key) ?
                                    $(key) :
                                    $val(key),
                                isVal(value) ?
                                    $val(value) :
                                    value
                            ]);
                    }
                    return output;
                },
                [])
        ];
    },

    // Regexes are literal, native regular expressions.
    // ['regex', <regex>]
    $regex = function(regex) {
        return [
            'regex',
            is.regex(regex) ? regex.toString() : regex
        ];
    },

    //---------------------
    //    Special Forms
    //---------------------

    // Block special forms are arrays of other special forms or expressions.
    // [<form1|expr1>, <form2|expr2>, ..., <formN|exprN>]
    $block = function() {
        return slice(arguments);
    },

    // Var special forms introduce new variable names into a
    // lexical environment.
    // [
    //     'var',
    //     [
    //         [<sym1>,<expr1|undefined>],
    //         [<sym2>,<expr2|undefined>],
    //         ...
    //         [<symN>,<exprN|undefined>]
    //     ]
    // ]
    $var = function() {
        return [
            'var',
            reduce(
                slice(arguments),
                function(output, name, i, args) {
                    var value;

                    if (i % 2 == 0) {
                        value = args[i + 1];
                        push(
                            output,
                            [
                                isSym(name) ?
                                    $(name) :
                                    name,
                                isVal(value) ?
                                    $val(value) :
                                    value
                            ]);
                    }
                    return output;
                },
                [])
        ];
    },

    // If special forms test the value of an expression to choose between
    // evaluating two branches containing a special form or expression.
    // ['if', <expr>, <form|expr>, <form|expr>]
    $if = function(test, consequent, alternative) {
        return [
            'if',
            isVal(test) ?
                $val(test) :
                test,
            consequent,
            alternative
        ];
    },

    // While special forms test the value of an expression to decide whether to
    // repeatedly evaulate a special form or expression.
    // ['while', <expr>, <form|expr>]
    $while = function(test, body) {
        return [
            'while',
            isVal(test) ?
                $val(test) :
                test,
            body
        ];
    },

    // For special forms evaluate an initializing expression, then repeatedly
    // test the value of an expression to decide whether to evalulate a
    // special form or expression in the body. The update expression is
    // evaluated before the test expression is evaluated every iteration after
    // the first.
    // ['for', <expr>, <expr>, <expr>, <form|expr>]
    $for = function(init, test, update, body) {
        return [
            'for',
            init,
            isVal(test) ?
                $val(test) :
                test,
            update,
            body
        ];
    },

    // Try special forms provide a means to capture an exception thrown by
    // the evaulation of the guarded special form or expression in a variable
    // with the given symbol name. A special form or expression is evaluated
    // upon capture of an exception and a finished form expression may also
    // be evaluated to perform cleanup work.
    // ['try', <form|expr>, <sym>, <form|expr>, <form|expr>]
    $try = function(guarded, name, caught, finished) {
        return [
            'try',
            guarded,
            isSym(name) ?
                $(name) :
                name,
            caught,
            finished
        ];
    },

    // Throw special forms interrupt the flow of evaluation and unwind
    // the call stack by passing the value of an expression back to the nearest
    // try special form in the call stack.
    // ['throw', <expr>]
    $throw = function(value) {
        return [
            'throw',
            isVal(value) ?
                $val(value) :
                value
        ];
    },

    // Return special forms interrupt the flow of evaluation, passing the
    // value of an expression back to the caller of a function.
    // ['return', <expr>]
    $return = function(value) {
        return [
            'return',
            isVal(value) ?
                $val(value) :
                value
        ];
    },

    // Params special forms introduce new variable names in the lexical
    // environment of a function.
    // ['params', [<sym1>, <sym2>, ..., <symN>]]
    $params = function() {
        return [
            'params',
            map(slice(arguments), function(param) {
                return isSym(param) ? $(param) : param;
            })
        ];
    },

    //-------------------
    //    Expressions
    //-------------------

    // A lambda expression creates a function with parameters and a body
    // containing a block special form that will be evaluated when the function
    // is called.
    // ['lambda', <params>, <block>]
    $lambda = function(params) {
        return [
            'lambda',
            params,
            invoke($block, slice(arguments, 1))
        ];
    },

    // A call expression calls a function, passing the values of the given
    // expressions as the function's arguments.
    // ['call', <expr>, [<expr1>, <expr2>, ..., <exprN>]]
    $call = function(fn) {
        return [
            'call',
            isSym(fn) ?
                $(fn) :
                fn,
            map(slice(arguments, 1), function(arg) {
                return (
                    isVal(arg) ?
                        $val(arg) :
                        arg);
            })
        ];
    },

    // A get expression retrieves the evaluated key name expression from an
    // evaluated object or array expression.
    // ['get', <expr>, <sym|expr>]
    $get = function(object, key) {
        return [
            'get',
            isSym(object) ?
                $(object) :
                object,
            isSym(key) ?
                $(key) :
                isVal(key) ?
                    $val(key) :
                    key
        ];
    },

    // A unary operator expression applies a native operator to the value of a
    // single evaluated expression.
    // ['unop', <op>, <expr>]
    $unop = function(op, value) {
        return [
            'unop',
            op,
            isVal(value) ?
                $val(value) :
                value
        ];
    },
    $not = partial($unop, '!'),
    $bitcomp = partial($unop, '~'),
    $neg = partial($unop, '-'),
    $pos = partial($unop, '+'),
    $new = partial($unop, 'new'),
    $delete = partial($unop, 'delete'),
    $typeof = partial($unop, 'typeof'),
    $void = partial($unop, 'void'),

    // A binary operator expression applies a native operator to the values of
    // two evaluated expressions.
    // ['binop', <op>, <expr>, <expr>]
    $binop = function(op, left, right) {
        return [
            'binop',
            op,
            isVal(left) ?
                $val(left) :
                left,
            isVal(right) ?
                $val(right) :
                right
        ];
    },
    $eq = partial($binop, '==='),
    $neq = partial($binop, '!=='),
    $lt = partial($binop, '<'),
    $lte = partial($binop, '<='),
    $gt = partial($binop, '>'),
    $gte = partial($binop, '>='),
    $in = partial($binop, 'in'),
    $instanceof = partial($binop, 'instanceof'),

    // A ternary operator applies a native operator to the values of three
    // evaluated expressions.
    // ['ternop', <op>, <op>, <expr>, <expr>, <expr>]
    $ternop = function(opleft, opright, left, middle, right) {
        return [
            'ternop',
            opleft,
            opright,
            isVal(left) ?
                $val(left) :
                left,
            isVal(middle) ?
                $val(middle) :
                middle,
            isVal(right) ?
                $val(right) :
                right
        ];
    },
    $choose = partial($ternop, '?', ':'),

    // An operator reduces the values of an arbitrary number of evaluated
    // expressions on a native binary operator.
    // ['op', <op>, [<expr1>, <expr2>, ..., <exprN>]]
    $op = function(op) {
        return [
            'op',
            op,
            map(slice(arguments, 1), function(value) {
                return (
                    isVal(value) ?
                        $val(value) :
                        value);
            })
        ];
    },
    $seq = partial($op, ','),
    $add = partial($op, '+'),
    $sub = partial($op, '-'),
    $mul = partial($op, '*'),
    $div = partial($op, '/'),
    $mod = partial($op, '%'),
    $bitand = partial($op, '&'),
    $bitor = partial($op, '|'),
    $bitxor = partial($op, '^'),
    $bitls = partial($op, '<<'),
    $bitrs = partial($op, '>>'),
    $bitars = partial($op, '>>>'),

    // A short-circuiting operator reduces the vaues of an arbitrary number of
    // evaluated expressions on a native binary operator until an expression
    // evaluates to a specific value, at which point the reduction
    // short-circuits.
    // ['shortop', <op>, [<expr1>, <expr2>, ..., <exprN>]]
    $shortop = function(op) {
        return [
            'shortop',
            op,
            map(slice(arguments, 1), function(value) {
                return (
                    isVal(value) ?
                        $val(value) :
                        value);
            })
        ];
    },
    $and = partial($shortop, '&&'),
    $or = partial($shortop, '||'),

    // A set operator performs assignment of the evaluated value of an
    // expression to the place designated by evaluating the destination
    // expression and applying a native binary operator between the source
    // value and the destination value.
    // ['setop', <op>, <expr>, <expr>]
    $setop = function(op, destination, value) {
        return [
            'setop',
            op + '=',
            isSym(destination) ?
                $(destination) :
                destination,
            isVal(value) ?
                $val(value) :
                value
        ];
    },
    $set = partial($setop, ''),
    $addset = partial($setop, '+'),
    $subset = partial($setop, '-'),
    $mulset = partial($setop, '*'),
    $divset = partial($setop, '/'),
    $modset = partial($setop, '%'),
    $bitandset = partial($setop, '&'),
    $bitorset = partial($setop, '|'),
    $bitxorset = partial($setop, '^'),
    $bitlsset = partial($setop, '<<'),
    $bitrsset = partial($setop, '>>'),
    $bitarsset = partial($setop, '>>>');

module.exports = {

    // Symbols
    $: $,

    // Literals
    $val: $val,
    $null: $null,
    $undefined: $undefined,
    $true: $true,
    $false: $false,
    $nan: $nan,
    $infinity: $infinity,

    // Complex Literals
    $array: $array,
    $object: $object,
    $regex: $regex,

    // Special Forms
    $block: $block,
    $var: $var,
    $if: $if,
    $while: $while,
    $for: $for,
    $try: $try,
    $throw: $throw,
    $return: $return,
    $params: $params,

    // Expressions
    $lambda: $lambda,
    $call: $call,
    $get: $get,
    $not: $not,
    $bitcomp: $bitcomp,
    $neg: $neg,
    $pos: $pos,
    $new: $new,
    $delete: $delete,
    $typeof: $typeof,
    $void: $void,
    $eq: $eq,
    $neq: $neq,
    $lt: $lt,
    $lte: $lte,
    $gt: $gt,
    $gte: $gte,
    $in: $in,
    $instanceof: $instanceof,
    $choose: $choose,
    $seq: $seq,
    $add: $add,
    $sub: $sub,
    $mul: $mul,
    $div: $div,
    $mod: $mod,
    $bitand: $bitand,
    $bitor: $bitor,
    $bitxor: $bitxor,
    $bitls: $bitls,
    $bitrs: $bitrs,
    $bitars: $bitars,
    $and: $and,
    $or: $or,
    $set: $set,
    $addset: $addset,
    $subset: $subset,
    $mulset: $mulset,
    $divset: $divset,
    $modset: $modset,
    $bitandset: $bitandset,
    $bitorset: $bitorset,
    $bitxorset: $bitxorset,
    $bitlsset: $bitlsset,
    $bitrsset: $bitrsset,
    $bitarsset: $bitarsset
};
