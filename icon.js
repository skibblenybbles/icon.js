'use strict';

// var fib = function(n) {
//     return n < 2 ? n : fib(n - 1) + fib(n - 2);
// };

// var astfib = (
//         $var(
//             'fib',
//             $lambda(
//                 $params('n'),
//                 $choose(
//                     $lt(
//                         $('n'),
//                         2),
//                     $('n'),
//                     $add(
//                         $call('fib', $sub($('n'), 1)),
//                         $call('fib', $sub($('n'), 2)))))));
