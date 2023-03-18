---
layout: post
title:  "Visitor pattern source generator"
date:   2023-03-18 16:00:00 +0100
categories: c# 'visitor pattern' 'source generators'
description: I am a big fan of the visitor pattern, I think it is a very good approach for adding behaviors to a group of classes without modifying all of them. Each visitor implementation contains a behavior for all the classes that we want to manage.
---

I am a big fan of the visitor pattern, I think it is a very good approach for adding behaviors to a group of classes without modifying all of them. Each visitor implementation contains a behavior for all the classes that we want to manage. 

I think I used we success a few times this approach and I also documented [here](2021-02-21-Workflows-with-visitor-pattern.md) one of these cases. In addition to that I think it can be used with success when implementing event sourcing. If we have an aggregate that is going to handle some events, probably it will be implemented like this

```csharp
public class MyAggregate {

    public void Apply(Event1 ev) {}
    public void Apply(Event2 ev) {}
    public void Apply(Event3 ev) {}
}
```

And there is a sharp resemblance with a visitor
```csharp
public class MyAggregate {

    public void Visit(Event1 ev) {}
    public void Visit(Event2 ev) {}
    public void Visit(Event3 ev) {}
}
```

And if we are working with CQRS and we need to build a read model for our aggregate, using the visitor pattern we can follow the sample approach for an aggregate and for the read model builder

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

