import runner from './runner';
import utils from './utils';

async function run(ctx, args, server) {
  const {method = 'nbid', profile = 'DEMO', lang = 'en', payload} = args;
  const {instanceName, spaceHost} = server.socket.instance;
  let targetUrl = `${instanceName}.${spaceHost}/signicat/validate/`;
  let proxyParams = {
    target: args.target,
    idAttribute: args.idAttribute || 'ResponseID'
  };
  if (payload) {
    proxyParams.payload = JSON.stringify(payload);
  }
  targetUrl = utils.buildURI(targetUrl, proxyParams);
  return server.response.json({
    url: utils.buildURI(utils.getSignicatURI(ctx), {
      id: method + ':' + profile + ':' + lang,
      target: targetUrl
    })
  });
}

export default async ctx => {
  return runner(ctx, run);
};
