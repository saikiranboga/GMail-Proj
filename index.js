var http = require('http'),
	https = require('https'),
	open = require('open'),
	readline = require('readline'),
	google = require('googleapis'),
	OAuth2Client = google.auth.OAuth2,
	gmail = google.gmail('v1');

var parser = require('http-string-parser');

var CLIENT_ID = '678036308788-tg49689s46v6tmrar31e3ct7b81qnq68.apps.googleusercontent.com',
	CLIENT_SECRET = 'F_nARPucHQvKXWk18qaQQrPD',
	REDIRECT_URL = 'http://localhost:9000/oa';
	OAtoken = "";

var server = http.createServer(function(req, res){
	res.writeHead(200, {'Content-Type':'text/html'});
	res.write("Hello");
	if(req.url.indexOf('/oa')==0){
		
		var code = req.url.slice(9);
		// console.log("Received code: " + code);

		getAccessToken(code, function(){
			gmail.users.messages.list({ userId: 'me', auth: oauth2Client, labelIds:["INBOX"], maxResults: 100 }, function(err,list){
				if(err){
					console.log('An error occured', err);
					return;
			  	}
			  	var msgs = list.messages;

			  	var boundary = "batch_foobarbaz";

			  	var bat = "";
			  	function makeBatch(msg){
			  		bat = bat + "--" + boundary + "\n" +
			  				"Content-Type: application/http\n\n"+
			  				"GET /gmail/v1/users/me/messages/"+ msg.id +"\n\n";
			  		if(msgs.length)
			  			makeBatch(msgs.shift());
			  		else{
			  			bat = bat + "--" + boundary + "--";
			  			execBatch();
			  		}
			  	}
			  	makeBatch(msgs.shift());

			  	function execBatch(){
				  	var options = {
				  		host: 'www.googleapis.com',
				        path: '/batch',
				        method: 'POST',
				        accept: '*/*',
				        headers: {
				        	'Authorization': 'Bearer ' + OAtoken,
				        	'Host': 'www.googleapis.com',
				            'Content-Type': 'multipart/mixed; boundary=' + boundary,
				            'Content-Length': bat.length
				        }
				    };
				  	var req_post = https.request(options);
				  	req_post.write(bat);
				  	req_post.end();
				  	var details = "";
				  	var snip;
				  	req_post.on('response', function(response) {
				  		response.on('data', function (chunk) {
				  			details += chunk.toString();
					    });
					    response.on('end', function(){
				    		result = parser.parseResponse(details);
				    		bdy = result.body.split("\r\n");
				    		var res_boundary = bdy[bdy.length-2];
				    		res_boundary = res_boundary.substring(0,res_boundary.length-2);
				    		var objs = [];
				    		var i = 0;
					    	function next(line){
					    		i++;
					    		if(line == res_boundary){
					    			if(bdy.length)
										next(bdy.shift());
					    		}
					    		else if(line == res_boundary + '--'){
					    			res.end("<pre>"+objs.join("\n")+"</pre>");
					    			process.exit();
					    			if(bdy.length)
										next(bdy.shift());
					    		}
					    		else if(line != '' && line && line[0] == '{'){
					    			var hds = JSON.parse(line).payload.headers;
					    			for(var i=0; i<hds.length; i++){
					    				if(hds[i].name=="From"){
					    					objs.push(hds[i].value);
					    					break;
					    				}
					    			}
									if(bdy.length)
										next(bdy.shift());
								}
								else if(bdy.length)
									next(bdy.shift());
					    	}
					    	next(bdy.shift());
					    });
					});
				}
			});
		})
	}
});

function getAccessToken(code, cb){
	oauth2Client.getToken(code, function(err, tokens){
		oauth2Client.setCredentials(tokens);
		OAtoken = tokens.access_token;
		cb();
	});
}

var oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);

var url = oauth2Client.generateAuthUrl({
	access_type: 'offline', // will return a refresh token
	scope: 'https://mail.google.com/'
});

open(url);

server.listen(9000);


/*
//OAUTH client token
var tkn = {
		access_token: 'ya29.xgC4flgrYJVD2nSXX4brhQ1qDpCFk8hwKY7wYPNHArQ5QIZgZZ80k-mq0ge7nJWfN-I7xmvVFLwGAA',
		token_type: 'Bearer',
		expiry_date: 1416686180696
	};
*/

/*
//structure of multipart request body
var bat = "--" + boundary + "\n" +
  	"Content-Type: application/http\n\n" +
  	"GET /gmail/v1/users/me/messages/149d8dcb4f788426?format=minimal\n\n" +
  	"--" + boundary + "\n" +
  	"Content-Type: application/http\n\n"+
  	"GET /gmail/v1/users/me/messages/149d8b7c7d078299?format=minimal\n\n"+
  	"--" + boundary + "--";
*/



/* 
// For fetching single message
var details = "";
for(var i in list.messages){
	gmail.users.messages.get({userId:'me', id:list.messages[i].id, auth: oauth2Client},function(err, msg){
		if(err){
			console.log('An error occured', err);
			return;
		}
		details = details + 
			"From: " + msg.payload.headers.filter(function(v){ return v["name"] == "From"; })[0].value + " | " +
		  	"To: " + msg.payload.headers.filter(function(v){ return v["name"] == "Delivered-To"; })[0].value + " | " +
		  	"Date: " + msg.payload.headers.filter(function(v){ return v["name"] == "Date"; })[0].value;
		if(i==list.messages.length-1){
			res.end(details);
		}
	});
}
*/