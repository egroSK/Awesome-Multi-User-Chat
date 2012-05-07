/**
 * Awesome Multi User Chat - chat
 * @author Matej Paulech <matej.paulech@gmail.com>
 */

/** @type {Utils.Colorgen} Objekt pre získavanie farieb zo zoznamu */
var colorgen = new Utils.Colorgen();

/**
 * Trieda s chatom uchovávajúca potrebné dáta a obsluhujúca akcie súvisiace s chatom.
 * @constructor
 * @param {string} user_id ID aktuálneho užívateľa
 * @param {string} user_nick Nick aktuálneho užívateľa
 * @param {Array.<Array.<string>>} users Zoznam užívateľov v tvare [[user_id][user_nick]]
 * @param {!Object} socket Socket.IO socket užívateľa
 */
var Chat = function (user_id, user_nick, users, socket) {
	this.user_id = user_id;
	this.nick = user_nick;
	this.users = {};
	this.socket = socket;

	// Prehodí zoznam užívateľov z prijatého poľa do objektu a priradí farbu užívateľovi
	(users || []).forEach(function (user) {
		this.users[user[0]] = {
			nick: user[1],
			color: (user[0] === this.user_id) ? 'green' : colorgen.getColor()
		};
	}, this);

	this._refreshUsers();
	this._writeWelcomeMessage();
	this._setCurrentNickToInput();
};

/**
 * Funkcia pre získanie nicku užívateľa chatu.
 * @return {string} Aktuálny nick užívateľa.
 */
Chat.prototype.getNick = function () {
	return this.nick;
}

/**
 * Funkcia pre výpis servisnej správy.
 * @param {string} message Text vypisovanej správy
 */
Chat.prototype.writeServiceMessage = function (message) {
	this._writeServiceMessage(message);
}

/******************************************************/
/*        ODCHÁDZAJÚCE AKCIE (VOLANIE SERVERU)        */
/******************************************************/

/**
 * Funkcia slúžiaca pre zmenu nicku a vyvolanie akcie prezmenu nicku (change_nick)
 * na servery. V prípade ak už je nick obsadený, bude o tom užívateľ informovaný.
 * @param {string} new_nick Nový nick užívateľa
 * @param {function(?string)} callback Funkcia volaná po zmene nicku, ak pri zmene
 *		došlo k chybe, bude zavolaná s prvým parametrom (err) obsahujúcim popis chyby.
 */
Chat.prototype.changeNick = function (new_nick, callback) {
	var that = this;
	this.socket.emit('change_nick', { 'new_nick': new_nick}, function (err) {
		if (err) {
			return callback(err);
		}
		that.nick = new_nick;
		that.users[that.user_id]['nick'] = new_nick;
		
		that._writeServiceMessage('Tvoja prezývka bola zmenená na ' + new_nick + '.');
		that._refreshUsers();

		callback(null);
	});
};

/**
 * Funkcia slúžiaca pre odoslanie správy na server, odosielajúca, 
 * ako verejné (public_message), tak aj privátne správy (private_message).
 * @param {string} send_to ID užívateľa, ktorému je správa odosielaná
 *		alebo výraz 'all' pri verejnej správe
 * @param {string} text Text odosielanej správy 
 */
Chat.prototype.sendMessage = function (send_to, text) {
	var that = this;
	var timestamp = Date.now();

	if (send_to === 'all') {
		this.socket.emit('public_message', {
			'text': text,
			'timestamp': timestamp
		});
	} else {
		this.socket.emit('private_message', {
			'send_to': send_to,
			'text': text,
			'timestamp': timestamp
		}, function () {
			// Callbacková funkcia vyvolaná po úspešnom odoslaní súkromnej správy užívateľovi
			that._writeMessage(send_to, timestamp, text, 'outcoming');
		});
	}
};

/******************************************************/
/*                PRICHÁDZAJÚCE AKCIE                 */
/******************************************************/

/**
 * Funkcia spracúvajúca novo pripojeného užívateľa.
 * Pridá ho do zoznamu užívateľov a vypíše o tom správu.
 * @param {string} user_id ID novo pripojeného užívateľa
 * @param {string} user_nick Nick novo pripojeného užívateľa
 */
Chat.prototype.userJoined = function (user_id, user_nick) {
	this.users[user_id] = {
		nick: user_nick,
		color: colorgen.getColor()
	};

	this._refreshUsers();
	this._writeServiceMessage('Užívateľ ' + user_nick + ' sa pripojil do chatu.')
};

/**
 * Funkcia spracúvajúca info o odpojení užívateľa.
 * Odoberie ho zo zoznamu a vypíše o tom správu.
 * @param {string} user_id ID odpojeného pripojeného užívateľa
 */
Chat.prototype.userLeft = function (user_id) {
	var user = this.users[user_id];
	if (user) {
		delete this.users[user_id];

		this._refreshUsers();
		this._writeServiceMessage('Užívateľ ' + user['nick'] + ' sa odpojil z chatu.');
	}
};

/**
 * Funkcia spracúvajúca info o zmene nicku užívateľa.
 * Zmení nick užívateľa v zozname užívateľov a vypíše o tom správu.
 * @param {string} user_id ID odpojeného pripojeného užívateľa
 * @param {string} new_nick Nový nick užívateľa
 */
Chat.prototype.userChangedNick = function (user_id, new_nick) {
	var user = this.users[user_id];
	if (user) {
		var old_nick = user['nick'];
		user['nick'] = new_nick;

		this._refreshUsers();
		this._writeServiceMessage('Užívateľ ' + old_nick  + ' si zmenil prezývku na ' + new_nick + '.')
	}
};

/**
 * Funkcia spracúvajúca prijatú správu. (Funkcia zavolá funkciu vypisujúcu správu.)
 * @param {string} user_id ID užívateľa od ktorého pochádza správa
 * @param {number} timestamp Čas odoslania správy
 * @param {string} text Text správy
 * @param {string=} type Typ správy je vyplnený iba pri privátnej správe,
 *		nadobúda hodnotu 'incoming' pri prichádzajúcej privátnej správe
 *		a 'outcoming' pri odchádzajúcej privátnej správe
 */
Chat.prototype.messageArrived = function (user_id, timestamp, text, type) {
	this._writeMessage(user_id, timestamp, text, type);
};

/******************************************************/
/*                  PRIVÁTNE FUNKCIE                  */
/******************************************************/

/**
 * Funkcia pre obnovenie zoznamu užívateľov v paneli užívateľov a v selecte
 * pre výber komu sa má poslať správa. 
 * Nick je automaticky skráterný na vhodnú dĺžku.
 * @private
 */
Chat.prototype._refreshUsers = function () {
	var nicks = [];
	var li_nicks = [];
	var reversed_users = {};
	var options = ['<option value="all">Všetkým</option>'];

	// Vytvorenie objektu {nick: user_id, ...}
	Object.keys(this.users).forEach(function (user_id) {
		reversed_users[this.users[user_id]['nick']] = user_id;
	}, this);

	nicks = Object.keys(reversed_users);
	nicks.sort();

	nicks.forEach(function (nick) {
		li_nicks.push('<li title="' + nick + '">' + ((nick.length > 20) ? nick.substr(0, 19) + '…' : nick)  + '</li>');

		if (reversed_users[nick] !== this.user_id) {
			options.push('<option value="' + reversed_users[nick] +'">' + ((nick.length > 10) ? nick.substr(0, 9) + '…' : nick)  + '</value>');
		} 
	}, this);

	// Zmaže starý zoznam užívateľov a nahradí novým
	$('#users ul').remove();
	$('#users').append('<ul>' + li_nicks.join('') + '</ul>');

	// Zmaže staré položky v select boxe a nahradí novými
	var prev_send_to_val = $('select[name="send_to"]').val();
	$('select[name="send_to"]').find('option').remove().end().append(options.join(''));
};

/**
 * Funkcia, ktorá nastaví hodnotu v políčku pre zmenu nicku na aktuálny nick užívateľa.
 * @private
 */
Chat.prototype._setCurrentNickToInput = function () {
	$('input[name="new_nick"]').val(this.nick);
};

// VÝPIS SPRÁV

/**
 * Funkcia vkladajúca novú správu do message listu. 
 * Vytvorí nový box pre správu, vloží do nej hodnotu z parametru a pripojí ho do message listu.
 * @private
 * @param {string} text Text, ktorý bude vložený, ako nová správa do message listu.
 */
Chat.prototype.__appendMessage = function (text) {
	$('#message-list').append('<div class="msg">' + text + '</div>');
	$('#message-list-wrap')[0].scrollTop = $('#message-list-wrap')[0].scrollHeight;
};

/**
 * Funkcia slúžiaca pre výpis verejnej a privátnej správy do message listu.
 * @private
 * Správu vhodne naformátuje podľa jej typu.
 * @param {string} user_id ID užívateľa od ktorého pochádza správa
 * @param {number} timestamp Čas odoslania správy
 * @param {string} text Text správy
 * @param {string=} type Typ správy je vyplnený iba pri privátnej správe,
 *		nadobúda hodnotu 'incoming' pri prichádzajúcej privátnej správe
 *		a 'outcoming' pri odchádzajúcej privátnej správe
 */
Chat.prototype._writeMessage = function (user_id, timestamp, text, type) {
	var user = this.users[user_id];
	var output = '<span class="time">' + Utils.decodeTimeStamp(timestamp) + '</span> ';
	
	if (type) {
		output += '<strong class="username" style="color: purple">[';
		if (type === 'incoming') {
			output += user['nick'] + ' » ' + this.nick;
		} else {
			output += this.nick + ' » ' + user['nick'];
 		}
		output += ']</strong> ';
	} else {
		output += '<strong class="username" style="color: ' + user.color + '">&lt;' + user.nick + '&gt;</strong> ';
	}

	output += '<span class="text">' + text + '</span>';
	this.__appendMessage(output);	
}

/**
 * Funkcia určená pre výpis servisnej správy, ktorej text podľa tohto typu naformátuje.
 * @private
 * @param {string} message Text servisnej správy, pre vypísanie
 */
Chat.prototype._writeServiceMessage = function (message) {
	this.__appendMessage('<span class="service-message">' + message + '</span>');
};

/**
 * Funkcia vypíše privítaciu správu do message listu.
 * @private
 */
Chat.prototype._writeWelcomeMessage = function () {
	this._writeServiceMessage('Vitaj v chate ' + this.nick + '!');
}
