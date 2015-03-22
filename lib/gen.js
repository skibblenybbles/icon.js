'use strict';

var //---------------
    //    Imports
    //---------------

    ast = require('./ast'),
    lang = require('./lang'),

    destructure = lang.destructure,
    destructured = lang.destructured,
    invoke = lang.invoke,
    is = lang.is,
    len = lang.len,
    join = lang.join,
    map = lang.map,
    partial = lang.partial,
    slice = lang.slice,
    undef = lang.undef,

    //-----------------------
    //    Pretty Printing
    //-----------------------

    indented = function(width) {
        var pretty = width !== undef,
            current = 0,
            indent = function(value) {
                return (
                    (join(Array(current + 1), ' ')) +
                    (is.fn(value) ?
                        value(indent) :
                        value));
            },
            level = function(value) {
                var text = '';

                current += (width || 0);
                text += (
                    is.fn(value) ?
                        value(indent) :
                        value);
                current -= (width || 0);
                return text;

            },
            line = function(value) {
                var text = pretty ? '\n' : '';

                current += (width || 0);
                text += indent(value);
                current -= (width || 0);
                return text;
            };

        indent.pretty = pretty;
        indent.level = level;
        indent.line = line;
        return indent;
    },

    //-----------------
    //    Utilities
    //-----------------

    // Normalize the given tree as a block, passing through undefined values.
    asBlock = function(tree) {
        return (
            is.undef(tree) || is.array(tree[0]) ?
                tree :
                [tree]);
    },

    // Generate a function to test for the given tree type.
    isType = function(type) {
        return function(tree) {
            return tree && tree[0] === type;
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

    gen$sym = function(tree) {
        return (
            destructure(
                tree,
                function(sym) {
                    return sym;
                }));
    },

    gen$val = function(tree) {
        return (
            destructure(
                tree,
                function(value) {
                    return value;
                }));
    },

    gen$array = function(tree, indent) {
        return (
            destructure(
                tree,
                function(values) {
                    return (
                        '[' +
                        (len(values) > 1 ?

                            (join(
                                map(values, function(value, i) {
                                    return (
                                        indent.line(partial(gen, value)) +
                                        (i < (len(values) - 1) ?
                                            ',' :
                                            ''));
                                }),
                                '') +
                            (indent.pretty ? '\n' : '') +
                            indent(']')) :

                            (map(values, function(value) {
                                return gen(value, indent);
                            }) +
                            ']')));
                }));
    },

    gen$object = function(tree, indent) {
        return (
            destructure(
                tree,
                function(pairs) {
                    return (
                        '{' +
                        (len(pairs) > 1 ?

                            (join(
                                map(pairs, function(pair, i) {
                                    return (
                                        destructure(pair, function(key, value) {
                                            return (
                                                indent.line(function(indent) {
                                                    return (
                                                        gen(key, indent) +
                                                        (indent.pretty ? ': ' : ':') +
                                                        (indent.pretty && isLong(value) ?

                                                            '(' +
                                                            indent.line(
                                                                partial(gen, value)) +
                                                            ')' :

                                                            gen(value, indent)) +

                                                        (i < (len(pairs) - 1) ?
                                                            ',' :
                                                            ''));
                                                }));
                                        }));
                                }),
                                '') +
                            (indent.pretty ? '\n' : '') +
                            indent('}')) :

                            (map(pairs, destructured(function(key, value) {
                                return (
                                    gen(key, indent) +
                                    (indent.pretty ? ': ' : ':') +
                                    gen(value, indent));
                            })) +
                            '}')));
                }));
    },

    gen$regex = function(tree) {
        return (
            destructure(
                tree,
                function(regex) {
                    return regex;
                }));
    },

    gen$block = function(tree, indent) {
        return (
            join(
                map(asBlock(tree) || [], function(line) {
                    return (
                        indent.line(
                            partial(gen, line)) +
                            (isExpr(line) ? ';' : ''));
                }),
                ''));
    },

    gen$var = function(tree, indent) {
        return (
            destructure(
                tree,
                function(vars) {
                    return (
                        indent('var ') +
                        (vars.length > 1 ?

                            (map(slice(vars, 0, 1), destructured(function(name, value) {
                                return (
                                    gen(name, indent) +
                                    (indent.pretty ? ' = ' : '=') +
                                    (indent.pretty && isLong(value) ?

                                        '(' +
                                        indent.level(function(indent) {
                                            return (
                                                indent.line(
                                                    partial(gen, value)));
                                        }) +
                                        ')' :

                                        indent.level(
                                            partial(gen, value))) +
                                    ',');
                            }))) +

                            (join(
                                map(slice(vars, 1), function(assignment, i) {
                                    return (
                                        destructure(assignment, function(name, value) {
                                            return (
                                                indent.line(function(indent) {
                                                    return (
                                                        gen(name, indent) +
                                                        (indent.pretty ? ' = ' : '=') +
                                                        (indent.pretty && isLong(value) ?

                                                            '(' +
                                                            indent.line(
                                                                partial(gen, value)) +
                                                            ')' :

                                                            gen(value, indent)) +
                                                        (i < (len(vars) - 2) ?
                                                            ',' :
                                                            ''));
                                                }));
                                        }));
                                }),
                                '')) :

                            (map(vars, destructured(function(name, value) {
                                return (
                                    gen(name, indent) +
                                    (indent.pretty ? ' = ' : '=') +
                                    (indent.pretty && isLong(value) ?

                                        '(' +
                                        indent.level(function(indent) {
                                            return (
                                                indent.line(
                                                    partial(gen, value)));
                                        }) +
                                        ')' :

                                        indent.level(
                                            partial(gen, value))));
                            })))) +
                        ';' +
                        (indent.pretty ? '\n' : ''));
                }));
    },

    gen$if = function(tree, indent) {
        return (
            destructure(
                tree,
                function(test, consequent, alternative) {
                    return (
                        (indent.pretty ? 'if (' : 'if(') +
                        gen(test, indent) +
                        (indent.pretty ? ') {' : '){') +
                        gen$block(consequent, indent) +
                        (indent.pretty ? '\n' : '') +
                        indent('}') +
                        (alternative ?
                            ((indent.pretty ? ' else {' : 'else{') +
                            gen$block(alternative, indent) +
                            (indent.pretty ? '\n' : '') +
                            indent('}')) :
                            ''));
                }));
    },

    gen$while = function(tree, indent) {
        return (
            destructure(
                tree,
                function(test, body) {
                    return (
                        (indent.pretty ? 'while (' : 'while(') +
                        gen(test, indent) +
                        (indent.pretty ? ') {' : '){') +
                        gen$block(body, indent) +
                        (indent.pretty ? '\n' : '') +
                        indent('}'));
                }));
    },

    gen$for = function(tree, indent) {
        return (
            destructure(
                tree,
                function(init, test, update, body) {
                    return (
                        (indent.pretty ? 'for (' : 'for(') +
                        gen(init, indent) +
                        (indent.pretty ? '; ' : ';') +
                        gen(test, indent) +
                        (indent.pretty ? '; ' : ';') +
                        gen(update, indent) +
                        (indent.pretty ? ') {' : '){') +
                        gen$block(body, indent) +
                        (indent.pretty ? '\n' : '') +
                        indent('}'));
                }));
    },

    gen$try = function(tree, indent) {
        return (
            destructure(
                tree,
                function(guarded, name, caught, finished) {
                    return (
                        (indent.pretty ? 'try {' : 'try{') +
                        gen$block(guarded, indent) +
                        (indent.pretty ? '\n' : '') +
                        indent('}') +
                        (name && caught ?

                            (indent.pretty ? ' catch (' : 'catch(') +
                            gen(name, indent) +
                            (indent.pretty ? ') {' : '){') +
                            gen$block(caught, indent) +
                            (indent.pretty ? '\n' : '') +
                            indent('}') :

                            '') +

                        (finished ?

                            (indent.pretty ? ' finally {' : 'finally{') +
                            gen$block(finished, indent) +
                            (indent.pretty ? '\n' : '') +
                            indent('}') :

                            ''));
                }));
    },

    gen$throw = function(tree, indent) {
        return (
            destructure(
                tree, function(value) {
                    return (
                        'throw ' +
                        (indent.pretty &&isLong(value) ?

                            '(' +
                            indent.line(
                                partial(gen, value)) +
                            ')' :

                            gen(value, indent)) +
                        ';');
                }));
    },

    gen$return = function(tree, indent) {
        return (
            destructure(
                tree, function(value) {
                    return (
                        'return ' +
                        (indent.pretty && isLong(value) ?

                            '(' +
                            indent.line(
                                partial(gen, value)) +
                            ')' :

                            gen(value, indent)) +
                        ';');
                }));
    },

    gen$params = function(tree, indent) {
        return (
            destructure(
                tree, function(params) {
                    return (
                        join(
                            map(params, function(param) {
                                return gen(param, indent);
                            }),
                            (indent.pretty ? ', ' : ',')));
                }));
    },

    gen$lambda = function(tree, indent) {
        return (
            destructure(
                tree, function(params, body) {
                    var last = body[len(body) - 1];

                    return (
                        'function(' +
                        gen(params, indent) +
                        ')' +
                        (indent.pretty ? ' {' : '{') +
                        (isExpr(last) ?

                            (len(body) > 1 ?
                                gen$block(slice(body, 0, -1), indent) :
                                '') +
                            indent.line(
                                partial(
                                    gen,
                                    ast.$return(last))) :

                            gen$block(body, indent)) +

                        (indent.pretty ? '\n' : '') +
                        indent('}'));
                }));
    },

    gen$call = function(tree, indent) {
        return (
            destructure(
                tree, function(fn, args) {
                    return (
                        (isLambda(fn) ? '(' : '') +
                        gen(fn, indent) +
                        '(' +
                        (len(args) > 1 ?

                            join(
                                map(args, function(arg, i) {
                                    return (
                                        indent.line(
                                            partial(gen, arg)) +
                                        (i < (len(args) - 1) ?
                                            ',' :
                                            ''));
                                }),
                                '') :

                            join(
                                map(args, function(arg) {
                                    return gen(arg, indent);
                                }),
                                (indent.pretty ? ', ' : ','))) +

                        ')' +
                        (isLambda(fn) ? ')' : ''));
                }));
    },

    gen$get = function(tree, indent) {
        return (
            destructure(
                tree, function(object, key) {
                    return (
                        (isObject(object) ? '(' : '') +
                        gen(object, indent) +
                        (isObject(object) ? ')' : '') +
                        (isSym(key) ?

                            '.' +
                            gen(key, indent) :

                            '[' +
                            (indent.pretty && isLong(key) ?

                                indent.line(
                                    partial(gen, key)) +
                                (indent.pretty ? '\n' : '') +
                                indent(']') :

                                gen(key, indent) +
                                ']')));
                }));
    },

    gen$unop = function(tree, indent) {
        return (
            destructure(
                tree, function(op, value) {
                    return (
                        (len(op) > 1 ? op + ' ' : op) +
                        (isOperator(value) && !isUnop(value) ?

                            '(' +
                            gen(value, indent) +
                            ')' :

                            gen(value, indent)));
                }));
    },

    gen$binop = function(tree, indent) {
        return (
            destructure(
                tree,
                function(op, left, right) {
                    return (
                        (isOperator(left) ? '(' : '') +
                        gen(left, indent) +
                        (isOperator(left) ? ')' : '') +
                        (indent.pretty ? ' ' + op + ' ' : op) +
                        (isOperator(right) ? '(' : '') +
                        gen(right, indent) +
                        (isOperator(right) ? ')' : ''));
                }));
    },

    gen$ternop = function(tree, indent) {
        return (
            destructure(
                tree,
                function(opleft, opright, left, middle, right) {
                    return (
                        !isShort(left) || !isShort(middle) || !isShort(right) ?

                            (isOperator(left) ? '(' : '') +
                            gen(left, indent) +
                            (isOperator(left) ? ')' : '') +
                            (indent.pretty ? ' ' + opleft + ' ' : opleft) +
                            (isOperator(middle) ? '(' : '') +
                            indent.line(
                                partial(gen, middle)) +
                            (isOperator(middle) ? ')' : '') +
                            (indent.pretty ? ' ' + opright + ' ' : opright) +
                            (isOperator(right) ? '(' : '') +
                            indent.line(
                                partial(gen, right)) +
                            (isOperator(right) ? ')' : '') :

                            (isOperator(left) ? '(' : '') +
                            gen(left, indent) +
                            (isOperator(left) ? ')' : '') +
                            (indent.pretty ? ' ' + opleft + ' ' : opleft) +
                            (isOperator(middle) ? '(' : '') +
                            gen(middle, indent) +
                            (isOperator(middle) ? ')' : '') +
                            (indent.pretty ? ' ' + opright + ' ' : opright) +
                            (isOperator(right) ? '(' : '') +
                            gen(right, indent) +
                            (isOperator(right) ? ')' : ''));
                }));
    },

    gen$op = function(tree, indent) {
        return (
            destructure(
                tree,
                function(op, values) {
                    return (
                        join(
                            map(values, function(value, i) {
                                return (
                                    (isOperator(value) ? '(' : '') +
                                    (i > 0 && len(values) > 2 ?
                                        indent(
                                            partial(gen, value)) :
                                        gen(value, indent)) +
                                    (isOperator(value) ? ')' : '') +
                                    (i < (len(values) - 1) ?
                                        (indent.pretty ?
                                            (len(values) > 2 ?
                                                (' ' + op + '\n') :
                                                (' ' + op + ' ')) :
                                            op) :
                                        ''));
                            }),
                            ''));
                }));
    },

    gen$shortop = function(tree, indent) {
        return (
            destructure(
                tree,
                function(op, values) {
                    return (
                        join(
                            map(values, function(value, i) {
                                return (
                                    (isOperator(value) ? '(' : '') +
                                    (i > 0 && len(values) > 2 ?
                                        indent(
                                            partial(gen, value)) :
                                        gen(value, indent)) +
                                    (isOperator(value) ? ')' : '') +
                                    (i < (len(values) - 1) ?
                                        (indent.pretty ?
                                            (len(values) > 2 ?
                                                (' ' + op + '\n') :
                                                (' ' + op + ' ')) :
                                            op) :
                                        ''));
                            }),
                            ''));
                }));
    },

    gen$setop = function(tree, indent) {
        return (
            destructure(
                tree,
                function(op, destination, value) {
                    return (
                        gen(destination, indent) +
                        (indent.pretty ? ' ' + op + ' ' : op) +
                        (indent.pretty && isLong(value) ?

                            '(' +
                            indent.line(
                                partial(gen, value)) +
                            ')' :

                            gen(value, indent)));
                }));
    },

    gen = function(tree, indent) {
        return ({
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
        })[tree[0]](slice(tree, 1), indent);
    };

module.exports = function(tree, width) {
    var indent = indented(width);

    return (
        join(
            map(asBlock(tree), function(line) {
                return (
                    gen(line, indent) +
                    (isExpr(line) ?
                        (indent.pretty ? ';\n' : ';') :
                        ''));
            }),
            ''));
};
