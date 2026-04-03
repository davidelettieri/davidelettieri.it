# Revision Plan: Lox as racket language module

## Already fixed

These points from the earlier review are no longer blockers and should stay as they are unless you decide to rewrite those sections for style.

1. The `nil` wording is now correct.

   The post now says that Lox nil is represented by the `lox-nil` binding, whose value is the symbol `nil`, which matches the implementation.

2. The article now explains much more of the `#lang` pipeline.

   The current draft covers the custom reader, the custom `#%module-begin`, compile-time resolution, and the top-level redeclaration rewrite. That was a major gap in the older draft and is now mostly resolved.

3. The wording around `this` and `super` is better.

   The draft no longer frames them as future work and it does explain the syntax-parameter-based implementation in callable bodies.

4. The class terminology is more accurate.

   The earlier `hashset` confusion is gone, and the post no longer suggests the implementation has a separate static/class-method feature.

5. The top-level redeclaration naming issue is fixed.

   The current draft consistently uses `resolve-redefinitions`, which now matches the repository.

6. The resolver responsibilities are now listed explicitly.

   The draft already gives readers a concise explanation of the semantic checks enforced at expansion time.

7. The initializer story is partly fixed.

   The post now explains that the constructor looks for `init`, and it also explains that methods named `init` force the return of the receiver.

## Remaining work

### 1. Correct the scanner/parser/reader split

This is the one clear technical inaccuracy still present in the post.

The draft currently says that the scanner in racket-lox returns a list of tokens, which is true as far as the scanner goes, but the surrounding paragraph is supposed to explain how the language is assembled. In the repository the actual pipeline is:

- scanner -> tokens
- parser -> syntax objects
- reader -> `(module anonymous-module racket-lox ...)` wrapping those parsed forms

Suggested replacement wording:

`The scanner produces tokens, the parser converts them to syntax objects, and the reader wraps the result into a module that uses #lang racket-lox.`

Priority: high

### 2. Extend the class runtime section one step further

The class section is much better than before, but it still stops just short of the runtime mechanics that make inheritance and method calls work.

What is still missing from the article:

- methods are stored as factories in a method table
- property access binds a method to a receiver on demand
- superclass lookup walks the inheritance chain recursively
- `super` dispatch uses the superclass reference captured for the bound method

This matters because the current text explains how classes are built, but not quite how method access and inherited dispatch behave at runtime.

Priority: high

### 3. Add a short testing and conformance section

The post mentions passing the Crafting Interpreters suite up to `chap13_inheritance` and briefly mentions some unit tests, but the repo gives you a stronger validation story than the article currently uses.

Worth stating explicitly:

- scanner tests
- parser tests
- resolver tests
- runtime tests
- integration execution against the Crafting Interpreters suite up to `chap13_inheritance`

This is useful evidence for readers because the post is making a semantic-compatibility claim, not just describing an experiment.

Priority: medium

### 4. Add a short section on semantic compatibility shims

Some of the most interesting implementation details in the repo are the places where Racket behavior differs from Lox and you handle that deliberately.

Good candidates for a compact section:

- negative zero printing
- numeric equality across exact and inexact numbers
- forcing division to produce inexact numbers
- printing classes, instances, and native functions in Lox style
- the native `clock` function
- required exit codes and error messages, including the DrRacket tradeoff

These are good article material because they show concrete host-language mismatches rather than only macro mechanics.

Priority: medium

### 5. Fix the contradictory `#%module-begin` snippet comment

The surrounding prose correctly says `#%plain-module-begin` is used to avoid printing expression results, but the inline comment in the snippet says the opposite.

That comment should either be corrected or removed.

Priority: low

## Recommended edit order

1. Fix the scanner/parser/reader description first.

   That is the only clear technical error still in the post.

2. Expand the class section with method binding, property lookup, and `super` dispatch.

   This is the most important missing architectural explanation.

3. Add the testing/conformance section.

   This strengthens the article's credibility with relatively little text.

4. Add the semantic compatibility section.

   This improves the article's depth and makes it more interesting for readers who care about language-port details.

5. Clean up the `#%module-begin` snippet comment.

   This is a small fix, but it removes a visible contradiction.

## Optional framing changes

If you want the post to read more like an engineering write-up and less like an implementation diary, two additions would improve the structure:

1. End the implementation-strategy section with a one-paragraph summary of the pipeline.

   That would give readers a stable mental model before the article dives into scanner, parser, resolver, and runtime details.

2. End the article with a short recap of where the complexity really is.

   The strongest closing point is probably that the scanner and parser are fairly direct ports, while the interesting work is in expansion-time validation and runtime semantic compatibility.

## Summary

The draft has already fixed most of the larger issues from the earlier review. The next revision should focus on one remaining technical correction, then on filling the two most valuable omissions: class dispatch mechanics and the testing/compatibility story.