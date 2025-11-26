---
title: Extensible Visitor Pattern in C#
date: 2025-11-15
tags: [c#, visitor-pattern, design-patterns]
---

Recently, I stumbled upon this paper [Synthesizing Object-Oriented and Functional Design to Promote Re-Use](https://cs.brown.edu/~sk/Publications/Papers/Published/kff-synth-fp-oo/). The paper wants to provide a solution to the [expression problem](https://web.archive.org/web/20250907153845/https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt). The authors suggest an improved version of the visitor pattern that they call "extensible visitor pattern" which is essentially a combination of the [visitor pattern](https://refactoring.guru/design-patterns/visitor) with the [factory method](https://refactoring.guru/design-patterns/factory-method) pattern.

While the paper and the expression problem statement don't explicitly mention SOLID principles, it looks like what they are really doing is exploring how to evolve a code base while respecting the **Open/Closed Principle**:

> Software entities (like classes, methods, and functions) should be open for extension, but closed for modification.
<!-- truncate -->

The idea that software entities should be open for extension is intuitive, we can add new code, inherit types, compose etc. But what does it mean closed for modification? Should we never change code that has been deployed to production? Is that what the principle is saying?

In my opinion, changing a piece of code for fixing a bug doesn't go against this principle, I believe that the principle suggests that we should be able to not change existing code when we want to add some functionality.

Honestly, if I think about this principle and what I saw in my career in software development, I can safely affirm that I never saw this principle applied faithfully. Classes, methods and all software constructs are modified _all the time_. 

The authors work through several examples all based on the same scenario: we have a set of shapes and a set of tools, essentially functions, over these shapes and we want either to add a new shape or to add a new tool. How can we update our code without changing the existing code? And what impact does our approach have on clients using our code?

They present 4 different implementations:
- functional without any pattern
- object oriented using the interpreter pattern
- object oriented using the visitor pattern
- object oriented using the extensible visitor pattern that is subject of the paper

The code samples are written in Java, a language called "Pizza" which is "a parametrically polymorphic extension of Java", and `SML` for the functional approach example. Given that I'm a big fan of the visitor pattern, I wanted to go through the paper and reimplement everything using F# for the functional approach and C# for everything else. The code will not be an exact port of the original, mostly because I don't know Pizza nor Java but also because they don't show all the code and I want to show a bit more than they did.

The key point to observe in the presented problem is that the _types are recursive_, in other words shapes are defined using other shapes. For example the translation of a shape, or a union of two shapes. This case cannot be ignored when we build a tree of types to represent some kind of domain and problem.

:::info

The authors used an abstract class as base type for the object oriented approaches, I used an interface. I'll try to motivate my choice later on.

:::

All the code is available here https://github.com/davidelettieri/extensible-visitor.

## Functional approach

The functional approach is the simplest and shortest of all, it is super easy to add a new tool and it is impossible to add new datatype without changing existing code. Let's examine why it's impossible. 

```fsharp title='Functional approach - F# implementation'
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

If we want to add a shape we need to modify the `Shape` definition, there is no way around that. 

:::note
To be honest, I'm not sure this is totally bad. The code is so short and clean and adding a new type will trigger a compilation error. It's exactly what we want, we know where we have to fix the code so that the new shape is supported everywhere. But doubting the **OCP** is beyond the scope of this post.
:::
As a bonus I tried a functional approach in C# and while the result is more verbose, we are able to define a new function `ContainsPointV2()` that supports a new shape and we don't need to modify any existing code.

```csharp title='Functional approach - C# Pattern Matching'
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
The highlighted line is key in correctly supporting the new shape. Since the `TranslatedShape` type is recursive, when we define a new tool to support a new shape, any instance of `TranslatedShape` could contain an instance of the `UnionShape`. This means that the recursive call needs to be done using the new tool definition. In this case `ContainsPointV2()`. This recursion is **the key** for understanding the approach of the paper and the extensible visitor pattern implements this exact behavior. 

Of course with this approach we are accepting the fact that we might get runtime exceptions, for example if someone passes a `UnionShape` instance to `ContainsPoint()`. Not exactly safe and while we are not changing our code, clients using our code need to update to `ContainsPointV2()` in order to be able to handle correctly the new `UnionShape` type.

## Object oriented with the interpreter pattern

Using the interpreter pattern means that each tool is a function on the data type, this pattern is usually explained with grammars or expressions however it has a more generic applicability. Whenever we have a family of types which expose the same behavior, a method, then we have a usage of the interpreter pattern.

The approach that is proposed is the following:
1. we start with a set of types all extending a base abstract class with a method representing the initial tool supported by the types.
2. we want to add a new shape. We define a new type that inherits the base abstract class and implement the method.
3. we want to add a new tool. We cannot add a new method to the existing types because we don't want to modify existing code. Instead, we define new types that extend the original one implementing the new tool.

Unfortunately existing clients of our code need to change the types they are using in order to leverage the new tool.

### Remarks on the interpreter pattern and the provided implementation

In the original GoF definition and in the code samples provided by the authors in the article the base type is an abstract class but there are some unclear points:
- the base abstract class is having the `shrink` method but all the initial shapes implement `containsPt`, the authors probably wanted the base abstract class to have the `containsPt` method
- the new union shape implements `containsPt`
- the newly implemented types extending the original shapes to have the `shrink` method don't have a base type in common which is a requirement to be able to handle shapes in a polymorphic manner.

The last point is why I decided to use interfaces for the C# code, imagine we define a new base abstract class for the shrinkable shapes. Then in order to allow code reuse we would have to inherit from multiple base types for example:

```csharp title='Interpreter Pattern - Abstract class based inheritance problem'
abstract class Shape {...}
abstract class ShrinkableShape {...}
class Square : Shape {...}
# highlight-next-line
class ShrinkableSquare : Square, ShrinkableShape // Impossible!
```

As noted in the code listing and as probably every reader knows we cannot inherit multiple classes, however we can implement multiple interfaces.

<figure>
    <img style={{ margin:'0 auto', display:'block' }} alt="Fig 4-5-6 from Synthesizing Object-Oriented and Functional Design to Promote Re-Use" src="/img/Synthesizing Object-Oriented and Functional Design to Promote Re-Use fig4-5-6.png" /> 
  <figcaption>Fig 4,5,6 from the article with some comments</figcaption>
</figure>

So, omitting most of the code, a shrinkable shape using the interpreter pattern in C# with interfaces instead of abstract base classes would look like this:

```csharp title='Interpreter Pattern - Shrinkable Shape Implementation'
public interface IShrinkableShape : IShape
{
    IShrinkableShape Shrink(double num);
}

public record ShrinkableSquare(double Length) : Square(Length), IShrinkableShape
{
    public IShrinkableShape Shrink(double num) => new ShrinkableSquare(Length / num);
}
```

## Object oriented with the visitor pattern

The visitor pattern is very much the same approach as the functional one. Adding a tool is the easy part because it only entails defining a new visitor type. The following is how we would approach in C#.

```csharp title='Visitor Pattern - Core Implementation'
public interface IShape
{
    T Process<T>(IShapeProcessor<T> processor);
}

public interface IShapeProcessor<T>
{
    T ForSquare(Square square);
    T ForCircle(Circle circle);
    T ForTranslatedShape(TranslatedShape translatedShape);
}

public sealed record Square(double Length) : IShape
{
    public T Process<T>(IShapeProcessor<T> processor) => processor.ForSquare(this);
}

// more shapes

public class ContainsPoint(Point point) : IShapeProcessor<bool>
{
    public bool ForSquare(Square square) =>
        point.X >= 0 && point.X <= square.Length &&
        point.Y >= 0 && point.Y <= square.Length;

    public bool ForCircle(Circle circle) =>
        point.X * point.X + point.Y * point.Y <= circle.Radius * circle.Radius;

    public bool ForTranslatedShape(TranslatedShape translatedShape) =>
        translatedShape.Shape.Process(new ContainsPoint(
            new Point(point.X - translatedShape.Point.X, point.Y - translatedShape.Point.Y)));
}

public sealed class Shrink(double num) : IShapeProcessor<IShape>
{
    // omitted
}
```

Adding a new shape without modifying existing code is more challenging. As for the interpreter pattern we proceed by adding new code: the new shape type, a new visitor interface that inherits from the existing one and is able to process also the new shape and, lastly, the implementation of our tools.

```csharp title='Visitor Pattern - Adding Union Shape Support'
public interface IUnionShapeProcessor<T> : IShapeProcessor<T>
{
    T ForUnionShape(UnionShape unionShape);
}

public sealed record UnionShape(IShape Shape1, IShape Shape2) : IShape
{
    public T Process<T>(IShapeProcessor<T> processor)
    {
        if (processor is IUnionShapeProcessor<T> unionProcessor)
        {
            return unionProcessor.ForUnionShape(this);
        }

        throw new NotSupportedException($"Processor of type {processor.GetType().Name} does not support UnionShape");
    }
}

public class UnionContainsPoint(Point point) : ContainsPoint(point), IUnionShapeProcessor<bool>
{
    public bool ForUnionShape(UnionShape unionShape) =>
        unionShape.Shape1.Process(this) || unionShape.Shape2.Process(this);
}
```

The obvious difference is that our original implementation is type safe while the new one is relying on runtime checks to validate that the visitor instance is able to handle the new shape. However, as the authors point out, there is a less obvious, critical flaw: this implementation does not work for recursive types. The issue is with the recursive type `TranslatedShape`, the `UnionContainsPoint` visitor is reusing the base implementation of `ContainsPoint`. This means that it is executing the following code

```csharp title='Visitor Pattern - Recursive Type Limitation'
public bool ForTranslatedShape(TranslatedShape translatedShape) =>
    translatedShape.Shape.Process(new ContainsPoint(
        new Point(point.X - translatedShape.Point.X, point.Y - translatedShape.Point.Y)));
```

Which is calling `Process` on the inner shape of the original object and it is passing a new instance of `ContainsPoint` (and not `UnionContainsPoint`!) so now we lost support for the `Union` shape. A unit test can confirm the expected behavior:

```csharp title='Visitor Pattern - Test for Nested Translated Shape'
[Fact]
public void TestNestedTranslatedShapes()
{
    // Arrange
    var circle = new Circle(10);
    var square = new Square(10);
    var t1 = new UnionShape(square, circle);
    var t2 = new TranslatedShape(t1, new Point(5, 5));

    // Act & Assert
    Assert.Throws<NotSupportedException>(() => t2.Process(new UnionContainsPoint(new Point(0, 0))));
}
```

The power of the visitor pattern comes from the fact that with a single call `t2.Process(...)` we are calling 2 methods on 2 different object obtaining a double dispatch at runtime. However when the `ContainsPoint` visitor is creating an instance of itself and that behavior is inherited by new visitor types, we are breaking the double dispatch because `ForTranslatedShape` will pass to `Process` the original visitor instance and not the extended one. 

## Object oriented with the extensible visitor pattern

The key part to understand from the visitor pattern approach is that a tool implementation, a visitor, will break if its implementation is creating new instances of itself or other tools. Today, at least in C# world, we are quite used to not directly create instances of types and relying on dependency injection to get our instances and to plug-in different instances when needed. 

A visitor directly creating an instance of its same type or another is clearly coupling itself to some specific implementation. The solution is to abstract the creation away so that we can use different instances, with the same interfaces, if we need to update a visitor to handle a new type. The following code shows how to implement it using a virtual method on the processor.

```csharp title='Visitor with virtual method to create instances of itself'
public class ContainsPoint(Point point) : IShapeProcessor<bool>
{
# highlight-next-line
    protected virtual ContainsPoint MakeContainsPoint(Point p) => new(p);

    public bool ForSquare(Square square) =>
        point.X >= 0 && point.X <= square.Length &&
        point.Y >= 0 && point.Y <= square.Length;

    public bool ForCircle(Circle circle) =>
        point.X * point.X + point.Y * point.Y <= circle.Radius * circle.Radius;

    public bool ForTranslatedShape(TranslatedShape translatedShape) =>
# highlight-next-line
        translatedShape.Shape.Process(MakeContainsPoint(
            new Point(point.X - translatedShape.Point.X, point.Y - translatedShape.Point.Y)));
}

public class UnionContainsPoint(Point point) : ContainsPoint(point), IUnionShapeProcessor<bool>
{
# highlight-next-line
    protected override ContainsPoint MakeContainsPoint(Point p) 
# highlight-next-line
        => new UnionContainsPoint(p);

    public bool ForUnionShape(UnionShape unionShape) =>
        unionShape.Shape1.Process(this) || unionShape.Shape2.Process(this);
}
```

The `UnionContainsPoint` type, by overriding the `MakeContainsPoint` virtual method is able to update the behavior of the base class to recognize the new shape. This is very much similar to the function `ContainsPointV2` that is recursively calling itself.