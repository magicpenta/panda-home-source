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
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        blog: {
          blogSidebarTitle: 'Recent Posts',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Panda Home',
        logo: {
          alt: 'Panda Logo',
          src: 'img/logo.svg',
        },
        items: [
		  {to: '/docs', label: 'Docs', position: 'left'},
		  {to: '/blog', label: 'Blog', position: 'left'},
		  {to: '/about', label: 'About', position: 'left'},
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
                to: '/docs',
              },
			  {
                label: 'Flink',
                to: '/docs/flink',
              }
            ],
          },
          {
            title: 'Other',
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
              },
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
		logo: {
          alt: 'Panda Logo',
          src: 'img/bottom.png',
        },
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
