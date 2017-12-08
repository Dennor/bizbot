import runner from './runner';
import {validate, getXML} from './utils';

async function run(ctx, args, server) {
  const {response} = server;
  const xml = getXML(args);
  const {cert, idAttribute} = args;
  let status = utils.validate(xml, cert, {idAttribute}) ? 'success' : 'failure';
  return response.json({status});
}

export default async ctx => {
  return await runner(ctx, run);
};
