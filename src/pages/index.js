import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';
import HomepageFeatures from '../components/HomepageFeatures';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">
		  <img className="hero_logo" src="/img/sun.png" width="400" height="400"/>
		  <p className="hero__title_content">
		    <b>Panda</b> 的 <b>大数据</b> 之路
		  </p>
		</h1>
        <p className="hero__subtitle">
		  岱宗夫如何？齐鲁青未了。
		</p>
		<p className="hero__subtitle">
		  造化钟神秀，阴阳割昏晓。
		</p>
		<p className="hero__subtitle">
		  荡胸生曾云，决眦入归鸟。
		</p>
		<p className="hero__subtitle">
		  会当凌绝顶，一览众山小。
		</p>
        <div className={styles.buttons}>
          <Link
            className="button button--info"
            to="/intro">
            登峰造极
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="这是来自 Panda 的大数据专栏！">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
