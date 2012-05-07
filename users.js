/**
 * Awesome Multi User Chat - users
 * @author Matej Paulech <matej.paulech@gmail.com>
 */

// Načítanie závislostí
var User = require('./user');
var Utils = require('./utils');

/**
 * Objekt užívateľov chatu.
 * @constructor
 */
var Users = function () {
	this.users = {};
};

/**
 * Funkcia createUser vytvorí nového užívateľa a prídá ho do zoznamu užívateľov.
 * @param {string} nick Nick nového užívateľa
 * @param {!Objcet} socket Socket.IO socket užívateľa
 * @param {function(?string, User=)} callback (err, user) Funkcia volaná 
 *		pri výskyte chyby a po vytvorení užívateľa.
 */
Users.prototype.createUser = function (nick, socket, callback) {
	if (this.isNickUsed(nick)) {
		return callback('Zadaná prezývka je už obsadená, zvoľ si inú.');
	}
	var user_id = Utils.generateID();
	var user = new User(user_id, nick, socket);
	this.users[user_id] = user;
	
	callback(null, user);
};

/**
 * Funkcia removeUser zmaže užívateĺa zo zoznamu užívateľov.
 * @param {sring} user_id ID mazaného užívateľa
 */
Users.prototype.removeUser = function (user_id) {
	delete this.users[user_id];
};

/**
 * Funkcia vracajúca objekt s hladaným užívateľským ID.
 * @param {string} user_id ID hladaného užívateľa
 * @return {?User} Vracia objekt s užívateľom alebo null pri jeho nenájdení.
 */
Users.prototype.getUser = function (user_id) {
	return this.users[user_id];
};

/**
 * Funkcia zisťujúca, či je zadaný nick používaný.
 * @param {string} nick Zadaný nick, pre ktorý sa zisťuje jeho výskyt.
 * @return {boolean} Funkcia vracia true ak je nick používaný, inak false
 */
Users.prototype.isNickUsed = function (nick) {
	return Object.keys(this.users).some(function (user_id){
		return (this.users[user_id]['nick'] === nick);
	}, this);
};

/**
 * Funkcia vracaujúca pole užívateľov.
 * @return {Array.<Array.<string>>} Pole užívateľov 
 * 		v tvare [[ID užívateľa], [nick]].
 */
Users.prototype.getIdNickPairs = function () {
	return Object.keys(this.users).map(function (user_id) {
		return [user_id, this.users[user_id]['nick']];
	}, this);
};

// Export modulu
module.exports = Users;