---
title:  "Downsides of Dependency Injection"
date:   2021-09-23
tags: [patterns, di]
---

:::info

What I want to highlight in this post is one issue that may arise when using dependency injection (DI), in particular when using a dependency injection container. To be completely clear I'm not advocating against DI, I'm always using it and I would strongly suggest to use it if you are using a framework that supports it (for example ASP.NET core).

I will be focused on .NET and C# and some terminology will be specific to these technologies.

I updated this post on 08/09/2025 to clarify and improve some points.

:::

What problems does DI solve? I really like [what wikipedia says](https://en.wikipedia.org/w/index.php?title=Dependency_injection&oldid=1309912801) (bold is mine)

>In software engineering, dependency injection is a programming technique in which an object or function receives other objects or functions that it requires, as opposed to creating them internally. **Dependency injection aims to separate the concerns of constructing objects and using them, leading to loosely coupled programs.**

If class A needs to use class B, it shouldn't also create an instance of it. This will give A too much responsibility since beside its actual functionalities it has to manage the lifetime of the instance of B. 

To use SOLID principles, if class A serve some purpose, managing also the lifetime of an instance of class B breaks the single responsibility principle because A would end up with having at least 2 responsibilities.

<!-- truncate -->

Here a couple of classes using DI and not
```csharp title="Samples of DI and not"
public class A;

// not using DI
public class B
{
    private readonly A _a;

    public B()
    {
        _a = new A();
    }
}

// using DI
public class C
{
    private readonly A _a;
    public C(A a)
    {
        _a = a;
    }
}
```

It remains to be understood who or what is passing an instance of `A` to `C`. We could create an instance of `A` in the entry point of our application and then pass it to the `C` constructor, this would work and suffice for simple application and small "trees" of types. For more complex scenarios the industry has come up with the concept of DI containers or IOC (inversion of control) containers. From wikipedia again

> The injector, sometimes also called an assembler, container, provider or factory, introduces services to the client.
> The role of injectors is to construct and connect complex object graphs, where objects may be both clients and services. The injector itself may be many objects working together, but must not be the client, as this would create a circular dependency.

Why are they called also IOC containers? Because dependency injection is considered a technique to achieve **dependency inversion** and the container, by enabling DI, is facilitating the dependency inversion.

>Applying the dependency inversion principle allows A to call methods on an abstraction that B implements, making it possible for A to call B at runtime, but for B to depend on an interface controlled by A at compile time (thus, inverting the typical compile-time dependency). At run time, the flow of program execution remains unchanged, **but the introduction of interfaces means that different implementations of these interfaces can easily be plugged in**.

As the [Microsoft docs](https://docs.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/architectural-principles#dependency-inversion) puts it (bold is mine). 

Let's note that if a class A creates an instance of class B using its constructor then A depends directly on B and this dependency is not mediated by an interface since the constructor belongs to the concrete definition of B. So, if we don't use DI we are breaking the dependency inversion principle. However by using DI we are not necessarily following the dependency inversion principle, we **need** to introduce abstractions.

```csharp title="DI with abstractions"
public interface IA;
public class A : IA;

public class C
{
    private readonly IA _a;
    public C(IA a)
    {
        _a = a;
    }
}
```

Now back to the definition of dependency inversion, I think that the sentence in bold is not necessarily true. While it is self-evident that using interfaces allows to plug in multiple concrete types, when managing the lifetime of all the dependencies an application uses, some complexities arise. The proliferation of DI containers[^1] is indeed a way to cope or manage this complexity with reusable components.

Now let's consider ASP.NET Core, the default DI Container offers three types of lifetime:
* Transient -> Each time we request an instance, a new one will be created.
* Scoped -> For each scope we have one instance, by default a scope is created with each http request in ASP.NET Core. Scopes can also be created on demand.
* Singleton -> There is only one instance for the lifetime of the application.
  
Those scopes are not necessarily tied to a concept of "duration", however given how they are used in ASP.NET Core we know that:
- Singleton services will live for the whole application lifecycle 
- Scoped services will live for the duration of an http request, that is shorter than the lifetime of the application
- Transient services will inherit the duration of the consuming service.

Now let's pretend we have

```csharp title="Sample classes and types with dependencies"
interface IBar {}
class Bar : IBar {}
class Foo {
    private readonly IBar _bar;

    Foo(IBar bar) => _bar = bar;
}
```

This is a simple case of constructor injection. We need to register the two classes in the IOC, we have 9 possibilities:

| Foo      | Bar | Does it make sense? |
| ----------- | ----------- | ------|
| Singleton | Singleton | Yes |
| Singleton   | Scoped        | No |
| Singleton   | Transient        | No |
| Scoped | Singleton | Yes |
| Scoped   | Scoped        | Yes |
| Scoped   | Transient        | It is expected to be yes but some consideration are needed. |
| Transient | Singleton | Yes |
| Transient   | Scoped        | Yes |
| Transient   | Transient        | Yes |

Three of the nine possibilities cannot work or will behave strangely at very least. Why? If `Foo` is a singleton, the IOC Container is going to build at most one instance. It needs an `IBar` instance, regardless of how `Bar` is registered it will be resolved only once from the IOC, making the `IBar` instance used by `Foo` a singleton. This could be an issue if the implementation of `Bar` is not prepared to be a long lived object.

The case for not using a transient dependency from a scoped is less clear. Usually in ASP.NET Core a scope exists for the duration of a request, a relatively short time frame, which allows a transient dependency to be used and released quickly. However given that we can create scopes manually, we could have a long running scope (possibly alive for the whole application lifetime) and in that case consuming a transient dependency might be more complex because the instance of that dependency will leave for a long time.

The rule is simple: **a longer-lived service should not depend on a shorter-lived service when using constructor injection**. We have a 66% of chance of getting it right just by luck but still 33% to have a potential bug. 

When you implement a class with some dependencies and you're using interfaces or classes, if you want to have maximum compatibility you have to code your class to be a transient dependency. In this way it can accept any kind of dependency.

If you need to implement a singleton dependency, it's probably best to avoid constructor dependency injection at all. 

I really don't feel to say that **different implementations of these interfaces can easily be plugged in**. It can be true if we know the lifetime of all the implementation of our interfaces. Since we could plug a new implementation later in time, we cannot know right now that it will be registered with the right lifetime. When we code we cannot just code against a few interfaces, we are also coding with an expected lifetime for our classes.

I always use DI but it's best to remember its downsides:
* A class cannot enforce its lifetime but it can depend on a specific lifetime. For example a DbContext from EF Core cannot be a singleton.
* A class registered lifetime must be larger than the registered lifetimes of its dependencies.

As a positive note, the .NET host partially checks for us that the dependencies' lifetimes: [it checks that scoped dependencies are not used by singleton services](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection#constructor-injection-behavior). This is probably related to the usage of EF. Given that the DbContext is registered by default as scoped and it is not thread safe, having it consumed by a singleton service will break the application. 

[^1]: I think now the variety DI containers is dying if favor of using default DI container from ASP.NET Core.