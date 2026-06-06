const express = require("express");
const CryptoJS = require("crypto-js");
const jwt = require("jsonwebtoken");
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
  origin: "*",
}));

app.use(bodyParser.text());

app.options('/api/history', cors()); // Enable preflight requests

app.get('/', (req, res) => {
  res.send('Bye World again 49!')
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});


app.get("/api/history2", async (req, res) => {
  const data = await getData('history');
  res.json(data);
});

app.get("/api/portfolio", async (req, res) => {
  const data = await getData('portfolio');
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



app.get("/api/users2", authenticateToken, async (req, res) => {
  const username = req.user.username; 
  const results = await getUserData(username);
  res.json(results);
});

app.get("/api/hasuser", async (req, res) => {
  const username = req.query.username;
  const password = req.query.password;
  const results = await hasUser(username, password);
  res.json(results)
});

app.put("/api/users2", async (req, res) => {
  try {
    let data = { ...req.body };
    const userPayload = data[0];

    const results = await addDataUsers2(userPayload);
    
    const tokenPayload = { ...userPayload };
    delete tokenPayload.password;

    const token = jwt.sign(tokenPayload, process.env.SQLSALT);

    res.json({
      success: true,
      results: results,
      token: token
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});


app.post("/api/users2", authenticateToken, async (req, res) => {
  let data = { ...req.body };
  const results = await updateUsers2(data[0])
  res.json(results);
})

app.post("/api/suggestions", async (req, res) => {
  let data = { ...req.body };
  const results = await addSuggestion(data[0])
  res.json(results);
})


console.log("Starting...");



function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  jwt.verify(token, process.env.SQLSALT, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token." });
    }
    
    req.user = user; 
    next();
  });
}

async function getData(table) {
  try {
    console.log("Reading rows from the Table...");
    const [rows] = await pool.query(`SELECT * FROM ${table}`);
    console.log(JSON.stringify(rows));
    return rows;
  } catch (err) {
    console.error(err.message);
    return "error: " + err.message;
  }
}

async function getUserData(username) {
  try {
    console.log("Reading rows from the Table...");
    let [rows] = await pool.query("SELECT * FROM users WHERE username = ? LIMIT 1", [username]);
    console.log(JSON.stringify(rows));
    delete rows[0].password;
    return rows[0];
  } catch (err) {
    console.error(err.message);
    return "error: " + err.message;
  }
}

async function hasUser(username, password) {
  try {
    console.log("Checking user authentication...");
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ? LIMIT 1", [username]);

    if (rows.length === 0) {
      return { user: false, password: false, token: null };
    }

    const bytes = CryptoJS.AES.decrypt(rows[0].password, process.env.SQLSALT);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    const isPasswordValid = originalText === password;

    if (!isPasswordValid) {
      return { user: true, password: false, token: null };
    }

    const userPayload = { ...rows[0] };
    delete userPayload.password; 

    const token = jwt.sign(
      userPayload, 
      process.env.SQLSALT
    );

    return {
      user: true,
      password: true,
      token: token,
      userData: userPayload
    };

  } catch (err) {
    console.error(err.message);
    return { error: err.message };
  }
}


async function addData(data, table) {
  try {
    console.log("data is " + JSON.stringify(data));
    const [rows] = await pool.query(`INSERT INTO ${table} (ipaddr, mode) VALUES ('${data.ipaddr}', '${data.mode}')`);
      return rows;
   
  } catch (err) {
    console.log(err);
    return "error: " + err.message;
  }
}

const userFields = [
  'username', 'password', 'data', 'c_day', 'c_day2', 'c_today', 'c_today2', 'c_week', 'cdate', 'cdate2',
  'cdate3', 'easy', 'medium', 'oll', 'pll', 'easy2', 'oll2', 'pbl2', 'm_easy', 'm_medium', 'audioon',
  'background', 'hollow', 'keyboard', 'speed', 'toppll', 'topwhite', 'm_34', 'm_4', 'c_day_bweek',
  'c_day2_bweek', 'border_width', 'blind2x2', 'blind3x3', 'marathon', 'marathon2', 'marathon3',
  'bandaged3', 'race2x2', 'race3x3', 'marathon4', 'marathon5', 'keymappings', 'swiperotate', 'marathonglow'
];

function buildUserValues(data) {
  return userFields.map(field => {
    if (field === 'password') {
      return CryptoJS.AES.encrypt(data.password, process.env.SQLSALT).toString();
    }
    return data[field];
  });
}

async function addDataUsers2(data) {
  try {
    console.log("data is " + JSON.stringify(data));
    const columns = userFields.join(', ');
    const placeholders = userFields.map(() => '?').join(', ');
    const sql = `INSERT INTO users (${columns}) VALUES (${placeholders})`;

    const values = buildUserValues(data);
    const [rows] = await pool.query(sql, values);
    
    return rows;
   
  } catch (err) {
    console.error(err); // Use console.error for errors
    return "error: " + err.message;
  }
}

async function addSuggestion(data) {
  try {
    console.log("data is " + JSON.stringify(data));
    const [rows] = await pool.query(`INSERT INTO suggestions (username, suggestion)  
      VALUES ('${data.username}', '${data.suggestion}')`);
      return rows;
   
  } catch (err) {
    console.log(err);
    return "error: " + err.message;
  }
}




async function updateUsers2(data) {
  try {
    const updateFields = userFields.slice(2); // skip username + password
    const assignments = updateFields.map(field => `${field}=?`).join(', ');
    const query = `UPDATE users SET ${assignments} WHERE username=?`;

    const values = buildUserValues(data);
    const updateValues = [...values.slice(2), values[0]];
    const [rows] = await pool.query(query, updateValues);
    return rows;
  } catch (err) {
    console.error(err);
    return "error: " + err.message;
  }
}


function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}