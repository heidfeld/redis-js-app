const express = require('express')
const bodyParser = require('body-parser')

const app = express()

app.use(bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

var Redis = require('ioredis');
var redis = new Redis({
  port: 6379,          // Redis port
  host: '127.0.0.1',   // Redis host
  family: 4,           // 4 (IPv4) or 6 (IPv6)
  db: 3
})

app.get('/', function(req, res) {
	res.send(`
    <center><h2>
    Witaj w aplikacji Samochody !
    <br><br> Pod ścieżką /main znajduje się menu główne programu.
    <br><br> <h1><a href="/main">MENU</a></h1>
    </h2></center>`);
});

app.get('/cars', async function(req, res) {
	const carVals = await redis.hvals('samochody');
  const carKeys = await redis.hkeys('samochody');
  var html_content = '<h2>Wszystkie Samochody</h2><ul>';
  for (var i = 0 ; i < carKeys.length ; i++) {
    html_content += '<li>';
    html_content += await redis.get(`marki:${carVals[i]}:nazwa`);
    html_content += ' ';
    html_content += await redis.get(`samochody:${carKeys[i]}:nazwa`);
    html_content += '</li>';
  }
  html_content += '</ul>';
	res.send(html_content);
});

app.get('/main', function(req, res) {
	res.send(`
  <h2>Dodaj Markę</h2>
	<form method="GET" action="/addBrand">
    Marka:<br><input type="text" name="brand"><br>
    <input type="submit" value="Dodaj markę">
  </form>
  <br>
  <h2>Dodaj Samochód</h2>
  <form method="POST" action="/addCar">
    Model:<br><input type="text" name="model"><br>
    Id marki:<br><input type="text" name="brand"><br>
    Rok produkcji od:<br><input type="text" name="from"><br>
    Rok produkcji do:<br><input type="text" name="to"><br>
    <input type="submit" value="Dodaj samochód">
  </form><br>
  <h2>Wypisz wszystkie elementy</h2>
  <form method="GET" action="/getAll">
    Tabela:<br><input type="text" name="table"><br>
    Pole:<br><input type="text" name="field"><br>
    <input type="submit" value="Pokaż">
  </form><br><br>
  `)
});

app.get('/addBrand', async function(req, res) {
  var table = 'marki';
  var field = 'nazwa';
  var html_content = `<h2>Dodano markę: ${req.query.brand}</h2>`;
  await redis.set(`${table}:${await getNewIndex(table, field)}:${field}`, req.query.brand);
  html_content += `<br><br><h1><a href="/getAll?table=${table}&field=${field}">WSZYSTKIE MARKI</a></h1>`;
	res.send(html_content);
});

app.post('/addCar', async function(req, res) {
  var brandSize = await getNewIndex('marki', 'nazwa') - 1;
  if(req.body.brand < 1 || req.body.brand > brandSize) {
    res.send(`<h2>Niepoprawne id marki: ${req.body.brand}</h2>`);
  }
  var carId = await getNewIndex('samochody', 'nazwa');
  var html_content = `<h2>Dodano samochód: ${await redis.get(`marki:${req.body.brand}:nazwa`)} ${req.body.model}</h2>`;
  html_content += `<h2>Produkowany od: ${req.body.from} do: ${req.body.to}</h2>`;
  await redis.set(`samochody:${carId}:nazwa`, req.body.model);
  await redis.set(`samochody:${carId}:rok:od`, req.body.from);
  await redis.set(`samochody:${carId}:rok:do`, req.body.to);
  await redis.set(`samochody:${carId}:marka`, req.body.brand);
  await redis.hset(`samochody`, carId, req.body.brand);
  html_content += `<br><br><h1><a href="/cars">WSZYSTKIE SAMOCHODY</a></h1>`;
  res.send(html_content);
});

app.get('/getAll', async function(req, res) {
  var html_content = `<h2>Tabela: ${req.query.table}</h2>`;
  html_content += `<h2>Pole: ${req.query.field}</h2>`;
  html_content += `<h2>Rozmiar: ${await getNewIndex(req.query.table, req.query.field) - 1}</h2><ul>`;
  for (var i = 1 ; i < await getNewIndex(req.query.table, req.query.field) ; i++) {
    html_content += '<li>';
    html_content += await redis.get(`${req.query.table}:${i}:${req.query.field}`);
    html_content += '</li>';
  }
  html_content += '</ul>';
	res.send(html_content);
});

async function getNewIndex(tab, field) {
  var i = 0;
  do {
    i++;
    var element = await redis.get(`${tab}:${i}:${field}`);
  } while (element);
  return i;
}

app.listen(3000, () => console.log('Example app listening on port 3000!'))
