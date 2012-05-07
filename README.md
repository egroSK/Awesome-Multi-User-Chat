Awesome-Multi-User-Chat
=======================

***Ukážková real-time webová aplikácia s využitím Socket.IO pre bakalársku prácu Real-time webové aplikácie.***

Jedná sa o chat s jednou miestnosťou pre viacero užívateľov.   

Medzi podporované funkcie patrí - posielanie verejných a privátnych správ, zmena nicku.

# Spustenie aplikácie

Pre spustenie aplikácie je nutné mať nainštalované prostredie [Node.js](http://nodejs.org/) verzie 0.4 a vyššej.

Pred spustením aplikácie je treba v adresári s aplikáciou stiahnúť závislosti príkazom:

	npm install -d

Samotná aplikácia sa spúšťa príkazom:

	node app.js

Po spustení aplikácie sa v konzole vypíše adresa a port na ktorom aplikácia beží. Štandartne je to adresa *localhost* a port *3000*. Port sa dá zmeniť v súbore *app.js* v časti:

	app.listen(3000, function(){ … });