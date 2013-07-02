exports.action = function(data, callback, config){

	var xmldoc = require('./lib/xmldoc');
	config = config.modules.zibase;
	var url="";
	var alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
	var actionList = ['OFF', 'ON', 'DIM', 'LM'];
	var lan_path = '/cgi-bin/domo.cgi';
	var web_path='/m/zapi_remote_zibase_set.php';
	var sensors_path='/sensors.xml';
	var http = 'http://';
	var https = 'https://';
	var actionType;
	
		
/************************************************* 
*************** BUILD URL ************************
**************************************************/	

	/** acces module **/
	console.log(data.module);
	var fs = require('fs');

	var xmlFile2 = fs.readFileSync(__dirname+'\\periph.xml');

	var file = new xmldoc.XmlDocument(xmlFile);
	var module = file.childWithAttribute('nom',data.module);

	
	callback({'tts': module.nom});
}
	/***** LAN method *****/
	if(config.acces_method == "lan") {
		if (!config.ip_lan){
			console.log("Missing Zibase LAN url");
			return;
		}
		// periph action
		if (module.type='module') {
			url = http+config.ip_lan+lan_path;
			// Dimmable action
			if (data.dimValue){
				url += '?cmd=DIM%20'+module.addr2+module.addr+'%20P'+module.proto;
				url += '%20'+data.dimValue;
			}
			// ON/OFF action
			else { 
				url += '?cmd='+data.actionModule+'%20'+module.addr2+module.addr1+'%20P'+module.proto;
			}
		}
		// Sensor action
		else if (module.type='sonde'){
			url = http+config.ip_lan+sensors_path;
		}
		// Scenario action
		else {	
			url = http+config.ip_lan+lan_path;
			url += '?cmd=LM%20'+module.addr1;
		}
		console.log("Sending request to: " + url);
	}

	/***** WEB method *****/
	else {
		if (!config.plateforme_web){
		console.log("Missing Zibase WEB url");
		return;
		}
		url = https+config.plateforme_web+web_path;
   
		// periph action
		if (module.type='module') {
			// Conversion format action/proto/DimValue => param 2
			var param2convert = "";
			
			if (data.dimValue){
				// DIM/BRIGHT
				param2convert += FormatNumberLength(parseInt(data.dimValue,10).toString(2),8);
				// PROTOCOL
				param2convert += FormatNumberLength(parseInt(module.proto,10).toString(2),8);
				// ACTION
				param2convert += FormatNumberLength(parseInt(actionList.indexOf('DIM'),10).toString(2), 8);
			}
			else {
				// PROTOCOL
				param2convert += FormatNumberLength(parseInt(module.proto,10).toString(2),8);
				// ACTION
				param2convert += FormatNumberLength(actionList.indexOf(data.actionModule), 8);
			}
			
			param2convert = parseInt(param2convert,2).toString(10);
			
			// Conversion du chiffre du module => param 3
			var param3convert = "";
			param3convert = parseInt(module.addr2)-1;
			
			// Conversion de la lettre du module => param 4
			var param4convert = "";
			param4convert = alphabet.indexOf(module.addr);
			actionType=0;
		}
		
		if (module.type='sonde') {
		callback({'tts': "La gestion des sondes en mode web n'est pour le moment pas possible"});
			return;
		}
		
		// Scenario action
		else {
			param2convert=parseInt(module.addr, 10).toString(2);
			actionType=1;
		}
		url += '?device='+config.device;
		url += '&token='+config.token;
		url += '&action=rowzibasecommand';
		url += '&param1='+actionType;
		url += '&param2='+param2convert;
		if (actionType == 0) {
			url += '&param3='+param3convert;
			url += '&param4='+param4convert;
		}
		console.log("Sending request to: " + url);
}
	
	
/************************************************ 
*************** CALL URL ************************
*************************************************/		
  
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
	
	// Sensors action => Parsing XML
	// !! les variables v1, v2 peuvent varier selon le péripherique
	if ((module.type == 'SONDE') && (config.acces_method == "lan")) {
		var results = new xmldoc.XmlDocument(body);
		var evs = results.childNamed("evs");
		var ev = evs.childWithAttribute('id',module.addr);
		var ttsEnd = "";
		if (module.info == 'temp') {
			var sonde = ev.attr.v1;
			ttsEnd = 'de ' + parseFloat(sonde/10).toString().replace(".",",") + " degrès";
		}
		if (module.info == 'hygro') {
			var sonde = ev.attr.v2;
			ttsEnd =  'de ' + parseFloat(sonde).toString().replace(".",",")+" pourcent";
		}
		if (module.info == 'elec') {
			var sonde = ev.attr.v2;
			ttsEnd = 'de ' + parseFloat(sonde*100).toString().replace(".",",")+" kilo watt heure";
		}
		
		if (module.info == 'battery') {
			var sonde = ev.attr.lowbatt;
			if (parseFloat(sonde) == 0) {
			ttsEnd = " bon";
			}
			else {
			ttsEnd = " faible";
			}
		}
		
		tts = module.tts + ttsEnd;
		
	}
	
    else {
		var tts = data.ttsAction + " " + module.tts;
		if (data.ttsDim){
			tts += " " + data.ttsDim;
		}
	}
	// Callback with TTS
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