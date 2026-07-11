const express = require('express');
const path = require('path');
const bodyParser= require ("body-parser");
const ensureLoggedIn = require("./config/ensureLoggedIn")

require('dotenv').config()
require("./config/database");

const cors=require("cors");//cors is a cross origin resource sharing  alows to use back end with a different url from front-end
// Auth is a JWT sent in the Authorization header (no cookies), so we don't need
// credentialed CORS. That matters: `credentials:true` together with `origin:'*'`
// makes browsers reject the response, and a wildcard is only valid when the
// request is NOT credentialed — which is our case. So: allow any origin, no creds.
const corsOptions ={
  origin:'*',
  optionsSuccessStatus:200,   // some legacy browsers choke on 204 for preflight
}

const app = express();

// app.use(bodyParser.json({ limit: '100mb', extended: true }))
// app.use(bodyParser.urlencoded({ limin: "10mb", extended: true}))
app.use(cors(corsOptions))
app.use(express.json());

// Configure both serve-favicon & static middleware
app.use(express.static(path.join(__dirname, "build")))//with this line of miidleware we are getting our react app to be served by the express miidleware
app.use(require('./config/checkToken'))

// Put API routes here, before the "catch all" route
app.use('/api/users', require("./routes/api/users"))
app.use('/api/event-types', require("./routes/api/eventTypes"))
app.use('/api/astronomy', require("./routes/api/astronomy"))
app.use('/api/launches', require("./routes/api/launches"))
app.use('/api/events', require("./routes/api/events"))
app.use('/api/user-events', require("./routes/api/userEvents"))
app.use('/api/iss', require("./routes/api/iss"))
app.use('/api/weather', require("./routes/api/weather"))
app.use('/api/score', require("./routes/api/score"))
app.use('/api/map', require("./routes/api/map"))
app.use('/api/news', require("./routes/api/news"))
// app.use('/api/astronomy',ensureLoggedIn, require("./routes/api/astronomy"))

app.get("/", (req, res) => {
  res.send("API server is running");
});

const PORT = process.env.PORT || 3001//if we don't have port in .env it is automaticaly running on 3001

const server = app.listen(PORT, () => {
  console.log(`Express app is running on port: ${PORT}`)
})

// Fail loudly (not silently) if the port is already taken — usually an orphaned
// `node server.js` from a previous run still holding it. Windows: find it with
//   Get-NetTCPConnection -LocalPort 3001 -State Listen
// then Stop-Process -Id <pid> -Force
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n[FATAL] Port ${PORT} is already in use — another process is ` +
      `holding it (could be an orphaned node, or a DIFFERENT project also using ` +
      `this port). Find it with:  Get-NetTCPConnection -LocalPort ${PORT} -State Listen\n`)
  } else {
    console.error("[FATAL] Server failed to start:", err)
  }
  process.exit(1)
})

// Close the listener on Ctrl+C / termination so the port is released promptly
// instead of lingering as a zombie that blocks the next start.
function shutdown(signal) {
  console.log(`\n${signal} received — shutting down and releasing port ${PORT}...`)
  server.close(() => process.exit(0))
  // Force-exit if connections don't drain in time.
  setTimeout(() => process.exit(0), 3000).unref()
}
process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))
