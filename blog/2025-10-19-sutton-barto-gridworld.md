---
title:  Sutton & Barto Gridworld example in C#
date: 2025-10-19
tags: [c#, reinforcement-learning]
---

Lately, I've been exploring various examples from Sutton and Barto's "Reinforcement Learning: An Introduction" book using C# and I already shared a few of them on this blog:
- [Tic-tac-toe reinforcement learning with C#](2025-03-16-tic-tac-toe-reinforcement-learning-with-c-sharp.md)
- [Ten armed testbed for the Bandit problem with C#](2025-04-27-ten-armed-testbed-with-c-sharp.md)
- [Multi-armed bandit exercise 2.5 with C#](2025-05-01-multi-armed-bandit-ex-2.5-csharp.md)

Today I'll be focusing on the gridworld example from chapter 3 of the book. [The code is available in the existing repo as a new project](https://github.com/davidelettieri/sutton-barto-reinforcement-learning/tree/main/gridworld). Gridworld is a simple example used to illustrate the Bellman equations and iterative policy evaluation. An excerpt from the book describes the environment:

> The cells of the grid correspond to the states of the environment. At
each cell, four actions are possible: north, south, east, and west, which deterministically
cause the agent to move one cell in the respective direction on the grid. Actions that
would take the agent off the grid leave its location unchanged, but also result in a reward
of -1. Other actions result in a reward of 0, except those that move the agent out of the
special states A and B. From state A, all four actions yield a reward of +10 and take the
agent to A'. From state B, all actions yield a reward of +5 and take the agent to B'.
>
> — Sutton & Barto, Reinforcement Learning: An Introduction, 2nd ed., Chapter 3.

<!-- truncate -->

The value function for each state is updated using the Bellman expectation equation for policy evaluation:

$$
v_{\pi}(s) = \sum_{a} \pi(a|s) \sum_{s',r} p(s',r|s,a) [r + \gamma v_{\pi}(s')], \quad \forall s \in S
$$

The components of the equation are:
- $v_{\pi}(s)$: the value of state $s$ under policy $\pi$, this is what we want to compute.
- $\pi(a|s)$: the probability of taking action $a$ in state $s$. This is called the policy.
- $p(s',r|s,a)$: the probability of transitioning to state $s'$ and receiving reward $r$ after taking action $a$ in state $s$.
- $\gamma$: the discount rate, which determines the importance of future rewards and is a value between 0 and 1. In our case it is set to 0.9.

Now the example proceeds by giving us the policy: the agent selects each action with equal probability $\pi(a|s) = \frac{1}{4}$, so we can simplify the equation:

$$
v_{\pi}(s) = \frac{1}{4} \sum_{a} \sum_{s',r} p(s',r|s,a) [r + \gamma v_{\pi}(s')], \quad \forall s \in S
$$

Because the environment is deterministic, for each state-action pair there is exactly one next state s' and reward (probability 1). Therefore the update simplifies to:

$$
v_{\pi}(s) = \frac{1}{4} \sum_{a} [r + \gamma v_{\pi}(s')]
$$

Using this formula we iteratively update the value function for each state until convergence up to a certain tolerance.

## The implementation

Regarding the implementation, I mostly followed the sample lisp code provided by the authors at http://incompleteideas.net/book/code/gridworld5x5.lisp. However I used clearer variable names, an enum for the actions, a better `next-state` and `full-backup` function and other minor improvements. If you look at the original `full-backup` it is actually also computing the `next-state` for a subset of cases, I decided to handle all cases in my `NextState` method and use the `FullBackup` only to compute the value of a given state-action pair. 

Some of the Lisp code's complexity — which I preserved in the C# port — is the mapping between state indices (0–24) and grid coordinates (row and column). It's not clear why the original maps states to indices this way; I kept the mapping for fidelity to the original implementation.

As a side note, I executed the lisp code to validate the results and the methods I ported to C# using [SBCL](https://www.sbcl.org/) and apparently a function was missing so I added it and provided an updated lisp version in my repo [here](https://github.com/davidelettieri/sutton-barto-reinforcement-learning/blob/main/gridworld/source.lisp).

I decided to use a `GridWorld` class to hold the global state and the required functions.

Looking at the simplified Bellman equation we can see that we need to compute $s'$ given a starting state and an action, this is implemented in the `NextState` method of the GridWorld class:

```csharp
int NextState(int state, Action action)
{
    if (state == _specialStateA)
    {
        return _specialStateAPrime;
    }

    if (state == _specialStateB)
    {
        return _specialStateBPrime;
    }

    // OffGrid returns true if the action would take the agent off the grid
    if (OffGrid(state, action))
    {
        return state;
    }

    var (row, col) = CoordinatesFromState(state);
    return action switch
    {
        Action.East => StateFromCoordinates(row, col + 1),
        Action.South => StateFromCoordinates(row + 1, col),
        Action.West => StateFromCoordinates(row, col - 1),
        Action.North => StateFromCoordinates(row - 1, col),
        _ => throw new ArgumentOutOfRangeException(nameof(action), "Invalid action"),
    };
}
```

The sum formula is adding one element for each action, the single element for a given action and state is computed in the `FullBackup` method:

```csharp
double FullBackup(int state, Action a)
{
    var nextState = NextState(state, a);
    double reward = state switch
    {
        _ when state == _specialStateA => 10,
        _ when state == _specialStateB => 5,
        // implicitly handles off-grid moves
        _ when nextState == state => -1,
        _ => 0
    };

    return reward + (_gamma * _v[nextState]);
}
```

The implementation of the value function is the following. Consider that we have 4 actions so average is dividing by 4:

```csharp
private double ValueFunction(int state)
    => Enum.GetValues<Action>()
        .Select(a => FullBackup(state, a))
        .Average();
```

The rest of the implementation is almost a 1-1 mapping from the lisp code to C#. The value function is updated in a loop until convergence.

## How to run the sample

- Clone and run the utton-barto-reinforcement-learning repository:
  - git clone https://github.com/davidelettieri/sutton-barto-reinforcement-learning.git
  - cd sutton-barto-reinforcement-learning/gridworld
  - dotnet run -c Release

- The app prints the value function after convergence; compare it with the book’s Figure 3.2.

## Grid diagram and state mapping

To make the indexing clear, here's the 5x5 grid used in the example (rows increase downward, columns increase to the right). Special states A and B and their primes A' and B' are shown in the grid where applicable.

|     | Col 0 | Col 1 | Col 2 | Col 3 | Col 4 |
|-----|:-----:|:-----:|:-----:|:-----:|:-----:|
| **Row 0** |  0 |  1 (A) |  2 |  3 (B) |  4 |
| **Row 1** |  5 |  6 |  7 |  8 |  9 |
| **Row 2** | 10 | 11 | 12 | 13 (B') | 14 |
| **Row 3** | 15 | 16 | 17 | 18 | 19 |
| **Row 4** | 20 | 21 (A')| 22 | 23 | 24 |
