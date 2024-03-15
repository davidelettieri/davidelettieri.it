---
title: TreeSitter C# bindings - new languages
date: 2023-11-18 17:30:00 +0100
tags: [c#, tree-sitter, c#-bindings, tree-sitter-ruby, tree-sitter-html, tree-sitter-embedded-template]
---

I updated my [`TreeSitter.Bindings`](https://www.nuget.org/packages/TreeSitter.Bindings/0.0.2) packages to support additional languages. I wanted to check how solid the bindings were and if I could implement a more complex sample with the respect to the json one I started with.

The tree-sitter documentation provides a [multilanguage sample](https://tree-sitter.github.io/tree-sitter/using-parsers#multi-language-documents) which involves three languages:
- embedded template
- ruby
- html

<!-- truncate -->

Luckily for me, my poor understanding of c/c++ build stack and lack of skills regarding scripting didn't stop me.

I was able to update `TreeSitter.Bindings` with the bindings for the new libraries, update the runtime packages to include the compiled libraries of the new languages (using version `0.20.8-extra.1`). 

The sample project in the [repo](https://github.com/davidelettieri/treesitter-bindings) now provides both samples:
- json
- multilanguage

I suggest to run it in the provided Dev Container. If not possible install `libcxx` in your linux distribution.

Here is a sample code

```csharp title="Program.cs"
using ClangSharp.Interop;
using TreeSitter.Bindings;
using static TreeSitter.Bindings.EmbdeddedTemplate.TSBindingsEmbdeddedTemplate;
using static TreeSitter.Bindings.Html.TSBindingsHtml;
using static TreeSitter.Bindings.Ruby.TSBindingsRuby;
using static TreeSitter.Bindings.TSBindings;

unsafe
{
    Console.WriteLine("-- Multi language sample --");
    MultiLanguageDocumentSample();

    void MultiLanguageDocumentSample()
    {
        var parser = parser_new();
        parser_set_language(parser, tree_sitter_embedded_template());

        MarshaledString sourceCode =
            new MarshaledString(
                "<ul>\n  <% people.each do |person| %>\n    <li><%= person.name %></li>\n  <% end %>\n</ul>");
        TSTree* tree = parser_parse_string(
            parser,
            null,
            sourceCode,
            (uint) sourceCode.Length
        );

        TSNode erbRootNode = tree_root_node(tree);
        var childCount = node_child_count(erbRootNode);
        TSRange[] htmlRanges = new TSRange[childCount];
        TSRange[] rubyRanges = new TSRange[childCount];
        uint htmlRangesCount = 0;
        uint rubyRangesCount = 0;

        for (uint i = 0; i < childCount; i++)
        {
            TSNode node = node_child(erbRootNode, i);

            if (new string(node_type(node)) == "content")
            {
                var htmlRange = new TSRange()
                {
                    start_point = node_start_point(node),
                    end_point = node_end_point(node),
                    start_byte = node_start_byte(node),
                    end_byte = node_end_byte(node)
                };

                htmlRanges[htmlRangesCount++] = htmlRange;
            }
            else
            {
                TSNode codeNode = node_named_child(node, 0);
                var rubyRange = new TSRange()
                {
                    start_point = node_start_point(codeNode),
                    end_point = node_end_point(codeNode),
                    start_byte = node_start_byte(codeNode),
                    end_byte = node_end_byte(codeNode)
                };
                rubyRanges[rubyRangesCount++] = rubyRange;
            }
        }

        fixed (TSRange* ph = &htmlRanges[0])
        fixed (TSRange* pr = &rubyRanges[0])
        {
            parser_set_language(parser, tree_sitter_html());
            parser_set_included_ranges(parser, ph, htmlRangesCount);
            TSTree* htmlTree = parser_parse_string(parser, null, sourceCode, (uint) sourceCode.Length);
            TSNode htmlRootNode = tree_root_node(htmlTree);
            
            parser_set_language(parser, tree_sitter_ruby());
            parser_set_included_ranges(parser, pr, rubyRangesCount);
            TSTree* rubyTree = parser_parse_string(parser, null, sourceCode, (uint) sourceCode.Length);
            TSNode rubyRootNode = tree_root_node(rubyTree);

            string erbSexp = new string(node_string(erbRootNode));
            string htmlSexp = new string(node_string(htmlRootNode));
            string rubySexp = new string(node_string(rubyRootNode));
            
            Console.WriteLine(erbSexp);
            Console.WriteLine(htmlSexp);
            Console.WriteLine(rubySexp);
        }
    }
}
```

The result is 

```bash title="output"
-- Multi language sample --
(template (content) (directive (code)) (content) (output_directive (code)) (content) (directive (code)) (content))
(fragment (element (start_tag (tag_name)) (element (start_tag (tag_name)) (end_tag (tag_name))) (end_tag (tag_name))))
(program (call receiver: (identifier) method: (identifier) block: (do_block parameters: (block_parameters (identifier)) body: (body_statement (call receiver: (identifier) method: (identifier))))))
```