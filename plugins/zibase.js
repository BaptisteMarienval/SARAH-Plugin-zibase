exports.action = function(data, callback, config){
	// Retrieve config
	config = config.modules.zibase;
	var url="";
	var alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
	var actionList = ['OFF', 'ON', 'DIM', 'LM'];
	
	var actionType;
		
	/***** LAN method *****/
	if(config.acces_method == "lan") {
		if (!config.api_url_lan){
			console.log("Missing Zibase LAN url");
			return;
		}
	url = config.api_url_lan;
	
	if (data.actionAdd2) {
		// une adresse de module = actin sur periph
		url += '?cmd='+data.actionModule+'%20'+data.actionAdd2+data.actionAdd1+'%20P'+data.actionProto;
		}
	else {
		// scenario
		url += '?cmd=LM%20'+data.actionScenario;
	}
	console.log("Sending request to: " + url);
	}

	/***** WEB method *****/
	else {
		if (!config.api_url_web){
		console.log("Missing Zibase WEB url");
		return;
		}
		url = config.api_url_web;
   
		// si add existe = action sur un peripherique
		if (data.actionAdd2) {
			// Conversion format action/proto
			var param2convert = "";
			param2convert = FormatNumberLength(parseInt(data.actionProto,10).toString(2),8);
			param2convert += FormatNumberLength(actionList.indexOf(data.actionModule), 8);
			// Conversion de la lettre du module
			var param4convert = "";
			param4convert = alphabet.indexOf(data.actionAdd2);
			actionType=0;
		}
		// si pas d'add = action sur scenario
		else {
			param2convert=parseInt(data.actionScenario, 10).toString(2);
			actionType=1;
		}
  
		url += '?device='+config.device;
		url += '&token='+config.token;
		url += '&action=rowzibasecommand';
		url += '&param1='+actionType; // 0 = emission RF, 1= scenario
		url += '&param2='+parseInt(param2convert,2).toString(10); // 0..7 = action (0=off, 1=on) ; 8..15 proto (0=chacon, 6=zwave)
		if (actionType == 0) {
			url += '&param3='+(parseInt(data.actionAdd1)-1); // chiffre adresse-1
			url += '&param4='+param4convert; // lettre adresse A=0, B=1 ...
		}
		console.log("Sending request to: " + url);
	}
  
	// Send Request
	var request = require('request');
	request({ 'uri' : url }, function (err, response, body){
	
	// Retour uniquement en config web
	if(config.acces_method == "web") {
		if (err || response.statusCode != 200) {
			callback({'tts': "L'action a échoué"});
			return;
		}
	}
	console.log(body);
    
	// Callback with TTS
	callback({'tts': "Je m'en noccupe !"});
	});
}

function FormatNumberLength(num, length) {
    var r = "" + num;
    while (r.length < length) {
        r = "0" + r;
    }
    return r;
}
    