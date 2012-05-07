/**
 * Awesome Multi User Chat - user
 * @author Matej Paulech <matej.paulech@gmail.com>
 */

/**
 * Objekt užívateľa.
 * @constructor
 * @param {string} id ID užívateľa
 * @param {string} nick Nick užívateľa
 * @param {!Object} socket Socket.IO socket užívateľa 
 */
var User = function (id, nick, socket) {
	this.id = id;
	this.nick = nick;
	this.socket = socket;
};

/**
 * Funkcia slúži pre zmenu nicku užívateľa.
 * @param {string} new_nick Nový nick užívateľa.
 */
User.prototype.changeNick = function (new_nick) {
	this.nick = new_nick;
}

// Export modulu
module.exports = User;