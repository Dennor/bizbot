import runner from './runner';
import {parse, getXML} from './utils';

async function run(ctx, args, server) {
  const {response} = server;
  const assertion = await parse(ctx, server, getXML(args));
  return response.json({
    assertion
  });
}

export default async ctx => {
  return await runner(ctx, run);
};
