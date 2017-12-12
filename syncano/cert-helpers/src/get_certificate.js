import runner from './runner';

function run(ctx, args, server) {
  const {response, data} = server;
  let q = [];
  for (const a in args) {
    q.push(a);
    q.push(args[a]);
  }
  return data.certificates
    .where(...q)
    .firstOrFail()
    .then(
      cert => {
        return response(cert.cert, 200, 'application/octet-stream', {});
      },
      e => {
        return response(e.message, 400, 'application/octet-stream', {});
      }
    );
}

let middleware = {
  parallel: ['validator/validate']
};

export default ctx => {
  return runner(ctx, run, middleware);
};
