module.exports = {
    root: true,
    parserOptions: {
        ecmaVersion: 2017,
        ecmaFeatures: {
            experimentalObjectRestSpread: true,
            jsx: true,
        },
    },
    globals: {
        'document': true,
    },
    extends: [
        'tutellus',
    ],
    rules: {
        'no-confusing-arrow': ["error", {"allowParens": true}],
        'no-warning-comments': 'warn',
        //en una arrow function debe indicarse con paréntesis el body si puede llevar
        //a confusión: ` a => (a ? b : c)`
        'no-extra-parens': ['error', 'all', {
            enforceForArrowConditionals: false,
            nestedBinaryExpressions: false,
        }],
        'max-lines': 'warn',
    },
};
