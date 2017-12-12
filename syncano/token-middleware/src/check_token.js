import runner from './runner';

function run(ctx, args, server) {
  const {response, data} = server;
  try {
    let key = ctx.args.args.apiToken
      ? ctx.args.args.apiToken
      : ctx.args.meta.request.HTTP_API_TOKEN;
    if (!key) {
      return Promise.resolve(response.json('', 403));
    }
    return data.tm_tokens
      .where('token', key)
      .firstOrFail()
      .then(token => {
        if (new Date(token.expire) < new Date()) {
          return response.json({message: 'token has expired'}, 403);
        }
        return response.json(Object.assign({args}, {args: {token}}), 200);
      });
  } catch (e) {
    return Promise.resolve(response.json('', 403));
  }
}

let middleware = {};

export default ctx => {
  return runner(ctx, run, middleware);
};
