import utils from './utils';
import runner from './runner';

async function run(ctx, args, server) {
  const {method = 'nbid', profile = 'DEMO', lang = 'en', payload} = args;
  const {instanceName, spaceHost} = server.socket.instance;
  let targetUrl = `https://${instanceName}.${spaceHost}/signicat/validate/`;
  let proxyParams = {
    target: args.target
  };
  if (payload) {
    proxyParams[payload] = payload;
  }
  targetUrl = utils.buildURI(targetUrl, proxyParams);
  return server.response.json({
    url: utils.buildURI(utils.getSignicatURI(), {
      id: method + ':' + profile + ':' + lang,
      target: targetUrl
    })
  });
}

export default async ctx => {
  return await runner(ctx, run);
};
