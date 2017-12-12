import Server from 'syncano-server';

class MiddlewareError extends Error {
  constructor(details) {
    super('middleware error');
    this.details = details;
  }
}

function runMiddleware(ctx, server, runner, middleware, options) {
  const {response, socket} = server;
  if (Object.keys(middleware).length === 0) {
    return execRunner(ctx, runner, ctx.args, server).then(resp => {
      return resp;
    });
  }
  return socket
    .post('middleware-socket/execute', {
      args: ctx.args,
      meta: ctx.meta,
      middleware,
      options
    })
    .then(
      resp => {
        const {args, middlewareResult} = resp;
        return execRunner(ctx, runner, args, server).then(resp => {
          return resp;
        });
      },
      e => {
        let errHandler = e => {
          if (e.response) {
            return response.json(e.response.data, e.response.status);
          } else {
            return response.json({e}, 500);
          }
        };
        return errHandler(e);
      }
    );
}

function execRunner(ctx, runner, args, server) {
  return runner(ctx, args, server).then(resp => {
    return resp;
  });
}

export default (ctx, runner, middleware, options) => {
  const server = Server(ctx);
  const {response, logger} = server;
  const {debug} = logger(ctx.meta.executor);
  middleware = middleware || {};
  options = options || {};
  return runMiddleware(ctx, server, runner, middleware, options).then(resp => {
    return resp;
  });
};
