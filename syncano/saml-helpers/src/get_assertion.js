import runner from './runner';
import utils from './utils';

async function run(ctx, args, server) {
  const xml = utils.getXML(args);
  const {cert, idAttribute} = args;
  const {error} = server.logger(ctx.meta.executor);
  let status = 'failure';
  let assertion = {};
  if (utils.validate(xml, cert, {idAttribute: args.idAttribute})) {
    status = 'success';
    assertion = await utils.parse(ctx, server, xml);
  }
  return server.response.json({status, assertion});
}

export default async ctx => {
  return await runner(ctx, run);
};
