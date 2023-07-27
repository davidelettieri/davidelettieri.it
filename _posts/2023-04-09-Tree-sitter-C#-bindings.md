---
layout: post
title:  "TreeSitter C# bindings"
date:   2023-04-09 10:00:00 +0200
categories: c# 'tree sitter' 'dotnet bindings' 'C# bindings'
description: I am a big fan of the visitor pattern, I think it is a very good approach for adding behaviors to a group of classes without modifying all of them. 
---

In a previous experiment I made I used the LLVMSharp library and I was quite curious on how the bindings are made. In the readme is it stated they are generated using che ClangSharp library, this one auto-generate hitself from the headers of Clang C header.

This functionality is exposed through a dotnet tool: ClangSharpPInvokeGenerator. So I wanted to try and hack my way into parsing the tree-sitter headers and use the generated code to run a very small sample using C#, in particular I was aiming for the one that's in the getting started section of the docs

```c
// Filename - test-json-parser.c

#include <assert.h>
#include <string.h>
#include <stdio.h>
#include <tree_sitter/api.h>

// Declare the `tree_sitter_json` function, which is
// implemented by the `tree-sitter-json` library.
TSLanguage *tree_sitter_json();

int main() {
  // Create a parser.
  TSParser *parser = ts_parser_new();

  // Set the parser's language (JSON in this case).
  ts_parser_set_language(parser, tree_sitter_json());

  // Build a syntax tree based on source code stored in a string.
  const char *source_code = "[1, null]";
  TSTree *tree = ts_parser_parse_string(
    parser,
    NULL,
    source_code,
    strlen(source_code)
  );

  // Get the root node of the syntax tree.
  TSNode root_node = ts_tree_root_node(tree);

  // Get some child nodes.
  TSNode array_node = ts_node_named_child(root_node, 0);
  TSNode number_node = ts_node_named_child(array_node, 0);

  // Check that the nodes have the expected types.
  assert(strcmp(ts_node_type(root_node), "document") == 0);
  assert(strcmp(ts_node_type(array_node), "array") == 0);
  assert(strcmp(ts_node_type(number_node), "number") == 0);

  // Check that the nodes have the expected child counts.
  assert(ts_node_child_count(root_node) == 1);
  assert(ts_node_child_count(array_node) == 5);
  assert(ts_node_named_child_count(array_node) == 2);
  assert(ts_node_child_count(number_node) == 0);

  // Print the syntax tree as an S-expression.
  char *string = ts_node_string(root_node);
  printf("Syntax tree: %s\n", string);

  // Free all of the heap-allocated memory.
  free(string);
  ts_tree_delete(tree);
  ts_parser_delete(parser);
  return 0;
}
```

## Using ClangSharpPInvokeGenerator to create C# bindings for tree-sitter

The ClangSharpPInvokeGenerator tool comes with some challenges to make it work. The readme of the [repo](https://github.com/dotnet/ClangSharp) is quite useful and digging into the issues also helps if you get stuck. 

At first run it wasn't working but the error message was quite useful and I ended up downloading this [nuget package](https://www.nuget.org/packages/libClangSharp.runtime.linux-x64/15.0.0) and copying the files where the tool was looking for them.

Additionally on my Fedora box, I had to install a missing dependency
```bash
sudo dnf install ncurses-compat-libs.x86_64
```

After the tool is running you will want to pass the correct parameters to generate the bindings. The `tree-sitter` repo was simple enough to navigate and I decided quickly that I wanted to generate the bindings for the 2 headers found in the folder `lib/include/tree_sitter`:
- `api.h`
- `parser.h`

My configuration file was strongly inspired by the one used in the ClangSharp repo, which you can find [here](https://github.com/dotnet/ClangSharp/blob/main/sources/ClangSharpPInvokeGenerator/Properties/GenerateClang.rsp).

### Bindings for tree-sitter-json

The tree-sitter library has a set of predefined grammars, the get started project uses the tree-sitter-json grammar which is published in its own repo. In order to complete the demo code I have to generate bindings also for that one.

### Some options are broken with the current ClangSharpPInvokeGenerator release

With the configuration I used it was necessary to use the `generate-helper-types` option to have some additional types in the generated output. However this was not working so I removed the option and copied the files from the ClangSharp repo. In addition to that I had a class generated twice, I'm not sure why and I might did into this a bit deeper in the future but for the sake of the experiment it was good enough to clean up manually the duplicated class.

## Packaging the bindings library

I want to be able to share and use without too much hassle the bindings I generated. This requires:
1. Package the project with the generated bindings
2. Distribute the compiled tree-sitter library

Point 1 is easy and I've done it several times, I'm publishing on github nuget registry since I find it very convenient to test packages. Point 2 is a bit tricky, since the compiled tree-sitter library is depending on the combination of os and architecture.

Again the ClangSharp and the LLVMSharp projects already faced the same problem and they solved it somehow, even if not completely due to lack of tooling and support in the nuget infrastructure.

Since I wanted to make this a one-day experiment (more or less!) I decided to settle on supporting only one architecture: `linux-x64` which was the one I was using.

The approach is the following:
- create a `libtreesitter` _meta-package_, this will reference other packages based on the runtime.
- create a `libtreesitter.runtime.linux-64` package, this package contains the compiled libraries for linux-x64:
  - `libtree-sitter.so`
  - `libtree-sitter-json.so`
- create packages for all the runtimes we want to support. All of them must be referenced by the main package.

The purpose of these packages is to ensure that the project you are developing has access to the tree-sitter-library. 

Now we can package the binding library which I called `TreeSitter.Bindings`, this package has a dependency on the `libtreesitter` meta-package. In order to make it work however after installing `TreeSitter.Bindings` a manual change is required in the csproj

```xml
    <PropertyGroup>
        ...
        <RuntimeIdentifier Condition="'$(RuntimeIdentifier)' == ''">$(NETCoreSdkRuntimeIdentifier)</RuntimeIdentifier>
    </PropertyGroup>

```

This will indicate the correct runtime so that the meta-package reference will pick up the correct runtime package to be used. 

## Getting the pieces together

This was roughly the steps I made to have a working sample:
1. Build tree-sitter -> as easy as cloning the repo and running `make`
2. Build tree-sitter-json -> same as above
3. Package the compiled libraries into the desired nuget packages using nuspec files
4. Generate the bindings for both tree-sitter and tree-sitter-json
5. Package the bindings in `TreeSitter.Bindings`
6. Build a sample project reproducing the get started sample

Sadly all of this was done manually, if I find the time to automate part of this process I might add all the other available grammars to the bindings.

That said the repo with all of this is [this one](https://github.com/davidelettieri/treesitter-bindings). There is a working sample and the packages are available on my github source repo.

The C# reproduction is following the c sample very closely.

```csharp
using System.Diagnostics;
using TreeSitter.Bindings.Helpers;
using static TreeSitter.Bindings.Json.TSBindingsJson;
using static TreeSitter.Bindings.TSBindings;

unsafe
{
    var parser = parser_new();

    parser_set_language(parser, tree_sitter_json());

    MarshaledString sourceCode = new MarshaledString("[1, null]");
    var tree = parser_parse_string(
        parser,
        null,
        sourceCode,
        (uint) sourceCode.Length
    );

    var rootNode = tree_root_node(tree);
    var arrayNode = node_named_child(rootNode, 0);
    var numberNode = node_named_child(arrayNode, 0);

    Debug.Assert(new string(node_type(rootNode)) == "document");
    Debug.Assert(new string(node_type(arrayNode)) == "array");
    Debug.Assert(new string(node_type(numberNode)) == "number");

    Debug.Assert(node_child_count(rootNode) == 1);
    Debug.Assert(node_child_count(arrayNode) == 5);
    Debug.Assert(node_named_child_count(arrayNode) == 2);
    Debug.Assert(node_child_count(numberNode) == 0);

    var stringRep = node_string(rootNode);

    Console.WriteLine("Syntax tree: {0}", new string(stringRep));
    
    tree_delete(tree);
    parser_delete(parser);
}
```