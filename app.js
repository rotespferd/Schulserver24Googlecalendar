var moment = require('moment');

var googleSync = require('./googleSync'),
 	schulserver = require('./schulserver24');

var date = moment().second(0);
date.week(date.week()-1);
for (var i = 7; i >= 0; i--) {
	date.week(date.week()+1);
	schulserver.getWeek(moment(date), function(week){
		googleSync.sync(week);
	});
};