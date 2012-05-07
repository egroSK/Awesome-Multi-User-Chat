/**
 * Awesome Multi User Chat
 *
 * Ukážková real-time webová aplikácia pre bakalársku prácu s témou real-time webové aplikácie.
 * Jedná sa o chat s jednou miestnosťou pre viacero užívateľov.
 * Medzi podporované funkcie patrí - posielanie verejných a privátnych správ, zmena nicku.
 * 
 * @author Matej Paulech <matej.paulech@gmail.com>
 */

// Závislosti (moduly)

var express = require('express');
var socket_io = require('socket.io');

// Vytvorenie serveru a obalenie so Socket.IO

var app = module.exports = express.createServer();
var io_server = socket_io.listen(app);

// Chat object - Užívatelia

var Users = require('./users');
var users = new Users();

// Nastavenia

app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.set('view options', { 'layout': false })
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.logger({ 'format': ':date :method :url' }));
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

// Routy

app.get('/', function (req, res) {
	res.render('index.ejs', { 'title': 'Awesome Multi User Chat' });
});

// Socket.IO

/**
 * Akcia (connection) volaná pri pripojení nového klienta (socketu).
 * @param {Object} socket Socket pripojeného klienta.
 */
io_server.sockets.on('connection', function (socket) {
	/******************************************************/
	/*                     CHAT STUFF                     */
	/******************************************************/

	/**
	 * Akcia join je vyvolaná klientom pri prihlasovaní do chatu.
	 * Overí vstupné údaje, vytvorí objekt s novým užívateľom
	 * informuje ostatných užívateľov a pošle klientovi počiatočné údaje.
	 * Predtým ešte overí, či už nemá užívateľ s daným socketom chat otvorený,
	 * ak áno zašle mu späť jeho id a nick.
	 * @param {Object.<string, string>} data Data obsahujú nick užívateľa.
	 * @param {function (?string, string=)} callback (err, data) Funkcia bude
	 *		 zavolaná po dokončení požiadavky alebo pri nastaní chyby.
	 */
	socket.on('join', function (data, callback) {
		// Overenie vstupných údajov
		if (!callback || typeof callback !== 'function') {
			return socket.emit('error', 'Nastala chyba pri pripájaní do chatu.');
		}

		// Overenie, či pripájaný užívateľ nemá už otvorený chat.
		socket.get('user_id', function (err, user_id) {
			var user = users.getUser(user_id);
			// Ak existuje užívateľ s ID priradeným k aktuálnemu socketu, pošle mu iba jeho staré údaje 
			if (user) {
				callback(null, {
					user_id: user['id'],
					user_nick: user['nick'],
					room_users: users.getIdNickPairs()
				});
			} else {
				if (!data || !data['user_nick']) {
					return callback('Zadaj prezývku.');
				}

				// Vytvorenie nového užívateľa
				users.createUser(data['user_nick'], socket, function (err, user) {
					if (err) {
						return callback('Zvolená prezývka je už v miestnosti obsadená, zvoľ si inú.');
					}
					
					// Informovanie ostatných užívateľov o novo pripojenom užívateľovi
					socket.broadcast.to('chat').emit('join_user', {
						'user_id': user['id'], 
						'user_nick': user['nick']
					});
					// Uloženie user_id užívateľa k socketu
					socket.set('user_id', user['id'], function (err, data) {
						if (err) {
							return callback('Nastala chyba pri pripájaní na chat (' + err + ')');
						}
						// Pripojenie užívateľa do kanálu, do ktorej budú posielané správy
						socket.join('chat');
						// poslanie počiatočných údajov užívateľovi
						callback(null, {
							user_id: user['id'],
							user_nick: user['nick'],
							room_users: users.getIdNickPairs()
						});
					})
				});
			}
		});
	});

	/**
	 * Akcia (public_message) vyvolaná pri poslaní verejnej správy klientom.
	 * Funkcia overí vstupné údaje a rozošle správu všetkým užívateľom.
	 * @param {Object.<string, string|number>} data Dáta prijaté od klienta 
	 * 		obsahujúce posielaná správu (text) a čas odoslania správy (timestamp).
	 */	
	socket.on('public_message', function (data) {
		// Overenie vstupných údajov
		if (!data || !data['text'] || data['text'].trim().length === 0) {
			return socket.emit('error', 'Musíš zadať text správy.');
		}
		if (!data['timestamp'] || !new Date(data['timestamp']))  {
			data['timestamp'] = Date.now();
		}

		// Získanie ID užívateľa
		socket.get('user_id', function (err, user_id) {
			if (err || !user_id) {
				return socket.emit('Nastala chyba pri posielaní správy');
			}

			// Poslanie správy všetkým užívateľom
			io_server.sockets.in('chat').emit('public_message', {
				'user_id': user_id,
				'timestamp': data['timestamp'],
				'text': data['text'].trim()
			});
		});
	});

	/**
	 * Akcia (private_message) je vyvolaná pri odoslaní súkromnej správy.
	 * Funkcia najprv skontroluje vstupné údaje a následne pošle súkromnú
	 * správu príjemcovi.
	 * @param {Object.<string, string|number>} data Dáta prijaté od klienta 
	 * 		obsahujúce posielaná správu (text), príjemcu (send_to) a čas odoslania 
	 *    		správy (timestamp).
	 * @param {function} callback Funkcia volaná pri úspešnom odoslaní správy.
	 */
	socket.on('private_message', function (data, callback) {
		// Overenie vstupných údajov
		if (!callback || typeof callback !== 'function') {
			return socket.emit('error', 'Nastala chyba pri doručovaní súkromnej správy.');
		}
		if (!data || !data['text'] || data['text'].trim().length === 0) {
			return socket.emit('error', 'Musíš zadať text správy.');
		}
		if (!data['send_to'] || !users.getUser(data['send_to'])) {
			return socket.emit('error', 'Zvolený príjemca privátnej správy sa nenachádza v miestnosti.');
		}
		if (!data['timestamp'] || !new Date(data['timestamp'])) {
			data['timestamp'] = Date.now();
		}

		socket.get('user_id', function (err, user_id) {
			var send_to_user = users.getUser(data['send_to']);
			if (err || !user_id || !send_to_user) {
				return socket.emit('error', 'Nastala chyba pri doručovaní súkromnej správy.');
			}

			// Informovanie odosielatela o úspešnom doručení
			callback();

			// Odoslanie správy na socket príjemcu
			send_to_user.socket.emit('private_message', {
				'user_id': user_id,
				'timestamp': data['timestamp'],
				'text': data['text']
			});
		});
	});

	/**
	 * Akcia (change_nick) vyvolaná klientom pri zmene nicku.
	 * Funkcia overí vstupné údaje, volnosť nicku, zmení nick a informuje
	 * ostatných užívateľov.
	 * @param {Object.<string, string|number>} data Dáta prijaté od klienta 
	 * 		obsahujúce nový nick (new_nick).
 	 * @param {function (?string)} callback (err) Funkcia volaná po dokončení
	 *		 požiadavky alebo pri nastaní chyby.
	 */
	socket.on('change_nick', function (data, callback) {
		// Overovanie vstupných dát
		if (!callback || typeof callback !== 'function') {
			return socket.emit('error', 'Nastala chyba pri zmene nicku.');
		}
		if (!data || !data['new_nick'] || data['new_nick'].trim().length === 0) {
			return callback('Zadaj nový nick.');
		}
		
		// Získanie ID užívateľa, overenie volnosti nicku, jeho zmena a informovanie o zmene
		socket.get('user_id', function (err, user_id) {
			var user = users.getUser(user_id);
			var new_nick = data['new_nick'].trim();

			if (err || !user) {
				return callback('Nastala chyba pri zmene nicku.');
			}

			if (users.isNickUsed(new_nick)) {
				return callback('Zadaná prezývka je už obsadená, zvoľ si inú.');
			}

			user.changeNick(new_nick);
			callback(null);

			socket.broadcast.to('chat').emit('change_nick', {
				'user_id': user_id,
				'new_nick': new_nick
			});
		});
	});

	/******************************************************/
	/*                  SOCKET DISCONNECT                 */
	/******************************************************/

	/**
	 * Akcia (disconnect) automaticky volaná pri odpojení klienta (socketu).
	 * Funkcia odobere užívateľa zo zoznamu užívateľov a informuje ostatných
	 * užívateľov o odpojení klienta.
	 */
	socket.on('disconnect', function () {
		socket.get('user_id', function (err, user_id) {
			if (!err || user_id || users.getUser(user_id)) {
				users.removeUser(user_id);
				socket.leave('chat');
			
				socket.broadcast.to('chat').emit('part_user', {
					'user_id': user_id
				});
			}
		});
	});
});

// Listen

app.listen(3000, function(){
	console.log("Express server is listening on: " + app.address().address + ":" + app.address().port);
});
