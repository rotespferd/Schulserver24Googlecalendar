
var fs = require('fs'),
	path = require('path'),
	Prowl = require('node-prowl')
	express = require('express'),
	googleapis = require('googleapis'),
	OAuth2Client = googleapis.OAuth2Client;



// ---- config ----
var config = require('./config.json');
var writeConfig = function(){
	fs.writeFile(path.resolve(__dirname,'config.json'), JSON.stringify(config, null, 4), function(err) {
	    if(err) {
	      console.log(err);
	    } 
	}); 
}
// ---- end config ---

// ---- push Notifications ----
var prowl;
if(config.prowl_key && config.prowl_key != ""){
	prowl = new Prowl(config.prowl_key);
}
// ---- end push Notifications ----

// ---- auth ----
var oauth2 = new OAuth2Client(config.consumer_key,config.consumer_secret, 'http://localhost:8082/auth');

var auth = function(cb, week){
	console.log('need to do oauth go to http://localhost:8082/auth');
	var app = express();
	app.all('/auth', function(req, res){
	    if(!req.query.code){
	    	var googleAuthUrl = oauth2.generateAuthUrl({ 
	    			access_type: 'offline', 
	    			scope: 'https://www.googleapis.com/auth/calendar'
	    		});
	    	return res.redirect(googleAuthUrl);
	    }
	    else {
	    	oauth2.getToken(req.query.code, function(err, tokens){
	    		if(err){
	    			res.send(JSON.stringify(err, null, 4));
	    		}else{
	    			config.access_token = tokens.access_token;
	    			config.refresh_token = tokens.refresh_token;
	    			writeConfig(); 
	    			console.log("auth succesful");
	    			res.send("auth succesful");
	    			cb(week);
	    		}
	    		
	    	});
	    }
	});
	app.listen(8082);
}
// ---- end auth ----

// ---- sync ----
var startSync = function(week){
	if(!config['refresh_token']){
		auth(sync, week);
	}else{
		sync(week);
	}
}

var sync = function (week){
	oauth2.credentials = {
  		access_token: config.access_token,
  		refresh_token: config.refresh_token
	};
	// get calId if not set
	googleapis
		.discover('calendar', 'v3')
		.execute(function(err, client){
			if(err){
				console.log(err);
			}else{
				if(!config.calendars.all.id || !config.calendars.representation.id){
					getCalendarIds(client, week, function(){});
				}else{
					updateCalendar(client, config.calendars.all.id, week, false);
					updateCalendar(client, config.calendars.representation.id, week, true)
				}
			}
		});
} 
// ---- end sync ----

// ---- calendar functions ----

var getCalendarIds = function(client, week, cb){
	client
		.calendar.calendarList.list()
		.withAuthClient(oauth2)
		.execute(function(err, calendarList){
			if(err){
				console.log(err);
			}
			else {
				for (var i = calendarList.items.length - 1; i >= 0; i--) {
					var calendar = calendarList.items[i];
					if(config.calendars.all.name == calendar.summary){
						config.calendars.all.id = calendar.id;
						writeConfig();
						cb(client, calendar.id, week, false);	
					}
					if(config.calendars.representation.name == calendar.summary){
						config.calendars.representation.id = calendar.id;
						writeConfig();
						cb(client, calendar.id, week, true);
					}
					if(config.calendars.all.id && config.calendars.representation.id){
						break;
					}
				}
			}
		});
}

var updateCalendar = function(client, calId, week, isRep){
	var day, lesson, lessonId, calEvent;
	// -- find existing events --
	var batchReqeuest = client.newBatchRequest();
	for (var i = 0; i < week.length; i++) {
		day = week[i];
		for(lessonId in day) {
			lesson = day[lessonId];
			if(!isRep || lesson.isRepresentation){
				batchReqeuest.add(getEvent(client, calId, lesson))
			}
		}
	}
	if(batchReqeuest.requests_.length == 0){
		return;
	}

	// -- end find existing events --
	batchReqeuest.withAuthClient(oauth2).execute(function(err, results){
		var counter = 0, calEvent, lessonRequest;
		// update existing events or create --
		var updateBatchRequest = client.newBatchRequest();
		for (var i = 0; i < week.length; i++) {
			day = week[i];
			for(lessonId in day) {
				lesson = day[lessonId];
				if(!isRep || lesson.isRepresentation){
					if(results[counter].items && results[counter].items.length > 0){
						calEvent = results[counter].items[0];
						if(calEvent.start.dateTime === lesson.time.begin){
							lessonRequest = updateLessonRequest(client, calId, lesson, calEvent);
						}
					}else{
						lessonRequest = insertLessonRequest(client, calId, lesson);
					}

					if(lessonRequest != null) {
						// send push for updated/new events
						if(prowl && lesson.isRepresentation && isRep){
							prowl.push(lesson.push, "Berufsschule", function(err, reamain){
								if(err) console.log(err);
							});
						}
						updateBatchRequest.add(lessonRequest);
					}
					counter++;
				}

			}
		}
		if(updateBatchRequest.requests_.length == 0) {
			return; 
		}

		updateBatchRequest.withAuthClient(oauth2).execute(function(err, updateResults){
			if(err){
				console.log(err);
			}
		});
	});
}
// ---- end calendar functions ----

// ---- calendar events ----
var updateLessonRequest = function(client, calId, lesson, calEvent){
	var params = getEventParams(calId, lesson);
	if(	   params.resource.location != calEvent.location 
		|| params.resource.summary != calEvent.summary ) {

		params.eventId = calEvent.id;
		return client.calendar.events.update(params);
	}else{
		return null;
	}
}

var insertLessonRequest = function(client, calId, lesson){
	return client.calendar.events.insert(getEventParams(calId, lesson));
}

var getEvent = function(client, calId, lesson){
	var params = {
		calendarId: calId,
		timeMin: lesson.time.begin,
		timeMax: lesson.time.end,
	}
	return client.calendar.events.list(params);
}

var getEventParams = function(calId, lesson){
	var params = {
		calendarId : calId,
		sendNotifications: lesson.isRepresentation,
		resource: {
			end : { dateTime: lesson.time.end},
			start : {dateTime: lesson.time.begin},
			location : lesson.location,
			summary : lesson.description
		}
	};
	return params;
}
// ---- end calendar events ----


// ---- exports ----
exports.sync = startSync;

// ---- exports ----