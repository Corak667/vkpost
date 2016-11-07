var exec = function(fname) {
	console.log('> '+fname);
	require('child_process').execSync(fname,{stdio:'inherit'});
};
var path = require('path');
var yargs = require('yargs');
var fs = require('fs');
var request = require('request');
var https = require('https');

var program = 'vkpost';
var priv_string  = '  up-privacy:\n';
	priv_string += '    0 - All users\n';
	priv_string += '    1 - Friends only\n';
	priv_string += '    2 - Friends of friends\n';
	priv_string += '    3 - Only me';

console.log('\nVK Video uploder v0.1.1');
console.log('Seiya Loveless 2016 <seiya-l@ya.ru>\n');
var argv = yargs
	.usage('Usage: '+program+' [options]')
	.describe('file','File to upload.')
	.nargs('file', 1)
	.alias('file','f')
	
	.describe('g','Upload to group id.')
	.default('g', 0)
	.describe('a','Upload to album id.')
	.describe('t','Name of the video.')
	.default('a', 0)
	.describe('d','Description of the video.')
	.default('d', '')
	.describe('p','Post the saved video on a user\'s/group\'s wall.')
	.boolean('p')
	.describe('r','Repeat the playback of the video.')
	.boolean('r')
	
	.describe('up-privacy-view','Who can view this video? [0-3]')
	.default('up-privacy-view', 0)
	.describe('up-privacy-comment','Who can comment this video? [0-3]')
	.default('up-privacy-comment', 0)
	
	.epilog(priv_string)
	
	.describe('gp-no-comments','Disable commenting.')
	.boolean('gp-no-comments')
	
	.describe('no-encode-progress','Do not show encode progress.')
	.boolean('no-encode-progress')
	
	.describe('encode-param','Show only encode progress.\n(coma-separated: owner_id,video_id,video_hash)')
	.nargs('encode-param', 1)
	
	// .describe('is-private','Для отправки личным сообщением.')
	// .boolean('is-private')
	// .default('is-private',false)
	
	.describe('v','Debug mode.')
	.alias('v','verbose')
	.boolean('v')
	
	.describe('h','Show this help.')
	.alias('h','help')
	.boolean('h')
	.argv;



function openAuth(iurl){
	var command;
	switch(process.platform) {
		case 'darwin':
			command = 'open';
			break;
		case 'win32':
			command = 'start explorer';
			break;
		case 'linux':
			command = 'xdg-open';
			break;
		default:
			throw new Error('Unsupported platform: ' + process.platform);
	}
	exec(command+' "'+iurl+'"');
}

function postFile(owner_id,url,file){

	var timer;
	var start_time = Date.now();
	var stats = fs.statSync(file);
	var fsize = stats.size;
	
	updateLine('UPL: 0/'+hsize(fsize)+' [0%] ??m??s');
	
	var formData = { video_file: fs.createReadStream(file) };
	var r = request.post({ url: url, formData: formData }, function (error, httpResponse, body) { // , timeout: 10000
		clearInterval(timer);
		if(body && !error && httpResponse.statusCode == 200){
			body = JSON.parse(body);
			if(!body.error){
				updateLine('UPL: '+hsize(fsize)+'/'+hsize(fsize)+' [100%] 0s\n');
				console.log('MSG: Video successfully uploaded.');
				//if (argv.v) console.log('DEBUG: Encode progress url [240/360]: '
				//	+'http://vk.com/al_video.php?act=encode_progress&al=1&oid='+owner_id+'&vid='+body.video_id+'&hash='+body.video_hash+'&size=240');
				//if (argv.v) console.log('DEBUG: Encode progress url [480/720]: '
				//	+' http://vk.com/al_video.php?act=encode_progress&al=1&oid='+owner_id+'&vid='+body.video_id+'&hash='+body.video_hash+'&size=480');
				console.log('MSG: Encode progress request      : '+program+' --encode-param '+owner_id+','+body.video_id+','+body.video_hash);
				if ( !argv['no-encode-progress'] ) {
					getEncodeStatus(owner_id,body.video_id,body.video_hash,0);
				}
			}
			else if(body.error){
				console.log('ERR: '+body.error+'.');
			}
			else{
				console.log('ERR: Unknown error.');
			}
		}
		else{
			console.log('ERR: Unknown error.');
			if (error) console.log('Status:', (httpResponse.statusCode?httpResponse.statusCode:''), '\n', error);
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

function getEncodeStatus(owner_id,video_id,video_hash,video_qua){
	
	if ( typeof wait_status != 'number' ){
		wait_status = 0;
	}
	
	switch(video_qua){
		case 0:
			video_size = 240;
			break;
		case 1:
			video_size = 480;
			break;
		case 2: // for test propose only
			video_size = 1080;
			break;
		default:
			video_size = 240;
	}
	
	var post_options = {
		host: 'vk.com',
		port: '443',
		path: '/al_video.php?act=encode_progress&al=1&oid='+owner_id+'&vid='+video_id+'&hash='+video_hash+'&size='+video_size,
		method: 'post',
		timeout: 60000,
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Cookie': 'remixsid=' + api.remixsid + ';'
		}
	};
	var post_req = https.request(post_options, function(res) {
		var data = '';
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			data += chunk;
		});
		res.on('end', function () {
			if ( !data.match('<!json>(.*)') ) {
				console.log(data);
				console.log('ERR: Encoding status access error.');
				process.exit();
			}
			var video_encode = JSON.parse(data.match('<!json>(.*)')[1]);
			//console.log(video_encode);
			
			// sizes
			video_encode.sizes   = video_encode.size ? video_encode.size.toString().replace(',','/') : '???';
			if(video_encode.sizes!='???'){
				switch(video_encode.sizes){
					case'240':
						video_encode.quality = 'LD';
						break;
					case'240/360':
						video_encode.quality = 'LD';
						break;
					case'480':
						video_encode.quality = 'SD';
						break;
					case'480/720':
						video_encode.quality = 'HD';
						break;
					case'1080':
						video_encode.quality = 'FullHD';
						break;
					default:
						video_encode.quality = 'SD';
				}
			}
			
			// steps
			video_encode.step = video_encode.step ? video_encode.step : [0,1];
			
			// progress
			video_encode.progress = video_encode.progress ? (video_encode.progress+video_encode.duration*(video_encode.step[0]-1)) : 0;
			// progress total
			video_encode.duration = video_encode.duration ? (video_encode.duration+video_encode.duration*(video_encode.step[1]-1)) : '????';
			
			// procents
			video_encode.percents = video_encode.percents ? video_encode.percents : 0;
			video_encode.percentsFxd = video_encode.percents.toFixed(2); // < 100 ? video_encode.percents.toFixed(2) : ( video_encode.percents == 100 ? 100 : 99 ) ;
			
			if( video_encode.duration == '????' ){
				wait_status++;
				if ( max_wait_time > 0 ) { wait_status_str = ' (Wait '+htime(wait_status)+') [Max wait time: '+htime(max_wait_time)+']'; }
				else { wait_status_str = ' (Wait '+htime(wait_status)+')'; }
			}
			else{
				wait_status_str = '';
			}
			
			video_encode.str  = 'ENC: ['+video_encode.sizes+'] '+video_encode.progress+'/'+video_encode.duration+' ['+video_encode.percentsFxd+'%]';
			video_encode.str += wait_status_str + ' Please wait...';
			updateLine(video_encode.str);
			
			if( wait_status > max_wait_time-1 && max_wait_time > 0 ){
				console.log('\nERR: Encoding status wait error. Please try get encoding status later.');
				process.exit();
			}
			
			if ( video_encode.percents < 100 || video_encode.step[0] < video_encode.step[1] ) {
				setTimeout(function(){ getEncodeStatus(owner_id,video_id,video_hash,video_qua); }, 1000);
			}
			else if ( video_encode.percents == 100 && video_qua < 1 ){
				updateLine(video_encode.str+'\n');
				console.log('MSG: '+video_encode.quality+' video successfully encoded.');
				setTimeout(function(){ getEncodeStatus(owner_id,video_id,video_hash,1); }, 1000);
			}
			else if ( video_encode.percents == 100 && video_qua < 2 && argv['1080'] ){
				updateLine(video_encode.str+'\n');
				console.log('MSG: '+video_encode.quality+' video successfully encoded.');
				setTimeout(function(){ getEncodeStatus(owner_id,video_id,video_hash,2); }, 1000);
			}
			else{
				updateLine(video_encode.str+'\n');
				console.log('MSG: '+video_encode.quality+' video successfully encoded.');
				process.exit();
			}
		});
	});
	post_req.on('error', function(e){
		console.log('\nERR: '+e.message+'. Trying repeat...');
		setTimeout(function(){ getEncodeStatus(owner_id,video_id,video_hash,video_qua); }, 1000);
	});
	post_req.write('');
	post_req.end();
	
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

var wait_status;
var wait_status_str;
var max_wait_time = argv.w ? 0 : 120;
var video_size = 0;

var api = {
	method: 'https://api.vk.com/method/execute.videoSave', v: 5.29, lang: 'en',
	auth_url: 'https://oauth.vk.com/authorize?client_id=4218952&display=page&redirect_uri=https%3A%2F%2Fvk.com%2Fblank.html&response_type=token&scope=video,groups,offline',
	access_token: (argv.k?argv.k:apicfg.access_token), remixsid: (argv.c?argv.c:apicfg.remixsid)
};

if (argv.h || typeof argv['encode-param'] != 'string' && typeof argv.file != 'string' ) {
	console.log(yargs.help());
	process.exit();
}

if( typeof argv['encode-param'] == 'string' && typeof argv.file != 'string' ){
	var param = {}; var params = argv['encode-param'].split(',');
	param.owner_id   = params[0] ? parseInt(params[0],10) : 0;
	param.video_id   = params[1] ? parseInt(params[1],10) : 0;
	param.video_hash = params[2] ? params[2] : '';
	if (argv.v) console.log(('DEBUG: Encode progress url [240/360]: http://vk.com/al_video.php?act=encode_progress&al=1'
		)+'&oid='+param.owner_id+'&vid='+param.video_id+'&hash='+param.video_hash+'&size=240');
	if (argv.v) console.log(('DEBUG: Encode progress url [480/720]: http://vk.com/al_video.php?act=encode_progress&al=1'
		)+'&oid='+param.owner_id+'&vid='+param.video_id+'&hash='+param.video_hash+'&size=480');
	getEncodeStatus(param.owner_id,param.video_id,param.video_hash,0);
}

// '%enc1%\iojs\iojs' '%cr_dl%\scripts\vkpost.js'
// --up-privacy-view 3 --up-privacy-comment 3 --is-private
// --up-privacy-view 3 --up-privacy-comment 3 --file 'video.mp4'
// -g 39841497 -a 5 --file '' -t '[Timecraft]  |  -  [Субтитры]'
// -g 23081559 --gp-no-comments --file '' -t '[AniDub]  |  [] [Cuba77]'

if(argv.file){

	if(!fs.existsSync(argv.file) || fs.existsSync(argv.file) && fs.statSync(argv.file).isDirectory()){
		console.log('ERR: File not selected.');
		console.log('MSG: See help for more information: '+program+' -h');
		process.exit();
	}
	
	var apirequrl  = api.method + '?v=' + api.v + '&lang=' + api.lang; // + '&access_token=' + api.access_token;
		apirequrl += argv.t ? '&name=' + encodeURIComponent(argv.t) : '&name=' + encodeURIComponent(path.parse(argv.file).name);
		apirequrl += argv.d && typeof argv.d == 'string' ? '&description=' + encodeURIComponent(argv.d).replace(/%5Cn/g,'%0A') : '';
		apirequrl += argv.p ? '&wallpost=1' : '';
		apirequrl += argv.r ? '&repeat=1' : '';
		apirequrl += argv.a && typeof argv.a == 'number' && argv.a > 0 ? '&album_id='+argv.a : '';
		
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
	
	apirequrl += argv['is-private'] ? '&is_private=1' : '';
	if (argv.v) console.log('DEBUG: Requested url: '+apirequrl);
	console.log('MSG: Selected file: '+argv.file);
	apirequrl += '&access_token=' + api.access_token;
	
	// --------------------------------------------------------------- request
	var replaceEmbed = /&__ref=vk.api&api_hash=[^&]*/;
	
	request.get(apirequrl, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			body = JSON.parse(body);
			if(body.response && !body.execute_errors && !body.error){
				console.log('MSG: Video title  : '+body.response.uploader_data.title);
				console.log('MSG: Video URL    : https://vk.com/video'+body.response.uploader_data.owner_id+'_'+body.response.uploader_data.video_id);
				var embed_code_msg = body.response.embed_code ? 'MSG: Video embed  : '+body.response.embed_code.replace(replaceEmbed,'')
					: 'ERR: VK api error, video embed url is empty.';
				console.log(embed_code_msg);
				postFile(body.response.uploader_data.owner_id,body.response.uploader_data.upload_url,argv.file);
			}
			else if(body.error && body.error.error_code == 5){
				console.log('ERR ('+body.error.error_code+'): '+body.error.error_msg);
				console.log('MSG: Auth url: '+api.auth_url);
				openAuth(api.auth_url);
			}
			else if(body.error){
				console.log('ERR ('+body.error.error_code+'): '+body.error.error_msg);
			}
			else if(body.execute_errors){
				console.log('ERR ('+body.execute_errors[0].error_code+'): '+body.execute_errors[0].error_msg);
			}
			else{
				console.log('ERR: Unknown error.');
				if (error) console.log(error);
			}
		}
		else{
			console.log('ERR: Unknown error.');
			if (error) console.log('Status:', response.statusCode, '\n', error);
		}
	});

}