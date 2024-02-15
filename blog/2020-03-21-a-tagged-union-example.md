---
layout: post
title:  "A tagged union example"
date:   2020-03-25 23:47:00 +0100
categories: 'Tagged union'
description: We will talk about tagged union types, how to implement them in C# and how to use them effectively in modeling our domain
---

We will talk about [tagged union types](https://en.wikipedia.org/wiki/Tagged_union), how to implement them in C# and how to use them effectively in modeling our domain. Tagged union types will improve your code expressiveness and ability to model all kinds of software domains. They have been extensively used in functional languages, F# itself support out of the box tagged union types under the name "discriminated unions". 

# Tagged union type - definition

Quoting wikipedia

> In computer science, a tagged union, also called a variant, variant record, choice type, discriminated union, disjoint union, sum type or coproduct, is a data structure used to hold a value that could take on several different, but fixed, types.

For example let's fix two types `A` and `B` then there is a type `Union<A,B>`, that could hold a value of type `A` or a value of type `B`, when we have an instance of `Union<A,B>` we do not know which type it currently holds so we have to handle both cases. Tagged union type are not available in C# type system right now, let's a viable implementation for a union of 2 types:

<script src="https://gist.github.com/davidelettieri/4329bf51a249d78492f02423433f1ad0.js"></script>

An instance of our class could contain a value of `TOne` or `TOther` but using the code as it is we cannot do very much with the value itself. In order to go forward let's understand how we can use the tagged union type to obtain an improved version of `int?`. A nullable int it's a type that can contains and int value or nothing, we could test if the value exists using the `HasValue` property however nothing stop us to access the value even if it does not exists. For example:

<script src="https://gist.github.com/davidelettieri/0084e654be07bf56f06d07e0673e74f9.js"></script>

We want to use the generic type `Union<A,B>` to represent a nullable int, with the further restriction that we can use the value only if it exists. To have an instance of `Union<A,B>` we need two types: the first one is `int`, the second one should be a value representing the *absence* of a value. Let's call it `None` and define it as `public class None {}`, our better representation for a nullable int will be `Union<int,None>`. We need a way to use the value inside an instance of `Union<A,B>`, let's update the class with two methods:

- `Switch` which will apply an action on the value inside `Union<A,B>`
- `Match` which will compute something using the value inside `Union<A,B>`

Both methods requires that the consumer of the object has to provide for 2 actions or 2 funcs in order to manage all the possible values inside `Union<A,B>`.

<script src="https://gist.github.com/davidelettieri/62ff5eda957f8e5bc35c62e2158ebb94.js"></script>

Let's see how we can use our new generic type for the nullable int example:

<script src="https://gist.github.com/davidelettieri/97e496aec6c13df3f4410e3b66213886.js"></script>

# How to use it

The nullable int example is a specific case of an _option type_ and should help us get a grasp of comprehension of what a tagged union type is. How do we use it in real world code? I think a very useful way to use the union type is returning values and errors from methods. 

In our simple domain we need to retrieve and manage customer orders, let the customer pay it and so on. A starting point could be:

<script src="https://gist.github.com/davidelettieri/0e204323a16d4abc520c3516fc86ccfe.js"></script>

Besides being just an example, there are two big flaws in it:

- An order could be paid or not, the actions we can perform on it depends on this state and we need to check it every time. If we forget we can make a huge mistake, for example let it be paid twice
- It's not clear from the interface whats happens if we call `GetById` with a value for a non existent order. Does it throws? Does it returns null?

Let's improve our simple example with better domain modeling and the `Union` type.

<script src="https://gist.github.com/davidelettieri/10cf6f5e4aa19a400aa4ad793440fd5b.js"></script>

Ok, I cheated a bit, I used a Union of three types instead of two but now our domain is way better:

- I expect the repository to return a `OrderNotFound` if there is no order with the requested `id`
- There is no way to pay a paid order, the compiler won't allow it. There is no way to add or remove items to a paid order, again the compiler won't allow it. Before I had to remember what was right to do inside an order, know I know I can't be wrong.
- When I ask for an order I have to handle all three cases since the Union type contains one of them but I don't know which one.

As last remark, you don't need to implement all union type for the n different types you need just use this [nuget package](https://www.nuget.org/packages/OneOf/.)

I hope you found this useful, if you have any comment or request drop me a line!