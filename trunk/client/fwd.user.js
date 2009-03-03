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

function feedme_main() {
    setupStyles();
    document.getElementById('entries').addEventListener('click', register_entry_click, false);
}

function register_entry_click() {
    if($(".feedme-enabled").parents("#current-entry").size() > 0) {
	// if we're still looking at the same item, just return
	return;
    }
    $(".feedme-enabled").remove();
    
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

function suggest_people(people, body) {
	body.before('<div class="feedme-enabled"></div>');
	var header = $(".feedme-enabled");
	for (var i=0; i<people.length; i++) {
		var person = people[i];
		header.append('<div class="fwd-person" style="display: inline;">' + person['name'] + '</div>');
		//header.append("<img src='" + person['photo'] + "' style='height: 50px;'>");
	}
	
	$(".fwd-person").click(toggleSuggestion);
}

function toggleSuggestion(event) {
	$(this).toggleClass("toggle");
	console.log($(this));
}

function setupStyles() {
	var buttonStyle = '.fwd-person { height: 25px; padding: 10px; border: 1px solid darkGray; margin-right: 10px; cursor: pointer; }';
	GM_addStyle(buttonStyle);
	var toggleStyle = '.toggle { background-color: gray; }';
	GM_addStyle(toggleStyle);
}

// from http://joanpiedra.com/jquery/greasemonkey/ and
// http://groups.google.com/group/ubiquity-firefox/msg/c4d1336793e5d6ed
// Add jQuery
    var GM_JQ = document.createElement('script');
    GM_JQ.src = 'http://jquery.com/src/jquery-latest.js';
    GM_JQ.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(GM_JQ);

// Check if jQuery's loaded
    function GM_wait() {
        if(typeof unsafeWindow.jQuery == 'undefined') { window.setTimeout(GM_wait,100);
    } else { 
        $ = unsafeWindow.jQuery;
        feedme_main(); }
    }
    GM_wait();

