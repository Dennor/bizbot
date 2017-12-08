import runner from './runner';
import {parse} from './utils';

async function run(ctx, args, server) {
  const {response} = server;
  let status = 'failure';
  const res = await parse(ctx, args, server);
  return response.json({
    assertion: res
  });
}

export default async ctx => {
  return await runner(ctx, run);
};
