const express = require('express');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
var dotenv = require('dotenv');
dotenv.load();

const bodyParser = require('body-parser');
const cors = require('cors');
const isDev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 5000;
const weatherEndpoints = require('./endpoints/weatherEndPoints');

// Multi-process to utilize all CPU cores.
if (!isDev && cluster.isMaster) {
  console.error(`Node cluster master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.error(`Node cluster worker ${worker.process.pid} exited: code ${code}, signal ${signal}`);
  });

} else {
  const server = express();
  server.use(bodyParser.json());
  server.use(morgan('common'));
   server.use(helmet());  
  // Priority serve any static files.
  server.use(express.static(path.resolve(__dirname, '../react-ui/build')));
  server.use(
    cors({
      credentials: true,
      origin: [process.env.CLIENT_URL],
      allowedHeaders: ['Content-Type', 'Authorization']
      
    })
  );
  server.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  })
  // server.use(function(req, res, next) {
  //   res.header('Access-Control-Allow-Origin', '*');
  //   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  //   next();
  // });
  
  server.use('/api/weather', weatherEndpoints);
  // Answer API requests.
  server.get('/api', function (req, res) {
    res.set('Content-Type', 'application/json');
    res.send('{"message":"Hello from the custom server!"}');
  });

  // All remaining requests return the React app, so it can handle routing.
  server.get('*', function(request, response) {
    response.sendFile(path.resolve(__dirname, '../react-ui/build', 'index.html'));
  });

  server.listen(PORT, function () {
    console.error(`Node ${isDev ? 'dev server' : 'cluster worker '+process.pid}: listening on port ${PORT}`);
  });
}
