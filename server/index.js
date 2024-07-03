const express = require("express");
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
  res.send('Bye World again 12!')
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

app.get("/api/history", async (req, res) => {
  getData().then((data) => {
    res.json(data);
  })
});

app.post("/api/history", async (request, response) => {
  console.log("req  body " + request.body);
  let order = { ...request.body };
  addData(order[0]).then(data  => {
    response.status(201).json(data);
  })
})


console.log("Starting...");


async function getData() {
  try {
    var poolConnection = await sql.connect(config);
    console.log("Reading rows from the Table...");
    const resultSet = await poolConnection.request().query('SELECT * FROM dbo.history');
    console.log(JSON.stringify(resultSet));
    return resultSet;
  } catch (err) {
    console.error(err.message)
    console.log("Reattempting");
    getData();
  }
}

async function addData(data) {
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