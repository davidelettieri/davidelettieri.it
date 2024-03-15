---
title:  "Visitor pattern source generator"
date:   2023-03-19 18:30:00 +0100
tags: [c#, visitor-pattern, source-generators, CQRS, event-sourcing]
---

I am a big fan of the visitor pattern, I think it is a very good approach for adding behaviors to a group of classes without modifying all of them. 

For example if we are building a compiler we may have an abstract syntax tree that represents the code that the compiler is compiling. Two different visitors can be, for example:
- a type checker 
- a code emitter

<!-- truncate -->

## CQRS and event sourcing

I think I used this pattern successfully a few times and I also documented [here](2021-02-21-Workflows-with-visitor-pattern.md) one of these cases. 

The visitor pattern can be useful in conjunction with event sourcing and CQRS.

Combining these two patterns means that:
- we have commands and command handlers to handle write operations. There is an aggregate that is going to handle the events, probably it will be implemented like this

```csharp
public class MyAggregate {

    public void Apply(Event1 ev) {}
    public void Apply(Event2 ev) {}
    public void Apply(Event3 ev) {}
}
```

Please note that there is a sharp resemblance with a visitor

```csharp
public class MyAggregate {

    public void Visit(Event1 ev) {}
    public void Visit(Event2 ev) {}
    public void Visit(Event3 ev) {}
}
```

- we have queries and query handlers. To support this efficiently we want to build one or more read models for our entities. We aim to do this asynchronously by handling the same events our aggregates are using. 
Using the visitor pattern we can follow the sample approach for the aggregate and for the read model builder. 

```csharp

public class MyAggregate {

    public void Visit(Event1 ev) {
        // do some complex business logic
    }
    public void Visit(Event2 ev) {
        // do some complex business logic
    }
    public void Visit(Event3 ev) {
        // do some complex business logic
    }
}

public class MyAggregateReadModelBuilder {
    public void Visit(Event1 ev) {
        // save on db a simplified view of the aggregate
    }
    public void Visit(Event2 ev) {
        // save on db a simplified view of the aggregate
    }
    public void Visit(Event3 ev) {
        // save on db a simplified view of the aggregate
    }
}
```

And if we have a multi-domain application and some other domain needs to build his own read model for some entity, sharing a `IMyAggregateVisitor` interface is a good way of communication all the available events and somehow forcing the consumer to handle all of them.

## The source generator

The unpleasant part of the visitor pattern is the amount of boilerplate needed to support the implementation. Today, with source generator support, C# developer have a straightforward way of generating code. I gave it a try and developed a simple source generator that allows to use the visitor pattern without having to implement everything by hand. 

Every implementation requires:
1. a base type for all the types handled by the visitor. From this point on I'll refer to this types as nodes
2. a base type for the visitors

For the nodes we might use an abstract class or an interface, for the visitor we will need an interface. For the sake of simplicity, I developed the source generator _expecting_ an inteface as base type for the nodes. This interface is the entry point of the source generator, by adding an attribute to the inteface we signal to the source generator that this is the base class of the nodes and the visitor should be based on all the types that implements this interface. Of course besides the interface we need at least one node to have a visitor.

Both the interface and the nodes must be partial since the source generator will complete the implementation to support the visitor pattern.

As soon as the source generator is installed an attribute type is generated and added to the project

```csharp
namespace VisitorGenerator
{
    [AttributeUsage(AttributeTargets.Interface, Inherited = false, AllowMultiple = false)]
    [System.Diagnostics.Conditional("VisitorSourceGenerator_DEBUG")]
    sealed class VisitorNodeAttribute : Attribute
    {
        public VisitorNodeAttribute()
        {
        }
    }
}
```

This is the attribute that is used to start the generation from an interface. A very minimal example of usage would be

```csharp
[VisitorNode]
public partial interface INode {}

public partial class MyNode: INode {}
```

This basic setup will generate the following code, split among a few files

```csharp
public partial interface INode
{
    T Accept<T>(INodeVisitor<T> visitor);
    void Accept(INodeVisitor visitor);
}
public interface INodeVisitor<T>
{
    T Visit(MyNode node);
}
public interface INodeVisitor
{
    void Visit(MyNode node);
}
public partial class MyNode
{
    public T Accept<T>(INodeVisitor<T> visitor) => visitor.Visit(this);
    public void Accept(INodeVisitor visitor) => visitor.Visit(this);
}
```

Two different visitor interfaces are added to the project, one with void `Visit` methods and one with a generic `T` return type. The last one can be used also to implement async `Visit` methods by choosing `T` as:
- `Task`
- `Task<U>` for some `U`.

The source code for the visitor generator with a sample project is hosted [here](https://github.com/davidelettieri/visitor-generator). I'm publishing this as a nuget package on github (not on Nuget!). To use the github registry look at the [official docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-nuget-registry).