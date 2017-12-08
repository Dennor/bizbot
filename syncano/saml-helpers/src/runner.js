import Server from 'syncano-server';

class ValidationError extends Error {
  constructor(details) {
    super('validation error');
    this.details = details;
  }
}

async function validate(ctx, server) {
  return new Promise((resolve, reject) => {
    const {response, socket} = server;
    socket
      .post('validator/validate', {
        ...ctx
      })
      .then(resp => {
        if (resp.status < 200 || resp.status >= 300) {
          if (resp.status === 400) {
            reject(resp.data);
            return;
          }
          reject('validation error');
          return;
        }
        const {args, validationErrors} = resp;
        if (Object.keys(validationErrors).length !== 0) {
          reject(new ValidationError({validationErrors}));
          return;
        }
        resolve(args);
      });
  });
}

export default async (ctx, runner) => {
  const server = Server(ctx);
  const {response, logger} = server;
  const {debug} = logger(ctx.meta.executor);
  try {
    const validatedArgs = await validate(ctx, server);
    return await runner(ctx, validatedArgs, server);
  } catch (e) {
    if (e instanceof ValidationError) {
      return response.json({details: e.details}, 400);
    }
    debug(e.stack);
    return;
  }
};
