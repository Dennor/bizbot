import runner from './runner';

async function run(ctx, args, server) {
  const {response} = server;
  return response.json(args);
}

export default async ctx => {
  return await runner(ctx, run);
};
