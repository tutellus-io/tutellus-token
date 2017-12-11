module.exports = {
    globals: {
        'web3': true,
        'describe': true,
        'before': true,
        'beforeEach': true,
        'it': true,
        'should': true,
        'assert': true,
        'contract': true,
        'artifacts': true,
    },
    rules : {
        'max-nested-callbacks': ['error', 5],
    }
}