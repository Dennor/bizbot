import runner from './runner';
import utils from './utils';
import merge from 'lodash.merge';

function run(ctx, args, server) {
  const {method = 'nbid', profile = 'DEMO', lang = 'en', payload} = args;
  const {instanceName, spaceHost} = server.socket.instance;
  let targetUrl = `${instanceName}.${spaceHost}/${args.target}/`;
  let proxyParams = {
    idAttribute: args.idAttribute || 'ResponseID'
  };
  if (payload) {
    proxyParams = merge(proxyParams, payload);
  }
  targetUrl = utils.buildURI(targetUrl, proxyParams);
  return Promise.resolve(
    server.response.json({
      url: utils.buildURI(utils.getSignicatURI(ctx), {
        id: method + ':' + profile + ':' + lang,
        target: targetUrl
      })
    })
  );
}

let middleware = {
  parallel: ['validator/validate']
};

export default ctx => {
  return runner(ctx, run);
};
