import Server from 'syncano-server';
import merge from 'lodash.merge';

function socketNoThrow(endpointName, s) {
  // TODO: Handling different mimetypes
  let errHandler = e => {
    let params = {};
    if (e.response) {
      params[endpointName] = e.response.data;
      params.status = e.response.status;
    } else {
      params[endpointName] = e;
      params.status = 500;
    }
    return params;
  };
  return s
    .then(
      resp => {
        let params = {};
        params[endpointName] = resp;
        params.status = 200;
        params.args = resp.args;
        delete resp.args;
        return params;
      },
      e => {
        return errHandler(e);
      }
    )
    .catch(e => {
      return errHandler(e);
    });
}

function mergeNewResult(res, newRes) {
  let status = res.status || 200;
  res = merge(res, newRes);
  if (res.status === 200 && status !== 200) {
    res.status = status;
  }
  return res;
}

function runSeries(ctx, server, series) {
  let midObj = series[0];
  series = series.slice(1);
  if (midObj) {
    return run(ctx, server, midObj).then(res => {
      let ret = res;
      return runSeries(ctx, server, series).then(resp => {
        ret = mergeNewResult(ret, resp);
        return ret;
      });
    });
  }
  return Promise.resolve({});
}

function runParallel(ctx, server, parallel) {
  if (parallel.length === 0) {
    return Promise.resolve({});
  }
  let promises = [];
  for (const p of parallel) {
    promises.push(run(ctx, server, p));
  }
  if (promises.length === 0) {
    return Promise.resolve({});
  } else {
    return Promise.all(promises)
      .then(
        values => {
          let ret = {};
          for (const v of values) {
            ret = mergeNewResult(ret, v);
          }
          return ret;
        },
        e => {
          return {status: 500};
        }
      )
      .catch(e => {
        return {status: 500};
      });
  }
}

function run(ctx, server, middlewareObject) {
  if (typeof middlewareObject === 'string') {
    return socketNoThrow(
      middlewareObject,
      server.socket.post(middlewareObject, {
        args: ctx.args.args,
        meta: ctx.args.meta,
        options: ctx.args.options
      })
    );
  } else if (middlewareObject.series || middlewareObject.parallel) {
    let midObj = middlewareObject.series || middlewareObject.parallel;
    let runArray = middlewareObject.series ? runSeries : runParallel;
    if (Array.isArray(midObj)) {
      return runArray(ctx, server, midObj);
    }
  }
  return Promise.resolve({});
}

export default ctx => {
  const server = Server(ctx);
  const {debug} = server.logger(ctx.meta.executor);
  if (!ctx.meta.admin) {
    return server.response.json({message: 'Forbidden'}, 403);
  }
  return run(ctx, server, ctx.args.middleware)
    .then(
      ret => {
        ret = merge({args: ctx.args.args}, ret);
        let status = ret.status || 200;
        delete ret['status'];
        return server.response.json(ret, status);
      },
      e => {
        debug(e.stack);
        return server.response.json({}, 500);
      }
    )
    .catch(e => {
      debug(e);
      return server.response.json(e, 500);
    });
};
