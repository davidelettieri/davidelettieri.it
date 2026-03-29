# Review Notes: Lox as racket language module

## Previously raised points now addressed

1. The `nil` wording is now correct.

   The post now says that Lox nil is represented by the `lox-nil` binding, whose value is the symbol `nil`, which matches the implementation.

2. The article now covers much more of the `#lang` pipeline.

   The current draft explains the custom reader, the custom `#%module-begin`, compile-time resolution, and the top-level redeclaration rewrite. That was a major gap in the earlier version and is now mostly fixed.

3. The wording around `this` and `super` is better than before.

   The current text no longer frames them as some future feature and it does mention syntax parameters in the callable-body implementation.

4. The class terminology is more accurate now.

   I no longer see the earlier `hashset` confusion, and the draft no longer suggests the implementation has a separate static/class-method feature.

## Current technical findings

1. The description of the reader is now technically wrong in a different way.

   The draft says that the racket-lox reader "returns a list of tokens". That is not what the repo does. The scanner returns tokens, the parser turns them into syntax objects, and the reader wraps the parsed forms into a `(module anonymous-module racket-lox ...)` syntax object.

   This is a meaningful distinction because the article is explicitly trying to explain how a Racket language module is assembled.

   Better phrasing:

   `The scanner produces tokens, the parser converts them to syntax objects, and the reader wraps the result into a module that uses #lang racket-lox.`

2. The naming around top-level redeclaration is inconsistent.

   The prose introduces a function called `resolve-definitions`, but the code example later calls `resolve-redefinitions`, and the repo exports `resolve-redefinitions` from `lox.rkt` for use by `main.rkt`.

   Readers trying to map the prose to the implementation will think there are two different mechanisms when there is only one.

3. The resolver is now mentioned, but its responsibilities are still under-described.

   The draft now proves that resolution happens at expansion time and explains where it runs, which is good. What is still missing is a concise explanation of what the resolver actually enforces.

   Based on the repo and resolver tests, the resolver is responsible for at least:

   - invalid top-level `return`
   - returning a value from `init`
   - invalid `this` usage
   - invalid `super` usage
   - class inheriting from itself
   - reading a local variable in its own initializer
   - duplicate local declarations in the same scope

   Without that list, a reader still does not get a clear picture of why the resolver exists as a distinct phase.

4. The class section still stops before the most interesting runtime mechanics.

   The constructor walkthrough is correct, but the post still does not explain the method-binding model implemented in the repo:

   - methods are stored as factories in a method table
   - property access binds a method to a receiver on demand
   - superclass lookup walks the inheritance chain recursively
   - `super` dispatch uses the superclass reference captured for the bound method

   Those pieces are the core of how methods, inheritance, `this`, and `super` actually work here.

5. Initializer semantics are still not explained completely.

   The constructor walkthrough mentions calling `init` if present, but the article still does not state the other half of the behavior: bound methods named `init` return the instance even if the function body computes some other value, and the resolver separately forbids returning a non-`nil` value from an initializer.

   Those two pieces belong together and make the initializer story much clearer.

6. The testing and conformance story is still missing from the post.

   The repo contains:

   - scanner tests
   - parser tests
   - resolver tests
   - runtime tests
   - integration execution against the Crafting Interpreters suite up to `chap13_inheritance`

   That is strong evidence for correctness and it is currently absent from the article.

7. The post still omits several deliberate semantic compatibility shims that are worth mentioning.

   The repo contains explicit handling for:

   - negative zero printing
   - numeric equality across exact and inexact numbers
   - forcing division to produce inexact numbers
   - printing classes, instances, and native functions in Lox style
   - the native `clock` function
   - mandated exit codes and messages, which in turn affect DrRacket integration

   These are exactly the kinds of details that make a language-port article interesting, because they show where host-language behavior diverges from the target language.

8. One of the code comments in the `#%module-begin` snippet contradicts the surrounding explanation.

   The prose correctly says `#%plain-module-begin` is used to avoid the default `#%module-begin` behavior of printing expression results, but the snippet comment says `use module-begin to have expressions printed out`.

   That looks like a copied code comment rather than an article statement, but in the post it reads as a contradiction and should be fixed.

## Recommended additions for the next revision

1. Correct the reader/scanner/parser responsibility split.

2. Rename `resolve-definitions` to `resolve-redefinitions` everywhere in the post, unless you intentionally want to rename the code as well.

3. Add a short resolver subsection listing the concrete Lox rules enforced there.

4. Extend the class section with method factories, receiver binding, superclass lookup, and `super` dispatch.

5. Add initializer semantics explicitly: constructor calls `init`, `init` returns the instance, and the resolver forbids returning a value from it.

6. Add a short testing/conformance section.

7. Add a short section on semantic mismatches handled explicitly in the runtime.

## Summary

The earlier review is no longer accurate as-is because the draft has already fixed several of the biggest issues, especially the `nil` wording and the missing `#lang` pipeline material. The remaining problems are now more specific: one real technical error about what the reader returns, one naming inconsistency around redefinitions, and a few architectural/runtime topics that are still missing from an otherwise much stronger draft.