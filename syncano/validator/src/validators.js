import validators from 'common-validators';
import JSONPath from 'jsonpath-plus';

validators.allowed_methods = (value, arg, opts) => {
  if (arg.length !== 0 && (!opts || !opts.meta)) {
    return {
      error: 'allowed_methods',
      message: 'missing method'
    };
  }
  for (const meth of arg) {
    if (meth.toUpperCase() === opts.meta.request.REQUEST_METHOD.toUpperCase()) {
      return;
    }
  }
  return {
    error: 'allowed_methods',
    message: `${opts.meta.request.REQUEST_METHOD} is not allowed`
  };
};

validators.access = (value, arg, opts) => {
  if (arg !== 'private') {
    return;
  }
  if (!opts || !opts.meta) {
    return {
      error: 'access',
      message: 'missing privilages'
    };
  }
  if (opts.meta.admin) {
    return;
  }
  return {
    error: 'access',
    message: 'this endpoint is private'
  };
};

let oldCustom = validators.custom;
validators.custom = (value, arg, opts) => {
  let newOpts = Object.assign({}, opts);
  delete newOpts['server'];
  return opts.server.socket
    .post(arg, {
      value: value,
      options: newOpts
    })
    .then(msg => {
      if (msg) {
        return {
          error: arg,
          message: msg
        };
        return;
      }
    });
};
validators.datetime = validators.date;

validators.jsonpath = (value, arg, opts) => {
  return JSONPath({json: value, path: arg.path}).length === 0
    ? 'jsonpath does not exist'
    : undefined;
};

export default validators;
