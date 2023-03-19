---
layout: post
title:  "Visitor pattern source generator"
date:   2023-03-18 16:00:00 +0100
categories: c# 'visitor pattern' 'source generators' CQRS 'event sourcing' 
description: I am a big fan of the visitor pattern, I think it is a very good approach for adding behaviors to a group of classes without modifying all of them. With this approach we group a type of behavior inside a single class. 
---

I am a big fan of the visitor pattern, I think it is a very good approach for adding behaviors to a group of classes without modifying all of them. With this approach we group a type of behavior inside a single class.

For example if we are building a compiler we may have an abstract syntax tree that represents the code thatthe compiler is compiling. Two different visitors can be, for example:
- a type checker 
- a code emitter

I think I used this pattern successfully a few times and I also documented [here](2021-02-21-Workflows-with-visitor-pattern.md) one of these cases. 

Beside that use case the visitor pattern can be useful in conjunction with event sourcing and CQRS.

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
Using the visitor pattern we can follow the sample approach for an aggregate and for the read model builder. 

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