const {Client} = require('pg');
const { app } = require('.');

const client = new Client({
    host: 'localhost',
    user: 'postgres',
    port: 5432,
    password: 'Eminence.17', //use rootuser if emin no work
    database: 'postgres'
})

client.connect().then(()=> console.log("connected"))
module.exports = client;

