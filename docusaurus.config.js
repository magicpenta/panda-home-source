// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Panda Home',
  tagline: '',
  url: 'https://magicpenta.github.io/',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/logo.svg',
  organizationName: 'magicpenta', // Usually your GitHub org/user name.
  projectName: 'magicpenta.github.io', // Usually your repo name.
  deploymentBranch: 'master',

  plugins: [
    [
      'content-docs',
      {
		id: 'flink',
        path: 'flink',
        routeBasePath: 'flink',
        include: ['*.md', '*.mdx'],
      },
    ],
	[
      'content-docs',
      {
		id: 'spark',
        path: 'spark',
        routeBasePath: 'spark',
        include: ['*.md', '*.mdx'],
      },
    ]
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
	  algolia: {
        appId: 'X1Z85QJPUV',
        apiKey: 'bf7211c161e8205da2f933a02534105a',
        indexName: 'docusaurus-2',
      },
      navbar: {
        title: 'Panda Home',
        logo: {
          alt: 'Panda Logo',
          src: 'img/logo.svg',
        },
        items: [
		  {to: '/intro', label: 'Intro', position: 'left'},
		  {to: '/spark/Spark 快速入门', label: 'Spark', position: 'left'},
		  {to: '/flink/Flink 快速入门', label: 'Flink', position: 'left'},
		  {to: '/docs/clickhouse', label: 'Docs', position: 'left'},
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Recommend',
            items: [
              {
                label: 'Spark',
                to: '/spark/Spark 快速入门',
              },
			  {
                label: 'Flink',
                to: '/flink/Flink 快速入门',
              }
            ],
          },
          {
            title: 'Docs',
            items: [
              {
                label: 'ClickHouse',
                to: '/docs/clickhouse',
              },
			  {
                label: 'Flume',
                to: '/docs/flume',
              },
			  {
                label: 'Spider',
                to: '/docs/spider',
              }
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/magicpenta',
              }
            ],
          },
		  {
            title: 'Legal',
            items: [
              {
                label: 'Privacy',
                href: 'https://opensource.fb.com/legal/privacy/',
              },
			  {
                label: 'Cookie Policy',
                href: 'https://opensource.fb.com/legal/cookie-policy/',
              }
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Panda's Home`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
		additionalLanguages: ['java', 'scala', 'python', 'bash', 'properties', 'docker'],
      },
    }),
};

module.exports = config;
