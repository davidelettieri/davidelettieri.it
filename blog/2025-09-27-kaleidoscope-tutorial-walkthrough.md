---
title:  Kaleidoscope tutorial walkthrough
date: 2025-09-27
tags: [c#, llvm, kaleidoscope]
---

A few years back I tried to go through the [Kaleidoscope tutorial](https://llvm.org/docs/tutorial/) and reimplement it using C# and the [LLVMSharp library](https://www.nuget.org/packages/LLVMSharp) which is a dotnet foundation project. I was able to implement up to Chapter 7 and while I followed the tutorial I did a few things differently.

I wrote a [couple of times](https://davidelettieri.it/tags/llvm) about these without going into much details. Given that I updated the code to keep up with LLVM versions for a few years now, I would like to go through the implementation again and wrote more detailed notes. During the writing of this post I re-organized the solution, simplified the visitor interface removing generic parameters, I added unit tests and modernized the code base using latest C# features.

I implemented up to chapter 7, we could reasonably say that my end goal was to be able to run the mandelbrot example.

:::info

The official tutorial is using C++ APIs while the LLVMSharp library exposes the C API. Those 2 APIs are not exposing the same functionalities so some differences between the official tutorial and my implementation are independent from my will or skills.

I said this before but I want to reiterate that I'm not an expert in LLVM, C++, C or compilers. All that is written below and coded is from the perspective of a person who can code and goes through documentation, open source code and all the resource one can find online.

:::

<!-- truncate -->

## Solution structure

The solution contains two applications, one with the implementation up to chapter 6 and one with the implementation up to chapter 7. The two projects are different because chapter 7 doesn't just build upon the previous parts but it changes some previous implementations. I wanted to keep both available in the latest version of the repository without resorting to tags or releases.

All other intermediate chapters are not available and if some parts are modified progressing through the tutorial there might be no record in the history of the repository.

The shared library is containing, of course, shared parts for the two applications. Some types, methods and enum values are used only in one project or the other. I left some comments to highlight which parts are used only in one of the two projects.

## Chapter 1 & 2: Lexer, Parser and AST

These chapters regarding lexing and parsing the Kaleidoscope language are completely different from the official tutorial. At the time I had just read [Crafting Interpreters](https://craftinginterpreters.com/) and I replicated what I had learned. 

If you look at the `Token`, `Scanner`, `Parser` types they closely resemble what can be found in the mentioned book. Some differences in the following chapters depends on this initial decision.

The main loop is also based on the book version instead of the Kaleidoscope tutorial. All of this brings better code organization (IMHO), the possibility to run files, some kind of "best practices" in place. Hopefully a known approach for C# developers interested in compilers, given that _Crafting Interpreters_ is a well known source.

## Chapter 3: Code generation to LLVM IR

### 3.2 Code generation setup

For each AST node we defined in previous chapters we need to be able to emit LLVM IR, the tutorial follows a simple approach where each AST type has a `codegen()` method defined for this scope. The tutorial also mentions the possibility of implementing the visitor pattern, I decided to follow this approach. The `codegen()` method is replaced with an implementation of the visitor pattern. 

Ref: https://llvm.org/docs/tutorial/MyFirstLanguageFrontend/LangImpl03.html#code-generation-setup

```cpp title='Tutorial base class'
/// ExprAST - Base class for all expression nodes.
class ExprAST {
public:
  virtual ~ExprAST() = default;
  virtual Value *codegen() = 0;
};

/// NumberExprAST - Expression class for numeric literals like "1.0".
class NumberExprAST : public ExprAST {
  double Val;

public:
  NumberExprAST(double Val) : Val(Val) {}
  Value *codegen() override;
};
```

The corresponding parts in my implementation:

```csharp title='C# base class and visitor interface'
public abstract class Expression
{
    public abstract LLVMValueRef Accept(IExpressionVisitor visitor);
}

public sealed class NumberExpression(double value) : Expression
{
    public double Value { get; } = value;

    public override LLVMValueRef Accept(IExpressionVisitor visitor) => visitor.VisitNumber(this);
}

public interface IExpressionVisitor
{
    LLVMValueRef VisitBinary(BinaryExpression expr);
    LLVMValueRef VisitCall(CallExpression expr);
    LLVMValueRef VisitFor(ForExpression expr);
    LLVMValueRef VisitFunction(FunctionExpression expr);
    LLVMValueRef VisitIf(IfExpression expr);
    LLVMValueRef VisitNumber(NumberExpression expr);
    LLVMValueRef VisitPrototype(PrototypeExpression expr);
    LLVMValueRef VisitVariable(VariableExpression expr);
    LLVMValueRef VisitExtern(ExternExpression expr);
    LLVMValueRef VisitUnary(UnaryExpression expr);
    LLVMValueRef VisitVarInExpression(VarInExpression expr);
}
```

The tutorial goes on with the set up adding some global variables and an helper function and a kind of symbol table for the code.

```cpp title='Static variables and log helper function'
static std::unique_ptr<LLVMContext> TheContext;
static std::unique_ptr<IRBuilder<>> Builder;
static std::unique_ptr<Module> TheModule;
static std::map<std::string, Value *> NamedValues;

Value *LogErrorV(const char *Str) {
  LogError(Str);
  return nullptr;
}
```

Instead of global static variables I went with private fields on an `Interpreter` class I introduced. We don't need the `LLVMContext` variable because the `LLVMModule` type has a property that expose a `LLVMContext`. For what concern the log error function, I decided to raise exceptions so there is no equivalent on the `C#` code. I substituted the `NamedValues` map with a `Context` which is a type holding the same dictionary. It is immutable, this characteristic helped when I had to "restore" old version of the context for example at the end of the definition of a function the parameters needs to be removed from the context.

```csharp title='C# module, builder'
private void InitializeModule()
{
    _module = LLVMModuleRef.CreateWithName("Kaleidoscope Module");
    _builder = _module.Context.CreateBuilder();

    // other code omitted
}

public sealed class Context
{
    private readonly ImmutableDictionary<string, LLVMValueRef> _source;
    // other code omitted
}
```

### 3.3 Expression code generation

The implementation for the code generation part is different between the two chapters and it's different from what is shown in chapter 3 because it includes some changes that arrive later in the tutorial. However some parts looks very similar to the `C++` original.

```cpp title='Expression code generation
Value *NumberExprAST::codegen() {
  return ConstantFP::get(*TheContext, APFloat(Val));
}

Value *VariableExprAST::codegen() {
  // Look this variable up in the function.
  Value *V = NamedValues[Name];
  if (!V)
    LogErrorV("Unknown variable name");
  return V;
}

Value *BinaryExprAST::codegen() {
  Value *L = LHS->codegen();
  Value *R = RHS->codegen();
  if (!L || !R)
    return nullptr;

  switch (Op) {
  case '+':
    return Builder->CreateFAdd(L, R, "addtmp");
  case '-':
    return Builder->CreateFSub(L, R, "subtmp");
  case '*':
    return Builder->CreateFMul(L, R, "multmp");
  case '<':
    L = Builder->CreateFCmpULT(L, R, "cmptmp");
    // Convert bool 0/1 to double 0.0 or 1.0
    return Builder->CreateUIToFP(L, Type::getDoubleTy(*TheContext),
                                 "booltmp");
  default:
    return LogErrorV("invalid binary operator");
  }
}
```

```csharp title='C# version'

public LLVMValueRef VisitNumber(NumberExpression expr)
  => LLVMValueRef.CreateConstReal(LLVMTypeRef.Double, expr.Value);

public LLVMValueRef VisitVariable(VariableExpression expr)
{
    var value = _context.Get(expr.Name);

    // Exception instead of log error function 
    if (value is null)
        throw new InvalidOperationException("variable not bound");

    return value.GetValueOrDefault();
}

public LLVMValueRef VisitBinary(BinaryExpression expr)
{
    // code that is needed later

    var lhsVal = Visit(expr.Lhs);
    var rhsVal = Visit(expr.Rhs);

    return expr.NodeType switch
    {
        Add => _builder.BuildFAdd(lhsVal, rhsVal, "addtmp"),
        Subtract => _builder.BuildFSub(lhsVal, rhsVal, "subtmp"),
        Multiply => _builder.BuildFMul(lhsVal, rhsVal, "multmp"),
        LessThan => _builder.BuildUIToFP(
            _builder.BuildFCmp(
                LLVMRealPredicate.LLVMRealOLT,
                lhsVal,
                rhsVal,
                "cmptmp"), LLVMTypeRef.Double, "booltmp"),
        // Exception instead of log error function 
        _ => throw new InvalidOperationException(),
    };
}
```

### 3.4 Function code generation

The tutorial continues with code generation for functions, prototypes and all that is required for those to work. I won't copy paste all the code here, as an example the prototype AST. I cleaned up the C# version to only show relevant code for chapter 3.

```cpp title='Prototype AST'
Function *PrototypeAST::codegen() {
  // Make the function type:  double(double,double) etc.
  std::vector<Type*> Doubles(Args.size(),
                             Type::getDoubleTy(*TheContext));
  FunctionType *FT =
    FunctionType::get(Type::getDoubleTy(*TheContext), Doubles, false);

  Function *F =
    Function::Create(FT, Function::ExternalLinkage, Name, TheModule.get());
```

```csharp title='C# version'
public LLVMValueRef VisitPrototype(PrototypeExpression expr)
{
    var name = expr.Name;
    var args = expr.Arguments;
    var doubles = new LLVMTypeRef[args.Count];
    Array.Fill(doubles, LLVMTypeRef.Double);

    // some code that is needed later

    var retType = LLVMTypeRef.Double;
    var ft = LLVMTypeRef.CreateFunction(retType, doubles);
    f = _module.AddFunction(name, ft);
    f.Linkage = LLVMLinkage.LLVMExternalLinkage;
    _context = _context.AddArguments(f, args);
    return f;
}
```

## Chapter 4: Adding JIT and Optimizer Support

This chapter is were I wasn't able to reproduce what is done in the tutorial at all.