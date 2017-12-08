function buildURI(base, args, options) {
  const {method = 'https'} = options ? options : {};
  let argString = '';
  for (const aName in args) {
    argString = argString + `${aName}=${encodeURIComponent(args[aName])}&`;
  }
  argString = argString.replace(/&$/, '');
  return `${method}://${base}?${argString}`;
}

function getSignicatURI(ctx) {
  return ctx.config.env + '.signicat.com/std/method/' + ctx.config.service;
}

export {buildURI, getSignicatURI};
