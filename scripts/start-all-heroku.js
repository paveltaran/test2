import {exec} from 'child_process'
let apps = `
wp-checker-01
`.trim().split('\n');

function scaleNext(app) {
	exec("heroku ps:scale web=0 worker=1 -a "+app,(...a)=>{
		console.log(...a);
	});
}
apps.forEach(scaleNext);