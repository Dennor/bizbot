import runner from './runner';
import utils from './utils';

function run(ctx, args, server) {
  const xml = utils.getXML(args);
  const {cert, idAttribute} = args;
  const {error} = server.logger(ctx.meta.executor);
  let status = 'failure';
  let assertion = {};
  if (utils.validate(xml, cert, {idAttribute: args.idAttribute})) {
    status = 'success';
    return utils.parse(ctx, server, xml).then(assertion => {
      return server.response.json({status, assertion});
    });
  }
  return Promise.resolve(server.response.json({status, assertion}));
}

let middleware = {
  parallel: ['validator/validate']
};

export default ctx => {
  return runner(ctx, run, middleware);
};
