/**
 * Awesome Multi User Chat
 *
 * Ukážková real-time webová aplikácia pre bakalársku prácu s témou real-time webové aplikácie.
 * Jedná sa o chat s jednou miestnosťou pre viacero užívateľov.
 * Medzi podporované funkcie patrí - posielanie verejných a privátnych správ, zmena nicku.
 * 
 * @author Matej Paulech <matej.paulech@gmail.com>
 */

/**
 * Funkcia zavolaná knižnicou jQuery v momente vykreslenia DOMu.
 * Vytvára pripojenie k Socket.IO serveru, nastavuje akcie k Socket.IO 
 * eventom a akcie k formulárovým prvkom.
 */
$(function () {
	/** @type {Chat} Premenná pre object s vytvoreným chatom */
	var chat;
	/** @type {string} Pomocná premenná uchovávajúca starý nick pri menení nicku */
	var old_nick;
	/** @type {string} Pomocná premenná uchovávajúca stav spojenia so Socket.IO serverom */
	var connected = false;

	// Často používané elementy
	var nickname_input = $('input[name="nickname"]');
	var new_msg_input = $('input[name="new_msg"]');
	var send_to_select = $('select[name="send_to"]');
	var new_nick_input = $('input[name="new_nick"]');

	// Pripojenie sa k Socket.IO
	var socket = io.connect();
 
	/**
	 * Funkcia pre prihlásenie sa do chatu. Funkcia zavolá akciu join na servery.
	 * Ak nastane pri prihlasovaní chyba (napr. nick je už obsadení) zobrazí sa chybová
	 * hláška, v opačnom prípade dôjde k schovaniu login boxu a zobrazeniu okna s chatom.
	 * @ param {string} user_nick Nick prihlasovaného užívateľa
	 */
	var joinToChat = function (user_nick) {
		/**
		 * Funkcia kontaktujúca server. Server na ňu odpovedá vyvolaním callbacku potrebnými  
		 * údajmi (user_id, user_nick, zoznam užívateľov a prípadnou chybou 
		 */
		socket.emit('join', { 'user_nick': user_nick }, function (err, data) {
			if (err) {
				// Zobrazí login box, ak je schovaný (napr. po páde spojenia)
				if ($('#login_box_wrap').css('display') === 'none') {
					$('#chat_box').fadeOut(function () {
						$('#login_box_wrap').fadeIn(function () {
							nickname_input.select();
							alert(err);
						});
					});
				} else {
					nickname_input.select();
					alert(err);
				}
				return;
			}

			// Vytvorenie objektu s chatom
			chat = new Chat(data['user_id'], data['user_nick'], data['room_users'], socket);

			// Schovanie boxu s prihlásením a zobrazenie boxu s chatom
			$('#login_box_wrap').fadeOut('slow', function () {
				$('#chat_box').fadeIn('slow', function () {
					enableChatUserControls();
					$('input[name="new_msg"]').focus();
				});			
			});
		});
	};

	/******************************************************/
	/*                  POMOCNÉ FUNKCIE                   */
	/******************************************************/

	var enableChatUserControls = function () {
		send_to_select.removeAttr('disabled');
		new_msg_input.removeAttr('disabled');
		new_nick_input.removeAttr('disabled');
		$('input[name="send_msg_form"]').removeAttr('disabled');
	}

	var disableChatUserControls = function () {
		send_to_select.attr('disabled', 'disabled');
		new_msg_input.attr('disabled', 'disabled');
		new_nick_input.attr('disabled', 'disabled');
		$('input[name="send_msg_form"]').attr('disabled', 'disabled');
	};

	/******************************************************/
	/*                   OBSLUHA UDALOSTÍ                 */
	/******************************************************/

	/**
	 * Akcia pre odoslanie prihlasovacieho formulára  
	 */
	$('form[name="login_form"]').submit(function (e) {
		// Zabráni klasickému odoslaniu formulára
		e.preventDefault();

		if (!connected) {
			return alert ('Nepodarilo sa nadviazať spojenie so serverom, skús sa o chvíľu pripojiť znova.');
		}

		var nick = nickname_input.val().trim();

		if (nick.length === 0) {
			nickname_input.focus();
			return alert('Zadaj prezývku.');
		}

		// Prihlásenie sa do chatu
		joinToChat(nick);
	});

	/**
	 * Akcia pre odoslanie formulára s novou správou.
	 * Pracuje s textovým polom pre správu a selectom pre výber príjemcu.
	 */
	$('form[name="chat_form"]').submit(function (e) {
		// Zabráni klasickému odoslaniu formulára
		e.preventDefault();

		var text = new_msg_input.val().trim();
		var send_to = send_to_select.val() || 'all';

		if (text.length === 0) {
			new_msg_input.focus();			
			return alert('Zadaj správu!');
		}

		chat.sendMessage(send_to, text);
		new_msg_input.val('');
	});

	/**
	 * Akcia po zmene hodnoty v selecte s výberom príjemcu nastaví kurzor do pola správy.
	 */
	send_to_select.change(function () {
			new_msg_input.focus();
	});

	/**
	 * Firefox fix - zabráneni ukončeniu Socket.IO spojenia pri stlačení Esc
	 */
	$('html').keydown(function (e) {
		if (e.keyCode === 27) {
			e.preventDefault();	
		}
	});

	/// ZMENA NICKU  

	/**
	 * Akcia pre kliknutie na políčko s nickom.
	 * Ak je políčko readonly, správy ho editovatelné.
	 */
	new_nick_input.click(function (e) {
		if (new_nick_input.attr('readonly')) {
			old_nick = new_nick_input.val();
			new_nick_input.removeAttr('readonly');
			new_nick_input.select();
		}
	});

	/**
	 * Akcia pre stlačenie klávesy v políčku s nickom.
	 * Pri stlačení klávesy Enter sa prevedie zmena nicku.
	 * Pri stlačení klávesy Esc sa nick vráti na pôvodnú 
	 * hodnotu a políčko sa stane needitovatelné. 
	 */
	new_nick_input.keydown(function (e) {
		// Ignoruj stlačenie klávesy, keď nie je políčko editovatelné
		if (new_nick_input.attr('readonly')) {
			return false;
		}

		if (e.keyCode === 13) { // Enter
			e.preventDefault();
			e.stopPropagation();

			var new_nick = new_nick_input.val().trim();

			if (new_nick.length === 0) {
				return alert('Zadaj nick.');
			}

			// Nie je treba meniť...
			if (new_nick === old_nick) {
				new_nick_input.attr('readonly', 'readonly');
				return new_msg_input.focus();;
			}

			// Zavolá akciu pre zmenu nicku
			chat.changeNick(new_nick, function (err) {
				if (err) {
					new_nick_input.select();
					return alert(err);
				}
				new_nick_input.attr('readonly', 'readonly');
				return new_msg_input.focus();
			});
		}

		if (e.keyCode === 27) { // Esc
			new_nick_input.val(old_nick);
			new_nick_input.attr('readonly', 'readonly');
		}
	});

	/******************************************************/
	/*              OBSLUHA SOCKET.IO UDALOSTÍ            */
	/******************************************************/

	/**
	 * Akcia vyvolávaná pri otvorení spojenia so serverom.
	 * Po obnovení spojenia po páde dôjde k opätovnému prihláseniu ku chatu.
	 */
	socket.on('connect', function () {
		connected = true;
		if (chat && chat.getNick()) {
			joinToChat(chat.getNick());
		}
	});

	/**
	 * Akcia vyvolaná po uzavretí spojenia so serverom.
	 * Ak sa užívateľ nachádza v chate, bude mu vypísaná informačná správa o páde spojenia.
	 */
	socket.on('disconnect', function () {
		connected = false;
		if (chat) {
			disableChatUserControls();
			chat.writeServiceMessage('Došlo k pádu spojenia, preto nie je možné prijímať \
				ani odosielať správy. Po obnove spojenia budeš znovu pripojený do chatu.');
		}
	});

	/**
	 * Akcia je vyvolaná v prípade prijatia chybovej hlášky pre užívateľa zo serveru.
	 * Táto chybová hláška sa ukáže užívateľovi v alerte.
	 * Prijímanými dátami je text správy v podobe reťazca (string).
	 */
	socket.on('error', function (error_message) {
		alert(error_message);
	});

	/**
	 * Akcia vyvolaná po prihlásení nového užívateľa do chatu (nie aktuálneho, ale cudzieho).
	 * Prijímanými dátami je ID a nick prihláseného užívateľa.
	 */
	socket.on('join_user', function (data) {
		chat.userJoined(data['user_id'], data['user_nick']);
	});

	/**
	 * Akcia vyvolaná po odhlásení užívateľa z chatu (nie aktuálneho).
	 * Prijímanými dátami je ID odhlasovaného užívateľa
	 */
	socket.on('part_user', function (data) {
		chat.userLeft(data['user_id']);
	})

	/**
	 * Akcia vyvolaná po zmene nicku niektorého z užívateľov (nie aktuálneho).
	 * Prijámanými dátami je ID užívateľa a jeho nový nick.
	 */
	socket.on('change_nick', function (data) {
		chat.userChangedNick(data['user_id'], data['new_nick']);
	});

	/**
	 * Akcia vyvolaná po príchode verejnej správy (aj od aktuálneho užívateľa).
	 * Prijímanými dátami je ID užívateľa, čas odoslania správy a jej text.
	 */
	socket.on('public_message', function (data) {
		chat.messageArrived(data['user_id'], data['timestamp'], data['text']);
	});

	/**
	 * Akcia vyvolaná po príchode súkromnej správy (nie od aktuálneho užívateľa).
	 * Prijímanými dátami je ID odosialeľa, čas odoslania správy a jej text.
	 */
	socket.on('private_message', function (data) {
		chat.messageArrived(data['user_id'], data['timestamp'], data['text'], 'incoming');
	});


	// Prihlásenie sa do chatu s náhodným nickom, vhodné pri testovaní, pre preskočenie prihlasovacej obrazkovky
	// joinToChat('lama' + Math.round(Math.random() * 10000));
});