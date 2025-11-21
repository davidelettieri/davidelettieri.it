---
title: Extensible Visitor Pattern in C#
date: 2025-11-15
tags: [c#, visitor-pattern, design-patterns]
---

Recently, I stumbled upon this paper [Synthesizing Object-Oriented and Functional Design to Promote Re-Use](https://cs.brown.edu/~sk/Publications/Papers/Published/kff-synth-fp-oo/) which suggests an improved version of the visitor pattern that the authors call "extensible visitor pattern" which is essentially is a combination of the [visitor pattern](https://refactoring.guru/design-patterns/visitor) with the [factory method](https://refactoring.guru/design-patterns/factory-method) pattern.

They don't explicitely mention SOLID principles, however it looks like what they are really doing is exploring how to evolve a code base while respecting the **Open/Closed Principle**:

> Software entities (like classes, methods, and functions) should be open for extension, but closed for modification.

I don't think changing a piece of code for fixing a bug goes against this principle, what the principle is suggesting is that we should not change existing code when we want to add some functionality. If I think about this principle and what I saw in my career in software development, I can safely affirm that I never saw this principle applied faithfully. Classes, methods and all software construct are modified _all the times_. 

The authors work through several examples all based on the same scenario: we have a set of shapes and a set of tools, essentially functions, over these shape and we want either to add a new shape or to add a new tool. 

They present 4 different implementations:
- functional without any pattern
- object oriented using the interpreter pattern
- object oriented using the visitor pattern
- object oriented using the extensible visitor pattern that is object of the paper

The code samples are written in a language called "Pizza" which is "a parametrically polymorphic extension of Java", only exception for which they refer to `Haskell` and `SML`. Given that I'm a big fan of the visitor pattern, I wanted to go through the paper and reimplement everything using F# for the functional approach and C# for everything else. The porting will not be a 1-1 code, mostly because I don't know Pizza nor Java but also because they don't show all the code and I want to show a bit more than they did.

The key point to observe in the presented problem is that the types are recursive, in other words shapes are defined using other shapes. For example translation of a shape, or a union of two shapes. This case cannot be ignored when we build a tree of types to represent some kind of domain and problem.

:::info

The authors used an abstract class as base type for the object oriented approaches, I used an interface. I'll try to motivate my choice later on.

:::

## Functional approach

The functional approach is the simplest and shortest of all, it is super easy to add a new tool and it is impossible to add new datatype without changing existing code. Let's examine why it's impossible. 

```fsharp
type Point = { X: float; Y: float }

type Shape =
    | Circle of radius: float
    | Square of length: float
    | Translated of shape: Shape * offset: Point

let rec containsPoint shape point =
    match shape with
    | Circle radius -> point.X * point.X + point.Y * point.Y <= radius * radius
    | Square length -> point.X >= 0 && point.X <= length && point.Y >= 0 && point.Y <= length
    | Translated(shape, offset) ->
        let translatedPoint =
            { X = point.X - offset.X
              Y = point.Y - offset.Y }
        containsPoint shape translatedPoint
```

If we want to add a shape we need to modify the `Shape` definition, there is no way around that. To be honest, I'm not sure this is totally bad. The code is so short and clean and adding a new type will trigger a compilation error. It's exacly what we want, know where we need to fix the code so that the new shape is supported everywhere. But doubting the **OCP** is beyond the scope of this post.

As a bonus a tried a functional approach in C# and while the result is more verbose, we are able to define a new function `ContainsPointV2()` that supports a new shape and we don't modify any existing code.

```csharp
public static class Tools
{
    public static bool ContainsPoint(Point point, IShape shape) =>
        shape switch
        {
            Square s => point.X >= 0 && point.X <= s.Length &&
                        point.Y >= 0 && point.Y <= s.Length,
            Circle c => point.X * point.X + point.Y * point.Y <= c.Radius * c.Radius,
            TranslatedShape ts => ContainsPoint(
                new Point(point.X - ts.Point.X, point.Y - ts.Point.Y),
                ts.Shape),
            _ => throw new NotSupportedException($"Shape of type {shape.GetType().Name} is not supported")
        };

    // sorry for the bad naming
    public static bool ContainsPointV2(Point point, IShape shape) =>
        shape switch
        {
            Square s => ContainsPoint(point, s),
            Circle c => ContainsPoint(point, c),
            # highlight-next-line
            TranslatedShape ts => ContainsPointV2(
                new Point(point.X - ts.Point.X, point.Y - ts.Point.Y),
                ts.Shape),
            UnionShape s => ContainsPointV2(point, s.Shape1) || ContainsPointV2(point, s.Shape2),
            _ => throw new NotSupportedException($"Shape of type {shape.GetType().Name} is not supported")
        };
}
```
The highlighted line is key in correctly supporting the new shape. Since the `TranslatedShape` type is recursive, when we define a new tool to support a new shape, any instance of `TranslatedShape` could contain an instance of the `UnionShape`. This means that the recursive call needs to be done using the new tool definition. In this case `ContainsPointV2()`. This recursion is **the theme** of the paper and the extensible visitor pattern implements this exact behavior. 

Of course with this approach we are accepting the fact that we might get runtime exceptions, for example if someone passes a `UnionShape` instance to `ContainsPoint()`. Not exactly safe.

## Object oriented with interpreter pattern


