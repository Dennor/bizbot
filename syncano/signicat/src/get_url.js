import utils from './utils';
import runner from './runner';

async function run(ctx, args, server) {
  const {method = 'nbid', profile = 'DEMO', lang = 'en'} = args;
  return server.response.json({
    url: utils.buildURI(utils.getSignicatURI(ctx), {
      id: method + ':' + profile + ':' + lang,
      target: args.target
    })
  });
}

export default async ctx => {
  return runner(ctx, run);
};
