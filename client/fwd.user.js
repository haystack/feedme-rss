// ==UserScript==
// @name          Fwd:
// @namespace     http://fwd.csail.mit.edu
// @description   A Greasemonkey script that adds sharing functionality to Google Reader
// @include             http://google.com/reader/*
// @include             http://*.google.com/reader/*
// @include             https://google.com/reader/*
// @include             https://*.google.com/reader/*

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

var lastViewedPost = null;
var autocompleteData = null;

/*
 * Gets called when all the required libraries have successfully loaded.  Sets up click listeners.
 */
function init() {
    // Fail gracefully if Firebug's not installed
    try { console.log('init console... done'); } catch(e) { console = { log: function() {} } }
    console.log("Libraries loaded.");
    
    setupStyles();
    initAutocomplete();
    $("#entries").click(register_entry_click);
}

/*
 * Callback when the user clicks to expand a GReader post.
 */
function register_entry_click(event) {
    if($(".fwd-suggestions").parents("#current-entry").size() > 0) {
	// if we're still looking at the same item, just return
	return;
    }
    
    // Now we know we're looking at a new post -- we need to populate the friend list.
    $(".fwd-suggestions").remove();
    
    suggest_people();
}

/*
 * Adds the friend suggestions contained in array people to node body.
 */
function suggest_people() {
	var body = $(".entry-body");
	
	var defaultAutocompleteText = "Type a name";
	body.before('<div class="fwd-suggestion-container">Recommend to:&nbsp;<div class="fwd-suggestions"><div id="fwd-people-placeholder" class="fwd-person">&nbsp;</div></div></div>');
	$(".fwd-suggestion-container").append('<input class="fwd-autocomplete fwd-autocompleteToggle" value="' + defaultAutocompleteText + '"></input>')
	.append('<img class="fwd-addImg" src="http://groups.csail.mit.edu/haystack/fwd/plus.png"></img>');
	
	// Clear the autocomplete when they start typing
	$('.fwd-autocomplete').focus(function() {
		$(this).val('');
		$(this).toggleClass('fwd-autocompleteToggle');
	});
	$('.fwd-autocomplete').blur(function() { 
		if ($(this).val() == '') {
			$(this).val(defaultAutocompleteText);
		}
		$(this).toggleClass('fwd-autocompleteToggle');
	});
	
	// faking it
	var people = {
	    "people": [
		{
		    "name": "Michael Bernstein",
		    "photo": "http://people.csail.mit.edu/msbernst/images/michael.jpg" 
		},
		{
		    "name": "Adam Marcus",
		    "photo": "http://people.csail.mit.edu/msbernst/images/michael.jpg" 
		},
		{
		    "name": "David Karger",
		    "photo": "http://people.csail.mit.edu/msbernst/images/michael.jpg" 
		} 
	    ]
	};
	
	// we're going to simulate a 1.5 second roundtrip to the server to get suggestions
	// so that I can build the UI
	window.setTimeout(function() { populateSuggestions(people['people'], body); }, 1500);
}

function populateSuggestions(people, body) {
	$("#fwd-people-placeholder").remove();
	var header = $(".fwd-suggestions");
	for (var i=0; i<people.length; i++) {
		var person = people[i];
		addFriend(person['name'], header);		
	}
	$(".fwd-person").click(toggleSuggestion);
	
	suggest_autocomplete();
}

/*
 * Adds a single friend to the suggestion div.  Takes the name of the friend and the element to append to.
 */
function addFriend(name, header) {
	$('<div class="fwd-person" ><a class="fwd-person-link" href="javascript:{}">' + name + '</a></div>').appendTo(header);
	//header.append("<img src='" + person['photo'] + "' style='height: 50px;'>");
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
	$(".fwd-autocomplete").autocomplete(autocompleteData, {
		width: 150,
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
		addFriend(item.name, $(".fwd-suggestions"));		// add the newly suggested friend to the list
		var newFriend = $(".fwd-person:last");		// find the new guy
		newFriend.click(toggleSuggestion).click();	// add the click listener, and then trigger it to select
	});
	
	$('.fwd-addImg').click(function(event) { $('.fwd-autocomplete').search() });
}

/*
 * Callback when somebody is recommended a post.
 */
function toggleSuggestion(event) {
	$(this).toggleClass("fwd-toggle");
}

// Original author mattkolb
// http://userscripts.org/scripts/show/29604
function initAutocomplete() {
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
	    }
	});
}

/*
 * Adds Fwd:'s CSS styles to the page.
 */
function setupStyles() {
	var suggestionStyle = '.fwd-suggestions { display: inline-block; }';
	GM_addStyle(suggestionStyle);
	var buttonStyle = '.fwd-person { display: inline-block; padding: 3px 6px; margin-right: 10px; cursor: pointer; border: 1px solid white;}';
	GM_addStyle(buttonStyle);
	var toggleStyle = '.fwd-toggle { background-color: #f3f5fc; border: 1px solid #d2d2d2; }';
	GM_addStyle(toggleStyle);
	var autocompleteStyle = '.fwd-autocomplete { width: 150px; }';
	GM_addStyle(autocompleteStyle);
	var autocompleteToggleStyle = '.fwd-autocompleteToggle { color: gray; }';
	GM_addStyle(autocompleteToggleStyle);
	var addImgStyle= '.fwd-addImg { margin-left: 5px; }';
	GM_addStyle(addImgStyle);
}

// This is called on startup -- initializes jQuery etc.

// from http://joanpiedra.com/jquery/greasemonkey/ and
// http://groups.google.com/group/ubiquity-firefox/msg/c4d1336793e5d6ed
// Add jQuery
    var GM_JQ = document.createElement('script');
    GM_JQ.src = 'http://jquery.com/src/jquery-latest.js';
    GM_JQ.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(GM_JQ);
    
// Add GData API
    var GM_GD = document.createElement('script');
    GM_GD.src = 'http://www.google.com/jsapi';
    GM_GD.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(GM_GD);
    
// Add jQuery-autocomplete
    var JQ_autocomplete = document.createElement('script');
    JQ_autocomplete.src = 'http://groups.csail.mit.edu/haystack/fwd/jquery.autocomplete.js';
    JQ_autocomplete.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(JQ_autocomplete);    
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'http://groups.csail.mit.edu/haystack/fwd/jquery.autocomplete.css';
    link.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(link);
    

// Check if jQuery and jQuery-autocomplete are loaded
    function GM_wait() {
	// wait if jQuery, jQuery Autocomplete aren't loaded, or if GReader hasn't finished populating its entries div.
        if(typeof unsafeWindow.jQuery == 'undefined' || typeof unsafeWindow.jQuery.Autocompleter == 'undefined' || unsafeWindow.jQuery("#entries").size() == 0) {
		window.setTimeout(GM_wait,100);
    } else { 
        $ = unsafeWindow.jQuery;
        init(); }
    }
    GM_wait();

