const express = require("express");
const CryptoJS = require("crypto-js");
const { exec } = require('child_process');
const fs = require('fs');
const PORT = process.env.PORT || 3002;
const app = express();
const bodyParser = require('body-parser');
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
  origin: 'http://localhost:5173'
}));

app.use(bodyParser.text());

app.options('/api/history', cors()); // Enable preflight requests

app.get('/', (req, res) => {
  res.send('Bye World again 33!')
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});


app.get("/api/history2", async (req, res) => {
  const data = await getData2('history', false);
  res.json(data);
});

app.get("/api/portfolio", async (req, res) => {
  const data = await getData2('portfolio', false);
  res.json(data);
});




app.post("/api/history2", async (req, res) => {
  let data = { ...req.body };
  const results = await addData(data[0], "history");
  res.json(results);
});

app.post("/api/portfolio", async (req, res) => {
  let data = { ...req.body };
  const results = await addData(data[0], "portfolio");
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


async function addData(data, table) {
  try {
    console.log("data is " + JSON.stringify(data));
    const [rows] = await pool.query(`INSERT INTO ${table} (ipaddr, mode, time) VALUES ('${data.ipaddr}', '${data.mode}', '${data.time}')`);
      return rows;
   
  } catch (err) {
    console.log(err);
    return "error: " + err.message;
  }
}

async function addDataUsers2(data) {
  try {
    console.log("Data being inserted:", JSON.stringify(data));

    const query = `
      INSERT INTO users 
      (username, password, data, c_day, c_day2, c_today, c_today2, c_week, cdate, cdate2, cdate3, 
      easy, medium, oll, pll, easy2, oll2, pbl2, m_easy, m_medium, audioon, background, hollow, keyboard, 
      speed, toppll, topwhite, m_34, m_4, c_day_bweek, c_day2_bweek, border_width)  
      VALUES (?, '${CryptoJS.AES.encrypt(data.password, process.env.SQLSALT)}', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.username, data.data, data.c_day, data.c_day2, data.c_today, data.c_today2, 
      data.c_week, data.cdate, data.cdate2, data.cdate3, data.easy, data.medium, data.oll, data.pll, 
      data.easy2, data.oll2, data.pbl2, data.m_easy, data.m_medium, data.audioon, data.background, 
      data.hollow, data.keyboard, data.speed, data.toppll, data.topwhite, data.m_34, data.m_4, 
      data.c_day_bweek, data.c_day2_bweek, data.border_width
    ];

    const [rows] = await pool.query(query, values);
    console.log("Insert result:", rows);
    return rows;
  } catch (err) {
    console.error("Error inserting data:", err.message);
    return "error: " + err.message;
  }
}



async function updateUsers2(data) {
  try {
    const query = `
      UPDATE users 
      SET data=?, c_day=?, c_day2=?, c_today=?, c_today2=?, c_week=?, cdate=?, cdate2=?, cdate3=?, 
      easy=?, medium=?, oll=?, pll=?, easy2=?, oll2=?, pbl2=?, m_easy=?, m_medium=?, 
      audioon=?, background=?, hollow=?, keyboard=?, speed=?, toppll=?, topwhite=?, 
      m_34=?, m_4=?, c_day_bweek=?, c_day2_bweek=?, border_width=? 
      WHERE username=?
    `;

    const values = [
      data.data, data.c_day, data.c_day2, data.c_today, data.c_today2, data.c_week, 
      data.cdate, data.cdate2, data.cdate3, data.easy, data.medium, data.oll, 
      data.pll, data.easy2, data.oll2, data.pbl2, data.m_easy, data.m_medium, 
      data.audioon, data.background, data.hollow, data.keyboard, data.speed, 
      data.toppll, data.topwhite, data.m_34, data.m_4, data.c_day_bweek, 
      data.c_day2_bweek, data.border_width, data.username
    ]; // make sure username is at the end

    const [rows] = await pool.query(query, values);
    return rows;
  } catch (err) {
    console.error(err);
    return "error: " + err.message;
  }
}


function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}