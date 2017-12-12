import runner from './runner';
import {validate, getXML} from './utils';

function run(ctx, args, server) {
  const {response} = server;
  const xml = getXML(args);
  const {cert, idAttribute} = args;
  let status = utils.validate(xml, cert, {idAttribute}) ? 'success' : 'failure';
  return Promise.resolve(response.json({status}));
}

let middleware = {
  parallel: ['validator/validate']
};

export default ctx => {
  return runner(ctx, run);
};
