// ==UserScript==
// @name          Feedme:
// @namespace     http://feedme.csail.mit.edu
// @description   A Greasemonkey script that adds sharing functionality to Google Reader
// @include             http://google.com/reader/*
// @include             http://*.google.com/reader/*
// @include             https://google.com/reader/*
// @include             https://*.google.com/reader/*
// @unwrap 
// ==/UserScript==

/**
	The MIT License

	Copyright (c) 2009 Massachusetts Institute of Technology

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
*/

var port = 8000;
var autocompleteData = null;
/*
 * Gets called when all the required libraries have successfully loaded.  Sets up click listeners.
 */
function init() {
    // Fail gracefully if Firebug's not installed
    try { console.log('init console... done'); } catch(e) { console = { log: function() {} } }
    console.log("Libraries loaded.");
    
    setupStyles();
    log_in();
    initAutocomplete();
    $("#entries").click(register_entry_click)
    $(document).keypress(register_entry_click);
}

/*
 * Callback when the user clicks to expand a GReader post.
 */
function register_entry_click(event) {
	try {
		if ($("#current-entry").size() == 0) {
			// there are no open feed items
			return;
		}
		if($(".feedme-suggestions").parents("#current-entry").size() > 0) {
			// if we're still looking at the same item, just return
			return;
		}
	    
		// Now we know we're looking at a new post -- we need to populate the friend list.
		console.log("click heard");
		$(".feedme-suggestions").remove();
	    
		suggest_people();
	} catch (e) { 
		console.log(e) 
	}
}


/*
 * Adds the friend suggestions contained in array people to node body.
 */
function suggest_people() {
	var body = $(".entry-body");
	
	var defaultAutocompleteText = "Type a name";
	body.before('<div class="feedme-suggestion-container"><div class="feedme-recommend-header" id="recommend-header"><div>Recommend to:&nbsp;</div><div class="feedme-num-shared">&nbsp;</div></div><div class="feedme-suggestions wait-for-suggestions"><div id="feedme-people-placeholder" class="feedme-person">&nbsp;</div></div></div></div>');
	$(".feedme-suggestion-container").append('<div id="feedme-autocomplete-container" style="display: inline; vertical-align: top;"><input class="feedme-autocomplete feedme-autocompleteToggle wait-for-suggestions" value="' + defaultAutocompleteText + '"></input><img class="feedme-addImg wait-for-suggestions" src="http://groups.csail.mit.edu/haystack/feedme/plus.png"></img></div>')
	.append('<div id="expand-container" class="expand-container"><textarea id="comments" class="comment-textarea"></textarea><a id="send-button" href="javascript:{}">Send</a></div>');
	
	// Clear the autocomplete when they start typing
	suggest_autocomplete();
	$('.feedme-autocomplete').focus(function() {
		$(this).val('');
		$(this).toggleClass('feedme-autocompleteToggle');
	});
	$('.feedme-autocomplete').blur(function() { 
		if ($(this).val() == '') {
			$(this).val(defaultAutocompleteText);
		}
		$(this).toggleClass('feedme-autocompleteToggle');
	});
	//$('#comments').blur(add_comment);
	$('#send-button').click(share_post);
	
	server_recommend();
}

function server_recommend() {
	var post_url = $('#current-entry .entry-title a').attr('href');
	var feed_url_loc = location.href.indexOf('feed%2F');
	var feed_url = location.href.substring(feed_url_loc + 'feed%2F'.length);
	var post_title = $('#current-entry .entry-container .entry-title').text();
	var post_contents = $('#current-entry .entry-body').html();
	
	var theurl = "recommend/";
	var data = {
		feed_url: feed_url,
		post_url: post_url,
		post_title: post_title,
		post_contents: post_contents
	}
	
	console.log(data)
	ajax_post(theurl, data, populateSuggestions);
}

// gives Greasemonkey control so we can call the XMLhttprequest. This is a security risk.
function ajax_post(url, data, callback)
{
	url = 'http://feedme.csail.mit.edu:' + port + '/' + url;	// this mitigates a security risk -- we can be sure at worst we're just calling our own server cross-domain
	window.setTimeout(function() {	// window.setTimeout is a loophole to allow page code to call Greasemonkey code
		GM_xmlhttpRequest({
		method: 'POST',
		url: url,
		data: $.param(data),
		headers: {
			'User-Agent': 'Mozilla/4.0 (compatible) Greasemonkey',
			'Content-Type': 'application/x-www-form-urlencoded',
			'Accept': 'application/json, text/javascript'
		},
		onload: function(responseDetails) {
			if (responseDetails.status == 200) {
				console.log('response received');
				callback(eval("(" + responseDetails.responseText + ")"));
			}
			else {
				console.log('AJAX error: ' + responseDetails.statusText);
			}
		},
		onerror: function(responseDetails) {
			console.log('error');
		}
		});
	}, 0);
}

function populateSuggestions(json) {
	var people = json["users"];
	var post_url = json["posturl"];
	var previously_shared = json["shared"];
	console.log(people);
	
	// We need to make sure that this result is for the post we're looking at
	// However, gReader adds elements to the URL by the time we get the callback,
	// so we use an indexOf to look for the substring rather than equality
	// e.g., post_url = http://www.facebook.com/profile.php?id=2305336
	//        $('.entry-title-link').attr('href') = http://www.facebook.com/profile.php?id=2305336&story_fbid=58363672851
	if ($('.entry-title-link').attr('href').indexOf(post_url) == -1)
	{
		return;	// it returned late, from a previous post -- ignore
	}
		
	$("#feedme-people-placeholder").remove();
	var header = $(".feedme-suggestions");
	for (var i=0; i<people.length; i++) {
		var person = people[i];
		addFriend(person['email'], person['email'], person['shared_today'], header);		
	}
	for (var j=0; j<previously_shared.length; j++) {
		var person = previously_shared[j];
		$('[email="' + person['email'] + '"]').toggleClass("feedme-toggle");
	}
	
	// Make the elements interactive
	$(".feedme-person").click(toggleSuggestion);
	$(".wait-for-suggestions").removeClass("wait-for-suggestions");
}

/*
 * Adds a single friend to the suggestion div.  Takes the name of the friend and the element to append to.
 */
function addFriend(name, email, shared_today, header) {
	$('<div class="feedme-person" email="' + email + '"><div><a class="feedme-person-link" href="javascript:{}">' + name + '</a></div><div class="feedme-num-shared">' + shared_today + ' today</div></div>').appendTo(header);
}

/*
 * Adds a jQuery autocomplete element to the suggestion div.  Hooks up listeners to the new friends that get added.
 */
function suggest_autocomplete() {
	autocompleteWait();
}

function autocompleteWait() {
        if(autocompleteData == null) {
		window.setTimeout(autocompleteWait,100);
	} else {         
		populateAutocomplete();
	}
}

function populateAutocomplete() {
	console.log("populating.");
	$(".feedme-autocomplete").autocomplete(autocompleteData, {
		width: 300,
		max: 6,
		highlight: false,
		multiple: false,
		scroll: true,
		scrollHeight: 300,
		matchContains: true,
		autoFill: false,
		formatItem: function(row, i, max) {
			return row.name + " [" + row.to + "]";
		},
		formatMatch: function(row, i, max) {
			return row.name + " " + row.to;
		},
		formatResult: function(row) {
			return row.to;
		}
	}).result(function(event, item) {
		$(this).val('');
		addFriend(item.to, item.to, 0, $(".feedme-suggestions"));		// add the newly suggested friend to the list
		var newFriend = $(".feedme-person:last");		// find the new guy
		newFriend.click(toggleSuggestion).click();	// add the click listener, and then trigger it to select
	});
	
	$('.feedme-addImg').click(function(event) { $('.feedme-autocomplete').search() });
	console.log('population complete');
}


function handle_ajax_response(data)
{
	console.log(data);
}

/*
 * Callback when somebody is recommended a post.
 */
function toggleSuggestion(event) {
	$(this).toggleClass("feedme-toggle");
	var share = $(this).hasClass("feedme-toggle");	// are we sharing or canceling?
	
	/*
	var recipientEmail = $(this).attr('email');
	var url = "share/email/" + recipientEmail;
	url += "/toggle/" + (share ? 1 : 0);
	console.log(url);
	
	console.log("AJAX: sharing post with " + recipientEmail);
	var data = {
		post_url: $('#current-entry .entry-title a').attr('href'),
	}
	
	console.log(data);
	ajax_post(url, data, handle_ajax_response);
	*/
	
	if ($(".feedme-toggle").length > 0) {
		$('#expand-container').removeClass('expand-container');
	} else
	{
		$('#expand-container').addClass('expand-container');
	}
}

function share_post(event) 
{
	var recipientDivs = $(".feedme-toggle");
	var recipients = new Array();
	for (var i=0; i < recipientDivs.length; i++)
	{
		recipients[i] = recipientDivs[i].getAttribute("email");
	}
	
	var url = "share/";
	console.log("Sharing post with: " + recipients);
	var data = {
		post_url: $('#current-entry .entry-title a').attr('href'),
		recipients: recipients,
		comment: $('#comments').val()
	}
	console.log(data);
	ajax_post(url, data, handle_ajax_response);
}

/*
function add_comment(event) {
	var data = {
		post_url: $('#current-entry .entry-title a').attr('href'),
		comment: $(this).val()
	}
	var url = "comment/";
	
	console.log(data)
	ajax_post(url, data, handle_ajax_response);
}

function send_mail(event) {
	$('#expand-container').addClass('expand-container');
	
	var data = {
		post_url: $('#current-entry .entry-title a').attr('href'),
	}
	var url = "send/";
	
	console.log(data)
	ajax_post(url, data, handle_ajax_response);
}
*/

// Original author mattkolb
// http://userscripts.org/scripts/show/29604
function initAutocomplete() {
	console.log('initializing autocomplete');
	// my email address
	// add your email to have it display as the top result on all searches
	// example: var my_email = ["me@myself.com", "my_other@address.com"];
	var my_email = [];
	var contacts_xml_url = "http://docs.google.com/c/data/contacts?max=1000";
	// whether to add your gmail address to the list of suggestions
	var add_gmail = true;
	var contact_entries = [];
	GM_xmlhttpRequest({
	    method: 'GET',
	    url: contacts_xml_url,
	    headers: {
		'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey/0.3',
		'Accept': 'application/atom+xml,application/xml,text/xml'
	    },
	    onload: function(responseDetails) {
		console.log('autocomplete data received');
		var parser = new DOMParser();
		var dom = parser.parseFromString(responseDetails.responseText,
		    "application/xml");
		if (add_gmail) {
			var display_email = dom.getElementsByTagName('DisplayEmail')[0].textContent;
			var email = dom.getElementsByTagName('Email')[0].textContent;
			if (display_email != 'undefined') {
				var found = false;
				for (var i in my_email) {
					if (my_email[i] == display_email) {
						found = true;
						break;
					}
				}
				if (!found) {
					my_email.push(display_email);
				}
			}
			if (email != 'undefined') {
				found = false;
				for (var i in my_email) {
					if (my_email[i] == email) {
						found = true;
						break;
					}
				}
				if (!found) {
					my_email.push(email);
				}
			}
		}

		var xml_objects = dom.getElementsByTagName('Object');
		for (var i = 0; i < xml_objects.length; i++) {
			var display_names = xml_objects[i].getElementsByTagName('DisplayName');
			if (display_names.length > 0) {
				var xml_addresses = xml_objects[i].getElementsByTagName('Address');
				for (var j = 0; j < xml_addresses.length; j++) {
					contact_entries.push( { name: display_names[0].textContent, to: xml_addresses[j].textContent } );
				}
			}
		}
		
		autocompleteData = contact_entries;
		console.log('autocomplete data set');
	    }
	});
}

/*
 * Adds feedme:'s CSS styles to the page.
 */
function setupStyles() {
	var suggestionStyle = '.feedme-suggestions { display: inline-block; }';
	GM_addStyle(suggestionStyle);
	var buttonStyle = '.feedme-person { display: inline-block; padding: 3px 6px; margin-right: 10px; cursor: pointer; border: 1px solid white;}';
	GM_addStyle(buttonStyle);
	var toggleStyle = '.feedme-toggle { background-color: #f3f5fc; border: 1px solid #d2d2d2; }';
	GM_addStyle(toggleStyle);
	var autocompleteStyle = '.feedme-autocomplete { width: 150px; }';
	GM_addStyle(autocompleteStyle);
	var autocompleteToggleStyle = '.feedme-autocompleteToggle { color: gray; }';
	GM_addStyle(autocompleteToggleStyle);
	var addImgStyle= '.feedme-addImg { margin-left: 5px; }';
	GM_addStyle(addImgStyle);
	var waitForSuggestionStyle= '.wait-for-suggestions { visibility: hidden; }';
	GM_addStyle(waitForSuggestionStyle);
	var expandContainerStyle = '.expand-container { display: none; }';
	GM_addStyle(expandContainerStyle);
	var commentStyle = '.comment-textarea { height: 42px; width: 415px; margin-top: 10px; margin-right: 20px; }';
	GM_addStyle(commentStyle);
	var numSharedStyle = '.feedme-num-shared { font-size: 7pt; text-align: right; }';
	GM_addStyle(numSharedStyle);
	var recommendHeaderStyle = '.feedme-recommend-header { display: inline-block; }';
	GM_addStyle(recommendHeaderStyle);
}

function log_in() {
	$("body").append('<iframe id="login-iframe" src="http://feedme.csail.mit.edu:' + port + '/loggedin" width="400px" height="400px" marginwidth="0" marginheight="0" hspace="0" vspace="0" frameborder="1" style="position: absolute; left: 50px; top: 50px; z-index: 999; background-color: white;"></iframe>');
	$('#login-iframe').ready(function() {
		if ($('#login-iframe').attr('src') == 'http://feedme.csail.mit.edu:' + port + '/loggedin') {
			// they have a session
			$('#login-iframe').remove();
		}
	});
}


// This is called on startup -- initializes jQuery etc.

// from http://joanpiedra.com/jquery/greasemonkey/ and
// http://groups.google.com/group/ubiquity-firefox/msg/c4d1336793e5d6ed
// Add jQuery
    var GM_JQ = document.createElement('script');
    GM_JQ.src = 'http://code.jquery.com/jquery-latest.js';
    GM_JQ.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(GM_JQ);    
    
// Add jQuery-autocomplete
    var JQ_autocomplete = document.createElement('script');
    JQ_autocomplete.src = 'http://groups.csail.mit.edu/haystack/feedme/jquery.autocomplete.js';
    JQ_autocomplete.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(JQ_autocomplete);    
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'http://groups.csail.mit.edu/haystack/feedme/jquery.autocomplete.css';
    link.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(link);
    
    // Check if jQuery and jQuery-autocomplete are loaded
    function GM_wait() {
	// wait if jQuery, jQuery Autocomplete aren't loaded, or if GReader hasn't finished populating its entries div.
        if(typeof unsafeWindow.jQuery == 'undefined' || typeof unsafeWindow.jQuery.Autocompleter == 'undefined' || unsafeWindow.jQuery("#entries").size() == 0) {
		window.setTimeout(GM_wait,100);
	}
	else {
		$ = unsafeWindow.jQuery.noConflict();	// ensures that gReader gets its $ back
		init(); 
	}
    }
    GM_wait();
