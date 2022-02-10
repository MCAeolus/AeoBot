import { createRequire } from "module"; // Bring in the ability to create the 'require' method
const require = createRequire(import.meta.url); // construct the require method
const config = require("./conf.json");

const prefix = config.prefix;
const debugMode = false;

export function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function pinging(user) {
    if (user == null) return '<null>';
	return "<@" + user.id + ">"
}

export function log(prop, val, inf, clazz) {
	if(debugMode) console.log((typeof clazz !== 'undefined' ? clazz.constructor.name : "") + "#" + prop + " " + inf + "=" + val)
}

export function makeCommandString(cmd) {
	return prefix + cmd.alias[0]
}