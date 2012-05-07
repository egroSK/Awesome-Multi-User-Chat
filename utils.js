/**
 * Awesome Multi User Chat - utils
 * @author Matej Paulech <matej.paulech@gmail.com>
 */

/**
 * Knižnica určená pre rôzne užitočné funkcie.
 */
var Utils = {};

/**
 * Funkcia generateID generuje náhodný reťazec.
 * @return {string} Náhodne vygenerované číslo
 */
Utils.generateID = function () {
	return Math.round(Math.random() * Math.random() * Date.now()).toString();
};


// Export modulu
module.exports = Utils;