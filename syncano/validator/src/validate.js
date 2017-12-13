import Server from 'syncano-server';
import validators from './validators';
import nodeFetch from 'node-fetch';

// CopyPasta from syncano-server/utils
export function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response.data;
  }

  let error;

  try {
    error = new Error(response.data.detail);
  } catch (err) {
    error = new Error(response.statusText);
  }

  error.response = response;
  error.data = response.data;
  error.status = response.status;
  error.headers = response.headers;
  error.size = response.size;
  error.timeout = response.timeout;
  error.url = response.url;

  throw error;
}

export function parseJSON(response) {
  const mimetype = response.headers.get('Content-Type');

  if (response.status === 204 || mimetype === null) {
    return Promise.resolve({
      data: undefined,
      ...response
    });
  }

  // Parse JSON
  if (/^.*\/.*\+json/.test(mimetype) || /^application\/json/.test(mimetype)) {
    return response.json().then(res => ({
      data: res,
      ...response
    }));
  }

  // Parse XML and plain text
  if (
    /^text\/.*/.test(mimetype) ||
    /^.*\/.*\+xml/.test(mimetype) ||
    mimetype === 'text/plain'
  ) {
    return response.text().then(res => ({
      data: res,
      ...response
    }));
  }

  return response.arrayBuffer();
}

const methods = {GET: {}, POST: {}, PUT: {}, DELETE: {}, PATCH: {}};
class Validator {
  constructor(rules, options) {
    this._validators = rules;
    const {required_args = []} = options ? options : {};
    for (const req of required_args) {
      if (!this._validators[req]) {
        this._validators[req] = [];
      }
      this._validators[req].push({rule: 'required'});
    }
  }

  validateArgs(args) {
    let promises = [];
    let validationArgs = {};
    for (const vlist in this._validators) {
      // We use * as a indicator of global rule for whole endpoint.
      let value;
      if (vlist !== '*') {
        validationArgs[vlist] = args[vlist];
        value = args[vlist];
      }
      for (let validator of this._validators[vlist]) {
        let vErr;
        vErr = validators[validator.rule](
          value,
          validator.arg,
          validator.options
        );
        if (vErr) {
          if (vErr instanceof Promise) {
            promises.push(
              vErr
                .then(
                  v => {
                    return {
                      key: vlist,
                      value: v
                    };
                  },
                  e => console.log(e)
                )
                .catch(e => console.log(e))
            );
          } else {
            promises.push(
              Promise.resolve({
                key: vlist,
                value: vErr
              })
            );
          }
        }
      }
    }
    return {
      validationErrors: Promise.all(promises),
      validationArgs
    };
  }
}

function getEndpointMeta(instance, endpoint) {
  let socket = endpoint.split('/')[0];
  return nodeFetch(
    `${instance.url(
      instance.instance.instanceName
    )}endpoints/sockets/${socket}/`
  )
    .then(parseJSON)
    .then(checkStatus)
    .then(
      socketData => {
        for (const endpointObj of socketData.objects) {
          if (endpointObj.name === endpoint) {
            return endpointObj.metadata;
          }
        }
        return {};
      },
      e => console.log(e)
    );
}

function parseConstraintsObject(constraints, method) {
  let rule = [];
  for (let constraint of constraints) {
    if (typeof constraint !== 'string') {
      let ruleName = Object.keys(constraint)[0];
      if (ruleName.toUpperCase() in methods) {
        if (method && ruleName.toUpperCase() === method.toUpperCase()) {
          rule.push(...parseConstraintsObject(constraint[ruleName]));
        }
        continue;
      }
      constraint = Object.assign({rule: ruleName}, constraint[ruleName]);
    }
    rule.push(constraint);
  }
  return rule;
}

function buildRulesFromParameters(meta, method) {
  let rules = {
    '*': []
  };
  let parameters = meta.parameters;
  if (meta.allowed_methods) {
    rules['*'].push({rule: 'allowed_methods', arg: meta.allowed_methods});
  }
  // If endpoint does not define public
  // in it's socket.yml, assume public as is default.
  // That's why we do exact compare with false
  if (meta.public === false) {
    rules['*'].push({rule: 'access', arg: 'private'});
  }
  // check if endpoint has
  // key equal to method, for example
  // endpoints:
  //  b:
  //    post:
  //      - access:
  //        arg: private
  // Useful for separate access rules between get and post.
  let methodConstraints = meta[method.toLowerCase()];
  if (methodConstraints) {
    rules['*'].push(...parseConstraintsObject(methodConstraints, method));
  }
  for (const p in parameters) {
    if (!rules[p]) {
      rules[p] = [];
    }
    let rule = rules[p];
    let param = parameters[p];
    rule.push(param.type);
    if (param.required) {
      rule.push('required');
    }
    if (param.constraints) {
      rule.push(...parseConstraintsObject(param.constraints, method));
    }
  }
  return rules;
}

export default ctx => {
  const server = Server(ctx);
  const {logger, response, socket} = server;
  try {
    const {debug} = logger('validator/validate');
    if (!ctx.meta.admin) {
      return response.json({message: 'Unauthorized'}, 401);
    }
    return prepareRules(ctx, server)
      .then(
        prep => {
          const validator = new Validator(prep.rules, {
            required_args: prep.required_args
          });
          return validateArgs(validator, ctx.args.args).then(r => {
            return response.json(r.result, r.status);
          });
        },
        e => {
          return response.json({message: 'bad rules'}, 400);
        }
      )
      .catch(e => {
        debug(e.stack);
        return response.json({message: 'bad rules'}, 400);
      });
  } catch (e) {
    console.log(e.stack);
    return Promise.resolve(
      response.json({message: 'internal server error'}, 500)
    );
  }
};

function getRules(ctx, server) {
  const {instance} = server;
  const {args, meta, options = {}} = ctx.args;
  const {validatorOpts = {}} = options;
  let {rules, required_args = []} = validatorOpts;
  delete validatorOpts['rules'];
  delete validatorOpts['required_args'];
  if (rules) {
    return Promise.resolve({rules, required_args});
  }
  return getEndpointMeta(instance, meta.executor).then(endpointMeta => {
    return {
      rules: buildRulesFromParameters(
        endpointMeta,
        meta.request.REQUEST_METHOD
      ),
      required_args,
      validatorOpts
    };
  });
}

function prepareRules(ctx, server) {
  return getRules(ctx, server).then(rulesObj => {
    // Append meta and server to rules options.
    let rules = rulesObj.rules;
    for (const r in rules) {
      if (rules[r]) {
        for (let i in rules[r]) {
          let v = rules[r][i];
          if (typeof v === 'string') {
            v = rules[r][i] = {
              rule: v
            };
          }
          if (!v.options) {
            v.options = {};
          }
          v.options.meta = ctx.args.meta;
          v.options.server = server;
          v.options = Object.assign(v.options, rulesObj.validatorOpts);
        }
      }
    }
    return rulesObj;
  });
}

function validateArgs(validator, args) {
  let {validationArgs, validationErrors} = validator.validateArgs(args);
  return validationErrors.then(
    values => {
      let validationErrors = {};
      for (const res of values) {
        if (!validationErrors[res.key]) {
          validationErrors[res.key] = [];
        }
        if (res.value.meta) {
          delete res.value.meta;
        }
        if (res.value.server) {
          delete res.value.server;
        }
        validationErrors[res.key].push(res.value);
      }
      let status = 200;
      if (Object.keys(validationErrors).length !== 0) {
        status = 400;
      }
      return {
        result: {args: validationArgs, validationErrors},
        status
      };
    },
    rej => {
      return {result: {}, status: 500};
    }
  );
}
