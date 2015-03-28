# icon.js

A JavaScript abstract syntax tree code generator and evaluator

## Example

Consider the following brute-force (*O(fib(n)), oh my!*) recursion for
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

with (ast) {
    astfib = (
        $var(
            'fib',
            $lambda(
                $params('n'),
                $return(
                    $choose(
                        $lt(
                            $('n'),
                            2),
                        $('n'),
                        $add(
                            $call('fib', $sub($('n'), 1)),
                            $call('fib', $sub($('n'), 2))))))));
}
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
                        "return",
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

We can also evaluate an AST and use results from the evaluation in our
JavaScript code. We'll need to modify `astfib` by wrapping it in a `$block()`
and adding a line to export the `fib()` function using `module.exports`:

```javascript
var ast = require('icon').ast,
    astfib;

with (ast) {
    astfib = (
        $block(
            $var(
                'fib',
                $lambda(
                    $params('n'),
                    $return(
                        $choose(
                            $lt(
                                $('n'),
                                2),
                            $('n'),
                            $add(
                                $call('fib', $sub($('n'), 1)),
                                $call('fib', $sub($('n'), 2))))))),
            $set($m('module', 'exports'), $('fib'))));
}
```
We'll evaluate the AST with `icon.evl()`. It will return the evaluated value
of `module.exports` from its top-level lexical environment:

```javascript
var fib = require('icon').evl(astfib);
```

Now we can call the `fib()` function that was generated by the evaluator:

```javascript
var i;

for (i = 1; i <= 20; i += 1) {
    console.log(i, fib(i));
}
```

which will output:

```
1 1
2 1
3 2
4 3
5 5
6 8
7 13
8 21
9 34
10 55
11 89
12 144
13 233
14 377
15 610
16 987
17 1597
18 2584
19 4181
20 6765
```

It's slow, but it's pretty cool.

## Why?

We already have a well-accepted "standard" for JavaScript ASTs from Mozilla's
**SpiderMonkey**, used by **esprima**, **escodegen** and many JavaScript code
analysis and transpiler tools. However, the AST from this world is dense and
burdened with myriad, heavyweight nodes for representing syntax from the past
and future of JavaScript, along with parser metadata.

The `icon.js` AST represents a subset of JavaScript. It is designed to clearly
demonstrate that JavaScript and all other languages boil down to tree
structures. Particularly, this AST encourages the exploration of evaluator
implementation and of homoiconic metaprogramming in JavaScript, that is,
writing programs that write programs by manipulating ASTs.
