/**
 * Awesome Multi User Chat - utils
 * @author Matej Paulech <matej.paulech@gmail.com>
 */

/**
 * Knižnica pre rôzne užitočné funkcie.
 */
var Utils = {};

/**
 * Funkcia decodeTimeStamp skonvertuje zadantý timestamp do času v tvare HH:MM:SS.
 * Ak je vstupný parameter timestamp chybný použije sa aktuálny čas.
 * @param {number} timestamp Kontertovaný timestamp
 * @return {string} Reťazec s časom v tvare HH:MM:SS
 */
Utils.decodeTimeStamp = function (timestamp) {
	var date = new Date(timestamp) || Date.now();
	
	var hours = (date.getHours() < 10) ? '0' + date.getHours() : date.getHours();
	var minutes = (date.getMinutes() < 10) ? '0' + date.getMinutes() : date.getMinutes();
	var seconds = (date.getSeconds() < 10) ? '0' + date.getSeconds() : date.getSeconds(); 
	
	return hours + ':' + minutes + ':' + seconds;
};

/**
 * Trieda pre poskytnutie farby zo zoznamu farieb. 
 * Pri každom volaní funkcie getColor vráti ďalšiu farbu zo zoznamu.
 * @constructor
 */
Utils.Colorgen = function () {
	this.pointer = 0;
	this.colors = ['maroon', 'green', 'olive', 'navy', 'purple', 'teal', 'red', 'blue'];
}

/**
 * Funkcia vracajúca názov farby nasledujúcej po farbe z predchádzajúceho volania v zozname farieb.
 * @return {string} Názov farby
 */
Utils.Colorgen.prototype.getColor = function () {
	return this.colors[this.pointer++ % this.colors.length];
}