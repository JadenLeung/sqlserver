const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require("cors");
const bodyParser = require('body-parser');
const mysql = require('mysql2');

const PORT = process.env.PORT || 3002;
const app = express();
const saltRounds = 10;

const DEV = false;

const config2 = {
  host: DEV ? process.env.homeIP : "localhost",
  user: process.env.SQLUSERNAME2, 
  password: process.env.SQLPASSWORD2,
  database: 'mydb'
};

const pool = mysql.createPool(config2).promise();

app.use(express.json());
app.use(cors({ origin: "*" }));
app.use(bodyParser.text());

app.options('/api/history', cors()); 

app.get('/', (req, res) => {
  res.send('Bye World again 52!')
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  jwt.verify(token, process.env.JWTSALT, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token." });
    }
    req.user = user; 
    next();
  });
}

// --- Routes ---
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

app.post("/api/hasuser", async (req, res) => {
  const { username, password } = req.body;
  const results = await hasUser(username, password);
  res.json(results);
});

app.put("/api/users2", async (req, res) => {
  try {
    let data = { ...req.body };
    const userPayload = data[0];

    const results = await addDataUsers2(userPayload);
    
    const tokenPayload = { ...userPayload };
    delete tokenPayload.password;

    const token = jwt.sign(tokenPayload, process.env.JWTSALT);

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
  const results = await updateUsers2(data[0]);
  res.json(results);
});

app.post("/api/suggestions", async (req, res) => {
  let data = { ...req.body };
  const results = await addSuggestion(data[0]);
  res.json(results);
});

// --- DB Helpers ---
async function getData(table) {
  try {
    const allowedTables = ['history', 'portfolio'];
    if (!allowedTables.includes(table)) throw new Error("Invalid table selection");

    const [rows] = await pool.query(`SELECT * FROM ${table}`);
    return rows;
  } catch (err) {
    console.error(err.message);
    return "error: " + err.message;
  }
}

async function getUserData(username) {
  try {
    let [rows] = await pool.query("SELECT * FROM users WHERE username = ? LIMIT 1", [username]);
    if (rows[0]) delete rows[0].password;
    return rows[0];
  } catch (err) {
    console.error(err.message);
    return "error: " + err.message;
  }
}

async function hasUser(username, password) {
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ? LIMIT 1", [username]);

    if (rows.length === 0) {
      return { user: false, password: false, token: null };
    }

    const isPasswordValid = await bcrypt.compare(password, rows[0].password);
    if (!isPasswordValid) {
      return { user: true, password: false, token: null };
    }

    const userPayload = { ...rows[0] };
    delete userPayload.password; 

    const token = jwt.sign(userPayload, process.env.JWTSALT);

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
    const allowedTables = ['history', 'portfolio'];
    if (!allowedTables.includes(table)) throw new Error("Invalid table selection");

    // Secure parameterized query
    const [rows] = await pool.query(`INSERT INTO ${table} (ipaddr, mode) VALUES (?, ?)`, [data.ipaddr, data.mode]);
    return rows;
  } catch (err) {
    console.error(err);
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

async function buildUserValues(data) {
  const values = [];
  for (const field of userFields) {
    if (field === 'password') {
      if (data.password == null) {
        values.push(null);
      } else {
        const hashed = await bcrypt.hash(String(data.password), saltRounds);
        values.push(hashed);
      }
    } else {
      values.push(data[field] == null ? null : data[field]);
    }
  }
  return values;
}

async function addDataUsers2(data) {
  try {
    if (!data || data.password == null) {
      throw new Error('Password is required to create an account');
    }

    const columns = userFields.join(', ');
    const placeholders = userFields.map(() => '?').join(', ');
    const sql = `INSERT INTO users (${columns}) VALUES (${placeholders})`;

    const values = await buildUserValues(data);
    const [rows] = await pool.query(sql, values);
    return rows;
  } catch (err) {
    console.error(err);
    return "error: " + err.message;
  }
}

async function addSuggestion(data) {
  try {
    // Secure parameterized query
    const [rows] = await pool.query(`INSERT INTO suggestions (username, suggestion) VALUES (?, ?)`, [data.username, data.suggestion]);
    return rows;
  } catch (err) {
    console.error(err);
    return "error: " + err.message;
  }
}

async function updateUsers2(data) {
  try {
    const updateFields = userFields.slice(2); 
    const assignments = updateFields.map(field => `${field}=?`).join(', ');
    const query = `UPDATE users SET ${assignments} WHERE username=?`;

    const values = await buildUserValues(data);
    const updateValues = [...values.slice(2), values[0]];
    const [rows] = await pool.query(query, updateValues);
    return rows;
  } catch (err) {
    console.error(err);
    return "error: " + err.message;
  }
}

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});