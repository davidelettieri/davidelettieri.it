---
title: Extensible Visitor Pattern in C#
date: 2025-11-15
tags: [c#, visitor-pattern, design-patterns]
---

Recently, I stumbled upon this paper [Synthesizing Object-Oriented and Functional Design to Promote Re-Use](https://cs.brown.edu/~sk/Publications/Papers/Published/kff-synth-fp-oo/) which suggests an improved version of the visitor pattern that they call "extensible visitor pattern" which is essentially is a combination of the visitor pattern with the [Factory method](https://refactoring.guru/design-patterns/factory-method) pattern.

They don't explicitely mention SOLID principles, however what they are really doing is exploring how to evolve a code base while respecting the **Open/Closed Principle**:

> Software entities (like classes, methods, and functions) should be open for extension, but closed for modification.

If I think about this principle and what I saw in my career in software development, I can safely affirm that I never saw this principle applied faithfully. Classes, methods and all software construct are modified _all the times_. While updating a piece of code for fixing a bug seems to go against this principle I think it's safe to assume that we can in fact change the code when it is wrong. What the principle is suggesting is that we should not change existing code when we want to add some functionality. 

Indeed the authors work through several examples all based on the same scenario: we have a set of shapes and a set of tools, essentially functions, over these shape and we want either to add a new shape or to add a new tool. 

They present 4 different implementations:
- functional without any pattern
- object oriented using the interpreter pattern
- object oriented using the visitor pattern
- object oriented using the extensible visitor pattern that is object of the paper

The code samples are written in a language called "Pizza" which is "a parametrically polymorphic extension of Java". Given that I'm a big fan of the visitor pattern, I wanted to go through the paper and reimplement everything using C#. The porting will not be a 1-1 code, mostly because I don't know Pizza nor Java but also because they don't show all the code and I want to got a bit further then they did.

## Functional approach

