---
title: Implementing APIs with the visitor pattern
date: 2023-06-16
tags: [c#, visitor-pattern, minimal-api]
---

I want to leverage my [visitor pattern source generator](https://github.com/davidelettieri/visitor-generator) to implement a simple minimal api.

I aim to:
- Have a request and a request handler for my endpoint. I will not use mediatr or any similar library and I will not use any real storage, only some in memory data structure to showcase the visitor pattern approach.
- The request handler `Handle` method returns an interface, every subtype represents a different type of result, a success, and one type for each error (provided) emitted by the handled.
- For each subtype we want to be able to return a possibly different http response.

<!-- truncate -->

To do this it is not required to leverage the visitor pattern and we can make it just with pattern matching. However the pattern matching approach, with its current capabilities, will not check for exaustiveness and if we add a new result type we will in the best case get an error during testing or worse at runtime. 

Moreover if we have multiple places where we are using pattern matching we have to remember to update all of them. The visitor pattern can be more easily updatable because once the interface of the visitor is updated, the build will be broken, signaling where a change is needed. If the interface is auto-generated this is even simpler since you cannot forget to update the visitor interface.

I won't provide a full repo, code listing is just one file with everything inside it. 

```csharp
using VisitorGenerator; // this namespace is coming from my visitor source generator. 
// It's hosted on github registry, here is the repo https://github.com/davidelettieri/visitor-generator

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<CreateProductRequestHandler>();
builder.Services.AddSingleton<ProductResultVisitor>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.MapPost("/product", (
    // this contains the user input
    CreateProductRequest request, 
    // this contains the domain logic
    CreateProductRequestHandler handler,
    // this will map the result obtained by our domain to an http result.
    ProductResultVisitor visitor) =>
{
    var result = handler.Handle(request);

    return result.Accept(visitor);
})
.WithName("CreateProduct")
.WithOpenApi();

app.Run();

public class CreateProductRequest
{
    public int? CategoryId { get; set; }
    public string? Name { get; set; }
}

// the attribute is coming from my nuget package. 
// All the types are marked partial because 
// the source generator will add code to all of them. 
// This is a requirement to use my package, but
// you can roll your own types and visitors manually. 
// Probably there are other libraries to do a similar
// work if you want to avoid using mine or doing it manually.
[VisitorNode]
public partial interface ICreateProductResult { } 

// After the base type, we define all our possible results.
public partial class ProductCreated : ICreateProductResult
{
    public ProductCreated(Guid productId)
    {
        ProductId = productId;
    }

    public Guid ProductId { get; }
}

public partial class NameIsMandatory : ICreateProductResult
{
}

public partial class CategoryNotFound : ICreateProductResult
{
}

public partial class NameAlreadyExisting : ICreateProductResult
{

}

// The ICreateProductResultVisitor<T> interfaces is generated automatically
// if you add a new result type this visitor will need to implement a new method.
// this will allow you to keep your code updated.
public class ProductResultVisitor : ICreateProductResultVisitor<IResult>
{
    public IResult Visit(ProductCreated node)
        => Results.Created($"/product/{node.ProductId}", node);

    public IResult Visit(NameIsMandatory node)
        => Results.BadRequest("{ message: 'Name is mandatory' }");

    public IResult Visit(CategoryNotFound node)
        => Results.BadRequest("{ message: 'Category not found' }");

    public IResult Visit(NameAlreadyExisting node)
        => Results.BadRequest("{ message: 'Name already existing' }");
}

// The handler implementation is not really important. 
// It is using some in memory data structure to perform a kind of validation. 
// We just want to be able to test all our results type. 
public class CreateProductRequestHandler
{
    private static readonly Dictionary<int, string> _categories = new()
    {
        { 1, "Category 1" },
        { 2, "Category 2" },
        { 3, "Category 3" },
    };

    private static readonly Dictionary<int, Dictionary<Guid, string>> _products = new();

    public ICreateProductResult Handle(CreateProductRequest request)
    {
        if (request.CategoryId is null)
        {
            return new CategoryNotFound();
        }

        if (!_categories.ContainsKey(request.CategoryId.Value))
        {
            return new CategoryNotFound();
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return new NameIsMandatory();
        }

        if (_products.ContainsKey(request.CategoryId.Value) &&
           _products[request.CategoryId.Value].Values.Contains(request.Name))
        {
            return new NameAlreadyExisting();
        }

        var id = Guid.NewGuid();

        if (!_products.ContainsKey(request.CategoryId.Value))
        {
            _products.Add(request.CategoryId.Value, new());
        }

        _products[request.CategoryId.Value].Add(id, request.Name);

        return new ProductCreated(id);
    }
}
```


