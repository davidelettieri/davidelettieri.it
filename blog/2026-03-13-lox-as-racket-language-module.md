---
title: Lox as racket language module
date: 2026-03-13
tags: [lox, racket]
---

For a long time, I wanted to implement a Racket language module with a non-lispy surface syntax. Lox, from [Crafting Interpreters](https://craftinginterpreters.com/), was an obvious candidate: I didn't want to invent a new syntax nor new semantics. My main objective was to leverage Racket language-building facilities while learning Racket, Scheme, and macros.

[I attempted this already a few years ago, with little success](2025-01-18-trying-to-implement-lox-as-racket-language-module.md). This time I dropped yacc and lex libraries and instead followed the approach from the book more closely, along with the C# version I had written earlier. The result is not especially functional in style: the scanner and parser are fairly imperative and rely on mutation, mainly because that made the code easier to port from the earlier implementations.
Another big help came from LLMs, I used GitHub Copilot and it helped me fill some gaps in my knowledge and troubleshoot issues that I honestly didn't have enough competencies to solve.

I do not use GitHub Copilot autocomplete because that removes all the fun from coding but I "chatted" extensively and I also asked it to generate parts I was not particularly interested in, such as the colorer[^1].

The code is available on GitHub [here](https://github.com/davidelettieri/racket-lox). In the post I'll go through the implementation, highlighting all the parts that I consider interesting or helpful.

## Scanner

The scanner mainly exposes the scan-tokens function and a few custom structs. scan-tokens takes an [input port](https://docs.racket-lang.org/guide/i_o.html) and walks through the source code. Its result is a scanner-output value containing both the tokens and an error flag. In the book’s implementation, scanner errors are reported through a static method on the interpreter. Since I do not have an interpreter here, I return that information explicitly instead.

Given the imperative style of the implementation, I also defined a `while` macro to use in loops and to closely mimic the book implementation. This macro is used also in the language expansion as well. Nothing fancy, there are plenty of examples online about this.

Something that resembles functional programming or at least more in line with Racket style, is the usage of [`for/list`](https://docs.racket-lang.org/reference/for.html#%28form._%28%28lib._racket%2Fprivate%2Fbase..rkt%29._for%2Flist%29%29) in conjunction with [`in-producer`](https://docs.racket-lang.org/reference/sequences.html#%28def._%28%28lib._racket%2Fprivate%2Fbase..rkt%29._in-producer%29%29). At the beginning I was using my `while` macro or a loop and using `cons` to build up lists of objects and then reversing the list to get the correct order. This was ugly as hell and doing the reverse at the end was painful. 

The `for/list` has options to stop the collection of items, skip items, etc. The `in-producer` is a lazily evaluated, possibly infinite, sequence of items provided by a `producer` function.

Overall the implementation is quite straightforward.

## Parser

The parser resembles, as the scanner, the source implementation. I didn't define a class to hold the state, so I had two options:
1. Pass the state around as parameter.
2. Use nested function definitions and capture the state from the outer context.
I chose the latter. It behaves almost like having an object instance whose methods access private fields, and it keeps the function signatures simpler because I do not have to pass the state around everywhere.

I don't have a proper syntax tree with pre-defined types, the parser is producing a "lisped" version of Lox syntax. Style is mixed, I'm using `for/list` and `in-producer` like in the scanner but also more imperative constructs as my `while` macro, hand-written loops and such things.

Thanks to the macro support, I was able to extract some repetitive logic that appears when parsing [expressions](https://craftinginterpreters.com/appendix-i.html#expressions):

``` title='Part of the Lox grammar referring to binary operations'
logic_or       → logic_and ( "or" logic_and )* ;
logic_and      → equality ( "and" equality )* ;
equality       → comparison ( ( "!=" | "==" ) comparison )* ;
comparison     → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
term           → factor ( ( "-" | "+" ) factor )* ;
factor         → unary ( ( "/" | "*" ) unary )* ;
```

All these productions have a similar form, they are all binary expressions:
1. They depend on another production 
2. They have a set of tokens for separating inner productions

With that in mind I defined the following macro and all the expressions:
```scheme title='Macro for parsing binary ops'
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

Another interesting part is the `assignment` production, [here is my C# version](https://github.com/davidelettieri/Lox):
```csharp title='Assignment parsing in my C# implementation'
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
In `C#` and in `Java` we can check if an object is of a specific type and cast it to the desired type. Given that I don't have any types but only Racket expressions produced by the parser I can't follow that approach. However, by knowing a bit of macros which are essentially functions with signature `syntax -> syntax` bound to a given name, we can define a `syntax -> syntax` function to understand what we have and react accordingly. The type check on the `expr` variable is replaced with a `syntax-parse` that is able to recognize the shape of the syntax we are expecting and produce the desired output syntax (opposed to a new AST object from Lox original implementation). The `#:datum-literals (lox-variable lox-get)` is telling `syntax-parse` that those elements need to be matched literally. Those are not pattern variables as `name:expr` or `obj:expr`:
```scheme title='Assignment syntax parser'
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

The `lox.rkt` file takes the place of the interpreter from the book. Since this is a Racket language module, the goal is not to interpret Lox directly but to translate it into Racket. The expanded syntax is therefore responsible for reproducing the runtime errors that the interpreter would have raised.

The syntax produced by the parser is something like:
```scheme title='Sample expanded syntax'
(lox-var-declaration v (lox-literal "Hello World!"))
(lox-print (lox-variable v))
```
We need to translate this to Racket standard forms and functions, with some attention because there are semantic differences between Racket and Lox that we need to handle on our own. For example Lox allows the following code (re-declaring a variable in a top-level scope)
```text title='Lox variable re-definition'
var v = "Hello World!";
var v = "a";
```
Racket does not behave the same:
```scheme title='Racket variable re-definition'
(define v "Hello World!")
(define v "a")
```
It fails with

> module: identifier already defined in: v

This is an essential difference but there are others as well, for example "truthiness" and the `nil` object, the lack of a `return` statement in Racket to be used inside of functions' bodies. I will go through some parts of the Lox expansion module to explain how it works.

### Nil and truthiness

The Lox `nil` value is defined using a sentinel value `'lox-nil`. To support truthiness a helper function is defined and used to define other parts of the syntax interacting with boolean values.

```scheme title='Truthiness'
(define (lox-truthy? v)
  (not (or (eq? v #f) (eq? v lox-nil))))
  
(define-syntax (lox-or stx)
  (syntax-parse stx
    [(_ left:expr right:expr) #'(let ([l-val left]) (if (lox-truthy? l-val) l-val right))]))

(define-syntax (lox-and stx)
  (syntax-parse stx
    [(_ left:expr right:expr) #'(let ([l-val left]) (if (lox-truthy? l-val) right l-val))]))

(define-syntax (lox-while stx)
  (syntax-parse stx
    [(_ cond:expr body:expr ...) #'(while (lox-truthy? cond) body ...)]))

(define-syntax (lox-if stx)
  (syntax-parse stx
    [(_ cond then)
     #'(when (lox-truthy? cond)
         then)]
    [(_ cond then else) #'(if (lox-truthy? cond) then else)]))

(define-syntax (lox-unary stx)
  (with-syntax ([line (syntax-line stx)])
    (syntax-parse stx
      #:datum-literals (BANG MINUS)
      [(_ BANG v:expr) #'(not (lox-truthy? v))]
      [(_ MINUS v:expr) #'(lox-negate-impl v line)])))
```

### Binary operations

I already described the macro used during the parsing phase of the language module. Also during expansion, I used macros to remove some code duplication in addition to a function helper used to do arguments validation.

A rather big macro performs a "dispatch" to the function defining the binary operations. When possible numeric binary operations are defined using the helper `lox-number-binary-with-validation`, some others like `lox-add-impl` are defined ad hoc.

```scheme title='Binary expression expansion'
(define-syntax (lox-binary stx)
  (with-syntax ([line (syntax-line stx)])
    (syntax-parse stx
      #:datum-literals
      (PLUS MINUS GREATER GREATER_EQUAL LESS LESS_EQUAL SLASH STAR BANG_EQUAL EQUAL_EQUAL AND OR)
      [(_ left:expr PLUS right:expr) #'(lox-add-impl left right line)]
      [(_ left:expr MINUS right:expr) #'(lox-number-binary-with-validation - left right line)]
      [(_ left:expr GREATER right:expr) #'(lox-number-binary-with-validation > left right line)]
      [(_ left:expr GREATER_EQUAL right:expr)
       #'(lox-number-binary-with-validation >= left right line)]
      [(_ left:expr LESS right:expr) #'(lox-number-binary-with-validation < left right line)]
      [(_ left:expr LESS_EQUAL right:expr) #'(lox-number-binary-with-validation <= left right line)]
      [(_ left:expr SLASH right:expr) #'(lox-divide-impl left right line)]
      [(_ left:expr STAR right:expr) #'(lox-number-binary-with-validation * left right line)]
      [(_ left:expr BANG_EQUAL right:expr) #'(not (lox-eqv? left right))]
      [(_ left:expr EQUAL_EQUAL right:expr) #'(lox-eqv? left right)]
      [(_ left:expr AND right:expr) #'(lox-and left right)]
      [(_ left:expr OR right:expr) #'(lox-or left right)])))
```

### Undefined variables

Lox undefined variable behavior, a runtime error with a specific error code and message, is implemented partially here and partially in the main module. In Racket [any unbound identifier is expanded through a #%top form](https://docs.racket-lang.org/reference/syntax-model.html#%28part._expand-steps%29) which I'm overriding to get the desired behavior. So I defined a `lox-top` macro:
```scheme
(define-syntax (lox-top stx)
  (syntax-parse stx
    [(_ . id:id)
     (with-syntax ([line (or (syntax-line #'id) (syntax-line stx) 0)]
                   [str-id (symbol->string (syntax->datum #'id))])
       #'(lox-runtime-error (format "Undefined variable '~a'." str-id) line))]))
```
This macro is used in the main module to override the default `#%top` form.

### Return statement

Racket does not have a built-in return statement for function bodies, but it provides the machinery needed to implement one. The core runtime piece is let/ec, which gives us an escape continuation. The macro-level piece is a syntax parameter: while expanding a function body, I rename return-param to that function’s escape continuation. This means that each function body expands with its own target for lox-return, so returns inside nested functions correctly exit the inner function rather than the outer one.

```scheme title='Simple early exit from function'
(define (foo)
  (let/ec k
    (displayln "inside function")
    (k 1)
    (displayln "post early return")
    2))

; sample execution
(define v (foo))
(displayln v)

; output
; inside function
; 1
```

The documentation on [racket docs for `let/ec` is pretty scarce](https://docs.racket-lang.org/reference/cont.html#%28form._%28%28lib._racket%2Fprivate%2Fletstx-scheme..rkt%29._let%2Fec%29%29) and I don't have much to add besides that the approach works and it is simple to use. 

We can see that the `k` in `let/ec k` is a new binding that's being introduced because `(let/ec k body ...+)` is equivalent to `(call/ec (lambda (k) body ...))`. We would like to return whenever we encounter a `lox-return` either alone or with a following value/expression. Using `(let/ec lox-return ...)` wouldn't work because we are defining a new binding and not using our parsed syntax object.

That is why I use a syntax parameter together with `syntax-parameterize` and `make-rename-transformer`: inside that expansion context, `lox-return` is rewritten to the escape continuation `k`. Nested function bodies are expanded under their own parameterization, so a return always targets the correct function.

```scheme title='Return statement implementation'
(define-syntax-parameter return-param
  (lambda (stx) (raise-syntax-error #f "return used outside of function" stx)))

(define-syntax (lox-return stx)
  (syntax-parse stx
    [(_ val) #'(return-param val)]))

; lox-run-callable-body is used multiple times
; otherwise it could have been included in the lox-function definition
(define-syntax-rule (lox-run-callable-body ((param binding) ...) stmt ...)
  (let/ec k
    (syntax-parameterize ([return-param (make-rename-transformer #'k)]
                          [param binding] ...)
      (lox-block stmt ...))))

(define-syntax (lox-function stx)
  (syntax-parse stx
    [(_ name:id (arg:id ...) (stmt ...))
     #'(define (name arg ...)
         (lox-run-callable-body () stmt ...))]))
```


[^1]: More details on syntax coloring [here](https://docs.racket-lang.org/tools/lang-languages-customization.html#%28idx._%28gentag._0._%28lib._scribblings%2Ftools%2Ftools..scrbl%29%29%29)