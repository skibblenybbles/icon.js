# icon.js
A JavaScript abstract syntax tree and code generator

## Example

Consider the following brute-force (*O(fib(N)), oh my!*) recursion for
calculating Fibonacci numbers:

```javascript
var fib = function(n) {
    return (
        n < 2 ?
            n :
            fib(n - 1) + fib(n - 2));
};
```

We can use tools from `icon.js` to generate an abstract syntax tree (AST) that
represents this code:

```javascript
var ast = require('icon').ast,
    astfib;

// Make AST tools global.
Object.keys(ast).forEach(function(key) {
    this[key] = ast[key];
});

// Generate the AST.
astfib = (
    $var(
        'fib',
        $lambda(
            $params('n'),
            $choose(
                $lt(
                    $('n'),
                    2),
                $('n'),
                $add(
                    $call('fib', $sub($('n'), 1)),
                    $call('fib', $sub($('n'), 2)))))));
```

The `astfib` variable will now contain the abstract syntax tree structure as a
nested array:

```javascript
[
    "var",
    [
        [
            [
                "sym", "fib"
            ],
            [
                "lambda",
                [
                    "params",
                    [
                        [
                            "sym", "n"
                        ]
                    ]
                ],
                [
                    [
                        "ternop", "?", ":",
                        [
                            "binop", "<",
                            [
                                "sym", "n"
                            ],
                            [
                                "val", "2"
                            ]
                        ],
                        [
                            "sym", "n"
                        ],
                        [
                            "op", "+",
                            [
                                [
                                    "call",
                                    [
                                        "sym", "fib"
                                    ],
                                    [
                                        [
                                            "op", "-",
                                            [
                                                [
                                                    "sym", "n"
                                                ],
                                                [
                                                    "val", "1"
                                                ]
                                            ]
                                        ]
                                    ]
                                ],
                                [
                                    "call",
                                    [
                                        "sym", "fib"
                                    ],
                                    [
                                        [
                                            "op", "-",
                                            [
                                                [
                                                    "sym", "n"
                                                ],
                                                [
                                                    "val", "2"
                                                ]
                                            ]
                                        ]
                                    ]
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ]
    ]
]
```

We could have created this tree manually, but the AST tools make this
easier. Now, we can generate JavaScript code from the AST:

```javascript
console.log(require('icon').gen(astfib, 4));
```

will output:

```javascript
var fib = function(n) {
        return (
            n < 2 ?
                n :
                fib(n - 1) + fib(n - 2));
    };
```

To skip the pretty-printing, don't pass any value for the tab width:

```javascript
console.log(require('icon').gen(astfib));
```

which will output:

```javascript
var fib=function(n){return n<2?n:fib(n-1)+fib(n-2);};
```

## Why?

We already have a well-accepted "standard" for JavaScript ASTs from Mozilla's
SpiderMonkey, used by **esprima**, **escodegen** and many JavaScript code
analysis and transpiler tools. However, the AST from this world is dense and
burdened with myriad, heavyweight nodes for representing syntax from the past
and future of JavaScript, along with parser metadata.

The `icon.js` AST represents a subset of JavaScript. It is designed to clearly
demonstrate that JavaScript and all other languages boil down to tree
structures. Particularly, this AST encourages the exploration of interpreter
implementation and of homoiconic metaprogramming in JavaScript, that is,
writing programs that write programs by manipulating ASTs.
