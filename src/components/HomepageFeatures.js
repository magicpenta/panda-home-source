import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

const FeatureList = [
  {
    title: '聚焦',
    Svg: require('../../static/img/rocket.svg').default,
    description: (
      <>
        专注于大数据相关技术的学习
      </>
    ),
  },
  {
    title: '原创',
    Svg: require('../../static/img/satellite.svg').default,
    description: (
      <>
        原创内容，统一的行文风格与样式
      </>
    ),
  },
  {
    title: '共享',
    Svg: require('../../static/img/star.svg').default,
    description: (
      <>
        所有内容开放共享，期待共同进步
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
