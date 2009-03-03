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

/*
 * Gets called when all the required libraries have successfully loaded.  Sets up click listeners.
 */
function init() {
    // Fail gracefully if Firebug's not installed
    try { console.log('init console... done'); } catch(e) { console = { log: function() {} } }
    
    setupStyles();
    $("#entries").click(register_entry_click);
}

/*
 * Callback when the user clicks to expand a GReader post.
 */
function register_entry_click() {
    if($(".fwd-suggestions").parents("#current-entry").size() > 0) {
	// if we're still looking at the same item, just return
	return;
    }
    
    // Now we know we're looking at a new post -- we need to populate the friend list.
    $(".fwd-suggestions").remove();
    
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
    
    var body = $(".entry-body");
    suggest_people(people['people'], body);    
}

/*
 * Adds the friend suggestions contained in array people to node body.
 */
function suggest_people(people, body) {
	body.before('<div class="fwd-suggestion-container">Recommend for:&nbsp;<div class="fwd-suggestions"></div></div>');
	var header = $(".fwd-suggestions");
	for (var i=0; i<people.length; i++) {
		var person = people[i];
		addFriend(person['name'], header);		
	}
	$(".fwd-person").click(toggleSuggestion);
	
	suggest_autocomplete($(".fwd-suggestion-container"));
}

/*
 * Adds a single friend to the suggestion div.  Takes the name of the friend and the element to append to.
 */
function addFriend(name, header) {
	var newGuy = header.append('<div class="fwd-person"><a class="fwd-person-link" href="javascript:{}">' + name + '</a></div>');
	//header.append("<img src='" + person['photo'] + "' style='height: 50px;'>");
}

/*
 * Adds a jQuery autocomplete element to the suggestion div.  Hooks up listeners to the new friends that get added.
 */
function suggest_autocomplete(header) {
	header.append('<input class="fwd-autocomplete"></input>');
	$(".fwd-autocomplete").autocomplete(["c++", "java", "php", "coldfusion", "javascript", "asp"], {
		width: 150,
		max: 6,
		highlight: false,
		multiple: false,
		scroll: true,
		scrollHeight: 300
	}).result(function(event, item) {
		addFriend(item, $(".fwd-suggestions"));		// add the newly suggested friend to the list
		var newFriend = $(".fwd-person:last");		// find the new guy
		newFriend.click(toggleSuggestion).click();	// add the click listener, and then trigger it to select
	});
	
	// + sign
	header.append('<img class="fwd-addImg" src="http://groups.csail.mit.edu/haystack/fwd/plus.png"></img>');
	$('.fwd-addImg').click(function(event) { $('.fwd-autocomplete').search() });
}

/*
 * Callback when somebody is recommended a post.
 */
function toggleSuggestion(event) {
	$(this).toggleClass("fwd-toggle");
}

/*
 * Adds Fwd:'s CSS styles to the page.
 */
function setupStyles() {
	var suggestionStyle = '.fwd-suggestions { display: inline-block; }';
	GM_addStyle(suggestionStyle);
	var buttonStyle = '.fwd-person { display: inline-block; line-height: 25px; padding: 3px 6px; margin-right: 10px; cursor: pointer; border: 1px solid white;}';
	GM_addStyle(buttonStyle);
	var toggleStyle = '.fwd-toggle { background-color: #f3f5fc; border: 1px solid #d2d2d2; }';
	GM_addStyle(toggleStyle);
	var autocompleteStyle = '.fwd-autocomplete { width: 150px; }';
	GM_addStyle(autocompleteStyle);
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
        if(typeof unsafeWindow.jQuery == 'undefined' || typeof unsafeWindow.jQuery.Autocompleter == 'undefined') {
		window.setTimeout(GM_wait,100);
    } else { 
        $ = unsafeWindow.jQuery;
        init(); }
    }
    GM_wait();

