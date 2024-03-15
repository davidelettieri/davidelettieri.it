---
layout: post
title:  "LLVM Kaleidoscope .NET"
date:   2021-04-09 19:00:00 +0100
categories: C# LLVM Kaleidoscope
description: If you're reading and learning about compilers in these days you will at some point find something about LLVM. I did and I tried to implement the Kaleidoscope tutorial from the official documentation using C#.
---

## LLVM Kaleidoscope .NET

If you're reading and learning about compilers in these days you will at some point find something about LLVM. I did and I tried to implement the Kaleidoscope tutorial from the official documentation using C#. I won't write a full blown tutorial and in the end I didn't actually follow the official tutorial as it was pretty hard for me to read C++ code. 

<!-- truncate -->

However I did implement the interpreter, with some bumps on the road and some changes to the syntax. [Here](https://github.com/davidelettieri/Kaleidoscope) you'll find all the code I wrote, roughly equivalent to Chapter 6 & 7 of the official tutorial.

Here you can see the code running the Mandelbrot example

<script id="asciicast-9UTdB0BVPfZemqMVjm0429YJb" src="https://asciinema.org/a/9UTdB0BVPfZemqMVjm0429YJb.js" async></script>

I'm going to point out things that I found out there weren't obvious for me and did confuse me along the road.

First, how do we use LLVM in C# code? There is a [nuget package](https://www.nuget.org/packages/LLVMSharp) from Microsoft, source [here](https://github.com/microsoft/LLVMSharp), I suggest to use the 11.0.0-beta since the last non beta version uses LLVM 5. The library contains bindings for the C api of LLVM, when you have some issue look for the actual C code that is being called and google it, it's easier than finding the corresponding C# method/type. I did find something useful looking in projects using the nuget itself so look for them on [github](https://github.com/microsoft/LLVMSharp/network/dependents?package_id=UGFja2FnZS0xNTY3NzI0NTk%3D), some of the projects are incomplete.

### Major differences between the official tutorial and my implementation

Here the key differences:
* I used the visitor pattern and the source code is read eagerly into tokens.
* Functions definitions requires a comma `,` between arguments eg `def f(x,y) x*y` instead of `def f(x y) x*x`
* I couldn't understand the Jit class they made in the tutorial, so I didn't do it. I'm using the MCJIT in a way that I hope is not too wrong. I cannot exclude that some of the problems I encountered are related to this.

### How the interpreter evaluates expressions

Let's say we want to evaluate something simple `1+2;` then the interpreter emits code of a function with no arguments that returns the evaluated expression as a result, in pseudocode
```
fun a() { return 3; }
```
Then it evaluates the function and write the result on the screen.

### The issues that hit me hard

Here's the list of what I learned by spending an awful lot of time scratching my head :)

*  Suppose you want to evaluate something like this `1+10;20*2;`. We have two subsequent expressions to be evaluated, let's call them `e1` and `e2`. The interpreter, using the MCJIT, does not work if you implement this flow
```
emit e1, evaluate e1, emit e2, evaluate e2
```
You need to implement this flow
```
emit e1, emit e2, evaluate e1, evaluate e2
```
Maybe it's obvious but it wasn't for me.
* Same as before, we want to evaluate `1+10;20*2;`. We need to define two functions but we have no name for them, at the beginning I passed an empty string in the `AddFunction` method. It turns out that LLVM is able to emit the code, it will name the function `@1` and the second one `@2` and so on. However when you evaluate the second function you get the result of the first one. I solved by calling the function `anon_expr` as in the official tutorial. You'll get `@anon_expr`, `@anon_expr.1`, `@anon_expr.3` and so on and evaluation will be correct. I have some C code to prove this point if needed.
* At chapter 7 when implementing mutable variables the official tutorial uses the type `AllocaInst`, there is an `AllocaInst` in the C# library but I couldn't find out how to use it. Moreover the methods for allocating, storing and retrieving values in the C api works with `LLVMValueRef` in both the pointer val and in the actual val for example 
```
LLVMValueRef LLVMBuildLoad2(LLVMBuilderRef, LLVMTypeRef Ty, LLVMValueRef PointerVal, const char *Name)
```
In the arguments we find a `LLVMValueRef` representing a pointer, the return value is a `LLVMValueRef` containing an actual value.
Since the C# library is a binding for the C api this is what you'll find. Forget `AllocaInst` and be careful with the `LLVMBuildStore` since in its arguments you will find two `LLVMValueRef`, one for the pointer and one for the value. If you switch them, like I did a couple of times, the code will obviously fail.
* Again at chapter 7, during the refactoring needed for the mutable variables, the code emitted for the function definition has to be changed. For example for a function `def f(x,y) x+y;`, what it is required to emit is these (in pseudocode)
```
def f(x,y):
    x1 = alloca double
    y1 = alloca double
    store x x1
    store y y1
    x2 = load x1
    y2 = load y2
    z = x2+y2
    return z
```
Which is pretty weird, I couldn't get my head around this and I still don't. But I checked the IR generated from an equivalent C code
```
int f(x, y)
{
    return x + y;
}
```
compiling the file with `clang -S -emit-llvm main.c` I got
```
define dso_local i32 @f(i32 %0, i32 %1) #0 {
  %3 = alloca i32, align 4
  %4 = alloca i32, align 4
  store i32 %0, i32* %3, align 4
  store i32 %1, i32* %4, align 4
  %5 = load i32, i32* %3, align 4
  %6 = load i32, i32* %4, align 4
  %7 = add nsw i32 %5, %6
  ret i32 %7
}
```
If clang does that, I should too. Please note that using `-O1` or `-O2` or `-O3` produces a simpler IR. 

### Remarks

If you're code is failing, check the generated IR with the optimization passes on and off. Both can give clues on where the error is. If you understand C++ follow the official tutorial. Check how `clang` emits IR for simple C code. My code is working in Fedora but it's not thoroughly tested.
