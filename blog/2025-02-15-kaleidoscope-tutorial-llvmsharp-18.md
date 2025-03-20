---
title:  Kaleidoscope tutorial with C# using LLVMSharp and llvm 18
date: 2025-02-20 18:20:00 +0100
tags: [c#, llvm, kaleidoscope]
---

A few years ago I worked on reproducing the Kaleidoscope tutorial using LLVMSharp, a library that exposes C# bindings for LLVM. I updated multiple times the project to support the latest versions of llvm and the LLVMSharp bindings. In the last week I was busy moving to llvm 18 and I encountered a few difficulties.

First, the newest version of LLVMSharp available on nuget is `16.0.0`, however the [corresponding repo](https://github.com/dotnet/LLVMSharp) is updated to support version `18.0.0` of llvm. Luckily for me, there is a nighly nuget feed where a release candidate of LLVMSharp supporting version `18.0.0` is available. Please note that at the time of writing the latest llvm version is `19`, LLVMSharp is updated inconsistently and it has been since the beginning for what I could see. 

<!-- truncate -->

Now, once I decided to go with llvm `18` and found the right source for the package, the next big issue was the removal of the `PassManagerBuilder.h` starting from version `17.0.0` as detailed in the [release notes](https://releases.llvm.org/17.0.1/docs/ReleaseNotes.html#changes-to-llvm-infrastructure). There is a documentation on how to use the new pass manager [here](https://llvm.org/docs/NewPassManager.html) using `C++` but LLVMSharp is exposing the `C` api of llvm. There is a point were `C` apis are mentioned in the new docs

> The C API also supports most of this, see llvm-c/Transforms/PassBuilder.h.

Given that:
1. I'm not an expert on llvm
2. I'm not an expert on `C` nor `C++`

It wasn't obvious to me how to use the new pass manager. I did quite some research on internet and on github trying to find samples and how-tos, with little luck tbh. 

One source that I think is good quality but overall too complex for me was the source code for the `C3` language, they are using the `C` api of llvm and indeed using the new PassBuilder. However while the compiler is written in `C` using the `C` apis of llvm, the bit about the pass manager has a [`C++` wrapper](https://github.com/c3lang/c3c/blob/79db06ecd142065d62766500735dd85deed0fbf3/wrapper/src/wrapper.cpp). So I'm out of luck on this.

Finally, I found a working approach in the place were I should have looked first (but didn't!), the llvm project itself. [They have unit tests for the new PassManager](https://github.com/llvm/llvm-project/blob/3b5b5c1ec4a3095ab096dd780e84d7ab81f3d7ff/llvm/unittests/Passes/PassBuilderBindings/PassBuilderBindingsTest.cpp), with that it was easy to get something working.

The approach that I'm following now with llvm 18 is not exactly the same as the one with llvm 16, because before I had a function pass manager and I was applying the passes on each single function, now I'm applying the passes to the whole module. I don't know what's the status now (at version `19.0.x` of llvm) and I don't know if it was already possible to keep the old approach but I wasn't able to do it. For my scopes, it is enough what I have now.

The passes need to be passed as a comma separated string to the `LLVMRunPasses` function, [here](https://llvm.org/docs/Passes.html) the list of the current available passes. The code using llvm `16` was having both analysis passes and transform passes for no other reason that I was mimicking what was done in the original Kaleidoscope tutorial.

The `LLVMRunPasses` didn't accept the only analysis pass I had `basic-aa` but accepted all the transforms. This is somehow understandable as the pass manager comes from `llvm-c/Transforms/PassBuilder.h`. I guess for analysis passes there is another infrastructure.

Now my [kaleidoscope repo](https://github.com/davidelettieri/kaleidoscope/) is updated and functional, still able to run the mandelbrot example.