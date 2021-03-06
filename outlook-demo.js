
Date.prototype.addHours = function(h) {    
  this.setTime(this.getTime() + (h*60*60*1000)); 
  return this;   
}

function getFutureEvents(events) {
  let timeNow = new Date(Date.now()); 

  let futureEvents = [];  

  events.forEach(function(event){
    let start = event.start.dateTime; 

    if(start > timeNow){
      futureEvents.push(event); 
    } 
  })
  
  return futureEvents;
}

Date.minutesBetween = function( date1, date2 ) {

  // Convert both dates to milliseconds
  var date1_ms = date1.getTime();
  var date2_ms = date2.getTime();

  // Calculate the difference in milliseconds
  var difference_ms = date2_ms - date1_ms;
    
  // Convert back to days and return
  return (difference_ms)/60000; 
}

function timeToString(date){
  let timeNow = date.getHours() + ':'+date.getMinutes(); 

  if(date.getMinutes() < 10) {
    timeNow = date.getHours() + ':0'+date.getMinutes();
  }
  return timeNow; 
}

function returnZoneTwoEvent(event) {
  let startTime = timeToString(event.start.dateTime);  
  let endTime = timeToString(event.end.dateTime);

  let eventSubject = document.createElement('h1'); 
  eventSubject.textContent = event.subject; 
  $(eventSubject).addClass("event-heading")
  let eventDetail = document.createElement('h3');  
  $(eventDetail).addClass("event-detail")
  eventDetail.textContent = 'Area '+event.location.displayName + '-'+startTime + '-'+endTime; 

  let detail = $(document.createElement('div')).append(eventSubject).append(eventDetail);
  detail.addClass("event-container") 
  return detail; 
}


$(function() {
  // App configuration
  var authEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?';
  var redirectUri = 'http://localhost:8080';
  var appId = 'e94524e7-2dfc-4c14-b9e4-db50cd36341a';
  var scopes = 'offline_access openid profile User.Read Mail.Read Calendars.Read Contacts.Read';

  // Check for browser support for sessionStorage
  if (typeof(Storage) === 'undefined') {
    render('#unsupportedbrowser');
    return;
  }

  // Check for browser support for crypto.getRandomValues
  var cryptObj = window.crypto || window.msCrypto; // For IE11
  if (cryptObj === undefined || cryptObj.getRandomValues === 'undefined') {
    render('#unsupportedbrowser');
    return;
  }

  
  $('#nav-container').hover(
    function(){
      $("#nav-child").show();
    },
    function(){
      $("#nav-child").hide();
    }

  )
  
  render(window.location.hash);

  $(window).on('hashchange', function() {
    render(window.location.hash);
  });
  
  function render(hash) {
    var action = hash.split('=')[0];

    // Hide everything
    $('.main-container .page').hide();

    // Check for presence of access token
    var isAuthenticated = (sessionStorage.accessToken != null && sessionStorage.accessToken.length > 0);
    renderNav(isAuthenticated);
    renderTokens();
    
    var pagemap = {
      
      // Welcome page
      '': function() {
        renderWelcome(isAuthenticated);
      },

      // Receive access token
      '#access_token': function() {
        handleTokenResponse(hash);             
      },

      // Signout
      '#signout': function () {
        clearUserState();
        
        // Redirect to home page
        window.location.hash = '#';
      },

      // Error display
      '#error': function () {
        var errorresponse = parseHashParams(hash);
        if (errorresponse.error === 'login_required' ||
            errorresponse.error === 'interaction_required') {
          // For these errors redirect the browser to the login
          // page.
          window.location = buildAuthUrl();
        } else {
          renderError(errorresponse.error, errorresponse.error_description);
        }
      },

      // Display calendar
      '#': function () {
        if (isAuthenticated) {
          hideAll();
          renderCalendar();  
        } else {
          // Redirect to home page
          window.location.hash = '#';
        }
      },

        '#events': function () {
          if (isAuthenticated) {
            hideAll();
            renderEvents();  
          } else {
            // Redirect to home page
            window.location.hash = '#';
          }
        },

      // Shown if browser doesn't support session storage
      '#unsupportedbrowser': function () {
        $('#unsupported').show();
      }
    }
    
    if (pagemap[action]){
      pagemap[action]();
    } else {
      // Redirect to home page
      window.location.hash = '#';
    }


  
  }

  function setActiveNav(navId) {
    $('#navbar').find('li').removeClass('active');
    $(navId).addClass('active');
  }

  function renderNav(isAuthed) {
    if (isAuthed) {
      $('.authed-nav').show();
    } else {
      $('.authed-nav').hide();
    }
  }

  function renderTokens() {
    if (sessionStorage.accessToken) {
      hideAll();
      //$('#calendar', window.parent.document).show();
        renderCalendar(); 
    } else {
      //$('#calendar', window.parent.document).hide();
    }

    /**
   * Jquery function for updating periodically 
   */
  window.setInterval(function(){
    let hash = window.location.hash
    var action = hash.split('=')[0];
    
    if (action === "") {
      hideAll();
      renderCalendar();
    } else{
      renderEvents(); 
      console.log('Hi!');
    }
 }, 30000);
}

function hideAll(){
  $("#zones").hide()
  $("#calendar").hide()
}

  function renderError(error, description) {
    $('#error-name', window.parent.document).text('An error occurred: ' + decodePlusEscaped(error));
    $('#error-desc', window.parent.document).text(decodePlusEscaped(description));
    $('#error-display', window.parent.document).show();
  }
  
  function renderWelcome(isAuthed) {
    setActiveNav('#home-nav');
    if (isAuthed) {
      $('#username').text(sessionStorage.userDisplayName);
     // $('#logged-in-welcome').show();
    } else {
      $('#connect-button').attr('href', buildAuthUrl());
      $('#signin-prompt').show();
    }
  }

  function renderCalendar() {
    $("#zones").show()
    getUserEvents(function(events, error){
      if (error) {
        renderError('getUserEvents failed', error);
      } else {       
        events = parseEventTime(events);
        events = getTodayEvents(events); 
        event_map = parseEvents(events);

        let date = new Date(Date.now());
        let timeNow = date.getHours() + ':'+date.getMinutes(); 

        if(date.getMinutes() < 10) {
          timeNow = date.getHours() + ':0'+date.getMinutes();
        } 
        
        $('#timer').html(timeNow);
        renderMap(event_map); 
      }
    });
  }

  function renderEvents() {
    setActiveNav('#calendar-nav');
    $('#calendar-status').text('Loading...');
    $('#event-list').empty();
    $('#calendar').show();

    getUserEvents(function(events, error){
      if (error) {
        renderError('getUserEvents failed', error);
      } else {       
        console.log(events)
        events = parseEventTime(events);
        events = getTodayEvents(events);
        events = getFutureEvents(events); 

        eventsHTML = []
        events.forEach(function(event){
          eventsHTML.push(returnZoneTwoEvent(event))
        });

        $('#zone-two-events').empty(); 

        if (eventsHTML.length < 1) {
          let newEl = $(document.createElement('div'))
          newEl.addClass('event-full');
          newEl.html('<span style="position:relative; top:30%; left:0; width:100%;">To find out how to create, collaborate and connect in this new space,' 
          +' email the Launchpad team at <span style="color:red">launchpad@murdoch.edu.au</span></span>').css({'text-align': 'center', 
          'font-weight':'bold', 'font-size':'24px'}); 
          $('#zone-two-events').append(newEl); 
        }
        else if(eventsHTML.length === 1) {
          let newEl = eventsHTML[0];
          newEl.addClass('event-full');
          $('#zone-two-events').append(newEl);
        } else{
          let par = document.createElement('div');
          $(par).addClass('slide-show'); 
          $('#zone-two-events').append(par);
          eventsHTML.forEach(function(newEl){
            newEl.addClass('event-full');
            $(par).append(newEl); 
          })
          $('.slide-show').slick(
            {
              autoplay: true,
              autoplaySpeed: 2000,
            }
          );
        }

        /*$('#calendar-status').text('Here are the events on your calendar.');
        var templateSource = $('#event-list-template').html();
        var template = Handlebars.compile(templateSource);

        var eventList = template({events: events});
        $('#event-list').append(eventList);*/
      }
    });
  }

  function parseEventTime(events) {
    events.forEach(function(event){
      let start = new Date(Date.parse(event.start.dateTime));
      start.addHours(8);

      let end = new Date(Date.parse(event.end.dateTime));
      end.addHours(8); 
      
      event.end.dateTime = end; 
      event.start.dateTime = start; 
    })
    return events;  
  }

function renderMap(event_map){
 
 let location_map = new Map ([
  ["PTL","ptl"],
  ["A", "a-zone"], 
  ["B", "b-zone"], 
  ["B1", "b1-zone"], 
  ["B2", "b2-zone"], 
  ["B3", "b3-zone"], 
  ["C", "zone-three"], 
  ["A_PLUS", "aplus-zone"]
 ]) 


 let timeNow = new Date(Date.now());

 for(let key of location_map.keys()){
    let isEngaged = false;
    if (event_map.has(key)){
      for(let  event of event_map.get(key)){
        let start = event.start.dateTime; 
        let end = event.end.dateTime; 

        if(timeNow > start && (timeNow < end)) {
          isEngaged = true;
          if (Math.abs(Date.minutesBetween(timeNow, end)) <= 10) {
            $('#'+location_map.get(key)).removeClass('map-square-occupied');
            $('#'+location_map.get(key)).addClass('map-square-almost-done');
          } else {
            $('#'+location_map.get(key)).addClass('map-square-occupied');
          }
        }
      }
    }
    if (!isEngaged) {
      $('#'+location_map.get(key)).removeClass('map-square-occupied');
      $('#'+location_map.get(key)).removeClass('map-square-almost-done'); 
    }
 }
}

function parseEvents(events){
  let locations = ["PTL","A","B","C","A_PLUS","B1","B2","B3"]

  let out = new Map();

  for (let event of events){
    event.location.displayName = event.location.displayName.trim().toUpperCase();  
    let a_location = event.location.displayName;

    if (locations.includes(a_location)){
      if (!(out.has(a_location))) out.set(a_location, []);
      out.get(a_location).push(event);
    }
  }

  return out;
}

function getTodayEvents(events) {
  let today = new Date(Date.now()); 
  today.setHours(0);
  today.setMinutes(0);
  today.setSeconds(0);  

  console.log('today'+today); 

  let tommorrow = new Date(Date.now()); 
  tommorrow.setHours(0);
  tommorrow.setMinutes(0); 
  tommorrow.setSeconds(0); 

  console.log('tomorrow'+tommorrow); 

  tommorrow.setDate(tommorrow.getDate()+1);

  let eventsToday = []; 

  events.forEach(function(event){
    let start = event.start.dateTime; 
    if(start > today && start < tommorrow && event.subject.indexOf("Canceled") === -1) { 
      eventsToday.push(event); 
    }
  })

  return eventsToday; 
}


  // OAUTH FUNCTIONS =============================

  function buildAuthUrl() {
    // Generate random values for state and nonce
    sessionStorage.authState = guid();
    sessionStorage.authNonce = guid();

    var authParams = {
      response_type: 'id_token token',
      client_id: appId,
      redirect_uri: redirectUri,
      expires_in : '360000',
      scope: scopes,
      state: sessionStorage.authState,
      nonce: sessionStorage.authNonce,
      response_mode: 'fragment'
    };
    console.log($.param(authParams)); 
    return authEndpoint + $.param(authParams);
  }

  function handleTokenResponse(hash) {
    // If this was a silent request remove the iframe
    $('#auth-iframe').remove();

    // clear tokens
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('idToken');

    var tokenresponse = parseHashParams(hash);

    // Check that state is what we sent in sign in request
    if (tokenresponse.state != sessionStorage.authState) {
      sessionStorage.removeItem('authState');
      sessionStorage.removeItem('authNonce');
      // Report error
      window.location.hash = '#error=Invalid+state&error_description=The+state+in+the+authorization+response+did+not+match+the+expected+value.+Please+try+signing+in+again.';
      return;
    }

    sessionStorage.authState = '';
    sessionStorage.accessToken = tokenresponse.access_token;
    
    // Get the number of seconds the token is valid for,
    // Subract 5 minutes (300 sec) to account for differences in clock settings
    // Convert to milliseconds
    var expiresin = (parseInt(tokenresponse.expires_in) - 300) * 1000;
    var now = new Date();
    var expireDate = new Date(now.getTime() + expiresin);
    sessionStorage.tokenExpires = expireDate.getTime();

    sessionStorage.idToken = tokenresponse.id_token;

    validateIdToken(function(isValid) {
      if (isValid) {
        // Re-render token to handle refresh
        renderTokens();
        
        // Redirect to home page
        window.location.hash = '#';
      } else {
        clearUserState();
        // Report error
        window.location.hash = '#error=Invalid+ID+token&error_description=ID+token+failed+validation,+please+try+signing+in+again.';
      }
    });
  }

  function validateIdToken(callback) {
    // Per Azure docs (and OpenID spec), we MUST validate
    // the ID token before using it. However, full validation
    // of the signature currently requires a server-side component
    // to fetch the public signing keys from Azure. This sample will
    // skip that part (technically violating the OpenID spec) and do
    // minimal validation

    if (null == sessionStorage.idToken || sessionStorage.idToken.length <= 0) {
      callback(false);
    }

    // JWT is in three parts seperated by '.'
    var tokenParts = sessionStorage.idToken.split('.');
    if (tokenParts.length != 3){
      callback(false);
    }

    // Parse the token parts
    var header = KJUR.jws.JWS.readSafeJSONString(b64utoutf8(tokenParts[0]));
    var payload = KJUR.jws.JWS.readSafeJSONString(b64utoutf8(tokenParts[1]));

    // Check the nonce
    if (payload.nonce != sessionStorage.authNonce) {
      sessionStorage.authNonce = '';
      callback(false);
    }

    sessionStorage.authNonce = '';

    // Check the audience
    if (payload.aud != appId) {
      callback(false);
    }

    // Check the issuer
    // Should be https://login.microsoftonline.com/{tenantid}/v2.0
    if (payload.iss !== 'https://login.microsoftonline.com/' + payload.tid + '/v2.0') {
      callback(false);
    }

    // Check the valid dates
    var now = new Date();
    // To allow for slight inconsistencies in system clocks, adjust by 5 minutes
    var notBefore = new Date((payload.nbf - 300) * 1000);
    var expires = new Date((payload.exp + 300) * 1000);
    if (now < notBefore || now > expires) {
      callback(false);
    }

    // Now that we've passed our checks, save the bits of data
    // we need from the token.

    sessionStorage.userDisplayName = payload.name;
    sessionStorage.userSigninName = payload.preferred_username;

    // Per the docs at:
    // https://azure.microsoft.com/en-us/documentation/articles/active-directory-v2-protocols-implicit/#send-the-sign-in-request
    // Check if this is a consumer account so we can set domain_hint properly
    sessionStorage.userDomainType = 
      payload.tid === '9188040d-6c67-4c5b-b112-36a304b66dad' ? 'consumers' : 'organizations';

    callback(true);
  }

  function makeSilentTokenRequest(callback) {
    // Build up a hidden iframe
    var iframe = $('<iframe/>');
    iframe.attr('id', 'auth-iframe');
    iframe.attr('name', 'auth-iframe');
    iframe.appendTo('body');
    iframe.hide();

    iframe.load(function() {
      callback(sessionStorage.accessToken);
    });
    
    iframe.attr('src', buildAuthUrl() + '&prompt=none&domain_hint=' + 
      sessionStorage.userDomainType + '&login_hint=' + 
      sessionStorage.userSigninName);
  }

  // Helper method to validate token and refresh
  // if needed
  function getAccessToken(callback) {
    var now = new Date().getTime();
    var isExpired = now > parseInt(sessionStorage.tokenExpires);
    // Do we have a token already?
    if (sessionStorage.accessToken && !isExpired) {
      // Just return what we have
      if (callback) {
        callback(sessionStorage.accessToken);
      }
    } else {
      // Attempt to do a hidden iframe request
      makeSilentTokenRequest(callback);
    }
  }

  // OUTLOOK API FUNCTIONS =======================

  function getUserInboxMessages(callback) {
    getAccessToken(function(accessToken) {
      if (accessToken) {
        // Create a Graph client
        var client = MicrosoftGraph.Client.init({
          authProvider: (done) => {
            // Just return the token
            done(null, accessToken);
          }
        });

        // Get the 10 newest messages
        client
          .api('/me/mailfolders/inbox/messages')
          .top(10)
          .select('subject,from,receivedDateTime,bodyPreview')
          .orderby('receivedDateTime DESC')
          .get((err, res) => {
            if (err) {
              callback(null, err);
            } else {
              callback(res.value);
            }
          });
      } else {
        var error = { responseText: 'Could not retrieve access token' };
        callback(null, error);
      }
    });
  }

  function getUserEvents(callback) {
    getAccessToken(function(accessToken) {
      if (accessToken) {
        // Create a Graph client
        var client = MicrosoftGraph.Client.init({
          authProvider: (done) => {
            // Just return the token
            done(null, accessToken);
          }
        });

        client
          .api('/me/events')
          .top(100)
          .select('subject,start,end,location,createdDateTime')
          .orderby('createdDateTime DESC')

          .get((err, res) => {
            if (err) {
              callback(null, err);
            } else {
              callback(res.value);
            }
          });
      } else {
        var error = { responseText: 'Could not retrieve access token' };
        callback(null, error);
      }
    });
  }

  function getUserContacts(callback) {
    getAccessToken(function(accessToken) {
      if (accessToken) {
        // Create a Graph client
        var client = MicrosoftGraph.Client.init({
          authProvider: (done) => {
            // Just return the token
            done(null, accessToken);
          }
        });

        // Get the first 10 contacts in alphabetical order
        // by given name
        client
          .api('/me/contacts')
          .top(10)
          .select('givenName,surname,emailAddresses')
          .orderby('givenName ASC')
          .get((err, res) => {
            if (err) {
              callback(null, err);
            } else {
              callback(res.value);
            }
          });
      } else {
        var error = { responseText: 'Could not retrieve access token' };
        callback(null, error);
      }
    });
  }

  // HELPER FUNCTIONS ============================

  function guid() {
    var buf = new Uint16Array(8);
    cryptObj.getRandomValues(buf);
    function s4(num) {
      var ret = num.toString(16);
      while (ret.length < 4) {
        ret = '0' + ret;
      }
      return ret;
    }
    return s4(buf[0]) + s4(buf[1]) + '-' + s4(buf[2]) + '-' + s4(buf[3]) + '-' +
      s4(buf[4]) + '-' + s4(buf[5]) + s4(buf[6]) + s4(buf[7]);
  }

  function parseHashParams(hash) {
    var params = hash.slice(1).split('&');
    
    var paramarray = {};
    params.forEach(function(param) {
      param = param.split('=');
      paramarray[param[0]] = param[1];
    });
    
    return paramarray;
  }

  function decodePlusEscaped(value) {
    // decodeURIComponent doesn't handle spaces escaped
    // as '+'
    if (value) {
      return decodeURIComponent(value.replace(/\+/g, ' '));
    } else {
      return '';
    }
  }

  function clearUserState() {
    // Clear session
    sessionStorage.clear();
  }

  Handlebars.registerHelper("formatDate", function(datetime){
    // Dates from API look like:
    // 2016-06-27T14:06:13Z

    var date = new Date(datetime);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  });
});