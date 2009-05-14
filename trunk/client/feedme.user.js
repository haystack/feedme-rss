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
    
	// initialize with any posts that are open in expanded (cards) view when the page loads
	//console.log($('#entries[class*="cards"] .entry'));
	//$('#entries[class*="cards"] .entry').each(entry_class_modified);
	
	$("#entries").bind("DOMNodeInserted", function(event) {
		if (!isEntry(event.target)) {
			// we're not looking at a post
			return;
		}
		
		// if it's expanded view
		if (isExpandedView(event.target))
		{
			// immediately send the query
			$(event.target).each(entry_class_modified);
		}
		// if it's list view
		else if (isListView(event.target))
		{
			// listen for when its class changes
			$(event.target).bind("DOMAttrModified", entry_class_modified);
		}
	});
}

/*
 * Returns true if the target element is of class "entry" -- e.g., a post
 */
function isEntry(target)
{
	return $(target).attr("class").indexOf("entry") != -1;
}

/*
 * Returns true if the entry element being queried is in expanded (card) view
 */
function isExpandedView(entryTarget)
{
	return $(entryTarget).parent().attr("class").indexOf("cards") != -1;
}

/*
 * Returns true if the entry element being queried is in list view
 */
function isListView(entryTarget)
{
	return $(entryTarget).parent().attr("class").indexOf("list") != -1;
}

/**
 * Listener when an entry gets class information modified, so we 
 * know if the user is looking at a new one
 */
function entry_class_modified(event) {
	var target = $(this);
	if (isEntry(target)) {
		// if it's expanded view or list view and that post has been expanded, fetch recommendations
		if (isExpandedView(target) || target.attr("class").indexOf("expanded") != -1) {
			register_entry_click(target);
		}
	}
}

/*
 * Callback when the user clicks to expand a GReader post.
 */
function register_entry_click(context) {
	try {
		if($(".feedme-suggestions", $(context)).size() > 0) {
			// if we're still looking at an item we've populated before
			return;
		}
		suggest_people($(context));
	} catch (e) { 
		console.log(e) 
	}
}


/*
 * Adds the friend suggestions contained in array people to node body.
 */
function suggest_people(context) {
	console.log("suggesting people");
	
	var defaultAutocompleteText = "Type a name";
	$(".entry-body", context).before('<div class="feedme-suggestion-container"><div class="feedme-recommend-header"><div>Recommend to:</div><div class="feedme-num-shared">&nbsp;</div></div><div class="feedme-suggestions wait-for-suggestions"><div id="feedme-people-placeholder" class="feedme-person feedme-button">&nbsp;<div class="feedme-num-shared">&nbsp;</div></div></div></div></div>');
	$(".feedme-suggestion-container", context).append('<div class="wait-for-suggestions" style="display: inline;"><div class="feedme-autocomplete-container"><input class="feedme-autocomplete feedme-autocompleteToggle wait-for-suggestions" value="' + defaultAutocompleteText + '"></input><img class="feedme-addImg wait-for-suggestions" src="http://groups.csail.mit.edu/haystack/feedme/plus.png"></img></div>')
	.append('<div class="feedme-comment-button feedme-button wait-for-suggestions"><img src="http://groups.csail.mit.edu/haystack/feedme/comment.png"></img></div>')
	.append('<div class="feedme-button feedme-toggle feedme-send wait-for-suggestions"><a class="feedme-send-button" href="javascript:{}">Send</a></div>')
	.append('<div class="feedme-toggle-hidden expand-container"><textarea class="comment-textarea"></textarea></div></div>');
	
	// Clear the autocomplete when they start typing
	suggest_autocomplete(context);
	$('.feedme-autocomplete', context).focus(function() {
		if ($(this).val() == defaultAutocompleteText) {
			$(this).val('');
		}
		$(this).toggleClass('feedme-autocompleteToggle');
	});
	$('.feedme-autocomplete', context).blur(function() { 
		if ($(this).val() == '') {
			$(this).val(defaultAutocompleteText);
		}
		$(this).toggleClass('feedme-autocompleteToggle');
		return true;
	});
	//$('#comments').blur(add_comment);
	$('.feedme-send-button', context).click(share_post);
	$('.feedme-comment-button', context).click(function() {
		console.log("comment button clicked");
		var comment_btn = $('.feedme-toggle-hidden', context);
		comment_btn.slideToggle("normal");
	});
	
	server_recommend(context);
}

function server_recommend(context) {
	var post_url = $('.entry-title a', context).attr('href');
	var feed_title = $('a.entry-source-title', context).text()
	var feed_url = unescape($('a.entry-source-title', context).attr('href'));
	var feed_url_loc = feed_url.indexOf('feed/');
	feed_url = feed_url.substring(feed_url_loc + 'feed/'.length);
	var post_title = $('.entry-container .entry-title', context).text();
	var post_contents = $('.entry-body', context).html();
	
	var theurl = "recommend/";
	var data = {
		feed_title: feed_title,
		feed_url: feed_url,
		post_url: post_url,
		post_title: post_title,
		post_contents: post_contents
	}
	
	console.log(data)
	ajax_post(theurl, data, populateSuggestions);
}

function ajax_post(url, data, callback) {
    ajax_req(url, data, callback, 'POST');
}

function ajax_get(url, data, callback) {
    ajax_req(url, data, callback, 'GET');
}

// gives Greasemonkey control so we can call the XMLhttprequest. This is a security risk.
function ajax_req(url, data, callback, method)
{
	url = 'http://feedme.csail.mit.edu:' + port + '/' + url;	// this mitigates a security risk -- we can be sure at worst we're just calling our own server cross-domain
	window.setTimeout(function() {	// window.setTimeout is a loophole to allow page code to call Greasemonkey code
		GM_xmlhttpRequest({
		method: method,
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
				console.log('AJAX error: "' + responseDetails.statusText + '" for URL: ' + url);
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
	console.log(post_url);
	console.log(people);
	console.log(previously_shared);
	
	var postToPopulate = $('.entry-title-link[href="' + post_url + '"]').parents('.entry');
	// if we can't find the post, jettison
	if (postToPopulate.size() == 0 || $('.entry-title-link', postToPopulate).attr('href').indexOf(post_url) == -1)
	{
		return;
	}
		
	$("#feedme-people-placeholder", postToPopulate).remove();
	var header = $(".feedme-suggestions", postToPopulate);
	for (var i=0; i<people.length; i++) {
		var person = people[i];
		addFriend(person['email'], person['email'], person['shared_today'], header);		
	}
	for (var j=0; j<previously_shared.length; j++) {
		var person = previously_shared[j];
		$('[email="' + person['email'] + '"]', postToPopulate).addClass("feedme-toggle").addClass("feedme-sent");
	}
	
	// Make the elements interactive
	$(".feedme-person", postToPopulate).click(toggleSuggestion);
	$(".wait-for-suggestions", postToPopulate).removeClass("wait-for-suggestions");
}

/*
 * Adds a single friend to the suggestion div.  Takes the name of the friend and the element to append to.
 */
function addFriend(name, email, shared_today, header) {
	$('<div class="feedme-person feedme-button" email="' + email + '"><div><a class="feedme-person-link" href="javascript:{}">' + name + '</a></div><div class="feedme-num-shared">' + shared_today + ' today</div></div>').appendTo(header);
}

/*
 * Adds a jQuery autocomplete element to the suggestion div.  Hooks up listeners to the new friends that get added.
 */
function suggest_autocomplete(context) {
	autocompleteWait(context);
}

function autocompleteWait(context) {
	if(autocompleteData == null) {
		window.setTimeout(autocompleteWait, 100, context);
	} else {         
		populateAutocomplete(context);
	}
}

function populateAutocomplete(context) {
	$(".feedme-autocomplete", context).autocomplete(autocompleteData, {
		width: 300,
		max: 6,
		multiple: false,
		scroll: true,
		scrollHeight: 300,
		matchContains: true,
		mustMatch: false,
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
        added = false;
		if (item) {
	    	addFriend(item.to, item.to, 0, $(".feedme-suggestions", context));		// add the newly suggested friend to the list
	    	added = true;
		} else if ($(this).val() != '') {
            addFriend($(this).val(), $(this).val(), 0, $(".feedme-suggestions", context));
            added = true;
		}
		
		if (added == true) {
    		$(this).val('');
	    	var newFriend = $(".feedme-person:last", context);		// find the new person
	        newFriend.click(toggleSuggestion).click();	// add the click listener, and then trigger it to select
	    }
	});
	
	$('.ac_results', context).blur(function() {
		var selected = $('.ac_over', context);
		console.log(selected);
		// store the last remembered highlighted person so that if they click '+', we know what they were pointing at
		$(this).data('last_selected_entry', selected);
		return true;
	});
	
	$('.feedme-addImg', context).click(function(event) { $('.feedme-autocomplete', context).search() });
	$('.feedme-autocomplete', context).keydown(function(event) {
	    if (event.which == 13) { // user pushed enter
	        $('.feedme-autocomplete', context).search();
	    }
	});
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
}

function share_post(event) 
{
	console.log("sharing post.");
	context = $(this).parents('.entry')
	var recipientDivs = $(".feedme-person.feedme-toggle", context);
	if (recipientDivs.length == 0) {
		console.log("nobody to share with.");
		alert("Please select a contact to share the article with.");
		return;
	}
	
	// remove comment box
	$('.feedme-toggle-hidden', context).slideUp("normal");
	$(".feedme-toggle.feedme-person", context).animate( { backgroundColor: '#F7EBBB', borderColor: '#9b9b9b' }, 750).addClass("feedme-sent");
	
	var recipients = new Array();
	for (var i=0; i < recipientDivs.length; i++)
	{
		recipients[i] = recipientDivs[i].getAttribute("email");
	}
	
	var url = "share/";
	console.log("Sharing post with: " + recipients);
	var data = {
		post_url: $('.entry-title a', context).attr('href'),
		recipients: recipients,
		comment: $('.comment-textarea', context).val()
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
	var suggestionStyle = '.feedme-suggestions { display: inline; }';
	GM_addStyle(suggestionStyle);
	var personStyle = '.feedme-person { display: inline; }';
	GM_addStyle(personStyle);
	var buttonStyle = '.feedme-button { display: inline-block; padding: 3px 6px; margin: 0px 10px 5px 0px; cursor: pointer; border: 1px solid white;}';
	GM_addStyle(buttonStyle);
	var toggleStyle = '.feedme-toggle { background-color: #f3f5fc; border: 1px solid #d2d2d2; -moz-border-radius: 5px; }';
	GM_addStyle(toggleStyle);
	var autocompleteStyle = '.feedme-autocomplete { width: 150px; }';
	GM_addStyle(autocompleteStyle);
	var autocompleteContainerStyle = '.feedme-autocomplete-container { display: inline; vertical-align: top; margin-right: 10px; }';
	GM_addStyle(autocompleteContainerStyle);
	var autocompleteToggleStyle = '.feedme-autocompleteToggle { color: gray; }';
	GM_addStyle(autocompleteToggleStyle);
	var addImgStyle= '.feedme-addImg { margin-left: 5px; cursor: pointer; }';
	GM_addStyle(addImgStyle);
	var waitForSuggestionStyle= '.wait-for-suggestions { visibility: hidden; }';
	GM_addStyle(waitForSuggestionStyle);
	var expandContainerStyle = '.expand-container { display: none; }';
	GM_addStyle(expandContainerStyle);
	var commentStyle = '.comment-textarea { height: 42px; width: 415px; margin-top: 10px; margin-right: 20px; }';
	GM_addStyle(commentStyle);
	var numSharedStyle = '.feedme-num-shared { font-size: 7pt; text-align: right; }';
	GM_addStyle(numSharedStyle);
	var recommendHeaderStyle = '.feedme-recommend-header { display: inline-block; margin-right: 5px; }';
	GM_addStyle(recommendHeaderStyle);
	var sentButtonStyle = '.feedme-send { vertical-align: top; margin-right: 2px; }';
	GM_addStyle(sentButtonStyle);
	var commentButtonStyle = '.feedme-comment-button { vertical-align: top; }';
	GM_addStyle(commentButtonStyle);
	var sentStyle = '.feedme-sent { background-color: #F7EBBB; border-color: #9b9b9b; }';
	GM_addStyle(sentStyle);
}

function log_in() {
    console.log('about to check login');
	ajax_get('check_logged_in', {}, verify_login);
}

function verify_login(json) {
    console.log('verified');
    if (json.logged_in == false) {
        console.log('logged out');
        $("body").append('<a style="display: none;" id="login-iframe" href="http://feedme.csail.mit.edu:' + port + '/accounts/login?iframe">login</a>');
        $("a#login-iframe").fancybox({
            frameHeight: 200,
	    hideOnContentClick: false,
        });
        $("a#login-iframe").click();
    }
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
    
    var JQ_fancybox = document.createElement('script');
    JQ_fancybox.src = 'http://groups.csail.mit.edu/haystack/feedme/jquery.fancybox/jquery.fancybox-1.2.1.js';
    JQ_fancybox.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(JQ_fancybox);    
    link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'http://groups.csail.mit.edu/haystack/feedme/jquery.fancybox/jquery.fancybox.css';
    link.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(link);
    
// Add jQuery-color animation
    var JQ_color = document.createElement('script');
    JQ_color.src = 'http://groups.csail.mit.edu/haystack/feedme/jquery.color.js';
    JQ_color.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(JQ_color);
    
    // Check if jQuery and jQuery-autocomplete are loaded
    function GM_wait() {
	// wait if jQuery or jQuery Autocomplete aren't loaded, or if GReader hasn't finished populating its entries div.
	// TODO: can't figure out how to wait for jQuery Color Animation
        if(typeof unsafeWindow.jQuery == 'undefined' || typeof unsafeWindow.jQuery.Autocompleter == 'undefined' || typeof unsafeWindow.jQuery.fn == 'undefined' || typeof unsafeWindow.jQuery.fn.fancybox == 'undefined' || unsafeWindow.jQuery("#entries").size() == 0) {
		window.setTimeout(GM_wait,100);
	}
	else {
		$ = unsafeWindow.jQuery.noConflict();	// ensures that gReader gets its $ back
		init(); 
	}
    }
    GM_wait();
