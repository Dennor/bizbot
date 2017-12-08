import runner from './runner';
import utils from './utils';

async function run(ctx, args, server) {
  const {response} = server;
  let status = 'failure';
  const res = await validateAndParse(ctx, args, server);
  if (res[0]) {
    status = 'success';
  }
  return response.json({
    status,
    assertion: res[1]
  });
}

export default async ctx => {
  return await runner(ctx, run);
};
