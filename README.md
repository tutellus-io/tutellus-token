# Tutellus ICO Smart Contracts

In this project are the smart contracts to be deployed on the blockchain mainnet of ethereum.

- `TutellusCrowdsale` Massive use contract, which conforms the ICO conditions of Tutellus.io

## Run the test

Copy `truffle.sample.js` to `truffle.js` and modify as needed to configure truffle.

Include `node_modules/.bin` in PATH to avoid the global installation of the packages: `npm install -g`. 

```sh
export PATH=node_modules/.bin:$PATH
```

Before starting, as usual, you must install the dependencies

```sh
npm install 
```

You will need two shells to run the test. In one of the shells we execute the blockchain test node `testrpc` :

```sh
scripts/test_node.sh
````

In the second shell we execute the test suite with a especific network without deploying de contracts

```sh
truffle test --network test
```
