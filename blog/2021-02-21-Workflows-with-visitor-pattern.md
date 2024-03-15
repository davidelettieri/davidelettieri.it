---
title:  "Workflows with the visitor pattern"
date:   2021-02-21 11:00:00 +0100
tags: [c#, visitor-pattern, workflows]
---

## Workflows

As a software developer I work, most of the times, on LOB applications that support some kind of process or workflow for a specific company. That means that there are some entities, such as customers, orders or support tickets, and that they _evolve_ during the lifecycle of the application. For example we could have a CRM with a lead entity that evolves into a customer or we could track the state of a ticket: open -> analysis -> work -> deploy.

<!-- truncate -->

Moreover workflows can be easily represented with a graph we can show to the business stakeholders, so that knowledge can be shared and validated. In code we can implement a [finite state machine](https://en.wikipedia.org/wiki/Finite-state_machine) (FSM) to represent our workflow with its states and transitions. And it's pretty easy to find in any programming language a library that can simplify the process of defining a FSM.

### Scenario

Today I need to implement this scenario for the company I work for: we handle insurance claims on behalf of insurance companies. We have an internal workflow made of several steps such as taking pictures of the insured goods, recover documents, making estimates, contacting the injured part and so on. Our clients can opt for the full workflow or for a subset of all the steps. 

We end up with a main workflow and several subsets of it. A subset of the workflow means not all steps and not all triggers between the steps are included. We only required that the first step and the last one will always be included since they represent the start and the end of the process. Our main entity is the *claim* and each claim, as soon as it enters our systems, is linked to a workflow.


#### Just a sample workflow

<img style={{ margin:'0 auto', display:'block' }} src="/img/workflow.svg" /> 

This image could represent a FSM where in *Step_1* we have two transitions, one to *Step_2* and one to *Step_5*. However we know from the beginning which path we will take so they are two different workflows that share a few steps. Following this line of reasoning the image display three different workflows:

1. FULL: full workflow
2. WF1: skip steps from 2 to 4
3. WF2: skip steps 4 and 5

What's in common in the three workflows is UI and business rules for the common steps. For example *Step_6* has the same UI and actions available for every workflow. The *Step_1* same UI, just different "next step", and so on.

>The real production workflows we have are a little bit more complicated, each one could be represented with a state machine with different transitions starting from the same step, including transitions back to a previous step.

We define *t_n_m* to be the transition between *Step_n* and *Step_m*, *t_start* and *t_end* the transition from *Start* to *Step_1* and the transition from *Step_6* to *end* respectively. Transitions *t_start* and *t_end* are common for every workflow, *t_1_5* belongs only to WF1. 

### Requirements

For our workflow implementation we want to:

1. Support simple change of state, there could be a validation before changing state. 
2. Support complex change of state. Our workflow is changing state and something should happen i.e. send an email, call some external APIs, or any other kind of side effects.
3. Support workflow specific change of state. Our object is changing state and something should happen that is workflow specific
4. Support context dependant side effects. We need change of state actions that depends on the informations we have in the entities connected to the specific workflow. For example send an email only if we have an email.
5. Have a simple API for the frontend
6. Avoid spaghetti code solution

### Visitor pattern

The visitor pattern is a classic OOP pattern, I won't go into details about it but I'll just give a couple of references that I found very useful 

* [Eric Lippert Blog](https://ericlippert.com/2015/05/04/wizards-and-warriors-part-three/)
* [Crafting Interpreters Book](http://www.craftinginterpreters.com/representing-code.html#the-visitor-pattern)

What I found really important is the ability to execute some piece of code based on the *runtime* type of two objects.

### Sample implementation

Since we want an OOP programming solution, each one of our workflows and each of our transition will be represented in his own class.

```csharp
public abstract class Workflow { }
public class FullWF : Workflow {}
public class WF1 : Workflow {}
public class WF2 : Workflow {}

public abstract class Transition {}
public class T_start : Transition {}
public class T_end : Transition {}
public class T_1_2 : Transition {}
public class T_1_5 : Transition {}
// and so on
```
>I know that the underscore is pretty ugly and I won't use it in a class name but in this case is very simple to understand the origin step and the destination using this notation so I will make an exception.

We said that each claim is linked to a workflow

```csharp
public class Claim {
    public Workflow Workflow { get; }
}
```

Now we need a way to execute the transition on the workflows, we start by adding a method to the base class

```csharp
public abstract class Workflow {
    public abstract void Execute(Transition transition);
}
```

It's more evident now that we need to run code based on the runtime type of two objects. The type of the workflow and the type of the transition. Implementing the visitor pattern results in:

```csharp
public abstract class Workflow
{
    public abstract void Fire(Transition transition);
}
public class FullWF : Workflow
{
    public override void Fire(Transition transition)
        => transition.ExecuteFor(this);
}
public class WF1 : Workflow
{
    public override void Fire(Transition transition)
        => transition.ExecuteFor(this);
}
public class WF2 : Workflow { 
    public override void Fire(Transition transition)
        => transition.ExecuteFor(this);
}

public abstract class Transition
{
    protected virtual void BaseExecute(Workflow workflow)
    {
        // do something common to all wf and all transition e.g. save something to db
    }

    public virtual void ExecuteFor(FullWF fullWF) => BaseExecute(fullWF);
    public virtual void ExecuteFor(WF1 wf1) => BaseExecute(wf1);
    public virtual void ExecuteFor(WF2 wf2) => BaseExecute(wf2);
}

public class T_start : Transition { }
public class T_end : Transition { }
public class T_1_2 : Transition { }
public class T_1_5 : Transition { }
```

This looks very cool, we have a lot of *extension points*. In the `BaseExecute` we run code that is in common in all workflows and all transitions, it seems that requirements 1 and 2 are fully satisfied. What about *workflow specific change of state*? We have two places:
1. The `ExecuteFor` in the base `Transition` class. We could run code that is workflow specific before and/or after the call to `BaseExecute` or we could skip entirely the call to the default implementation. This will change the behavior for all transitions.
2. The `ExecuteFor` of a specific transition with the exact same possibilities of before.

```csharp
// Example 1
public abstract class Transition
{
    // removed code for clarity
    public virtual void ExecuteFor(FullWF fullWF) {
        // run code before default implementation
        BaseExecute(fullWF);
        // run code after default implementation
    }
    // removed code for clarity
}

// Example 2
public abstract class Transition
{
    // removed code for clarity
    public virtual void ExecuteFor(FullWF fullWF) {
        // run code and skip default implementation
    }
    // removed code for clarity
}

// Example 3
public class T_start
{
    // removed code for clarity
    public override void ExecuteFor(FullWF fullWF) {
        // run code before default implementation
        BaseExecute(fullWF);
        // run code after default implementation
    }
    // removed code for clarity
}

// Example 4
public class T_start
{
    // removed code for clarity
    public override void ExecuteFor(FullWF fullWF) {
        // run code and skip default implementation
    }
    // removed code for clarity
}
```

This satisfies 3 of our requirements and even more since we can implement workflow specific behaviors, workflow and transition specific behaviors. We can skip entirely the default implementation or augment it with *pre* and *post* actions. What about point 4 of our requirements? I was kind of skipping an important consideration, we have our workflows and our transition but what about our claim? How could we do something on our main entity if we lost track of it? We need to update the signature of our methods in order to pass an instance of `Claim` around.

```csharp
public class Claim
{
    public Workflow Workflow { get; }
}

public abstract class Workflow
{
    public abstract void Fire(Transition transition, Claim claim);
}
public class FullWF : Workflow
{
    public override void Fire(Transition transition, Claim claim)
        => transition.ExecuteFor(this, claim);
}
public class WF1 : Workflow
{
    public override void Fire(Transition transition, Claim claim)
        => transition.ExecuteFor(this, claim);
}
public class WF2 : Workflow
{
    public override void Fire(Transition transition, Claim claim)
        => transition.ExecuteFor(this, claim);
}

public abstract class Transition
{
    protected virtual void BaseExecute(Workflow workflow, Claim claim)
    {
        // do something common to all wf and all transition e.g. save something to db
    }

    public virtual void ExecuteFor(FullWF fullWF, Claim claim) => BaseExecute(fullWF, claim);
    public virtual void ExecuteFor(WF1 wf1, Claim claim) => BaseExecute(wf1, claim);
    public virtual void ExecuteFor(WF2 wf2, Claim claim) => BaseExecute(wf2, claim);
}
```

Cool! Now, as an example, in an possibly expanded version of `Claim` we could check if we have an email address to send some documentation on the *t_end* transition. I think that everything is looking nice and tight and I'm positive that we are fullfilling also point 6 of our requirements: this is no spaghetti code.

Lastly we need to find a nice way to expose our implementation externally. I think that our frontend needs at least this capabilities:
* Show the `Claim` and all related informations.
* Recognize the workflow linked to the `Claim`.
* Show available transitions.
* Be able to execute a transition in a simple way.

Both our `Claim` and `Workflow` will have a simple corresponding POCO class, each subtype of `Transition` will have a corresponding enum value in an ad hoc enum type. Our transition class will not hold any information they just implements the actions to be done during the transition itself and enum is an easy way to expose all possible transitions to a user.

```csharp
public class ClaimDto
{
    public WorkflowDto Workflow { get; set; }
}

public class WorkflowDto
{
    public TransitionDto[] AvailableTransitions { get; set; }
}

public enum TransitionDto
{
    T_start,
    T_end,
    T_1_2,
    T_1_5
}

public class TransitionResolver
{
    public Transition Resolve(TransitionDto dto)
    {
        return dto switch
        {
            TransitionDto.T_start => new T_start(),
            TransitionDto.T_end => new T_end(),
            TransitionDto.T_1_2 => new T_1_2(),
            TransitionDto.T_1_5 => new T_1_5(),
            // so on
            _ => throw new InvalidOperationException("Unexpected transition dto value")
        };
    }
}
```

### What's missing?
A lot of stuff! First of all, we didn't define our FSM in any of our workflows. Which transitions are allowed? Then we didn't talk about the current step of the `Claim`. We could need a proper class as in the `Transition` case or just an enum if we don't need any step specific behavior. Our transition types don't actually contains code, we could need DI to actually performs something e.g. passing a db connection or a logger. This would complicate our `TransitionResolver` class. We need to keep in sync the transitions with the corresponding enum, maybe something automated could be a good idea, depending on how frequently we need new transition and who is going to work on it. A new hire could miss the point of having some kind of duplication or simply she could not know.

I think that is a pretty good solution, not over-engineered and simple to modify and extend. If we have a nice base implementation in `Transition` we could also remove the abstract keyword and using just that type for simple transition that do not need specific code. E.g.

```csharp
public class TransitionResolver
{
    // Transition is no more abstract
    public Transition Resolve(TransitionDto dto)
    {
        return dto switch
        {
            TransitionDto.T_start => new T_start(),
            TransitionDto.T_end => new T_end(),
            TransitionDto.T_1_2 => new Transition(),
            TransitionDto.T_1_5 => new Transition(),
            // so on
            _ => throw new InvalidOperationException("Unexpected transition dto value")
        };
    }
}
```

The code is [here](https://gist.github.com/davidelettieri/ac7025e62bbf0f417e00b002da3f90a9), let me know what you think! 

Last but not least I would like to thank [Marcello](https://www.linkedin.com/in/marcello-santambrogio/) for working with me on the first implementation of the workflow system and for kindly reviewing this post.
