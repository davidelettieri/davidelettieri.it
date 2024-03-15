---
title:  "Creating a new Racket language"
date:   2023-02-25 15:50:00 +0100
tags: [racket programming-languages parsers]
---

If you're interested in creating new programming languages or domain specific languages and also in scheme or LISP you will definitively encounter Racket at some point. Which is described on the official website as "the Language-Oriented Programming Language" so it is something to look into it.

<!-- truncate -->

Learning a new language comes with his own struggles, such us having an IDE of some sort and support for your preferred OS and not always there is a good solution at least not for novices. If you are into Emacs you probably don't need an IDE to code in a LISP language, but if you're a .NET developer like me used to Visual Studio or Rider working with Emacs might not be the easiest path to learn a new language.

Racket comes with a cross-platform IDE which I with no particular issues on Windows and on Fedora Linux and there are extensions and a language service to work with VS Code. So an easy setup with an IDE of some sort that allows a developer to start tinkering without much hassle.

Racket comes with a lot of documentation and there is a lot of interests in his language building capabilities and people much more competent than me on both Racket and on building programming languages wrote about it. However I struggled to find a minimal setup of a project to start a new programming language or DSL.

That's why, to my own benefit I created a repo with a very basic setup of a new programming language with a custom surface syntax. [Here](https://github.com/davidelettieri/sample-racket-language) is the repo.

I might update the repo in the future to have nice error messages and a more complex syntax for the language but for now it is a decent starting point to start building your own language.