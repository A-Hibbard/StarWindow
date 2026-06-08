const express = require('express');
const path = require('path');

const bodyParser= require ("body-parser");
require('dotenv').config()
require("./config/database");

const cors=require("cors");//cors is a cross origin resource sharing  alows to use back end with a different url from front-end


const app = express();

const corsOptions ={
  origin:'*', 
  credentials:true,            //access-control-allow-credentials:true
  optionSuccessStatus:200,
}




app.use(cors(corsOptions))
app.use(express.json());

// Configure both serve-favicon & static middleware
app.use(express.static(path.join(__dirname, "build")))//with this line of miidleware we are getting our react app to be served by the express miidleware



// Put API routes here, before the "catch all" route
app.use('/api/users', require("./routes/api/user"))

app.get("/", (req, res) => {
  res.send("API server is running");
});

//if the server withing the React app itself
// app.get("/{*splat}", (req, res) => {
//   res.sendFile(path.join(__dirname, "build", "index.html"));
// });

const PORT = process.env.PORT || 3001//if we don't have port in .env it is automaticaly running on 3001

app.listen(PORT, () => {
  console.log(`Express app is running on port: ${PORT}`)
})