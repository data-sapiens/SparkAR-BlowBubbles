const D = require('Diagnostics');
const Time = require('Time');

export const delay = (ms) => new Promise(resolve => Time.setTimeout(resolve, ms));