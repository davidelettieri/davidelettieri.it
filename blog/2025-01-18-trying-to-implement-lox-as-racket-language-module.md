---
title:  Trying to implement Lox as Racket language module
date: 2025-01-18 16:30:00 +0100
tags: [racket, lox, lisp]
---

Given my previous attempt of having a basic scaffolding for [creating a new racket language](2023-02-25-Creating-a-new-racket-language.md) I thought it was worth a shot at implementing Lox from the [Crafting interpreters book](https://craftinginterpreters.com/).

Racket has a huge ecosystem and extensive documentation, based on my own research and preferences I decided to use a lex/yacc source generator available in Racket itself and documented here https://docs.racket-lang.org/lex-yacc-example/index.html. There are plenty of resources on how to build language with Racket, both free and paid. 

I used only free resources and my feeling is that the amount of information required to approach this project is A LOT. Another feeling I have is that the documentation, even if it's extensive, it's not providing all the information required to build new languages for Racket or at very least this information is hard to find. I didn't find it, despite trying multiple times.

<!-- truncate -->

All of this to anticipate that I failed and I failed for multiple reasons:
1. Lack of continuity on the project: I couldn't work on this with the energy I would have needed to succeed in this.
2. Lack of (or difficulty in finding) proper documentation for Racket languages. I will add some links later on what I found most useful.
3. Possible wrong/difficult choices: for example I tried to use the test infrastructure provided in the [craftinginterpreters](https://github.com/munificent/craftinginterpreters/) repo. This required having exit codes and writing to stderr, even if this seems simple, trying to make this work with Linux, Windows and DrRacket (the IDE provided with Racket) was a problem I couldn't solve.

I kept the repo private for a long time, while trying to work on it and hoping to have it completed and polished, however that time might never come so now the [repository is public](https://github.com/davidelettieri/racket-lox). I didn't invest time in documenting how to run things because it's a failed project so I don't feel doing it.

However, all the tests from chapter 8 of the book pass, so if you clone the repo, move the folder and run `raco pkg install` then you can open a racket file and execute this.
```
#lang racket-lox
var a = "a";
var b = "b";
var c = "c";

// Assignment is right-associative.
a = b = c;
print a; // expect: c
print b; // expect: c
print c; // expect: c
```

## What could have I done differently?

I guess ditch the whole lex/yacc parser tools and implement a manual tokenizer and parser as it is done in the book itself. Doing this will remove complexity around the parser and might give more explicit control on the code. 

Another point could be not using macros. Macros are cool, they are powerful and somehow they are a key advantage in lisps languages (if you can use them), I decided to use them to try to feel what it means to know them but for sure they add complexity to the code and it is one more thing to understand.

Do not use the test infrastructure provided by the author of the book. That infrastructure is good and useful and I used it when building [my c# implementation](https://github.com/davidelettieri/Lox) which was more aligned in intent with the Java version of the book: building an interpreter. Given that a Racket language module is a different beast, I feel like this decision costed me more time that it saved.

## Did I learn something useful?

I learned a bit the lex/yacc parser tools, I don't feel this was useful. It was painful enough for me to not want to have anything to do with this. 

I learned a bit of Racket macros and how to troubleshoot them with the `Macro Stepper` function of DrRacket, this was a useful bit and if I continue playing with Racket I will definitively use it again.

## Most useful resource?

The **Racket School 2019: The “How to Design Languages” Track** website https://school.racket-lang.org/2019/plan/. This is a nice, complex, rather comprehensive documentation on building languages and on implicit forms like `#%module-begin` and `#%app` and all the others. I didn't even arrive at the typing part and it was still useful.

### Second best?

An implementation of brainf**k language as a Racket language module https://www.hashcollision.org/brainfudge/

## Closing thoughts

Not much to be honest, I would suggest any novice on Racket like me to avoid the parser tools library. It's hard and not much documented. Racket looks like a very powerful tool but it's language building capabilities are not documented enough to make it available to a wide audience. At least those are my feelings.

The only path I see to move forward is to rewrite the project and mimic as much as possible the parser from the book, it's a recursive descent parser, it's easy and readable. Use mutability, even if Racket is a functional language, and move from there. 

I'll be happy for any comment on the code, or for additional useful resources anyone might have on the topic.