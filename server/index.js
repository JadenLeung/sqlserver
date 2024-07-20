const express = require("express");
const CryptoJS = require("crypto-js");
const PORT = process.env.PORT || 3001;
const app = express();
const cors = require("cors");
const sql = require('mssql');

const config = {
    user: process.env.SQLUSERNAME, 
    password: process.env.SQLPASSWORD,
    server: 'imisschloedemo.database.windows.net',
    port: 1433,
    database: 'elephant',
    authentication: {
        type: 'default'
    },
    options: {
        encrypt: true
    }
}

app.use(express.json());

app.use(cors({
  origin: 'http://localhost:8000'
}));

app.options('/api/history', cors()); // Enable preflight requests

app.get('/', (req, res) => {
  res.send('Bye World again 21!')
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

app.get("/api/history", async (req, res) => {
  getData('dbo.history', false).then((data) => {
    res.json(data);
  })
});

app.post("/api/history", async (request, response) => {
  let data = { ...request.body };
  addDataHistory(data[0]).then(data => {
    response.status(201).json(data);
  })
})

app.get("/api/users", async (req, res) => {
  let data = [false];
  if (req.query.username != undefined) {
    console.log("Not undefined");
    const username = req.query.username;
    const password = req.query.password;
    data = {username: username, password: password}
  }
  console.log("Data is " + data);
  getData('dbo.users', data).then((data) => {
    res.json(data);
  })
});

app.put("/api/users", async (request, response) => {
  let data = { ...request.body };
  addDataUsers(data[0]).then(data => {
    response.status(201).json(data);
  })
})

app.post("/api/users", async (request, response) => {
  let data = { ...request.body };
  updateUsers(data[0]).then(data => {
    response.status(201).json(data);
  })
})


console.log("Starting...");


async function getData(table, data) {
  try {
    var poolConnection = await sql.connect(config);
    console.log("Reading rows from the Table...");
    const resultSet = await poolConnection.request().query('SELECT * FROM ' + table);
    console.log(JSON.stringify(resultSet));
    console.log("Data is "+ data);
    if (data == false || data == 'false')  {
      return resultSet;
    }
    const returned = resultSet.recordsets[0];
    const username = data.username;
    const password = data.password;
    //return returned;
    let success = false;
    

    returned.forEach((obj) => {
      const bytes = CryptoJS.AES.decrypt(obj.password, process.env.SQLSALT);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      console.log(originalText);
      if (obj.username == username && originalText == password) {
        success = true;
      }
    })
    return success;
  } catch (err) {
    console.error(err.message)
  }
}

async function addDataHistory(data) {
  try {
    console.log("data is " + JSON.stringify(data));
    let pool = await sql.connect(config);
    let insertProduct = await pool.request()
    .query(`INSERT INTO dbo.history (ipaddr, mode, time) VALUES ('${data.ipaddr}', '${data.mode}', '${data.time}')`);
    return insertProduct.recordsets;
  }
  catch (err) {
    console.log(err);
  }
}

async function addDataUsers(data) {
  try {
    console.log("data is " + JSON.stringify(data));
    let pool = await sql.connect(config);
    let insertProduct = await pool.request()
    .query(`INSERT INTO dbo.users (username, password, data, easy, medium, oll, pll, easy2, oll2, pbl2, m_easy, m_medium, audioon, background,
      hollow, keyboard, speed, toppll, topwhite)  
      VALUES ('${data.username}', '${CryptoJS.AES.encrypt(data.password, process.env.SQLSALT)}', '${data.data}', '${data.easy}', '${data.medium}', 
      '${data.oll}', '${data.pll}', '${data.easy2}', '${data.oll2}', '${data.pbl2}', '${data.m_easy}', 
      '${data.m_medium}', '${data.audioon}', '${data.background}', '${data.hollow}', '${data.keyboard}', 
      '${data.speed}', '${data.toppll}', '${data.topwhite}')`);
    return insertProduct.recordsets;
  }
  catch (err) {
    console.log(err);
  }
}

async function updateUsers(data) {
  try {
    console.log("data is " + JSON.stringify(data));
    let pool = await sql.connect(config);
    let insertProduct = await pool.request()
    .query(`UPDATE dbo.users 
      SET data='${data.data}', easy='${data.easy}', medium='${data.medium}', 
      oll='${data.oll}', pll='${data.pll}', easy2='${data.easy2}', oll2='${data.oll2}', pbl2='${data.pbl2}', m_easy='${data.m_easy}', 
      m_medium='${data.m_medium}', audioon='${data.audioon}', background='${data.background}', hollow='${data.hollow}', keyboard='${data.keyboard}', 
      speed='${data.speed}', toppll='${data.toppll}', topwhite='${data.topwhite}'
      WHERE username = '${data.username}'`);
    return insertProduct.recordsets;
  }
  catch (err) {
    console.log(err);
  }
}