'use strict';

var //---------------
    //    Imports
    //---------------

    ast = require('./ast'),
    lang = require('./lang'),

    butfirst = lang.butfirst,
    butlast = lang.butlast,
    call = lang.call,
    concat = lang.concat,
    destructure = lang.destructure,
    destructured = lang.destructured,
    first = lang.first,
    invoke = lang.invoke,
    is = lang.is,
    last = lang.last,
    len = lang.len,
    join = lang.join,
    map = lang.map,
    partial = lang.partial,
    reduce = lang.reduce,
    slice = lang.slice,
    undef = lang.undef,

    //-----------------------
    //    Pretty Printing
    //-----------------------

    printer = function(width) {
        var current = 0,
            render = function(value) {
                return (
                    is.fn(value) ?
                        value(print) :
                        value);
            },
            space = function(size) {
                var text;

                if (size > 0) {
                    text = ' ';
                    while ((2 * len(text)) <= size) {
                        text += text;
                    }
                    return (
                        text +
                        space(size - len(text)));
                } else {
                    return '';
                }
            },
            line = function(value) {
                return (
                    (width !== undef ? '\n' : '') +
                    space(current * (width || 0)) +
                    render(value));
            },
            indent = function(value) {
                var text;

                current += 1;
                text = render(value);
                current -= 1;
                return text;
            },
            pretty = function(large, small) {
                return (
                    width !== undef ?
                        render(large) :
                        render(small));
            },
            print = {
                line: line,
                indent: indent,
                pretty: pretty
            };

        return print;
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
    isVal = isType('val'),
    isSym = isType('sym'),
    isArray = isType('array'),
    isObject = isType('object'),
    isRegex = isType('regex'),
    isLambda = isType('lambda'),
    isCall = isType('call'),
    isGet = isType('get'),
    isUnop = isType('unop'),
    isBinop = isType('binop'),
    isTernop = isType('ternop'),
    isOp = isType('op'),
    isShortop = isType('shortop'),
    isSetop = isType('setop'),

    // Is the given tree an expression?
    isExpr = function(tree) {
        return (
            isVal(tree) ||
            isSym(tree) ||
            isArray(tree) ||
            isObject(tree) ||
            isRegex(tree) ||
            isLambda(tree) ||
            isCall(tree) ||
            isGet(tree) ||
            isUnop(tree) ||
            isBinop(tree) ||
            isTernop(tree) ||
            isOp(tree) ||
            isShortop(tree) ||
            isSetop(tree));
    },

    // Is the given tree an operator?
    isOperator = function(tree) {
        return (
            isUnop(tree) ||
            isBinop(tree) ||
            isTernop(tree) ||
            isOp(tree) ||
            isShortop(tree) ||
            isSetop(tree));
    },

    // Is the given tree short?
    isShort = function(tree) {
        return (
            isSym(tree) ||
            isVal(tree));
    },

    // Is the tree a long function call with several arguments or
    // a self-calling closure?
    isLongCall = function(tree) {
        return (
            isCall(tree) &&
            destructure(tree, function(name, fn, args) {
                return (
                    len(args) > 1 ||
                    isLambda(fn));
            }));
    },

    // Is the tree a long ternary operation?
    isLongTernop = function(tree) {
        return (
            isTernop(tree) &&
            destructure(tree, function(name, opleft, opright, left, right, middle) {
                return (
                    !isShort(left) ||
                    !isShort(middle) ||
                    !isShort(right));
            }));
    },

    // Is the tree a long operator with several values?
    isLongOp = function(tree) {
        return (
            isOp(tree) &&
            destructure(tree, function(name, op, values) {
                return len(values) > 2;
            }));
    },

    // Is the tree a long short-circuiting operator with several values?
    isLongShortop = function(tree) {
        return (
            isShortop(tree) &&
            destructure(tree, function(name, op, values) {
                return len(values) > 2;
            }));
    },

    // Is the tree long?
    isLong = function(tree) {
        return (
            isLongCall(tree) ||
            isLongTernop(tree) ||
            isLongOp(tree) ||
            isLongShortop(tree));
    },

    //---------------
    //    Symbols
    //---------------

    gen$sym = function(sym) {
        return sym;
    },

    //----------------------
    //    Literal Values
    //----------------------

    gen$val = function(value) {
        return value;
    },

    gen$array = function(values, print) {
        return (
            len(values) > 1 ?

                '[' +
                print.indent(
                    partial(
                        reduce,
                        values,
                        function(text, value, i) {
                            return (
                                text +
                                print.line(gen(value, print)) +
                                (i < (len(values) - 1) ? ',' : ''));
                        },
                        '')) +
                print.line(']') :


                '[' +
                gen(first(values), print) +
                ']');
    },

    gen$object = function(pairs, print) {
        return (
            len(pairs) > 1 ||
            destructure(first(pairs) || [], destructured(function(key, value) {
                return isLong(value);
            })) ?

                '{' +
                print.indent(
                    partial(
                        reduce,
                        pairs,
                        function(text, pair, i) {
                            return (
                                destructure(pair, function(key, value) {
                                    return (
                                        text +
                                        print.line(function() {
                                            return (
                                                gen(key, print) +
                                                print.pretty(': ', ':') +
                                                (isLong(value) ?
                                                    print.pretty(
                                                        function() {
                                                            return (
                                                                '(' +
                                                                print.indent(
                                                                    partial(
                                                                        print.line,
                                                                        partial(gen, value, print))) +
                                                                ')');
                                                        },
                                                        partial(gen, value, print)) :
                                                    gen(value, print)) +
                                                (i < (len(pairs) - 1) ? ',' : ''));
                                        }));
                                }));
                        },
                        '')) +
                print.line('}') :

                '{' +
                destructure(first(pairs), function(key, value) {
                    return (
                        gen(key, print) +
                        print.pretty(': ', ':') +
                        gen(value, print));
                }) +
                '}');
    },

    gen$regex = function(regex) {
        return regex;
    },

    gen$block = function(tree, print) {
        return (
            reduce(
                asBlock(tree) || [],
                function(text, line) {
                    return (
                        text +
                        print.line(gen(line, print)) +
                        (isExpr(line) ? ';' : ''));
                },
                ''));
    },

    gen$var = function(vars, print) {
        return (
            'var ' +
            print.indent(
                partial(
                    reduce,
                    vars,
                    function(text, pair, i) {
                        return (
                            destructure(pair, function(name, value) {
                                return (
                                    text +
                                    (i === 0 ? call : print.line)(function() {
                                        return (
                                            gen(name, print) +
                                            print.pretty(' = ', '=') +
                                            (isLong(value) ?
                                                print.pretty(
                                                    function() {
                                                        return (
                                                            '(' +
                                                            print.indent(
                                                                partial(
                                                                    print.line,
                                                                    partial(gen, value, print))) +
                                                            ')');
                                                    },
                                                    partial(gen, value, print)) :
                                                gen(value, print)) +
                                            (i < (len(vars) - 1) ? ',' : ''));
                                    }));
                            }));
                    },
                    '')) +
            print.pretty(';\n', ';'));
    },

    gen$if = function(test, consequent, alternative, print) {
        return (
            print.pretty('if (', 'if(') +
            print.indent(partial(gen, test, print)) +
            print.pretty(') {', '){') +
            print.indent(partial(gen$block, consequent, print)) +
            print.line('}') +
            (alternative ?
                print.pretty(' else {', 'else{') +
                print.indent(partial(gen$block, alternative, print)) +
                print.line('}') :
                ''));
    },

    gen$while = function(test, body, print) {
        return (
            print.pretty('while (', 'while(') +
            print.indent(partial(gen, test, print)) +
            print.pretty(') {', ') {') +
            print.indent(partial(gen$block, body, print)) +
            print.line('}'));
    },

    gen$for = function(init, test, update, body, print) {
        return (
            print.pretty('for (', 'for(') +
            gen(init, print) +
            print.pretty('; ', ';') +
            gen(test, print) +
            print.pretty('; ', ';') +
            gen(update, print) +
            print.pretty(') {', '){') +
            print.indent(partial(gen$block, body, print)) +
            print.line('}'));
    },

    gen$try = function(guarded, name, caught, finished, print) {
        return (
            print.pretty('try {', 'try{') +
            print.indent(partial(gen$block, guarded, print)) +
            print.line('}') +
            (name ?

                print.pretty(' catch (', 'catch(') +
                gen(name, print) +
                print.pretty(') {', '){') +
                print.indent(partial(gen$block, caught, print)) +
                print.line('}') :

                '') +
            (finished ?

                print.pretty(' finally {', 'finally{') +
                print.indent(partial(gen$block, finished, print)) +
                print.line('}') :

                ''));
    },

    gen$throw = function(value, print) {
        return (
            'throw ' +
            (isLong(value) ?
                print.pretty(
                    function() {
                        return (
                            '(' +
                            print.indent(
                                partial(
                                    print.line,
                                    partial(gen, value, print))) +
                            ')');
                    },
                    partial(gen, value, print)) :
                gen(value, print)) +
            ';');
    },

    gen$return = function(value, print) {
        return (
            'return ' +
            (isLong(value) ?
                print.pretty(
                    function() {
                        return (
                            '(' +
                            print.indent(
                                partial(
                                    print.line,
                                    partial(gen, value, print))) +
                            ')');
                    },
                    partial(gen, value, print)) :
                gen(value, print)) +
            ';');
    },

    gen$params = function(params, print) {
        return (
            reduce(
                params,
                function(text, param, i) {
                    return (
                        text +
                        gen(param, print) +
                        (i < (len(params) - 1) ?
                            print.pretty(', ', ',') :
                            ''));
                },
                ''));
    },

    gen$lambda = function(params, body, print) {
        return (
            'function(' +
            gen(params, print) +
            print.pretty(') {', '){') +
            print.indent(
                partial(
                    gen$block,
                    concat(
                        butlast(body),
                        [isExpr(last(body)) ?
                            ast.$return(last(body)) :
                            last(body)]),
                    print)) +
            print.line('}'));
    },

    gen$call = function(fn, args, print) {
        return (
            (isLambda(fn) ? '(' : '') +
            gen(fn, print) +
            '(' +
            (len(args) > 1 ?
                print.indent(
                    partial(
                        reduce,
                        args,
                        function(text, arg, i) {
                            return (
                                text +
                                print.line(gen(arg, print)) +
                                (i < (len(args) - 1) ? ',' : ''));
                        },
                        '')) :
                gen(first(args), print)) +
            ')' +
            (isLambda(fn) ? ')' : ''));
    },

    gen$get = function(object, key, print) {
        return (
            (isObject(object) ? '(' : '') +
            gen(object, print) +
            (isObject(object) ? ')' : '') +
            (isSym(key) ?

                '.' +
                gen(key, print) :

                '[' +
                (isLong(key) ?

                    print.indent(
                        partial(
                            print.line,
                            partial(gen, key, print))) +
                    print.line(']') :

                    gen(key, print) +
                    ']')));
    },

    gen$unop = function(op, value, print) {
        return (
            (len(op) > 1 ? op + ' ' : op) +
            (isOperator(value) && !isUnop(value) ?

                '(' +
                gen(value, print) +
                ')' :

                gen(value, print)));
    },

    gen$binop = function(op, left, right, print) {
        return (
            (isOperator(left) ? '(' : '') +
            gen(left, print) +
            (isOperator(left) ? ')' : '') +
            print.pretty(' ' + op + ' ', op) +
            (isOperator(right) ? '(' : '') +
            gen(right, print) +
            (isOperator(right) ? ')' : ''));
    },

    gen$ternop = function(opleft, opright, left, middle, right, print) {
        return (
            !isShort(left) || !isShort(middle) || !isShort(right) ?

                (isOperator(left) ? '(' : '') +
                gen(left, print) +
                (isOperator(left) ? ')' : '') +
                print.pretty(' ' + opleft, opleft) +
                print.indent(function() {
                    return (
                        print.line(function() {
                            return (
                                (isOperator(middle) ? '(' : '') +
                                gen(middle, print) +
                                (isOperator(middle) ? ')' : '') +
                                print.pretty(' ' + opright, opright));
                        }) +
                        print.line(function() {
                            return (
                                (isOperator(right) ? '(' : '') +
                                gen(right, print) +
                                (isOperator(right) ? ')' : ''));
                        }));
                }) :

                (isOperator(left) ? '(' : '') +
                gen(left, print) +
                (isOperator(left) ? ')' : '') +
                print.pretty(' ' + opleft + ' ', opleft) +
                (isOperator(middle) ? '(' : '') +
                gen(middle, print) +
                (isOperator(middle) ? ')' : '') +
                print.pretty(' ' + opright + ' ', opright) +
                (isOperator(right) ? '(' : '') +
                gen(right, print) +
                (isOperator(right) ? ')' : ''));
    },

    gen$op = function(op, values, print) {
        return (
            reduce(
                values,
                function(text, value, i) {
                    return (
                        text +
                        (isOperator(value) ? '(' : '') +
                        (i > 0 && len(values) > 2 ? print.line : call)(
                            partial(gen, value, print)) +
                        (isOperator(value) ? ')' : '') +
                        (i < (len(values) - 1) ?
                            (len(values) > 2 ?
                                print.pretty(' ' + op, op) :
                                print.pretty(' ' + op + ' ', op)) :
                            ''));
                },
                ''));
    },

    gen$shortop = function(op, values, print) {
        return (
            reduce(
                values,
                function(text, value, i) {
                    return (
                        text +
                        (isOperator(value) ? '(' : '') +
                        (i > 0 && len(values) > 2 ? print.line : call)(
                            partial(gen, value, print)) +
                        (isOperator(value) ? ')' : '') +
                        (i < (len(values) - 1) ?
                            (len(values) > 2 ?
                                print.pretty(' ' + op, op) :
                                print.pretty(' ' + op + ' ', op)) :
                            ''));
                },
                ''));
    },

    gen$setop = function(op, destination, value, print) {
        return (
            gen(destination, print) +
            print.pretty(' ' + op + ' ', op) +
            (isLong(value) ?

                '(' +
                print.indent(
                    partial(
                        print.line,
                        partial(gen, value, print))) +
                ')' :

                gen(value, print)));
    },

    generators = {
        sym: gen$sym,
        val: gen$val,
        array: gen$array,
        object: gen$object,
        regex: gen$regex,
        var: gen$var,
        if: gen$if,
        while: gen$while,
        for: gen$for,
        try: gen$try,
        throw: gen$throw,
        return: gen$return,
        params: gen$params,
        lambda: gen$lambda,
        call: gen$call,
        get: gen$get,
        unop: gen$unop,
        binop: gen$binop,
        ternop: gen$ternop,
        op: gen$op,
        shortop: gen$shortop,
        setop: gen$setop
    },

    gen = function(tree, print) {
        return (
            destructure(
                concat(
                    butfirst(tree),
                    [print]),
                generators[first(tree)]));
    };

module.exports = function(tree, width) {
    var print = printer(width);

    return (
        reduce(
            asBlock(tree),
            function(text, line) {
                return (
                    text +
                    gen(line, print) +
                    (isExpr(line) ?
                        print.pretty(';\n', ';') :
                        print.pretty('\n', '')));
            },
            ''));
};
