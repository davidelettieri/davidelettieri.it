---
title: Lox as racket language module
date: 2026-03-13
tags: [lox, racket]
---

For a long time I wanted to implement a racket language module with a non-lispy surface syntax. An obvious candidate was the Lox programming language from the [Crafting Interpreters book](https://craftinginterpreters.com/) because I didn't want to invent a new syntax nor new semantics. My main objective was just to be able to leverage Racket language facilities, learn some Racket/Scheme, learn some macros.

[I attempted this already a few years back with little success](2025-01-18-trying-to-implement-lox-as-racket-language-module.md), I decided to tackle it again ditching yacc/lex parsing libraries and mimicking more easily what was done in the book and what I did in C# replicating the book. It is noticeable that I didn't follow a functional programming style but more an imperative / oop style with mutations in particular in the scanning and parsing part where the code could be ported from existing implementations. 
Another big help came from LLMs, I used copilot and it helped me gap some knowledge and troubleshoot issues that I honestly didn't have enough competencies to solve.

I do not use copilot autocomplete because that removes all the fun from coding but I "chatted" extensively and I also used to fully generate parts I wasn't particularly interested in, such as the colorer[^1].

The code is available on github [here](https://github.com/davidelettieri/racket-lox). I'll go through the implementation, highlighting all the parts that I consider interesting or helpful, I want to follow my thought process as I worked on the implementation and the learnings I got.

## Scanner

The scanner is essentially exposing the `scan-tokens` function and some custom structs. The `scan-tokens` function takes an [input-port](https://docs.racket-lang.org/guide/i_o.html) and use it to go through the source code. The result of the `scan-tokens` function is a `scanner-output` type, in the original implementation a scanner error was exposed to the interpreter through a static method called directly from the scanner. I don't have an interpreter and so I don't have a static field to set, so I resolved to return a pair `(tokens had-error)` to signal if an error occurred or not. All custom defined struct have the `#:transparent` struct option so that we get nice printing, extensively used during "printf-debugging" I did.

Given the imperative style of the implementation, I also defined a `while` macro to use in loops and to closely mimic the book implementation. Nothing fancy, there are plenty of examples online about this.

Something that resembles functional programming or at least more in line with racket style, is the usage of [`for/list`](https://docs.racket-lang.org/reference/for.html#%28form._%28%28lib._racket%2Fprivate%2Fbase..rkt%29._for%2Flist%29%29) in conjuction with [`in-producer`](https://docs.racket-lang.org/reference/sequences.html#%28def._%28%28lib._racket%2Fprivate%2Fbase..rkt%29._in-producer%29%29). At the beginning I was using my `while` macro or a loop and using `cons` to build up lists of objects and then reversing the list to get the correct order. This was ugly as hell and doing the reverse at the end was painful. 

The `for/list` has options to stop the collection of items, skip items, etc. The `in-producer` is a lazily evaluated, possibly infinite, list of items provided by a `producer` function.

Overall the implementation is quite straightforward.

## Parser

The parser resembles, as the scanner, the source implementation. I didn't define a class to hold the state, so I had two options:
1. Pass the state around as parameter.
2. Use nested function definition and capture the state from the outer context.
I chose the latter, it's behaving almost like having an instance of a object with some methods that access private fields to perform their actions, it allows simpler function signature since we don't have to pass the state all the times.

I don't have a proper syntax tree with pre-defined types, the parser is producing a "lisped" version of Lox syntax. Style is mixed, I'm using `for/list` and `in-producer` like in the scanner but also more imperative constructs as my `while` macro, hand-written loops and such things.

Thanks to the macro support, I was able to extract some repetitive logic that appear when parsing [expressions](https://craftinginterpreters.com/appendix-i.html#expressions):

```
logic_or       → logic_and ( "or" logic_and )* ;
logic_and      → equality ( "and" equality )* ;
equality       → comparison ( ( "!=" | "==" ) comparison )* ;
comparison     → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
term           → factor ( ( "-" | "+" ) factor )* ;
factor         → unary ( ( "/" | "*" ) unary )* ;
```

All these productions have a similar form, they are all binary expressions:
1. They depend on another production 
2. They have a set of token for separating inner productions

Understanding that I defined the following macro and all the expressions:
```scheme
(define-syntax-rule (iterative-production name production . token-types)
(define (name)
    (define expr (production))
    (while (match .
            token-types)
            (define op (previous))
            (define right (production))
            (define op-type (token-type op))
            (set! expr (datum->syntax #f `(lox-binary ,expr ,op-type ,right) (token->src op))))
    expr))
(iterative-production factor unary 'SLASH 'STAR)
(iterative-production term factor 'MINUS 'PLUS)
(iterative-production or-syntax and-syntax 'OR)
(iterative-production and-syntax equality 'AND)
(iterative-production equality comparison 'BANG_EQUAL 'EQUAL_EQUAL)
(iterative-production comparison term 'GREATER 'GREATER_EQUAL 'LESS 'LESS_EQUAL)
```
As in other parts of the code, a lot of imperative pieces such as the `while` loop and the `set!` to "accumulate" the result into the `expr` variable.

Another interesting part is the `assignment` parse, here my C# version:
```csharp
private IExpr Assignment()
{
    var expr = Or();

    if (Match(EQUAL))
    {
        var equals = Previous();
        var value = Assignment();

        switch (expr)
        {
            case Variable v:
                return new Assign(v.Name, value);
            case Get g:
                return new Set(g.Obj, g.Name, value);
            default:
                Error(equals, "Invalid assignment target.");
                break;
        }
    }

    return expr;
}
```
In `C#` and in `Java` we can check if an object is of a specific type and cast it to the desired type. Given that I don't have any types but only racket expression produced by the parser I can't follow that approach. However, by knowing a bit of macros which are essentially functions with signature `syntax -> syntax` bound to a given name, we can define a `syntax -> syntax` function to understand what we have and react accordingly. The type check on the value variable is replaced with a `syntax-parse` that is able to recognize the shape of the syntax we are expecting and produce the desider output syntax (opposed to a new AST object from Lox original implementation). The `#:datum-literals (lox-variable lox-get)` is telling `syntax-parse` that those elements need to be matched literally. Those are not pattern variables as `name:expr` or `obj:expr`:
```scheme
(define (assignment)
(define expression (or-syntax))
(when (match 'EQUAL)
    (define equal (previous))
    (define value (assignment))
    (with-syntax ([value value])
    (set! expression
            (syntax-parse expression
            #:datum-literals (lox-variable lox-get)
            [(lox-variable name:expr)
                ;; reuse expression’s source location
                (syntax/loc expression
                (lox-assign name value))]
            [(lox-get obj:expr name:expr)
                (syntax/loc expression
                (lox-set obj name value))]
            [_ (parse-error equal "Invalid assignment target.")]))))
expression)
```

## Lox 

The `lox.rkt` file replaces what is the interpreter in the book. We are not directly interpreting the language, being this a racket language module the final objective is to "translate" lox to racket. The syntax produced by the parser is something like:
```scheme
(lox-var-declaration v (lox-literal "Hello World!"))
(lox-print (lox-variable v))
```
We need to translate this to racket standard forms and functions, with some attention because there are semantic differences between racket and Lox that we need to handle on our own. For example Lox allow the following code (re-declaring a variable in a top-level scope)
```
var v = "Hello World!";
var v = "a";
```
Racket does not behave the same:
```scheme
(define v "Hello World!")
(define v "a")
```
It fails with

> module: identifier already defined in: v

This is an essential difference but there are others as well, for example "truthyness" and the `nil` object.

[^1]: More details on syntax coloring [here](https://docs.racket-lang.org/tools/lang-languages-customization.html#%28idx._%28gentag._0._%28lib._scribblings%2Ftools%2Ftools..scrbl%29%29%29)