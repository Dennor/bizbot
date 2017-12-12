export default {
  buildURI: (base, args, options) => {
    const {method = 'https'} = options ? options : {};
    let argString = '';
    for (const aName in args) {
      if (args[aName]) {
        let arg = args[aName];
        if (typeof arg === 'object') {
          arg = JSON.stringify(arg);
        }
        argString = argString + `${aName}=${encodeURIComponent(arg)}&`;
      }
    }
    argString = argString.replace(/&$/, '');
    return `${method}://${base}?${argString}`;
  },

  getSignicatURI: ctx => {
    return ctx.config.env + '.signicat.com/std/method/' + ctx.config.service;
  },

  getSignicatCertCN: ctx => {
    if (ctx.config.env === 'preprod') {
      return 'test.signicat.com/std';
    }
    return 'id.signicat.com/std';
  }
};
