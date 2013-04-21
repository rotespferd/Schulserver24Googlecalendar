var config = require('./config.json');
var jQuery = require('jQuery');
var jsdom = require('jsdom');
var Moment = require('moment')
var schoolHoursToTime = require('./schoolHoursToTime.json');

var weekDays = {
	"Sonntag"	:0,
	"Montag"	:1,
	"Dienstag" 	:2,
	"Mittwoch" 	:3,
	"Donnerstag":4,
	"Freitag"	:5,
	"Samstag"	:6,
}


exports.getWeek = function(date, cb){
	var url = generateUrl(date.week(),date.year());
	jsdom.env(url,[], function(errors, window){
		if(errors){
			console.log(errors);
		}else{
			var week = parseHtml(window, date);
			if(cb){
				cb(week);
			}
		}
		
	});
}

function generateUrl(cw,year){
	var schulserver24 = config.schulserver24;
	var url = schulserver24.url.replace('{{school}}', schulserver24.school);
	url += '?lehrer_kuerzel='+schulserver24.teacher.trim();
	url += '&akt_kw='+year+'_'+cw;

	return url;
}

function parseHtml(window,moment){
	var $ = jQuery.create(window);
		
	var week = [{},{},{},{},{},{}];
	
	var plan = $('table tr');
	for (var i = 1; i < plan.length; i++) {
		var row = $(plan[i]).children('td');
		
		for (var j = 1; j < row.length; j++) {
			var field = $(row[j]);
			if(field.hasClass('moreInfo_grid')){
				var infoHtml = field.attr('title');
				var teachingHour = {};
				teachingHour['description'] = getDescription(field, $);
				teachingHour['time'] = getTime(infoHtml, $, moment);
				teachingHour['location'] = getLocation(infoHtml, $);
				teachingHour['isRepresentation'] = 	isRepresentation(field, $);
				teachingHour['push'] = getPushNotification(teachingHour);
				week[j-1][i] = teachingHour;
			}			
				
		};
	}
	return week;

}

function isRepresentation(node, $){
	var result;

	result = $(node).find('span').filter(function(){
		//red and line-through means representation
		var color = $(this).css('color').trim().toLowerCase();
		var lineThrough = $(this).css('text-decoration').trim().toLowerCase();
		return color === 'red' || lineThrough === 'line-through';
	});
	return (result.length != 0) ? true : false;
}

function getTime(infoHtml, $, moment){
	var result = {};
	var schoolHour = infoHtml.split('<br>')[0];
	var array = schoolHour.split(" ");
	var weekDay = array[0];
	schoolHour = array[1];


	var weekDayInt = weekDays[weekDay];
	moment.day(weekDayInt);

	var time = schoolHoursToTime[schoolHour];
	if(time){
		var begin = time.begin.split(':');
		var hour = begin[0];
		var minute = begin[1];
		moment.hour(hour);
		moment.minute(minute);
		result['begin'] = moment.format("YYYY-MM-DDTHH:mm:ssZ");

		var end = time.end.split(':');
		hour = end[0];
		minute = end[1];
		moment.hour(hour);
		moment.minute(minute);
		result['end'] = moment.format("YYYY-MM-DDTHH:mm:ssZ");
	}
	

	return result;
}

function getPushNotification(object){

	var date = Moment(object.time.begin, "YYYY-MM-DDTHH:mm:ssZ");
	var notifiaction = date.format("DD.MM.YYYY HH:mm");

	return notifiaction + " - " +object.description;
}

function getLocation(infoHtml, $){
	//return the room
	var htmlParts = infoHtml.trim().split(' ');

	return htmlParts[htmlParts.length -1].replace('</span>', '');
}

function getDescription(node, $){
	return node.text().split('&nbsp').join(' ').trim();
}
