import {exec} from 'child_process'
const _ = require('underscore');

let xx = _.range(1,21);

function createNext(app) {
	let n = ('0'+app).slice(-2);
	let name = 'wp-checker-'+n;
	exec(`heroku create `+name, (...x)=>{
		console.log(...x);
	})
}

xx.forEach(createNext);


