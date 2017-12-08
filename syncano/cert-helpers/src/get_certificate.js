import runner from './runner';

async function run(ctx, args, server) {
  const {response, data} = server;
  let q = [];
  for (const a in args) {
    q.push(a);
    q.push(args[a]);
  }
  let cert = await data.certificates.where(...q).firstOrFail();
  return response(cert.cert, 200, 'application/octet-stream', {});
}

export default async ctx => {
  return await runner(ctx, run);
};
