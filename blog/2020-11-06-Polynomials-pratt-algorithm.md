---
title:  "Parsing polynomials with the Pratt algorithm"
date:   2020-11-06 18:00:00 +0100
tags: [c# pratt polynomial]
---
## polynomials-pratt-algorithm
Using a Pratt parser I aim to parse expressions like this `x^2+y^2-1, x=1, y=1` and `xy, x=2, y=3`. Parsing mathematical expressions it's not hard but it already contains some interesting behaviour such as associativity between operators `x+y*z` is equal to `x+(y*z)` and not `(x+y)*z`. For no particular reason I decided to put the variable assignments after the polynomial. The expression `x^2+y^2-1, x=1, y=1` is to be interpreted as you would with this pseudo code
```
x=1
y=1
print (x*2+y^2+1)
```
For the full source code see [here](https://github.com/davidelettieri/Polynomials-pratt-algorithm.html) 

The Pratt algorithm allows to create a "general purpose parser" in which is possible to plug in all the parser rules needed for your language or grammar. In my implementation I decided to build a parsed with fixed parsing rules by adding them into the constructors. But as you can see in the Java example (see references) it's easy to create a generic parser and plug the rules by subclassing it. 

The important stuff happens in the ParseExpression method. The first time it is called with `precedence = 0` and let's see how it works with the polynomial `x+y*z`:
1. advance to the next token, which is `x`
2. retrieve the corresponding prefix denotation `VarDenotation`. The prefix denotation cannot be null if the polynomial expressions is correct since we are at the beginning of the expression so the only valid tokens are exactly the ones associated with a prefix denotation, for example a polynomial cannot start with a '*'.
3. use the denotation to parse the token, `VarDenotation` return a `VariableExpr`. Remember that a denotation *can* call ParseExpression, so here we have a kind of recursion.
4. we check if the next token `+` as an higher precedence with respect of the current precedence parameters. Since the precedence of the `BinaryOperatorDenotation ` of `+` is `1` we enter the while
5. advance to `+`
6. get the infix denotation 
7. use the denotation to parse the token. The `parse` method on an infix denotation needs the previous expression, the token and the parser to call `ParseExpression` again. It's easy to see the in order to parse an `AddExpr` we need the expression before the `+` and the expression after. 
8. the `BinaryOperatorDenotation` will call the `ParseExpression` method with `precedence=1`
9. advance to `y`
10. retrieve `VarDenotation`
11. parse `y` to a `VariableExpr`
12. `PeekPrecedence()` will return the precedence related to the `BinaryOperatorDenotation` of '*' which is `2` so we enter again the while again. This reflects the fact that `*` has a higher precedence of `+` and entering the while means that the `VariableExpr` of `y` will be a parameter of the `*` instead of `+` as one would expect.
13. advance to `*`
14. get the infix denotation
15. the parse of the `*` call parse with `precedence=2`.
16. (we're almost over) advance to `z`
17. parse the `VarDenotation`
18. `PeekPrecedence()` returns `0` since we are at the end of the expression
19. we skip the while and returns the `z` parselect
20. we're back in the binary operator related to `*` which returns the `ProductExpr` representing `y*z`
21. we're back in the `ParseExpression` with `precedence=1`
22. we're back in the binary operator related to `+` which returns the final `AddExpr` representing `x+(y*z)`
23. we're back in the `ParseExpression` with `precedence=0` and we return the result.

```
public IExpr ParseExpression(int precedence = 0)
{
    var token = Advance();
    var prefix = GetPrefixDenotation(token.Type);

    if (prefix is null) throw new ParseError($"Could not parse \"{token.Lexeme}\" at column {token.Column}");

    var left = prefix.Parse(this, token);

    while (precedence < PeekPrecedence())
    {
        token = Advance();

        var infix = GetInfixDenotation(token.Type);
        left = infix.Parse(this, left, token);
    }

    return left;
}
```

## References 

I came across the Pratt parsing algorithm while reading [https://craftinginterpreters.com/](https://craftinginterpreters.com/), which is a great resource on interpreters and compilers. From the same author, a java implementation of a Pratt parser [http://journal.stuffwithstuff.com/2011/03/19/pratt-parsers-expression-parsing-made-easy/](http://journal.stuffwithstuff.com/2011/03/19/pratt-parsers-expression-parsing-made-easy/).

More formal resources are the paper from Pratt in which he explains the algorithm for the first time [https://dl.acm.org/doi/10.1145/512927.512931](https://dl.acm.org/doi/10.1145/512927.512931) and a thesis which is more approachable [http://vandevanter.net/mlvdv/publications/a-formalization-and-proof-o.html](http://vandevanter.net/mlvdv/publications/a-formalization-and-proof-o.html)