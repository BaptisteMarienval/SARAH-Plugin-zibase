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
	var fs = require('fs');
	var xmlFile = fs.readFileSync(__dirname+'\\periph.xml');
	var file = new xmldoc.XmlDocument(xmlFile);
	var module = file.childWithAttribute('nom',data.module);

	/***** LAN method *****/
	if(config.acces_method == "lan") {
		if (!config.ip_lan){
			console.log("Missing Zibase LAN url");
			return;
		}
		// periph action
		if (module.attr.type=='module') {
			url = http+config.ip_lan+lan_path;
			// Dimmable action
			if (data.dimValue){
				url += '?cmd=DIM%20'+module.attr.addr+module.attr.addr2+'%20P'+module.attr.proto;
				url += '%20'+data.dimValue;
			}
			// ON/OFF action
			else { 
				url += '?cmd='+data.actionModule+'%20'+module.attr.addr+module.attr.addr2+'%20P'+module.attr.proto;
			}
		}
		// Sensor action
		else if (module.attr.type=='sonde'){
			url = http+config.ip_lan+sensors_path;
		}
		// Scenario action
		else {	
			url = http+config.ip_lan+lan_path;
			url += '?cmd=LM%20'+module.attr.addr;
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
		if (module.attr.type='module') {
			// Conversion format action/proto/DimValue => param 2
			var param2convert = "";
			
			if (data.dimValue){
				// DIM/BRIGHT
				param2convert += FormatNumberLength(parseInt(data.dimValue,10).toString(2),8);
				// PROTOCOL
				param2convert += FormatNumberLength(parseInt(module.attr.proto,10).toString(2),8);
				// ACTION
				param2convert += FormatNumberLength(parseInt(actionList.indexOf('DIM'),10).toString(2), 8);
			}
			else {
				// PROTOCOL
				param2convert += FormatNumberLength(parseInt(module.attr.proto,10).toString(2),8);
				// ACTION
				param2convert += FormatNumberLength(actionList.indexOf(data.actionModule), 8);
			}
			
			param2convert = parseInt(param2convert,2).toString(10);
			
			// Conversion du chiffre du module => param 3
			var param3convert = "";
			param3convert = parseInt(module.attr.addr2)-1;
			
			// Conversion de la lettre du module => param 4
			var param4convert = "";
			param4convert = alphabet.indexOf(module.attr.addr);
			actionType=0;
		}
		
		if (module.attr.type='sonde') {
		callback({'tts': "La gestion des sondes en mode web n'est pour le moment pas possible"});
			return;
		}
		
		// Scenario action
		else {
			param2convert=parseInt(module.attr.addr, 10).toString(2);
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
	if (module.attr.type == 'sonde') {
		var results = new xmldoc.XmlDocument(body);
		var evs = results.childNamed("evs");
		var ev = evs.childWithAttribute('id',module.attr.addr);
		var ttsEnd = "";
		var sonde;
		if (module.attr.addr2 == 'v1') {
			var sonde = ev.attr.v1;
		}
		if (module.attr.addr2 == 'v2') {
			var sonde = ev.attr.v2;
		}
		if (module.attr.addr2 == 'lowbatt') {
			var sonde = ev.attr.lowbatt;
		}
		
		if (module.attr.info == 'temp') {
			ttsEnd = parseFloat(sonde/10).toString().replace(".",",");
		}
		if (module.attr.info == 'hygro') {
			var sonde = ev.attr.v2;
			ttsEnd =  parseFloat(sonde).toString().replace(".",",");
		}
		if (module.attr.info == 'elec') {
			var sonde = ev.attr.v2;
			ttsEnd = parseFloat(sonde*100).toString().replace(".",",");
		}	
		if (module.attr.info == 'battery') {
			if (parseFloat(sonde) == 0) {
				ttsEnd = " bon";
			}
			else {
				ttsEnd = " faible";
			}
		}	
		
		tts = module.attr.tts;
		tts = tts.replace('%s', ttsEnd);
	}
	
    else {
		var tts = data.ttsAction + " " + module.attr.tts;
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