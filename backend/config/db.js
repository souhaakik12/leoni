const sql = require("mssql");
const dbConfig = require("../config");

let poolPromise;

function getPool() {
    if (!poolPromise) {
        poolPromise = sql.connect(dbConfig);
    }
    return poolPromise;
}

module.exports = {
    sql,
    getPool,
};

