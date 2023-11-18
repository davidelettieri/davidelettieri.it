---
layout: post
title:  "TreeSitter C# bindings - new languages"
date:   2023-11-18 17:30:00 +0100
categories: c# 'tree sitter' 'dotnet bindings' 'C# bindings' 'tree sitter ruby' 'tree sitter html' 'tree sitter embedded template'
description: I updated my TreeSitter.Bindings packages to support additional languages.
---

I updated my [`TreeSitter.Bindings`](https://www.nuget.org/packages/TreeSitter.Bindings/0.0.0-alpha.0.52) packages to support additional languages. I wanted to check how solid the bindings were and if I could implement a more complex sample with the respect to the json one I started with.

The tree-sitter documentation provides a [multilanguage sample](https://tree-sitter.github.io/tree-sitter/using-parsers#multi-language-documents) which involves three languages:
- embedded template
- ruby
- html

Luckily for me, my poor understanding of c/c++ build stack and lack of skills regarding scripting didn't stop me.

I was able to update `TreeSitter.Bindings` with the bindings for the new libraries, update the runtime packages to include the compiled libraries of the new languages (using version `0.20.8-extra.1`). 

The sample project in the [repo](https://github.com/davidelettieri/treesitter-bindings) now provides both samples:
- json
- multilanguage

I suggest to run it in the provided Dev Container. If not possible install `libcxx` in your linux distribution.

Next step could be supporting Windows.