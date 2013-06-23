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
	
	if (data.add2Module) {
		// une adresse de module = actin sur periph

		if (data.dimValue){
			url += '?cmd=DIM%20'+data.add2Module+data.add1Module+'%20P'+data.protocoleModule;
			url += '%20'+data.dimValue;
		}
		else { 
			url += '?cmd='+data.actionModule+'%20'+data.add2Module+data.add1Module+'%20P'+data.protocoleModule;
		}
	}

	else {
		// scenario
		url += '?cmd=LM%20'+data.scenarioId;
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
		if (data.add2Module) {
			// Conversion format action/proto/DimValue => param 2
			var param2convert = "";
			
			if (data.dimValue){
				// DIM/BRIGHT
				param2convert += FormatNumberLength(parseInt(data.dimValue,10).toString(2),8);
				// PROTOCOL
				param2convert += FormatNumberLength(parseInt(data.protocoleModule,10).toString(2),8);
				// ACTION
				param2convert += FormatNumberLength(parseInt(actionList.indexOf('DIM'),10).toString(2), 8);
			}
			else {
				// PROTOCOL
				param2convert += FormatNumberLength(parseInt(data.protocoleModule,10).toString(2),8);
				// ACTION
				param2convert += FormatNumberLength(actionList.indexOf(data.actionModule), 8);
			}
			
			param2convert = parseInt(param2convert,2).toString(10);
			
			// Conversion du chiffre du module => param 3
			var param3convert = "";
			param3convert = parseInt(data.add1Module)-1
			
			// Conversion de la lettre du module => param 4
			var param4convert = "";
			param4convert = alphabet.indexOf(data.add2Module);
			actionType=0;
		}
		// si pas d'add = action sur scenario
		else {
			param2convert=parseInt(data.scenarioId, 10).toString(2);
			actionType=1;
		}
		url += '?device='+config.device;
		url += '&token='+config.token;
		url += '&action=rowzibasecommand';
		url += '&param1='+actionType; // 0 = emission RF, 1= scenario
		url += '&param2='+param2convert; // 0..7 = action (0=off, 1=on) ; 8..15 proto (0=chacon, 6=zwave)
		if (actionType == 0) {
			url += '&param3='+param3convert; // chiffre adresse-1
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
	//console.log(body);
    
	// Callback with TTS
	var tts = data.ttsAction + " " + data.ttsPeriph;
	if (data.ttsDim){
	tts += " " + data.ttsDim;
	}
	
	callback({'tts': tts});
	});
}

function FormatNumberLength(num, length) {
    var r = "" + num;
    while (r.length < length) {
        r = "0" + r;
    }
    return r;
}
    