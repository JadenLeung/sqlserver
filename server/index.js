const express = require("express");
const CryptoJS = require("crypto-js");
const PORT = process.env.PORT || 3002;
const app = express();
const cors = require("cors");
//const sql = require('mssql');
const mysql = require('mysql2');


const config = {
    user: process.env.SQLUSERNAME, 
    password: process.env.SQLPASSWORD,
    server: 'imisschloedemo.database.windows.net',
    port: 1433,
    database: 'free',
    authentication: {
        type: 'default'
    },
    options: {
        encrypt: true
    }
}

const config2 = {
  host: process.env.homeIP,
  user: process.env.SQLUSERNAME2, 
  password: process.env.SQLPASSWORD2,
  database: 'mydb'
};

const pool = mysql.createPool(config2).promise();

app.use(express.json());

app.use(cors({
  origin: 'http://localhost:8000'
}));

app.options('/api/history', cors()); // Enable preflight requests

app.get('/', (req, res) => {
  res.send('Bye World again 27!')
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});


app.get("/api/history2", async (req, res) => {
  const data = await getData2('history', false);
  res.json(data);
});


app.post("/api/history2", async (req, res) => {
  let data = { ...req.body };
  const results = await addDataHistory2(data[0]);
  res.json(results);
});



app.get("/api/users2", async (req, res) => {
  let data = [false];
  if (req.query.username != undefined) {
    console.log("Not undefined");
    const username = req.query.username;
    const password = req.query.password;
    data = {username: username, password: password}
  }
  console.log("Data is " + data);
  const results = await getData2('users', data)
  res.json(results)
});

app.put("/api/users2", async (req, res) => {
  let data = { ...req.body };
  const results = await addDataUsers2(data[0]);
  res.json(results)
});


app.post("/api/users2", async (req, res) => {
  let data = { ...req.body };
  const results = await updateUsers2(data[0])
  res.json(results);
})


console.log("Starting...");





async function getData2(table, data) {
  try {
    console.log("Reading rows from the Table...");
    const [rows] = await pool.query(`SELECT * FROM ${table}`);
    console.log(JSON.stringify(rows));
    console.log("Data is " + data);

    if (data == false || data == "false") {
      console.log("her");
      return rows;
    }

    const username = data.username;
    const password = data.password;
    let success = false;

    console.log("rows is " + rows);

    rows.forEach((obj) => {
      const bytes = CryptoJS.AES.decrypt(obj.password, process.env.SQLSALT);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      console.log(originalText);
      if (obj.username === username && originalText === password) {
        success = true;
      }
    });

    return success;
  } catch (err) {
    console.error(err.message);
    return "error: " + err.message;
  }
}


async function addDataHistory2(data) {
  try {
    console.log("data is " + JSON.stringify(data));
    const [rows] = await pool.query(`INSERT INTO history (ipaddr, mode, time) VALUES ('${data.ipaddr}', '${data.mode}', '${data.time}')`);
      return rows;
   
  } catch (err) {
    console.log(err);
    return "error: " + err.message;
  }
}

async function addDataUsers2(data) {
  try {
    console.log("data is " + JSON.stringify(data));
    const [rows] = await pool.query(`INSERT INTO users (username, password, data, easy, medium, oll, pll, easy2, oll2, pbl2, m_easy, m_medium, audioon, background,
      hollow, keyboard, speed, toppll, topwhite)  
      VALUES ('${data.username}', '${CryptoJS.AES.encrypt(data.password, process.env.SQLSALT)}', '${data.data}', '${data.easy}', '${data.medium}', 
      '${data.oll}', '${data.pll}', '${data.easy2}', '${data.oll2}', '${data.pbl2}', '${data.m_easy}', 
      '${data.m_medium}', '${data.audioon}', '${data.background}', '${data.hollow}', '${data.keyboard}', 
      '${data.speed}', '${data.toppll}', '${data.topwhite}')`);
      return rows;
   
  } catch (err) {
    console.log(err);
    return "error: " + err.message;
  }
}


async function updateUsers2(data) {
  try {
    console.log("data is " + JSON.stringify(data));
    const [rows] = await pool .query(`UPDATE users 
      SET data='${data.data}', easy='${data.easy}', medium='${data.medium}', 
      oll='${data.oll}', pll='${data.pll}', easy2='${data.easy2}', oll2='${data.oll2}', pbl2='${data.pbl2}', m_easy='${data.m_easy}', 
      m_medium='${data.m_medium}', audioon='${data.audioon}', background='${data.background}', hollow='${data.hollow}', keyboard='${data.keyboard}', 
      speed='${data.speed}', toppll='${data.toppll}', topwhite='${data.topwhite}'
      WHERE username = '${data.username}'`);
      return rows;
   
  } catch (err) {
    console.log(err);
    return "error: " + err.message;
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}