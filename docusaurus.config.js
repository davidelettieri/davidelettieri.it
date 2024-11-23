// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import { themes as prismThemes } from 'prism-react-renderer';

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
          routeBasePath: '/',
          showReadingTime: true,
          archiveBasePath: 'archive', 
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
            href: 'https://github.com/davidelettieri',
            label: 'GitHub',
            position: 'left',
          },
          {
            href: 'https://www.linkedin.com/in/davide-lettieri/',
            label: 'Linkedin',
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
        additionalLanguages: ['powershell','csharp','bicep','bash','lua','java','fsharp'],
      },
    })
};

export default config;
