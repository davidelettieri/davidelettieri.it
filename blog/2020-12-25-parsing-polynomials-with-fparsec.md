---
title:  "Parsing polynomials with F# and FParsec"
date:   2020-12-25 20:00:00 +0100
tags: [f#, fparsec, polynomials]
---

## Parsing polynomials with F# and FParsec
Parsing a polynomial expression is a simple but interesting example of parsing. We need to handle operator precedence and associativity, for example `*` has a higher precedence than `+` and the exponentiation is right associative `x^y^z=x^(y^z)` while subtraction is left associative `x-y-z=(x-y)-z`. Moreover a straighforward definition of the grammar is left recursive and a recursive descent parser does not allow to parse such grammar. We need to _arrange_ our grammar in order to avoid the left recursion.

<!-- truncate -->

In this post we will build a console app that:
* Ask the user for a polynomial expression such as `x+1` or `2*(x-y)^2`.
* Ask the user for the value of all the variables that appear in the polynomial.
* Print the value of the polynomial for the provided variables values.

The solution is very concise and simple thanks to the power of [F#](https://fsharp.org/) and the parser combinator library [FParsec](https://www.quanttec.com/fparsec/). Using simple and small building block we will build a recursive descent parser for our polynomial grammar. Let's start with choosing a representation for the polynomials.

### The AST
We use a [discriminated union](https://docs.microsoft.com/en-us/dotnet/fsharp/language-reference/discriminated-unions) to define a type to represent a polynomial:

```fsharp
type Expression = 
    | Add of Expression * Expression // x+y or z+1
    | Const of double // 1 or 10.5
    | Negative of Expression // -x
    | Pow of Expression * Expression // x^2
    | Product of Expression * Expression // x*y
    | Subtract of Expression * Expression // x-1 or x-y
    | Variable of char // x or y
```

Note that the type is recursive since we want to represent complex polynomials such as `x*(y+1)` which corresponds to `Product(Variable(x),Add(Variable(y),Const(1)))`. We could define a type for `Pow` to have a better distinction between the base and the exponent, in this example the distinction is purely _positional_: the first `Expression` is the base, the second one is the exponent. 

### Evaluation
In order to evaluate a polynomial we need:
* the polynomial itself which is an instance of Expression
* the values for all the variables in the polynomial which we choose to represent as a Map from `char` to `float`

The `eval` functions is straightforward to implement
```fsharp
let rec eval e (x:Map<char,float>) = 
    match e with
    | Add (e1,e2) -> eval e1 x + eval e2 x
    | Const c -> c
    | Negative e1 -> - eval e1 x
    | Pow (b,exp) -> Math.Pow(eval b x,eval exp x)
    | Product (e1,e2) -> eval e1 x * eval e2 x
    | Subtract (e1,e2) -> eval e1 x - eval e2 x
    | Variable v -> x.[v]
```

#### Helpers functions
We need a couple of helper functions:
* to list all the variable in an `Expression` 
* to ask the user of the console app the values for each one of the variables

```fsharp
let getVariables e = 
    let rec impl e =
            match e with
            | Add (e1,e2) -> impl e1 + impl e2
            | Const _ -> set []
            | Negative e1 -> impl e1
            | Pow (b,exp) -> impl b + impl exp
            | Product (e1,e2) -> impl e1 + impl e2
            | Subtract (e1,e2) -> impl e1 + impl e2
            | Variable v -> set [v]

    (impl e) |> Seq.toList

let askVariableValues l = 
    let rec impl l (m:Map<char,float>) = 
        match l with
        | [] -> m
        | h::t -> 
            printfn "Please enter value for %c" h
            let value = Console.ReadLine()
            let m' = m.Add(h,float value)
            impl t m'
    
    impl l (Map<_,_>([||]))
```

### The Grammar
I present the grammar starting with the highest precedence productions, usually the grammars are presented in the opposite order but we will implement the functions in this order because we need to define a parser using only parsers we defined _before_ the current one. The only exception is the Primary production which needs to use the Expression production, FParsec allow us to handle this pretty easily we'll see how.

```
Variable = [a-zA-Z] // corresponds to letter parser
Number = [0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)? // pfloat
Primary = Variable | Number | '(' Expression ')'
Unary = '-' Primary | Primary
Power = Unary ('^' Unary)*
Multiplication = Power ( ('*'|'/') Power )*
Addition = Multiplication ( ('+'|'-') Multiplication)*
Expression = Addition
```

### The parsing

Let's start with analyzing the type of our parser, we start with a string such as `x+y` or `x-1` and we want an instance of `Expression`. We cannot be sure that the input string will be a correct polynomial expression, for example we could feed into the parser `++` which is not a polynomial. A possible type for our parser is `string -> Expression option`. This is too far away from the type that FParsec uses for the parser which is 

```fsharp
type Parser<'TResult, 'TUserState> = CharStream<'TUserState> -> Reply<'TResult>
```
The `Parser` type from FParsec is more sofisticated than our candidate. It supports a user state which allows to implement _context sensitive parsers_ but it's beyond the scope of the post and not needed to parse the polynomial grammar. The `CharStream` is

>The CharStream class provides a unified interface for efficiently reading UTF‐16 chars from a binary stream or an in‐memory char buffer (e.g. a string). It is optimized for the use in backtracking parser applications and supports arbitrary char‐based seeking, even for streams larger than the addressable memory (on 32‐bit platforms).

as stated in the [official docs](https://www.quanttec.com/fparsec/reference/charstream.html#CharStream.remarks). The `Reply` contains a status indicating success or failure, a possible null error and a result in case of success.

The `expression` parser we want will have the type `Parser<Expression, unit>` indicating that it will produce an instance of `Expression` on success and that the user state is unused.

The first two productions are implemented with predefined parsers found in FParsec

```fsharp
let pvariable = letter |>> Variable
let pconst = pfloat |>> Const
```

The `letter` parser, parse a letter as the name suggest and return the letter itself which is feed into the `Variable` constructor. The `pfloat` parser works in the exacts same way but it returns a `float`. The `|>>` operator has the following signature
```fsharp
val (|>>): Parser<'a,'u> -> ('a -> 'b) -> Parser<'b,'u>
```
It takes a parser that produces an `'a` on success and applies the function `('a -> 'b)` to the result effectively producing a new parser of type `Parser<'b,'u>`. It is lifting a function from the types `'a,'b` to the 'Parser' types.


To define Primary we need a way to handle the reference to a parser which is not yet defined. FParsec provides a [createParserForwardedToRef function](https://www.quanttec.com/fparsec/reference/primitives.html#members.createParserForwardedToRef) 
```fsharp
let expression, expressionRef = createParserForwardedToRef()
```
where `expression` forwards all the call to `expressionRef` which in turns is a mutable reference that we correctly _fill_ later in the development. We are ready to define the primary parser using two helper functions and a couple of combinators

```fsharp
let pop = skipChar '('
let pcp = skipChar ')'
let pprimary = choice [ pvariable; pconst; between pop pcp expression ]
```

The `skipChar` parser matches a `char` and ignore the value. We don't need the '(' or the ')' we just need to know if we encounter one. Then we use two different combinators `choice` and `between`. The first one tries to apply, in order, any of the parsers in the supplied list. The second one is for parsing in sequence `pop`,`expression` and `pcp` and keeping the result of `expression`.

The Unary production is 

```fsharp
let punary = choice [ skipChar '-' >>. pprimary |>> Negative ; pprimary]
```

We are building with the already known parsers and combinators except for `>>.` which parse in sequence its left operand and its right operand and keeps the result of the right one. The Power production is slightly more complicated but FParsec has already a combinator we can use to build our parser, the `chainr1`

```fsharp
val chainr1: Parser<'a,'u> -> Parser<('a -> 'a -> 'a),'u> -> Parser<'a,'u>
```

exactly what we need, quoting the [documentation](https://www.quanttec.com/fparsec/reference/primitives.html#members.chainr1)

>The parser chainr1 p op parses one or more occurrences of p separated by op (in EBNF: p (op p)*)

Let's recall the Power production rule

```fsharp
Power = Unary ('^' Unary)*
```

This means that:
* `punary` is the `p` in the [EBNF](https://en.wikipedia.org/wiki/Extended_Backus%E2%80%93Naur_form) definition.
* we need the `op` in the EBNF definition. 

We know its type: `Parser<Expression -> Expression -> Expression, unit>`, we know we need to parse an '^' character and we have the `Pow` constructor of `Expression` of type `Expression * Expression -> Expression`. FParsec has several parser for chars we choose the `skipChar` which match a char and discard the result, since again we need to know that we found an '^' but we don't need it. Our `skipChar` '^' has type `Parser<unit>`, how could we obtain the desired type? With another combinator! The operator `>>%`

```fsharp
val (>>%): Parser<'a,'u> -> 'b -> Parser<'b,'u>
```
>The parser p >>% x applies the parser p and returns the result x. [docs](https://www.quanttec.com/fparsec/reference/primitives.html#members.:62::62::37:)

And we define

```fsharp
let curry f = fun x -> fun y -> f(x,y)
let powerOp = skipChar '^' >>% (curry Pow)
let pexpr = chainr1 punary powerOp
```

It's important to note that we choose `chainr1` which is **right associative**. Similar reasoning allows us to define all the other production in the grammar. Only the last one needs a special treatment since it is

```fsharp
expressionRef:= paddition
```

By setting `expressionRef` to addition we know that all calls to expression are going to be forwared to `paddition` as we want. The full code listing (only 83 lines!) is [here](https://github.com/davidelettieri/polynomials-fparsec). What do you think? Reach me out if you want and let me know!