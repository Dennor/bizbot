import runner from './runner';
import {validateAndParse} from './utils';

async function run(ctx, args, server) {
  const {response} = server;
  let status = 'failure';
  if ((await validateAndParse(ctx, args, server))[0]) {
    status = 'success';
  }
  return response.json({status});
}

export default async ctx => {
  return await runner(ctx, run);
};
