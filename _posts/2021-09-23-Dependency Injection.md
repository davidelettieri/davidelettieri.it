---
layout: post
title:  "Downsides of Dependency Injection"
date:   2021-09-23 23:15:00 +0200
categories: patterns
description: What problems does DI solve? I really like what wikipedia says "The intent behind dependency injection is to achieve separation of concerns of construction and use of objects."
---

What problems does DI solve? I really like what wikipedia says

>The intent behind dependency injection is to achieve separation of concerns of construction and use of objects.

If class A needs to use class B, it does not need to create an instance of it. This will give A too much responsibility since beside its actual requirements it has to manage the lifetime of the instance of B.

Another presumed benefit of the dependency injections is

>Applying the dependency inversion principle allows A to call methods on an abstraction that B implements, making it possible for A to call B at runtime, but for B to depend on an interface controlled by A at compile time (thus, inverting the typical compile-time dependency). At run time, the flow of program execution remains unchanged, **but the introduction of interfaces means that different implementations of these interfaces can easily be plugged in**.

As the [Microsoft docs](https://docs.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/architectural-principles#dependency-inversion) puts it (bold is mine).   

I think that the sentence in bold is a lie. Let's start with ASP.NET Core, the default IOC Container offers three types of lifetime:
* Scoped
* Transient
* Singleton
Now let's pretend we have

```csharp
interface IBar {}
class Bar : IBar {}
class Foo {
    private readonly IBar _bar;

    Foo(IBar bar) => _bar = bar;
}
```

We need to register the two class in the IOC, we have 9 possibilities:

| Foo      | Bar | Does it make sense? |
| ----------- | ----------- | ------|
| Singleton | Singleton | Yes |
| Singleton   | Scoped        | No |
| Singleton   | Transient        | No |
| Scoped | Singleton | Yes |
| Scoped   | Scoped        | Yes |
| Scoped   | Transient        | No |
| Transient | Singleton | Yes |
| Transient   | Scoped        | Yes |
| Transient   | Transient        | Yes |

Three of the nine possibilities cannot work or will behave strangely at very least. Why? If `Foo` is a singleton, the IOC Container is going to build at most one instance. It needs `Bar` which is a registered as a scoped dependency but since `Foo` is built only once, his particular instance of `Bar` is built only once making it effectively a singleton instance. 

The rules is very simple "a class cannot depend on objects with a larger scope". We have a 66% of chance of getting it right just by luck but still 33% to have a potential bug. 

When you implement a class with some dependencies and you're using interfaces or classes, if you want to have maximum compatibility you have to code your class to be a transient dependency. In this way it can accept any kind of dependency. Of course you cannot force in any way to register your class as transient since its construction is concern of another component of the application. 

If you need to implement a singleton dependency, it's probably best to avoid dependency injection at all. The only way to be sure that only singletons are injected into your class is to not depend on external objects.

I really don't feel to say that **different implementations of these interfaces can easily be plugged in**. It can be true if we know the lifetime of all the implementation of our interfaces. Since we could plug a new implementation later in time, we cannot know right now that it will be registered with the right lifetime. When we code we cannot code against a few interfaces, we are also coding with an expected lifetime for our classes.

I always use DI but it's best to remember its downsides:
* A class cannot enforce its lifetime but it can depends on a specific lifetime. For example a DbContext from EF Core cannot be a singleton.
* A class registered lifetime must be larger than the registered lifetimes of its dependencies.
