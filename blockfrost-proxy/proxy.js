const express = require('express');
const app = express();

const BLOCKFROST_API_KEY = 'preprod3FmQltcPTAbSPrSohDoMXkuNAm6uCmE3';

app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type,project_id,lucid');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use('/blockfrost/', async (req, res) => {
  const path = req.originalUrl.replace('/blockfrost/', '');
  const url = 'https://cardano-preprod.blockfrost.io/api/v0/' + path;
  console.log(`Inoltrando richiesta a: ${url}`);
  try {
    const response = await fetch(url, {
      headers: { project_id: BLOCKFROST_API_KEY }
    });
    const data = await response.text();
    console.log(`Risposta ricevuta: ${response.status}`);
    res.status(response.status).send(data);
  } catch (err) {
    console.error(`Errore proxy: ${err.message}`);
    res.status(500).json({ error: 'Proxy error: ' + err.message });
  }
});

app.listen(3001, () => console.log('Proxy listening on port 3001'));