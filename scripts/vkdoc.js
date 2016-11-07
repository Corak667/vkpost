var path = require('path');
var fs = require('fs');
var yargs = require('yargs');
var request = require('request');
var querystring = require('querystring');
var https = require('https');

var program = 'vkdoc';
console.log('\nVK Doc uploader v0.1.1');
console.log('Seiya Loveless 2016 <seiya-l@ya.ru>\n');

var argv = yargs
	.usage('Usage: '+program+' [options]')
	.describe('file','File to upload.')
	.nargs('file', 1)
	.alias('file','f')

	.describe('g','Upload to group id.')
	.default('g', 0)
	.describe('h','Show this help.')
	.alias('h','help')
	.boolean('h')
	.argv;

function postFile(url){

	var file = argv.file;
	
	var timer;
	var start_time = Date.now();
	var stats = fs.statSync(file);
	var fsize = stats.size;
	
	updateLine('UPL: 0/'+hsize(fsize)+' [0%] ??m??s');
	
	var formData = { file: fs.createReadStream(file) };
	var r = request.post({ url: url, formData: formData }, function (error, httpResponse, body) { // , timeout: 10000
		clearInterval(timer);
		if(body && !error && httpResponse.statusCode == 200){
			body = JSON.parse(body);
			if(body.file){
				updateLine('UPL: '+hsize(fsize)+'/'+hsize(fsize)+' [100%] 0s\n');
				console.log('MSG: doc successfully uploaded.');
				save(body.file);
			}
			else if(body.error){
				console.log('ERR: '+body.error+'.');
			}
			else{
				console.log('ERR: api unknown error.');
			}
		}
		else{
			console.log('ERR: Unknown error.');
			if (error) console.log('Status:', (httpResponse&&httpResponse.statusCode?httpResponse.statusCode:''), '\n', error);
		}
	});
	
	timer = setInterval(function(){
		var ub = r.req.connection._bytesDispatched;
		var elapsed = Date.now() - start_time;
		var percentFxd = (ub/fsize*100).toFixed();
		var percent = percentFxd < 100 ? percentFxd : 99;
		var time = htime(((parseInt(elapsed*(fsize/ub-1)))/1000).toFixed());
		if (ub < fsize){
			updateLine('UPL: '+hsize(ub)+'/'+hsize(fsize)+' ['+percent+'%] '+time);
		}
	}, 1000);

}

function save(file){
	var url  = api.save + '?' + querystring.stringify({
		v: api.v,
		lang: api.lang,
		file: file,
		access_token: api.access_token
	});
	var r = request.post({ url: url }, function (error, httpResponse, body) {
		body = JSON.parse(body);
		if(body.response){
			console.log(body.response[0].title);
			console.log(body.response[0].url);
		}
		else{
			console.log(body);
		}
	});
}

function numberFormat(number, decimals, decPoint, thousandsSep) {
	decimals = isNaN(decimals) ? 2 : Math.abs(decimals);
	decPoint = (decPoint === undefined) ? '.' : decPoint;
	thousandsSep = (thousandsSep === undefined) ? '' : thousandsSep;
	
	var sign = number < 0 ? '-' : '';
	number = Math.abs(+number || 0);
	
	var intPart = parseInt(number.toFixed(decimals), 10) + '';
	var j = intPart.length > 3 ? intPart.length % 3 : 0;
	
	return (sign + (j ? intPart.substr(0, j) + thousandsSep : '') + intPart.substr(j).replace(/(\d{3})(?=\d)/g, '$1' + thousandsSep)
		) + (decimals ? decPoint + Math.abs(number - intPart).toFixed(decimals).slice(2) : '');
}

function hsize(value){
	var units = [[1, 'B'], [1024, 'KiB'], [1024*1024, 'MiB'], [1024*1024*1024, 'GiB']];
	for (var i=0; i<units.length-1; i++) {
		if (value < units[i+1][0]) {
			return numberFormat(value / units[i][0], 3) + units[i][1];
		}
	}
	return numberFormat(value / units[units.length-1][0], 3) + units[units.length-1][1];
}

function htime(value){
	var result = value % 60 + 's';
	value = parseInt(value / 60);
	if (value > 0) {
		result = value % 60 + 'm' + result;
		value = parseInt(value / 60);
	}
	if (value > 0) {
		result = value + 'h' + result;
	}
	return result;
}

function updateLine(text) {
	var s = process.stderr;
	s.cursorTo(0);
	s.write(text);
	s.clearLine(1);
}

//-------------------------------------------------------------------------------------------- vars

var configdir = path.normalize(__dirname+'/config/');
var apicfg = require(configdir+'vkpost.json');

var api = {
	upload: 'https://api.vk.com/method/docs.getWallUploadServer',
	save: 'https://api.vk.com/method/docs.save', v: '5.53', lang: 'en',
	access_token: (argv.k?argv.k:apicfg.access_token),
};

if (argv.h || typeof argv['encode-param'] != 'string' && typeof argv.file != 'string' ) {
	console.log(yargs.help());
	process.exit();
}

if(argv.file){

	if(!fs.existsSync(argv.file) || fs.existsSync(argv.file) && fs.statSync(argv.file).isDirectory()){
		console.log('ERR: File not selected.');
		console.log('MSG: See help for more information: '+program+' -h');
		process.exit();
	}
	
	var apirequrl  = api.upload + '?v=' + api.v + '&lang=' + api.lang +'&group_id='+api.group;
	console.log('MSG: Selected file: '+argv.file);
	apirequrl += '&access_token=' + api.access_token;

	if(argv.g && typeof argv.g == 'number' && argv.g > 0){
		apirequrl += '&group_id=' + argv.g;
		apirequrl += argv['gp-no-comments'] ? '&no_comments=1' : '';
	}
	else{
		var privview = argv['up-privacy-view'];
		var privcmmt = argv['up-privacy-comment'];
		apirequrl += typeof privview == 'number' && privview > 0 ? '&privacy_view='    + ( privview > 3 ? 3 : privview ) : '';
		apirequrl += typeof privcmmt == 'number' && privcmmt > 0 ? '&privacy_comment=' + ( privcmmt > 3 ? 3 : privcmmt ) : '';
	}

	// console.log(apirequrl.replace(/&access_token=(.*)/,'&access_token=*** (access token was hidden)'));
	
	// --------------------------------------------------------------- request
	
	request.get(apirequrl, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			body = JSON.parse(body);
			if(body.response && !body.error){
				// console.log(body.response);
				if(body.response.upload_url){
					// console.log(body.response.upload_url);
					postFile(body.response.upload_url);
				}
			}
			else if(body.error){
				console.log('ERR ('+body.error.error_code+'): '+body.error.error_msg);
			}
			else{
				console.log('ERR: Unknown error.');
				if (error) console.log(error);
			}
		}
		else{
			console.log('ERR: Unknown error.');
			if (error) console.log('Status:', (httpResponse&&httpResponse.statusCode?httpResponse.statusCode:''), '\n', error);
		}
	});

}