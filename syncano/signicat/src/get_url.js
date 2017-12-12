import utils from './utils';
import runner from './runner';

function run(ctx, args, server) {
  const {method = 'nbid', profile = 'DEMO', lang = 'en'} = args;
  return Promise.resolve(
    server.response.json({
      url: utils.buildURI(utils.getSignicatURI(ctx), {
        id: method + ':' + profile + ':' + lang,
        target: args.target
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
