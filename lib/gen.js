'use strict';

var //---------------
    //    Imports
    //---------------

    lang = require('./lang'),

    butfirst = lang.butfirst,
    call = lang.call,
    concat = lang.concat,
    destructure = lang.destructure,
    destructured = lang.destructured,
    first = lang.first,
    is = lang.is,
    partial = lang.partial,
    reduce = lang.reduce,
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
                    while ((2 * text.length) <= size) {
                        text += text;
                    }
                    return (
                        text +
                        space(size - text.length));
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
    isMember = isType('member'),
    isIndex = isType('index'),
    isUnop = isType('unop'),
    isBinop = isType('binop'),
    isTernop = isType('ternop'),
    isOp = isType('op'),
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
            isMember(tree) ||
            isIndex(tree) ||
            isUnop(tree) ||
            isBinop(tree) ||
            isTernop(tree) ||
            isOp(tree) ||
            isSetop(tree));
    },

    // Is the given tree an operator?
    isOperator = function(tree) {
        return (
            isUnop(tree) ||
            isBinop(tree) ||
            isTernop(tree) ||
            isOp(tree) ||
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
                    args.length > 1 ||
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
                return values.length > 2;
            }));
    },

    // Is the tree long?
    isLong = function(tree) {
        return (
            isLongCall(tree) ||
            isLongTernop(tree) ||
            isLongOp(tree));
    },

    // Operator precedence.
    precedence = {
        unop: {
            '!': 15,
            '~': 15,
            '-': 15,
            '+': 15,
            'new': 16,
            'delete': 15,
            'typeof': 15,
            'void': 15
        },
        binop: {
            '===': 10,
            '!==': 10,
            '<': 11,
            '<=': 11,
            '>': 11,
            '>=': 11,
            'in': 11,
            'instanceof': 11
        },
        ternop: {
            '?': 4
        },
        op: {
            ',': 0,
            '+': 13,
            '-': 13,
            '*': 14,
            '/': 14,
            '%': 14,
            '&': 9,
            '|': 7,
            '^': 8,
            '<<': 12,
            '>>': 12,
            '>>>': 12,
            '&&': 6,
            '||': 5
        },
        setop: {
            '=': 3,
            '+=': 3,
            '-=': 3,
            '*=': 3,
            '/=': 3,
            '%=': 3,
            '&=': 3,
            '|=': 3,
            '^=': 3,
            '<<=': 3,
            '>>=': 3,
            '>>>=': 3
        }
    },

    // Does the left operator need to parenthesize usage of the right operator?
    needsParens = function(left, right) {
        return (
            isOperator(left) &&
            isOperator(right) &&
            destructure(left, function(leftType, leftOp) {
                return destructure(right, function(rightType, rightOp) {
                    return (
                        precedence[rightType][rightOp] <
                        precedence[leftType][leftOp]);
                });
            }));
    },

    //---------------
    //    Symbols
    //---------------

    gen$ = function(tree, name) {
        return name;
    },

    //----------------------
    //    Literal Values
    //----------------------

    gen$val = function(tree, value) {
        return JSON.stringify(value);
    },

    //------------------------------
    //    Complex Literal Values
    //------------------------------

    gen$array = function(tree, values, print) {
        return (
            values.length > 1 ?

                '[' +
                print.indent(
                    partial(
                        reduce,
                        values,
                        function(text, value, i) {
                            return (
                                text +
                                print.line(gen(value, print)) +
                                (i < (values.length - 1) ? ',' : ''));
                        },
                        '')) +
                print.line(']') :

                '[' +
                gen(first(values), print) +
                ']');
    },

    gen$object = function(tree, pairs, print) {
        return (
            pairs.length > 1 ||
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
                                                (i < (pairs.length - 1) ? ',' : ''));
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

    gen$regex = function(tree, regex) {
        return regex;
    },

    //---------------------
    //    Special Forms
    //---------------------

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

    gen$var = function(tree, vars, print) {
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
                                            (is.undef(value) ?
                                                '' :
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
                                                    gen(value, print))) +
                                            (i < (vars.length - 1) ? ',' : ''));
                                    }));
                            }));
                    },
                    '')) +
            print.pretty(';\n', ';'));
    },

    gen$if = function(tree, test, consequent, alternative, print) {
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

    gen$while = function(tree, test, body, print) {
        return (
            print.pretty('while (', 'while(') +
            print.indent(partial(gen, test, print)) +
            print.pretty(') {', ') {') +
            print.indent(partial(gen$block, body, print)) +
            print.line('}'));
    },

    gen$for = function(tree, init, test, update, body, print) {
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

    gen$forin = function(tree, name, iterable, body, print) {
        return (
            print.pretty('for (', 'for(') +
            gen(name, print) +
            ' in ' +
            gen(iterable, print) +
            print.pretty(') {', '){') +
            print.indent(partial(gen$block, body, print)) +
            print.line('}'));
    },

    gen$try = function(tree, guarded, name, caught, finished, print) {
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

    gen$throw = function(tree, value, print) {
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

    gen$return = function(tree, value, print) {
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

    gen$params = function(tree, params, print) {
        return (
            reduce(
                params,
                function(text, param, i) {
                    return (
                        text +
                        gen(param, print) +
                        (i < (params.length - 1) ?
                            print.pretty(', ', ',') :
                            ''));
                },
                ''));
    },

    //-------------------
    //    Expressions
    //-------------------

    gen$lambda = function(tree, params, body, print) {
        return (
            'function(' +
            gen(params, print) +
            print.pretty(') {', '){') +
            print.indent(partial(gen$block, body, print)) +
            print.line('}'));
    },

    gen$call = function(tree, fn, args, print) {
        return (
            (isLambda(fn) ? '(' : '') +
            gen(fn, print) +
            '(' +
            (args.length > 1 ?
                print.indent(
                    partial(
                        reduce,
                        args,
                        function(text, arg, i) {
                            return (
                                text +
                                print.line(gen(arg, print)) +
                                (i < (args.length - 1) ? ',' : ''));
                        },
                        '')) :
                gen(first(args), print)) +
            ')' +
            (isLambda(fn) ? ')' : ''));
    },

    gen$m = function(tree, object, name, print) {
        return (
            (isObject(object) ? '(' : '') +
            gen(object, print) +
            (isObject(object) ? ')' : '') +
            '.' +
            gen(name, print));
    },

    gen$i = function(tree, object, key, print) {
        return (
            (isObject(object) ? '(' : '') +
            gen(object, print) +
            (isObject(object) ? ')' : '') +
            '[' +
            (isLong(key) ?

                print.indent(
                    partial(
                        print.line,
                        partial(gen, key, print))) +
                print.line(']') :

                gen(key, print) +
                ']'));
    },

    gen$unop = function(tree, op, value, print) {
        return (
            (op.length > 1 ? op + ' ' : op) +
            (needsParens(tree, value) ?

                '(' +
                gen(value, print) +
                ')' :

                gen(value, print)));
    },

    gen$binop = function(tree, op, left, right, print) {
        return (
            (needsParens(tree, left) ? '(' : '') +
            gen(left, print) +
            (needsParens(tree, left) ? ')' : '') +
            print.pretty(' ' + op + ' ', op) +
            (needsParens(tree, right) ? '(' : '') +
            gen(right, print) +
            (needsParens(tree, right) ? ')' : ''));
    },

    gen$ternop = function(tree, opleft, opright, left, middle, right, print) {
        return (
            !isShort(left) || !isShort(middle) || !isShort(right) ?

                (needsParens(tree, left) ? '(' : '') +
                gen(left, print) +
                (needsParens(tree, left) ? ')' : '') +
                print.pretty(' ' + opleft, opleft) +
                print.indent(function() {
                    return (
                        print.line(function() {
                            return (
                                gen(middle, print) +
                                print.pretty(' ' + opright, opright));
                        }) +
                        print.line(partial(gen, right, print)));
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

    gen$op = function(tree, op, values, print) {
        return (
            reduce(
                values,
                function(text, value, i) {
                    return (
                        text +
                        (needsParens(tree, value) ? '(' : '') +
                        (i > 0 && values.length > 2 ? print.line : call)(
                            partial(gen, value, print)) +
                        (needsParens(tree, value) ? ')' : '') +
                        (i < (values.length - 1) ?
                            print.pretty(' ' + op + ' ', op) :
                            ''));
                },
                ''));
    },

    gen$setop = function(tree, op, destination, value, print) {
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

                (needsParens(tree, value) ? '(' : '') +
                gen(value, print) +
                (needsParens(tree, value) ? ')' : '')));
    },

    //--------------------------
    //    Generator Dispatch
    //--------------------------

    generators = {
        sym: gen$,
        val: gen$val,
        array: gen$array,
        object: gen$object,
        regex: gen$regex,
        var: gen$var,
        if: gen$if,
        while: gen$while,
        for: gen$for,
        forin: gen$forin,
        try: gen$try,
        throw: gen$throw,
        return: gen$return,
        params: gen$params,
        lambda: gen$lambda,
        call: gen$call,
        member: gen$m,
        index: gen$i,
        unop: gen$unop,
        binop: gen$binop,
        ternop: gen$ternop,
        op: gen$op,
        setop: gen$setop
    },

    gen = function(tree, print) {
        return (
            destructure(
                concat(
                    [tree],
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
