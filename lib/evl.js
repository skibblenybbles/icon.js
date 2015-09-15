'use strict';

var //---------------
    //    Imports
    //---------------

    lang = require('./lang'),

    apply = lang.apply,
    butfirst = lang.butfirst,
    concat = lang.concat,
    destructure = lang.destructure,
    destructured = lang.destructured,
    each = lang.each,
    first = lang.first,
    is = lang.is,
    join = lang.join,
    last = lang.last,
    map = lang.map,
    owns = lang.owns,
    reduce = lang.reduce,
    slice = lang.slice,
    split = lang.split,
    undef = lang.undef,

    //----------------
    //    Closures
    //----------------

    closure = function(values) {
        return [values || {}];
    },

    extend = function(outerclosure, values) {
        return concat(closure(values), outerclosure);
    },

    def = function(closure, name, strict) {
        var length,
            i;

        for (i = 0, length = closure.length; i < length; i += 1) {
            if (owns(closure[i], name)) {
                return true;
            }
        }
        if (strict) {
            throw new ReferenceError(name + ' is not defined');
        }
        return false;
    },

    get = function(closure, name) {
        var length,
            i;

        for (i = 0, length = closure.length; i < length; i += 1) {
            if (owns(closure[i], name)) {
                return closure[i][name];
            }
        }
        throw new ReferenceError(name + ' is not defined');
    },

    set = function(closure, name, value) {
        return (first(closure)[name] = value);
    },

    //-----------------
    //    Utilities
    //-----------------

    // Normalize the given tree as a block, passing through undefined values.
    asBlock = function(tree) {
        return (
            is.undef(tree) || is.array(first(tree)) ?
                tree :
                [tree]);
    },

    // Generate a function to test for the given tree type.
    isType = function(type) {
        return function(tree) {
            return tree && first(tree) === type;
        };
    },

    isSym = isType('sym'),
    isCall = isType('call'),
    isMember = isType('member'),
    isIndex = isType('index'),

    // Is the closure top-level?
    isTop = function(closure) {
        return closure.length === 1;
    },

    // Get the name of a symbol or a string's value.
    nameof = function(tree) {
        return tree[1];
    },

    // A return value.
    Ret = function(value) {
        this.value = value;
    },

    // Return a value.
    ret = function(value) {
        return new Ret(value);
    },

    // Only pass through a return value.
    retval = function(ret) {
        if (ret instanceof Ret) {
            return ret;
        }
    },

    // Get the value of a return value.
    retvalof = function(ret) {
        return (retval(ret) || {}).value;
    },

    //---------------
    //    Symbols
    //---------------

    evl$ = function(name, closure) {
        return get(closure, name);
    },

    //----------------------
    //    Literal Values
    //----------------------

    evl$val = function(value) {
        return value;
    },

    //------------------------------
    //    Complex Literal Values
    //------------------------------

    evl$array = function(values, closure) {
        return (
            map(
                values,
                function(value) {
                    return evl(value, closure);
                }));
    },

    evl$object = function(pairs, closure) {
        return (
            reduce(
                pairs,
                function(object, pair) {
                    destructure(pair, function(key, value) {
                        object[nameof(key)] = evl(value, closure);
                    });
                    return object;
                },
                {}));
    },

    evl$regex = function(regex) {
        var parts = split(regex, '/');

        return (
            new RegExp(
                join(
                    slice(parts, 1, -1),
                    '/'),
                last(parts)));
    },

    //---------------------
    //    Special Forms
    //---------------------

    evl$block = function(tree, closure) {
        var ret,
            length,
            i;

        tree = asBlock(tree) || [];
        for (i = 0, length = tree.length; !ret && i < length; i += 1) {
            ret = retval(evl(tree[i], closure));
        }
        if (ret && isTop(closure)) {
            throw new SyntaxError('Illegal return statement');
        }
        return ret;
    },

    evl$var = function(vars, closure) {
        each(vars, destructured(function(name, value) {
            set(
                closure,
                nameof(name),
                is.undef(value) ?
                    undef :
                    evl(value, closure));
        }));
    },

    evl$if = function(test, consequent, alternative, closure) {
        var ret;

        if (evl(test, closure)) {
            ret = evl$block(consequent, closure);
        } else if (alternative) {
            ret = evl$block(alternative, closure);
        }
        return ret;
    },

    evl$while = function(test, body, closure) {
        var ret;

        while (!ret && evl(test, closure)) {
            ret = evl$block(body, closure);
        }
        return ret;
    },

    evl$for = function(init, test, update, body, closure) {
        var ret;

        for (evl(init, closure);
            !ret && evl(test, closure);
            evl(update, closure)) {
            ret = evl$block(body, closure);
        }
        return ret;
    },

    evl$forin = function(name, iterable, body, closure) {
        var key,
            ret;

        if (!isSym(name)) {
            throw new SyntaxError(
                'Iteration variable in for...in statement must be a symbol');
        }
        for (key in iterable) {
            set(closure, nameof(name), key);
            ret = evl$block(body, closure);
            if (ret) {
                return ret;
            }
        }
    },

    evl$try = function(guarded, name, caught, finished, closure) {
        var catchclosure,
            ret;

        if (name && !isSym(name)) {
            throw new SyntaxError(
                'Catch variable in try...catch...finally statement must be ' +
                'a symbol');
        }
        try {
            ret = evl$block(guarded, closure);
        } catch (error) {
            if (name && caught) {
                catchclosure = {};
                catchclosure[nameof(name)] = error;
                ret = evl$block(caught, extend(closure, catchclosure));
            }
        } finally {
            if (finished) {
                ret = evl$block(finished, closure);
            }
        }
        return ret;
    },

    evl$throw = function(value, closure) {
        throw evl(value, closure);
    },

    evl$return = function(value, closure) {
        return ret(evl(value, closure));
    },

    evl$params = function(params, closure) {
        var args = get(closure, 'arguments');

        each(params, function(param, i) {
            set(closure, nameof(param), args[i]);
        });
        return closure;
    },

    //-------------------
    //    Expressions
    //-------------------

    evl$lambda = function(params, body, closure) {
        return function() {
            return (
                retvalof(
                    evl$block(
                        body,
                        evl(
                            params,
                            extend(
                                closure,
                                {
                                    arguments: arguments,
                                    this: is.undef(this) ? global : this
                                })))));
        };
    },

    evl$call = function(fn, args, closure) {
        var context;

        if (isMember(fn)) {
            destructure(butfirst(fn), function(object, name) {
                context = evl(object, closure);
                fn = context[nameof(name)];
            });
        } else if (isIndex(fn)) {
            destructure(butfirst(fn), function(object, key) {
                context = evl(object, closure);
                fn = context[evl(key, closure)];
            });
        } else {
            fn = evl(fn, closure);
        }
        return (
            apply(
                fn,
                context,
                map(args, function(arg) {
                    return evl(arg, closure);
                })));
    },

    evl$m = function(object, name, closure) {
        return evl(object, closure)[nameof(name)];
    },

    evl$i = function(object, key, closure) {
        return evl(object, closure)[evl(key, closure)];
    },

    mkevl$unop = function(fn) {
        return function(value, closure) {
            return fn(evl(value, closure));
        };
    },

    evl$not = mkevl$unop(function(value) {
        return !value;
    }),

    evl$bitcomp = mkevl$unop(function(value) {
        return ~value;
    }),

    evl$neg = mkevl$unop(function(value) {
        return -value;
    }),

    evl$pos = mkevl$unop(function(value) {
        return +value;
    }),

    evl$new = function(value, closure) {
        var fn,
            args,
            object,
            result;

        if (isCall(value)) {
            destructure(butfirst(value), function(vfn, vargs) {
                fn = evl(vfn, closure);
                args = map(vargs, function(arg) {
                    return evl(arg, closure);
                });
            });
        } else {
            fn = evl(value, closure);
            args = [];
        }
        object = Object.create(fn.prototype || null);
        result = apply(fn, object, args);
        return (
            is.object(result) ?
                result :
                object);
    },

    evl$delete = function(value, closure) {
        if (isMember(value)) {
            return destructure(butfirst(value), function(object, name) {
                return delete evl(object, closure)[nameof(name)];
            });
        } else if (isIndex(value)) {
            return destructure(butfirst(value), function(object, key) {
                return delete evl(object, closure)[evl(key, closure)];
            });
        }
        return false;
    },

    evl$typeof = function(value, closure) {
        if (isSym(value) && !def(closure, nameof(value))) {
            return typeof undef;
        }
        return typeof evl(value, closure);
    },

    evl$void = mkevl$unop(function(value) {
        return void value;
    }),

    unops = {
        '!': evl$not,
        '~': evl$bitcomp,
        '-': evl$neg,
        '+': evl$pos,
        new: evl$new,
        delete: evl$delete,
        typeof: evl$typeof,
        void: evl$void
    },

    evl$unop = function(op, value, closure) {
        return unops[op](value, closure);
    },

    mkevl$binop = function(fn) {
        return function(left, right, closure) {
            return fn(evl(left, closure), evl(right, closure));
        };
    },

    evl$eq = mkevl$binop(function(left, right) {
        return left === right;
    }),

    evl$neq = mkevl$binop(function(left, right) {
        return left !== right;
    }),

    evl$lt = mkevl$binop(function(left, right) {
        return left < right;
    }),

    evl$lte = mkevl$binop(function(left, right) {
        return left <= right;
    }),

    evl$gt = mkevl$binop(function(left, right) {
        return left > right;
    }),

    evl$gte = mkevl$binop(function(left, right) {
        return left >= right;
    }),

    evl$in = mkevl$binop(function(left, right) {
        return left in right;
    }),

    evl$instanceof = mkevl$binop(function(left, right) {
        return left instanceof right;
    }),

    binops = {
        '===': evl$eq,
        '!==': evl$neq,
        '<': evl$lt,
        '<=': evl$lte,
        '>': evl$gt,
        '>=': evl$gte,
        in: evl$in,
        instanceof: evl$instanceof
    },

    evl$binop = function(op, left, right, closure) {
        return binops[op](left, right, closure);
    },

    evl$choose = function(left, middle, right, closure) {
        return (
            evl(left, closure) ?
                evl(middle, closure) :
                evl(right, closure));
    },

    ternops = {
        '?': {
            ':': evl$choose
        }
    },

    evl$ternop = function(opleft, opright, left, middle, right, closure) {
        return ternops[opleft][opright](left, middle, right, closure);
    },

    mkevl$op = function(fn) {
        return function(values, closure) {
            return (
                reduce(
                    butfirst(values),
                    function(accumulator, value) {
                        return fn(accumulator, evl(value, closure));
                    },
                    evl(first(values), closure)));
        };
    },

    evl$seq = mkevl$op(function(previous, value) {
        return value;
    }),

    evl$add = mkevl$op(function(sum, value) {
        return sum + value;
    }),

    evl$sub = mkevl$op(function(difference, value) {
        return difference - value;
    }),

    evl$mul = mkevl$op(function(product, value) {
        return product * value;
    }),

    evl$div = mkevl$op(function(quotient, value) {
        return quotient / value;
    }),

    evl$mod = mkevl$op(function(remainder, value) {
        return remainder % value;
    }),

    evl$bitand = mkevl$op(function(bits, value) {
        return bits & value;
    }),

    evl$bitor = mkevl$op(function(bits, value) {
        return bits | value;
    }),

    evl$bitxor = mkevl$op(function(bits, value) {
        return bits ^ value;
    }),

    evl$bitls = mkevl$op(function(bits, value) {
        return bits << value;
    }),

    evl$bitrs = mkevl$op(function(bits, value) {
        return bits >> value;
    }),

    evl$bitars = mkevl$op(function(bits, value) {
        return bits >>> value;
    }),

    evl$and = function(values, closure) {
        var result,
            length,
            i;

        for (i = 0, length = values.length; i < length; i += 1) {
            result = evl(values[i], closure);
            if (!result) {
                return result;
            }
        }
    },

    evl$or = function(values, closure) {
        var result,
            length,
            i;

        for (i = 0, length = values.length; i < length; i += 1) {
            result = evl(values[i], closure);
            if (result) {
                return result;
            }
        }
    },

    ops = {
        ',': evl$seq,
        '+': evl$add,
        '-': evl$sub,
        '*': evl$mul,
        '/': evl$div,
        '%': evl$mod,
        '&': evl$bitand,
        '|': evl$bitor,
        '^': evl$bitxor,
        '<<': evl$bitls,
        '>>': evl$bitrs,
        '>>>': evl$bitars,
        '&&': evl$and,
        '||': evl$or
    },

    evl$op = function(op, values, closure) {
        return ops[op](values, closure);
    },

    mkevl$setop = function(fn) {
        return function(destination, value, closure) {
            if (isMember(destination)) {
                return destructure(butfirst(destination), function(object, name) {
                    var destination = evl(object, closure),
                        property = nameof(name);

                    return (
                        destination[property] = (
                            fn ?
                                fn(destination[property], evl(value, closure)) :
                                evl(value, closure)));
                });
            } else if (isIndex(destination)) {
                return destructure(butfirst(destination), function(object, key) {
                    var destination = evl(object, closure),
                        property = evl(key, closure);

                    return (
                        destination[property] = (
                            fn ?
                                fn(destination[property], evl(value, closure)) :
                                evl(value, closure)));
                });
            } else if (
                isSym(destination) &&
                def(closure, nameof(destination), true)) {
                return (
                    set(
                        closure,
                        nameof(destination),
                        fn ?
                            fn(evl(destination, closure), evl(value, closure)) :
                            evl(value, closure)));
            } else {
                throw new ReferenceError(
                    'Invalid left-hand side in assignment');
            }
        };
    },

    evl$set = mkevl$setop(),

    evl$addset = mkevl$setop(function(left, right) {
        return left + right;
    }),

    evl$subset = mkevl$setop(function(left, right) {
        return left - right;
    }),

    evl$mulset = mkevl$setop(function(left, right) {
        return left * right;
    }),

    evl$divset = mkevl$setop(function(left, right) {
        return left / right;
    }),

    evl$modset = mkevl$setop(function(left, right) {
        return left % right;
    }),

    evl$bitandset = mkevl$setop(function(left, right) {
        return left & right;
    }),

    evl$bitorset = mkevl$setop(function(left, right) {
        return left | right;
    }),

    evl$bitxorset = mkevl$setop(function(left, right) {
        return left ^ right;
    }),

    evl$bitlsset = mkevl$setop(function(left, right) {
        return left << right;
    }),

    evl$bitrsset = mkevl$setop(function(left, right) {
        return left >> right;
    }),

    evl$bitarsset = mkevl$setop(function(left, right) {
        return left >>> right;
    }),

    setops = {
        '=': evl$set,
        '+=': evl$addset,
        '-=': evl$subset,
        '*=': evl$mulset,
        '/=': evl$divset,
        '%=': evl$modset,
        '&=': evl$bitandset,
        '|=': evl$bitorset,
        '^=': evl$bitxorset,
        '<<=': evl$bitlsset,
        '>>=': evl$bitrsset,
        '>>>=': evl$bitarsset
    },

    evl$setop = function(op, destination, value, closure) {
        return setops[op](destination, value, closure);
    },

    //--------------------------
    //    Evaluator Dispatch
    //--------------------------

    evaluators = {
        sym: evl$,
        val: evl$val,
        array: evl$array,
        object: evl$object,
        regex: evl$regex,
        var: evl$var,
        if: evl$if,
        while: evl$while,
        for: evl$for,
        forin: evl$forin,
        try: evl$try,
        throw: evl$throw,
        return: evl$return,
        params: evl$params,
        lambda: evl$lambda,
        call: evl$call,
        member: evl$m,
        index: evl$i,
        unop: evl$unop,
        binop: evl$binop,
        ternop: evl$ternop,
        op: evl$op,
        setop: evl$setop
    },

    evl = function(tree, closure) {
        return (
            destructure(
                concat(
                    butfirst(tree),
                    [closure]),
                evaluators[first(tree)]));
    };

module.exports = function(tree) {
    var environment = closure({

            // Built-in Constants
            null: null,
            undefined: void 0,
            Infinity: Infinity,
            NaN: NaN,

            // Built-in Functions
            decodeURI: decodeURI,
            decodeURIComponent: decodeURIComponent,
            encodeURI: encodeURI,
            encodeURIComponent: encodeURIComponent,
            eval: eval,
            isFinite: isFinite,
            isNaN: isNaN,
            parseInt: parseInt,
            parseFloat: parseFloat,

            // Built-in Types
            Array: Array,
            Boolean: Boolean,
            Date: Date,
            Function: Function,
            Number: Number,
            Object: Object,
            RegExp: RegExp,
            String: String,

            // Built-in Modules
            Math: Math,
            JSON: JSON,

            // Built-in Errors
            Error: Error,
            EvalError: EvalError,
            RangeError: RangeError,
            ReferenceError: ReferenceError,
            SyntaxError: SyntaxError,
            TypeError: TypeError,
            URIError: URIError,

            // Environment Globals
            clearInterval: global.clearInterval,
            clearTimeout: global.clearTimeout,
            console: global.console,
            require: global.require,
            setInterval: global.setInterval,
            setTimeout: global.setTimeout,

            // Custom Module
            module: {}
        });

    each(asBlock(tree), function(line) {
        evl(line, environment);
    });
    return get(environment, 'module').exports;
};
