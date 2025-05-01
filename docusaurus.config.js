// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import { themes as prismThemes } from 'prism-react-renderer';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Davide Lettieri',
  tagline: 'An average C# developer',
  favicon: 'img/favicon.svg',

  // Set the production url of your site here
  url: 'https://davidelettieri.it',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',
  themes: ['@docusaurus/theme-mermaid'],
  markdown: {
    mermaid: true
  },
  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: false,
        blog: {
          blogTitle: 'Davide Lettieri\'s blog',
          blogSidebarTitle: 'Latests posts',
          blogDescription: 'Davide Lettieri\'s blog about C#, .NET, Azure and more.',
          routeBasePath: '/',
          showReadingTime: true,
          archiveBasePath: 'archive',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'Davide Lettieri',
        items: [
          {
            href: '/about',
            label: 'About me',
            position: 'left',
          },
          {
            href: '/talk-with-me',
            label: 'Talk with me',
            position: 'left',
          },
          {
            href: '/archive',
            label: 'Archive',
            position: 'left',
          },
          {
            href: 'https://github.com/davidelettieri',
            label: 'GitHub',
            position: 'left',
          },
          {
            href: 'https://www.linkedin.com/in/davide-lettieri/',
            label: 'Linkedin',
            position: 'left',
          },
          {
            href: '/tags',
            label: 'Tags',
            position: 'left',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            href: 'https://github.com/davidelettieri',
            label: 'GitHub',
            position: 'right',
          },
          {
            href: 'https://www.linkedin.com/in/davide-lettieri/',
            label: 'Linkedin',
            position: 'right',
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Davide Lettieri, Inc. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['powershell', 'csharp', 'bicep', 'bash', 'lua', 'java', 'fsharp'],
      },
    }),
    stylesheets: [
      {
        href: 'https://cdn.jsdelivr.net/npm/katex@0.13.24/dist/katex.min.css',
        type: 'text/css',
        integrity:
          'sha384-odtC+0UGzzFL/6PNoE8rX/SPcQDXBJ+uRepguP4QkPCm2LBxH3FA3y+fKSiJ+AmM',
        crossorigin: 'anonymous',
      },
    ],
};

export default config;
