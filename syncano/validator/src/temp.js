import Server from 'syncano-server';
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

async function getEndpointParameters(instance, endpoint) {
  let socket = endpoint.split('/')[0];
  console.log(
    `${instance.url(instance.instance.instanceName)}endpoints/sockts/${socket}/`
  );
  let socketData = await nodeFetch(
    `${instance.url(instance.instance.instanceName)}endpoints/sockets/${
      socket
    }/`
  )
    .then(parseJSON)
    .then(checkStatus);
  for (const endpointObj of socketData.objects) {
    if (endpointObj.name === endpoint) {
      return endpointObj.metadata.parameters;
    }
  }
  return {};
}

function buildRulesFromParameters(parameters) {
  let rules = {};
  for (const p in parameters) {
    if (!rules[p]) {
      rules[p] = [];
    }
    let rule = rules[p];
    let param = parameters[p];
    rule.push(param.type);
    if (parameters[p].requried) {
      rule.push('required');
    }
    if (param.constraints) {
      for (const constraint of param.constraints) {
        rules[p].push(constraint);
      }
    }
  }
  return rules;
}

export default ctx => {
  const {response} = Server(ctx);
  return response.json(ctx.meta);
};
