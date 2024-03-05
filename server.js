require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const http = require('http');
const cors = require('cors')
const session = require('cookie-session')

const crypto = require('crypto')

const port = process.env.PORT

const app = express();
const httpServer = http.createServer(app);
const { init } = require('./sockets/io')
init(httpServer)

const database = require('./configs/database')

mongoose.set('strictQuery', false)
mongoose.connect(database.url, database.config, (error) => {
	if (error) console.log("Error connect database", error)
	else console.log("Success connect database")
})

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(cors({
	credentials: true,
	origin: ['ducking.vn', 'localhost:8888'],
}))
app.use(morgan('combined'));
app.use(session({
	secret: crypto.randomBytes(48).toString('hex'),
	cookie: { maxAge: 60000 },
	resave: true,
	saveUninitialized: true
}));

require('./routes/index')(app);
require('./configs/admin')();

// routers(app)
// require('./routes/index')(app); // API route
// require('./config/admin')
require('./socket/messages.socket')(io)

httpServer.listen(port)



