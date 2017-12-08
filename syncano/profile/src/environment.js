function getEnvironment(config) {
  return config.ENV ? config.ENV : 'development';
}

function getSignicatCertCN(config) {
  if (
    getEnvironment(config) &&
    getEnvironment(config).toLowerCase() === 'production'
  ) {
    return 'id.signicat.com/std';
  }
  return 'test.signicat.com/std';
}

function getSignicatCertConfig(config) {
  return {
    CN: getSignicatCertCN(config),
    OU: 'Signicat',
    O: 'Signicat',
    L: 'Trondheim',
    ST: 'Norway',
    C: 'NO'
  };
}
