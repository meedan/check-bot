const express = require('express');
const serveStatic = require('serve-static');
const path = require('path');
const util = require('util');

const app = express();
const port = process.env.SERVER_PORT || 8585;
const functions = ['index', 'buttons', 'google-image-search', 'slash', 'slash-response'];

function generateCallback(response) {
  const callback = function(value, resp) {
    console.log('Callback: ' + util.inspect(value));
    if (resp) {
      response.send(resp);
    }
  };
  return callback;
}

app.use(express.json());

functions.forEach(function(name) {
  app.post('/' + name, function(request, response){
    const lambda = require('./' + name).handler;
    console.log(util.inspect(request.body));
    lambda(request.body, { source: 'local' }, generateCallback(response));
  });
});

console.log('Starting server on port ' + port);
app.listen(port);