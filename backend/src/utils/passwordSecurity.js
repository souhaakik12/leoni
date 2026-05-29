const bcrypt = require("bcryptjs");

const BCRYPT_ROUNDS = 10;

function isBcryptHash(value) {
    return typeof value === "string" && /^\$2[aby]\$/.test(value);
}

async function hashPassword(password) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyStoredPassword(plainPassword, storedPassword) {
    if (typeof plainPassword !== "string" || typeof storedPassword !== "string" || !storedPassword) {
        return {
            matches: false,
            shouldMigrate: false,
        };
    }

    if (isBcryptHash(storedPassword)) {
        return {
            matches: await bcrypt.compare(plainPassword, storedPassword),
            shouldMigrate: false,
        };
    }

    const matches = storedPassword === plainPassword;

    return {
        matches,
        shouldMigrate: matches,
    };
}

module.exports = {
    isBcryptHash,
    hashPassword,
    verifyStoredPassword,
};
