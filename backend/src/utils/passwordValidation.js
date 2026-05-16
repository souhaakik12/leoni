const PASSWORD_VALIDATION_MESSAGE = "Le mot de passe doit contenir au moins 8 caracteres, une majuscule, une minuscule, un chiffre et un caractere special.";

function validatePassword(password) {
    const value = String(password ?? "");

    const isValid =
        value.length >= 8
        && /[A-Z]/.test(value)
        && /[a-z]/.test(value)
        && /\d/.test(value)
        && /[^A-Za-z0-9]/.test(value);

    return {
        isValid,
        message: isValid ? "" : PASSWORD_VALIDATION_MESSAGE,
    };
}

module.exports = {
    PASSWORD_VALIDATION_MESSAGE,
    validatePassword,
};
