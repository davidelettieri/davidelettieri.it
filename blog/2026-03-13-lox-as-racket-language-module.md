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

## Implementation strategy

The objective of the project is to have a Lox implementation as a Racket language module. For me, that means passing all tests from the Crafting Interpreter repo up to Chapter 13. The original implementation repo provides a Dart script to execute the test suite against any interpreter:

```bash
dart tool/bin/test.dart chap13_inheritance --interpreter racket
```

In order to have this working I added the `#lang racket-lox` at the top of each test file and changed the expected line adding 1. This approach is effective once you have a "working" language module already in place. For this reasons, the first few steps of the implementation have been done without "validation". I wrote a stub of the scanner, the parser and the language expansion. Once I was able to run the tests the development loop was pretty nice. I added a few unit tests to confirm some behaviors and iterate quicker on some bits of the implementation.

### Definining the racket-lox language

Being Racket a language-oriented programming language has all the facilities to build custom programming languages. This means having to build 2 different pieces:
- An expander module
- A reader module

 The expander moduleis the first module to be imported and it contains all the bindings that will be available. In particular there is an implicit form `#%module-begin` that must be provided, a few that can be provided such as `#%top` or `#%datum`. The reader module is responsible for getting the text of the program and convert it to racket code. If the surface syntax is lisp-like there are additional facilities to help with the definition of the language.

 To make a comparison between Lox implementation pieces and racket-lox parts we can say:
 - scanner, both Lox and racket-lox have a scanner. Behavior is almost the same, racket-lox reader returns a list of tokens.
 - parser, both Lox and racket-lox have a parser. Bheavior is different, racket-lox parser returns racket syntax objects. There is no pre-defined AST with classes. 
 - interpreter, racket-lox does not have an interpreter. The language is not interpreted, a `lox.rkt` file contains macros and functions that replicates Lox behavior in Racket.
 - resolver, both Lox and racket-lox have a resolver. The behavior is different, Lox resolver is executed at runtime before passing the AST to the interpreter. In racket-lox, the resolver is executed at compile time before. Its responsibilities are to forbid:
   - invalid top-level `return`
   - returning a value from `init`
   - invalid `this` usage
   - invalid `super` usage
   - class inheriting from itself
   - reading a local variable in its own initializer
   - duplicate local declarations in the same scope
 - resolve-redefinitions. This is only in racket-lox, I used it to support variable re-definition in a top level scope.

#### How to verify that resolver is executed at compile (expansion time)

Execute the following code

```text title='Source file proving that resolver is executed at compile time'
#lang racket-lox
print "before";
this;
```

and the output will be:
```text title='Output'
[line 3] Error at 'this': Can't use 'this' outside of a class.
```

Since there is no `before` printed anywhere we know the resolver is executed before the code from the source file is executed.

#### What is resolve-redefinitions

Lox supports variable re-definition in a top level scope, in order to support that I defined a function to be executed at expansion time `resolve-redefinitions`. In order to have it available at expansion time I wrapped the definition in a `begin-for-syntax`. The function is going through all the top level statements received from the parser and:
- it keeps track of defined variables
- it replaces a `lox-var-declaration` with a `lox-assign` whenever we are re-defining an existing variable. 
Please note that the function does not need to be recursive because we are interested in re-writing only the top level statements.

#### The custom #%module-begin form

The racket-lox language uses a custom `#%module-begin` form for multiple reason:
- we want to execute `resolve-statements` to enforce Lox language scoping rules.
- we want to execute `resolve-redefinitions` to allow top level variable re-declaration.
- we want to use `#%plain-module-begin` because the default `#%module-begin` prints out expression values to the default output port.

In order to make `resolve-statements` work we need to pass it the un-expanded syntax tree produced by the reader. However Racket might pre-expand some forms before passing it to the language custom module. To avoid that we wrap the list of statements produced by the reader with a `lox-module-wrapper` which is doing nothing, it wraps everthing in a `(begin ...)` and which we are removing in with the `unwrap-forms` function if we received it un-expanded. If racket is deciding to "pre-expand" something before passing it to our module, it will only expand the wrapper and not the inner forms. In this way the resolver will encounter the expected forms and work as intended.

```scheme title='racket-lox custom #%module-begin'
(define-syntax custom-module-begin
  (syntax-parser
    [(_ form ...)
     (define raw-forms (unwrap-forms #'(form ...)))
     (resolve-statements raw-forms)
     (with-syntax ([(fixed-forms ...) (resolve-redefinitions raw-forms)])
       #'(#%plain-module-begin ;; use module-begin to have expressions printed out
          fixed-forms ...))]))
```

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

Lox nil is represented by the `lox-nil` binding, whose value is the symbol `nil`. To support truthiness a helper function is defined and used to define other parts of the syntax interacting with boolean values.

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

The `lox-run-callable-body` indirection is useful to re-use the same code in function and in class methods. The `[param binding] ...` part is used in class methods to implement `this` and `super`, both are defined as `syntax-parameters`.

### Classes

Class definition is by far the most complex part of the project. As just mentioned we need to support `this` and `super`, but also methods, fields, printing of class definition, class instance, instance methods etc. It's really a lot of functionality for a single language construct. 

My first attempt at defining a Lox class was using Racket class, it supports everything fields, methods, this and such. Possibly not everything with the same semantics and functionality required by Lox but it was worth to give it a try. 

I tried, however the expansion of a very simple class is extremely complex. The following racket code

```scheme title='Racket empty class definition'
(define foo% (class object%))
```

expands to 

```scheme title='Racket empty class expansion'
(define-values
 (foo%)
 (#%app
  compose-class
  'foo%
  object%
  (#%app list)
  (#%app current-inspector)
  '#f
  '#f
  '0
  '()
  '()
  '()
  '()
  '()
  '()
  '()
  '()
  '()
  '()
  '()
  '()
  '()
  '()
  '()
  '()
  '()
  'normal
  (lambda (local-accessor local-mutator)
    (let-values ()
      (let-values ()
        (let-values ()
          (let-values ()
            (let-values ()
              (let-values ()
                (let-values ()
                  (let-values ()
                    (letrec-values ()
                      (#%app
                       values
                       (#%app list)
                       (#%app list)
                       (#%app list)
                       (lambda (self561
                                super-go
                                si_c
                                si_inited?
                                si_leftovers
                                init-args)
                         (let-values ()
                           (let-values ()
                             (let-values ()
                               (let-values ()
                                 (let-values ()
                                   (#%app void)
                                   '(declare-field-use-start))))))))))))))))))
  '#f
  '#f))
```

Troubleshooting my code scanner, parser and macros using this expansion for the class implementation was nearly impossible. I decided to follow an approach similar to the one used in the Crafting Intepreters book. I defined two types:

```scheme
(struct lox-class-constructor (base name method-table superclass)
  #:property prop:procedure
  (struct-field-index base))

(struct lox-class-instance (class fields))
```

The first one, `lox-class-constructor`, is similar to `LoxClass` in Crafting Interpreters. The `#:property prop:procedure` makes the struct "callable", it is an procedure and, as the name suggest, an instance of `lox-class-constructor` once called will return an instance of the class it is defining. The `base` argument is the procedure that will be called when we call an instance of `lox-class-constructor`. The `lox-class-instance` is an instance of a given class.

Now that we have the defining types we need a set of helper methods to properly implement Lox classes. We want `lox-class-constructor` to return `lox-class-instance` instance, sorry for the word play but `lox-class-instance` is a type that represent an instance of a Lox class, an instance of `lox-class-instance` is an instance of a Lox class, and we want all `lox-class-instance` of a given type to reference the same `lox-class-constructor` in the `class` field. So the instances of this types are mutually recursive, we define then:

```scheme showLineNumbers
(define (make-lox-class-constructor class-name-str superclass-value method-table)
  (letrec ([class (lox-class-constructor
                   (lambda ctor-args
                     (define fields (make-hash))
                     (define self (lox-class-instance class fields))
                     (define maybe-init (lox-class-bind-method class 'init self))
                     (when maybe-init
                       (lox-call-impl maybe-init ctor-args (current-call-line)))
                     (when (and (not maybe-init) (not (null? ctor-args)))
                       (lox-runtime-error (format "Expected 0 arguments but got ~a."
                                                  (length ctor-args))
                                          (current-call-line)))
                     self)
                   class-name-str
                   method-table
                   superclass-value)])
    class))
```

Let go line by line:
- In line 1 we are definining an helper function `make-lox-class-constructor` that helps us build a lox-class-constructor instance for a given class.
- In line 2 to define lox-class-constructor we need to define a function that returns an a lox-class-instance holding a reference to the lox-class-constructor. We use letrec to allow using class inside its own definition.
- In line 3 not much to say, syntax to define the lambda
- In line 4 initiating a hash table to hold the fields of the instance
- In line 5 defining the instance. Notice the `class` value passed into the struct constructor.
- In line 6 looking for a `init` method using our helper `lox-class-bind-method`
- In lines 7-8 if there is a `init` method, we call it (line 8)
- In lines 9-12 if there is no `init` but we got parameters we raise an error
- In line 13 we use `self` as return value for the lambda we are defining and the lambda definition is done and so we have the first parameter for the `lox-class-constructor`
- In lines 14-16 we pass the remaining parameters
- In line 17 we use `class` as return value for the `make-lox-class-constructor` we are defining.


[^1]: More details on syntax coloring [here](https://docs.racket-lang.org/tools/lang-languages-customization.html#%28idx._%28gentag._0._%28lib._scribblings%2Ftools%2Ftools..scrbl%29%29%29)