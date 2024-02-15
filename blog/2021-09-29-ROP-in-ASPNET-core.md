---
layout: post
title:  "Railway oriented programming in ASP.NET Core"
date:   2021-09-29 06:15:00 +0200
categories: ROP 'Railway oriented programming' C#
description: In a previous post I talked about ROP in C#, now I want to explore how to use it in a ASP.NET Core web api project.
---

In a previous post I talked about ROP in C#, now I want to explore how to use it in a ASP.NET Core web api project. If you haven't I suggest to take a look at my previous posts since I won't go into the details of union types and my custom `Result<T>` type:

1. [A tagged union example](2020-03-21-a-tagged-union-example.md)
2. [Railway oriented programming with C#](2020-04-04-railway-oriented-programming-with-c-sharp.md)

I have a few requirements:

1. Good json serialization for our frontend
2. Good swagger support for the `Result<T>` type
3. Single source of application errors
4. Use HTTP Status code for signaling errors
5. Low boilerplate solution
6. Nice to have: localization support

Sample code can be found [here](https://github.com/davidelettieri/ApiWithROP). Point 1, 2 and 4 is for supporting frontend development, the `Result<T>` type is a union of a `Failure` type and `T`, it can be one or another and to serialize correctly we need to extract the value from the type. Moreover we are using the default `Swashbuckle.AspNetCore` library and `Result<T>` is a custom type with no specific support in swagger. Point 3 and 5 is for supporting the development and debugging of the application. In order to show my approach I'll use a simple api with one endpoint to retrieve an user by its `id`.

```csharp
public class User
{
    public int Id { get; set; }
    public string Name { get; set; }
}
```

## Good json serialization for our frontend

We need to transform `Result<T>` into something we can easily return from our endpoints. I opt for `ActionResult<T>` to declare that in the *happy path* the client should expect a `T` object as a result. Let's use an extension method

```csharp
public static class ResultsExtentions
{
    public static ActionResult<T> ToActionResult<T>(this Result<T> result)
        => result.Match(FromSuccess, FromFailure<T>);


    private static ActionResult<T> FromSuccess<T>(T t) => new OkObjectResult(t);
    private static ActionResult<T> FromFailure<T>(Failure f) => new ObjectResult(f) { StatusCode = 403 };
}
```
Note that in case of failure we change the status code to 403. 

## Good swagger support for Result

Right now swagger shows correctly the result for the success but there is no documentation for the 403 case. To add the 403 to all of our endpoint we use an operation filter. The filter has to be added in the configuration of swashbuckle. Please be aware that the following filter will add the 403 to all the endpoints of the web api. To make it consistent we will need to always return a `Result<T>`.
```csharp
internal class DefaultFailureResponseOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        // we can override the 403 swagger documentation by decorating the endpoint with a
        // ProducesResponseType(typeof([OTHER_TYPE]), StatusCodes.Status403Forbidden)]
        // in such case Responses will contain a 403 key and the following code will skip the endpoint
        if (!operation.Responses.ContainsKey("403"))
        {
            operation.Responses.Add("403", new OpenApiResponse
            {
                Description = "Forbidden",
                Content = new Dictionary<string, OpenApiMediaType>
                {
                    ["application/json"] = new OpenApiMediaType
                    {
                        Schema = context.SchemaGenerator.GenerateSchema(typeof(Failure), context.SchemaRepository)
                    }
                }
            });
        }
    }
}
```
## Single source of application errors

We will put all our application errors inside a single class for each application domain. For our simple example we have a single error available. Please remember that `Failure` has 2 properties, an error id, which I consider fixed for that error and a message, which is what we can eventually translate to another language. Keeping everything in a file allow us to check if we have duplicate ids and also to find easily all errors we can produce.
```csharp
public static class Errors
{
    public static readonly Failure UserNotFound = new Failure("E-001", "User not found");
}
```

## Use HTTP Status code for signaling errors

I use 403 but it's up to you what to use. For example, the usual code for a resource that has not been found is 404 but I find very confusing to receive a 404 when a route does not exists and when an entity does not exists. Using 403 for application errors give us an easy way to recognize configuration errors, such as the path to an endpoint is wrong, from application errors, such us the user with that id doesn't exist.

## Low boilerplate solution

This solution requires that we call the extension method on the `Result<T>` instance we receive from our services:
```csharp
[HttpGet("{id}")]
public ActionResult<User> Get(int id)
{
    var user = _userService.GetUser(id);

    return user.ToActionResult();
}
```
It's not a lot of code but we have to do it anyway.

## Localization support

First of all, we need to add [localization support to our web api](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/localization?view=aspnetcore-5.0). The we need to use the `IStringLocalizer` to localize our error message. We can do something like this
```csharp
public static class ResultsExtentions
{
    public static ActionResult<T> ToActionResult<T>(this Result<T> result)
        => result.Match(FromSuccess, FromFailure<T>);

    public static ActionResult<T> ToActionResult<T>(this Result<T> result, IStringLocalizer localizer)
        => result.Match(FromSuccess, f => FromFailure<T>(f, localizer));


    private static ActionResult<T> FromSuccess<T>(T t) => new OkObjectResult(t);
    private static ActionResult<T> FromFailure<T>(Failure f) => new ObjectResult(f) { StatusCode = 403 };
    private static ActionResult<T> FromFailure<T>(Failure f, IStringLocalizer localizer)
    {
        var localizedFailure = new Failure(f.ReasonId, localizer[f.ReasonId]);
        return new ObjectResult(localizedFailure) { StatusCode = 403 };
    }
}
```

## Final remarks

Using a union type in C# is challenging for a few reasons, it's not baked into the language and it's not a common approach in C# development. I think that in the long run it improves readability and consistency in the codebase. In ASP.NET Core with good support for swagger, it offers a stable and consistent way of presenting application errors to the clients. 

I find it very useful in my job and I'm always looking to improve it's usage so if you have improvements to suggest I'll be very happy to hear it.
