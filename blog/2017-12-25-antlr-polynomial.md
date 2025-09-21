---
title:  "Antlr4 polynomial grammar"
date:   2017-12-25
tags: [c#, antlr, polynomials]
---
## Antlr4

**Update April 2020, hey! I updated this article and the corresponding repo check it out [here](2020-04-18-antlr-polynomial-2020-update.md)**

In the last couple of months I've been reading and studying about compilers and languages and for everyone doing something like that it's very easy to meet Antlr at a certain point. What is antlr?
<!-- truncate -->

>Antlr4 is a powerful parser generator for reading, processing, executing, or translating structured text or binary files. It's widely used to build languages, tools, and frameworks. From a grammar, ANTLR generates a parser that can build and walk parse trees.
> 
>[antlr official website](http://www.antlr.org/ "antlr official website")

I have no better words to describe it since I'm not an expert of the field... Anyway I decided to understand the basics of how the tool work while using VS2017. Antlr is written in Java so you have to install Java on your workstation. Since I have the Xamarin development environment on my machine I already have it.

The [getting started guide](https://github.com/antlr/antlr4/blob/master/doc/getting-started.md "getting started guide") it's almost everything you need in order to make it work. I had to add the java bin folder (C:\Program Files (x86)\Java\jdk1.8.0_131\bin) to my path environment variable. I also modified the suggested .bat files in order to always target c#.

A possible useful guide is the one written by Tomassetti at [The ANTLR mega tutorial](https://tomassetti.me/category/language-engineering/antlr/ "Antlr tutorial").

At a very basic level Antlr allows to parse a text and build a tree representing the parsed text. This tree is the perfect source for a compilation or interpretation of the text, here I'm thinking about code. It's very similar to the role of the [System.Linq.Expressions](https://learn.microsoft.com/en-us/dotnet/api/system.linq.expressions?view=net-8.0 "System.Linq.Expressions documentation") namespace in .NET, the lambdas representing the query are organized in a tree in order to translate it to a different provider such as SQL. 

The project is at [Antlr4 Polynomial](https://github.com/davidelettieri/Antlr4.Polynomials), I won't go into the details of the creation of the grammar since it was a trial and error process.

```
grammar Polynomial;

polynomial      : (SIGN? monomial)(SIGN monomial)*  #monomialSum; 
monomial        : NUM? '*'? VAR ('^' NUM)?          #realMonomial
                | NUM                               #const;

NUM             : [0-9]+;
VAR             : [a-z];
SIGN            : '+' | '-';
WS              : ' ' -> skip;
```

Let's just focus on some details:
* The first line is the grammar name, you have to use the same name of the file. In my case is Polynomial.g4.
* Each of the following lines are rules:
    * lowercase name is a parser rule 
    * uppercase name is a lexer rule [wiki](https://en.wikipedia.org/wiki/Lexical_analysis)
* Our lexer will recognize four tipes of tokens:
    1. Numbers
    2. Variables
    3. The symbols + and -
    4. Whitespaces
* Each rule is specified through a regex or a regex mixed with tokens
* Our polynomial is a string that:
    1. Start with a monomial, possibly without a sign before
    2. Could continue with a sequence of monomials separated from a sign
* Our monomial is a power of some variable or a number
* The strings starting with a # are label that are extremely useful when generating the visitor

After writing my grammar a ran antlr with the visitor flag, targeting c#. This operation generates a number of files, we will not work directly with any of it but all of them are useful. Let's focus on the PolynomialBaseVisitor class, we are going to inherit it from another class. Remember that Antlr4 will generate the lexer and the parser and their work combined is to generate the tree that represents our input text, in order to do something useful with the tree we have to "visit it".

My aim is to use the visitor to take a string representation of a polynomial and to create an object that allow us to evaluate the polynomial for any value of the variable. The result is:

```csharp
public class Evaluator
{
    private Func<double, double> PolynomialFunc;

    public Evaluator(string polynomial)
    {
        var inputStream = new AntlrInputStream(polynomial);
        var lexer = new PolynomialLexer(inputStream);
        var commonTokenStream = new CommonTokenStream(lexer);
        var parser = new PolynomialParser(commonTokenStream);

        var context = parser.polynomial();

        var visitor = new VisitorImpl();

        PolynomialFunc = visitor.Visit(context);

        if (PolynomialFunc == null)
        {
            PolynomialFunc = visitor.Visit(parser.monomial());
        }
    }

    public double Eval(double x)
    {
        return PolynomialFunc(x);
    }

    class VisitorImpl : PolynomialBaseVisitor<Func<double, double>>
    {
        private static readonly Func<double, double, double> add = (i, j) => i + j;
        private static readonly Func<double, double, double> subtract = (i, j) => i - j;

        public override Func<double, double> VisitConst(PolynomialParser.ConstContext context)
        {
            var val = double.Parse(context.NUM().GetText());

            return p => val;
        }

        public override Func<double, double> VisitRealMonomial(PolynomialParser.RealMonomialContext context)
        {
            var coeff = context.NUM().Length == 2 ? Convert.ToDouble(context.NUM().GetValue(0).ToString()) : 1;

            var exp = context.NUM().Length > 0 ? Convert.ToDouble(context.NUM().GetValue(context.NUM().Length - 1).ToString()) : 1;

            return p => coeff * Math.Pow(p, exp);
        }

        public override Func<double, double> VisitMonomialSum(PolynomialParser.MonomialSumContext context)
        {
            var monomials = context.monomial();
            var operations = context.SIGN();
            var ifStartWithAnOp = monomials.Length == operations.Length;
            var finalValue = ifStartWithAnOp ? GetOp(operations[0])(p => 0, Visit(monomials[0])) : Visit(monomials[0]);
            var monomioIndex = 1;
            var segniIndex = ifStartWithAnOp ? 1 : 0;

            while (monomioIndex < monomials.Length)
            {
                var op = GetOp(operations[segniIndex]);

                var value = Visit(monomials[monomioIndex]);

                finalValue = op(finalValue, value);

                monomioIndex++;
                segniIndex++;
            }

            return finalValue;
        }

        private Func<Func<double, double>, Func<double, double>, Func<double, double>> GetOp(ITerminalNode node)
        {
            if (node?.GetText() == "-")
            {
                return (i, j) => k => subtract(i(k), j(k));
            }

            return (i, j) => k => add(i(k), j(k));
        }
    }

}
```

In my visitor implementation, thanks to the label I assigned when defining my grammar, it's easy to manage the only three cases my parser will found. The base visitor is a generic class and I chose the Func\<double,double\> type in order to create a function that will represent my polynomial. After the work is done in the constructor of Evaluator, I can compute the function every time I want.
