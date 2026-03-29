# Review Notes: Lox as racket language module

## Technical findings

1. The `nil` representation is described incorrectly in the post.

   The draft says the sentinel is `'lox-nil`, but the implementation defines `lox-nil` as a binding whose value is the symbol `nil`. That distinction matters because the parser emits the identifier `lox-nil`, while runtime code compares against `'nil`.

   Better phrasing:

   `Lox nil is represented by the lox-nil binding, whose value is the symbol nil.`

2. The post still under-describes the actual compilation and analysis pipeline.

   With the classes section added, this is now a meaningful architectural gap. A reader could come away thinking most semantic enforcement happens during expansion or runtime, but the project also contains a resolver pass before final expansion.

   That resolver is responsible for several important Lox rules:

   - invalid top-level `return`
   - returning a value from `init`
   - invalid `this` usage
   - invalid `super` usage
   - class inheriting from itself
   - reading a local variable in its own initializer

3. The wording around `this` and `super` is slightly off technically.

   Saying they “will be new syntax-parameters” is misleading. They are existing syntax parameters that get rebound inside method bodies via `syntax-parameterize` and rename transformers.

4. The wording `class methods` is misleading.

   The implementation clearly supports callable class objects, instances, fields, instance methods, inheritance, `this`, `super`, and initializer behavior. I did not see a separate static/class-method feature, so `methods` or `instance methods` would be more precise.

5. The class walkthrough says `hashset`, but the code uses a mutable hash table.

   That is a small but real technical distinction, because fields are key-value properties rather than set membership.

## Project-derived additions worth adding to the post

1. Add a short pipeline section.

   The missing high-level explanation is:

   - the reader scans and parses the source
   - it wraps the result into a `module` using `#lang racket-lox`
   - the custom `#%module-begin` runs the resolver
   - top-level redeclarations are rewritten
   - normal expansion and runtime take over

   This is one of the most interesting parts of the project and is currently mostly implicit.

2. Add a resolver section.

   This is the biggest architectural piece still missing from the article. The repo has a dedicated resolver that performs static analysis to enforce Lox rules that Racket does not give you automatically.

3. Add a subsection on top-level variable redeclaration.

   You already mention that Lox and Racket differ here, but the repo has a neat solution: repeated top-level `var` declarations are rewritten into assignments before final expansion. That is worth showing explicitly.

4. Add a subsection on method binding and inheritance lookup.

   The current class section explains constructor creation, but the more interesting part is how methods are stored as factories, then bound to a receiver when accessed, and how superclass lookup recursively walks the inheritance chain.

5. Add initializer semantics explicitly.

   The implementation does two important things:

   - it invokes `init` during construction if present
   - it makes initializers return the instance rather than an arbitrary value

   Together with the resolver rule that forbids returning a non-`nil` value from an initializer, this would make the class section much more complete.

6. Add a short testing and conformance section.

   The repo has:

   - scanner tests
   - parser tests
   - resolver tests
   - runtime tests
   - integration tests against the Crafting Interpreters suite up to `chap13_inheritance`

   That is strong support for the implementation and worth mentioning.

7. Consider a short section on semantic mismatches handled explicitly.

   The repo contains several nice examples you could mention briefly:

   - negative zero printing
   - numeric equality across exact/inexact values
   - forcing division to produce inexact numbers
   - printing classes and instances in Lox style
   - the native `clock` function
   - the required exit codes, which complicate DrRacket integration

## Summary

The class section is directionally correct and matches the implementation reasonably well. The main remaining issue is not correctness of that section itself, but the absence of a few architectural pieces from the overall article, especially the resolver and the full `#lang` pipeline.