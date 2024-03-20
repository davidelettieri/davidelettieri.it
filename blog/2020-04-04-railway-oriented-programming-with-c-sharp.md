---
title:  "Railway oriented programming with C#"
date:   2020-04-04 17:00:00 +0100
tags: [rop, railway-oriented-programming, c#]
---

**2021-09-29** I added an example on how to use ROP in an ASP.NET Core project [here](https://davidelettieri.it/rop/'railway/oriented/programming'/c%23/2021/09/29/ROP-in-ASPNET-core.html)

A few days back I was reading about [Railway oriented programming](https://fsharpforfunandprofit.com/rop/) (ROP) on the awesome fsharpforfunandprofit website. Scott Wlaschin (SW) describe a functional approach to error handling not regarding only exceptions but in general how to handle *deviations* from the happy path. I really liked his approach and I tried to translate the F# code to C# and in this post I'll briefly recap what I've learned.
<!-- truncate -->

Let's apply the ROP to the following scenario: 

>An email has to be sent to a customer but only if his email is valid and he has compiled his name and surname. 

We're trying to think functionally here so we will be working mainly with functions and with their signature to achieve the desired result. A stub of our functions could be

<script src="https://gist.github.com/davidelettieri/3bdbb6315d3a9e08a585a74974a2b712.js"></script>

This is a very simple and naive implementation of our requirements. The bool result will notify us about success or failure, but what kind of failure and where? We don't know! Moreover the logic for exiting with a `false` has been repeatedly used in the code and factor it out would be a great improvement. Let's define the following class

<script src="https://gist.github.com/davidelettieri/17fc206f87ec97d3ffd80d7ad25a1520.js"></script>

This is not much but at least now we have a message to display to the user

<script src="https://gist.github.com/davidelettieri/95ef8dbdb5eae0cd2714a64b366f7b57.js"></script>

Now we have an error message but we're not sure if the user of our function is going to check the "Success" boolean and handle the error. Maybe nobody is there to check if the email has been sent and log an error or display a useful message to the user triggering this action. So the correct usage of this code has been delegated to the developer and his good will. We want to use the compiler to check for errors and not have to remember how to use correctly a piece of code that maybe we wrote months ago. Union types to the rescue! As I said in a previous [post](2020-03-21-a-tagged-union-example.md), Union types can help us in these situation. For example we can define

<script src="https://gist.github.com/davidelettieri/744df9e717240608ee3672e5df799544.js"></script>

This will force the user of ValidateEmail to handle both cases using the swith/match methods (please refer to this [post](2020-03-21-a-tagged-union-example.md) for more details on that). Before we go on, let's notice also that in our implementation of "SendEmailToCustomerIfValid" we have to "tracks":
- the success track that runs the code to the end
- the failure track, which is a fast exit we get each time we find an error.

These are the "railways" of the ROP and the main idea is to compose several functions, any of which can follow the success track or switch on the error track. I'm going to translate to C# what Scott Wlaschin has done in his ROP talk and slides, which anyone should definitively check out at [ROP](https://fsharpforfunandprofit.com/rop/).

F# has a more powerful type system and type inference than C# so we are probably going to write code that's more verbose and ugly than the equivalent F#. In order to compose our functions we need to update their signature and we are going to use some helper functions, as described in the ROP article, to help us in this task and to make the composition work. Practically we want to be able to do something like this 

```
Union<Success,Failure> SendEmailToCustomerIfValid(Customer c) { 
    return SendEmail(ValidateNameSurname(ValidateEmail(c)));
}
```

To improve code's readability we would like to reverse the order of the function since we are reading them in reverse order with respect to execution, with F# we would have done `ValidateEmail |> ValidateNameSurname |> SendEmail` but C# is missing the `|>` operator. I think we can manage to obtain this `ValidateEmail(c).Then(ValidateNameSurname).Then(SendEmail)`. First of all we need to change `ValidateEmail` to return the Customer object in the success case because `ValidateNameSurname` needs it. In the same way we update `ValidateNameSurname`.

<script src="https://gist.github.com/davidelettieri/05924714163a02cfb7598be9634231c8.js"></script>

We are still not able to call `ValidateNameSurname(ValidateEmail(c))` as we would need to make the signature of `ValidateNameSurname` to be `Union<Customer,Failure> ValidateNameSurname(Union<Customer,Failure> u)` and handle both cases of success and failure inside the body of the function. To avoid doing this repeatedly in ROP is proposed the "bind" function which we can translate to 

<script src="https://gist.github.com/davidelettieri/05bcd14c55fe22be0841f740b9b55097.js"></script>

Using Bind we can call `Bind(ValidateNameSurname)(ValidateEmail)` without changing the signature of the functions, using Bind we can define `Then` as an extension method

<script src="https://gist.github.com/davidelettieri/7eed4df336c6fe9ed78ef52af838288b.js"></script>

achieving the desired `ValidateEmail(c).Then(ValidateNameSurname)`. SW goes on showing how to insert in the pipeline other types of functions such as:

1. functions that work on the input without generating any failure
2. void functions
	
Both type of functions can be plugged into the pipeline using `ToSwitchFunction` and a overload of `Then` defined as

<script src="https://gist.github.com/davidelettieri/a5b3918ec1ffbe863b88ac0eec874abf.js"></script>

I created a [repository](https://github.com/davidelettieri/ROP) with all the code and some tests to showcase how to use the functions. I strongly suggest to go to the original source and take a look at the F# code and the slides. They're very helpful and better than my own C# recap. There are other cases and improvements that are worth reading.
