# Schulserver24GoogleCalendar

This script syncs a [Schulserver24](http://schulserver24.de) timetable with your Google Calendar

### Requirements
* You need Access to the Google Api ( [https://code.google.com/apis/console/](https://code.google.com/apis/console/))
* [Prowl](http://www.prowlapp.com) for Push Notifications (new representation hours)  

## Config
### schulserver24/config.json
```json
{  
  "schulserver24": {  
    "url": "http://{{school}}.schulserver24.de/stundenGrid.php",  
    "school": "rvwbk",  // => your school
    "teacher": "klasse_EIT22"  => school class or teacher
  }  
}
```  

### googleSync/config.json

```json
{
  "consumer_key": "YOUR_CLIENT_ID", // => Google API CLient ID  
  "consumer_secret": "YOUR_CLIENT_SECRET", // => Google API CLient Secret  
  "calendars": {  
    "all": {  
      "name": "CALENDAR_NAME_FOR_ALL" // => Calendar Name for all teaching hours  
    },  
    "representation": {  
      "name": "CALENDAR_NAME_FOR_REPRESENTATION" // => Calendar Name for representation teaching hours  
    }  
  },  
  "prowl_key": "PROWL_API_KEY" // => API_KEY for Prowl Push notifcations, or leave empty ("")  
}
```
