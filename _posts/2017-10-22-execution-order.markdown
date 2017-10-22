---
layout: post
title:  "Execution Order"
date:   2017-10-22 22:40:07 +0200
categories: c# oop
description: I have a .NET console app which calls several methods and I want to be sure that I call them in the correct order. More precisely I want that the code doesn't compile if the order is not correct.
---

## The problem
I have a .NET console app which calls several methods and I want to be sure that I call them in the correct order. More precisely I want that the code doesn't compile if the order is not correct. For example

{% highlight c# %}

class Program
{
    static void Main(string[] args)
    {
        Method1();
        Method2();
        Method3();
        Method4();
    }
}

{% endhighlight %}

If I change to this 

{% highlight c# %}

class Program
{
    static void Main(string[] args)
    {
        Method4();
        Method1();
        Method2();
        Method3();
    }
}

{% endhighlight %}

It still compiles but it doesn't work necessarily.

## The solution
We're going to leverage the OOP paradigm to force the execution order. The idea is very simple each method will take as input a "result object" from the previous method. 

We should also avoid situations like 

{% highlight c# %}

class Program
{
    static void Main(string[] args)
    {
        Method2(new Method1Result()); // Method1Result is the "result object" of Method1
        Method1();
    }
}

{% endhighlight %}

### tl;dr

All the code is available at the [execution order repo](https://github.com/davidelettieri/execution-order "execution order repo")

In order to give some context I'm going to pretend that the console app has 3 methods:
1. Init
2. Work
3. Close

We're moving each method to a separate class, first of all Init which has no "dependency" on the other methods, it should be the first one we call.

{% highlight c# %}

public class Init
{
    private Init()
    {

    }

    public static Init Execute()
    {
        // here we put the actual implementation

        return new Init();
    }
}

{% endhighlight %}

Since Init has a private constructor we could not create it from anywhere outside the class itself. Now in the Work class the "Execute" method is gonna ask for an instance of the Init class, this way we have to call Init.Execute first.

{% highlight c# %}

public class Work
{
    private Work()
    {

    }

    public static Work Execute(Init init)
    {
        if (init == null)
            throw new ArgumentNullException(nameof(init));

        return new Work();
    }
}

{% endhighlight %}

Private constructor, same reason as before. Argument validation in order to avoid passing null to the Work.Execute method. Last of all the Close class which needs a Work instance but doesn't return anything since it's last one to call.

{% highlight c# %}

public class Close
{
    public static void Execute(Work work)
    {
        if (work == null)
            throw new ArgumentNullException(nameof(work));

        // implementation of the Close
    }
}

{% endhighlight %}

### Caveats
The solution is not perfect because it depends on the Argument validation in order to work.

## Closing
Our program now is ugly but we have to follow the correct order.

{% highlight c# %}

class Program
{
    static void Main(string[] args)
    {
        var initResult = Init.Execute();
        var workResult = Work.Execute(initResult);
        Close.Execute(workResult);
    }
}
    
{% endhighlight %}