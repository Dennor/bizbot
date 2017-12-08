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

  async validateArgs(args) {
    let validationErrors = {};
    let promises = [];
    let validatedArgs = {};
    for (const vlist in this._validators) {
      // We use * as a indicator of global rule for whole endpoint.
      let value;
      if (vlist !== '*') {
        validatedArgs[vlist] = args[vlist];
        value = args[vlist];
      }
      validationLoop: for (let validator of this._validators[vlist]) {
        let vErr;
        vErr = validators[validator.rule](
          value,
          validator.arg,
          validator.options
        );
        if (vErr) {
          promises.push(
            new Promise(resolve => {
              let params = {
                key: vlist,
                value: vErr
              };
              if (!(vErr instanceof Promise)) {
                return resolve(params);
              }
              params.value.then(v => {
                params.value = v;
                resolve(params);
              });
            })
          );
        }
      }
    }
    for (const res of await Promise.all(promises)) {
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
    return {
      args: validatedArgs,
      validationErrors
    };
  }
}

async function getEndpointMeta(instance, endpoint) {
  let socket = endpoint.split('/')[0];
  let socketData = await nodeFetch(
    `${instance.url(instance.instance.instanceName)}endpoints/sockets/${
      socket
    }/`
  )
    .then(parseJSON)
    .then(checkStatus);
  for (const endpointObj of socketData.objects) {
    if (endpointObj.name === endpoint) {
      return endpointObj.metadata;
    }
  }
  return {};
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
      for (let constraint of param.constraints) {
        rule.push(...parseConstraintsObject(param.constraints, method));
      }
    }
  }
  return rules;
}

export default async ctx => {
  const server = Server(ctx);
  const {instance, logger, response, socket} = server;
  const {debug} = logger('validator/validate');
  try {
    if (!ctx.meta.admin) {
      return response.json({message: 'Unauthorized'}, 401);
    }
    const {args, meta, required_args = []} = ctx.args;
    let {rules} = ctx.args;
    if (!rules) {
      rules = buildRulesFromParameters(
        await getEndpointMeta(instance, meta.executor),
        meta.request.REQUEST_METHOD
      );
    }

    // Append meta and server to rules options.
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
          v.options.meta = meta;
          v.options.server = server;
        }
      }
    }
    const validator = new Validator(rules, {required_args});
    return response.json(await validator.validateArgs(args));
  } catch (e) {
    debug(e.stack);
    return response.json({message: 'bad rules'}, 400);
  }
};
