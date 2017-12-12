import runner from './runner';
import {parse, getXML} from './utils';

function run(ctx, args, server) {
  const {response} = server;
  return parse(ctx, server, getXML(args)).then(assertion => {
    return response.json({
      assertion
    });
  });
}

let middleware = {
  parallel: ['validator/validate']
};

export default ctx => {
  return runner(ctx, run);
};
