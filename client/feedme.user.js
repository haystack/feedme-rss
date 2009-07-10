// ==UserScript==
// @name                FeedMe
// @namespace         http://feedme.csail.mit.edu
// @description       A Greasemonkey script that adds sharing functionality to Google Reader
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

// Fail gracefully if Firebug's not installed
try { console.log('Firebug console found.'); } catch(e) { console = { log: function() {} }; }

var port = 8001;
var script_version = 0.12;
var autocompleteData = null;
// number of recommendations to show when a person asks for more
var moreRecommendations = 3;

/*
 * Gets called when all the required libraries have successfully loaded.  Sets up click listeners.
 */
function init() {
    console.log("Libraries loaded.");
    
    checkVersion();
    setupStyles();
    log_in();
    initAutocomplete();
    
    // initialize with any posts that are open in expanded (cards) view when the page loads
    //console.log($('#entries[class*="cards"] .entry'));
    //$('#entries[class*="cards"] .entry').each(entry_class_modified);
    
    $("#entries").bind("DOMNodeInserted", expandListener);
}

/* Sees if there's a newer version of the script, and if so, prompts the user */
function checkVersion()
{
    console.log("Checking version")
    var urlToCheck = "http://groups.csail.mit.edu/haystack/feedme/current_version.js?" + new Date().getTime();  // date appending ensures that it doesn't cache
    GM_xmlhttpRequest({
        method: 'GET',
        url: urlToCheck,
        headers: {
            'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey/0.3',
            'Accept': 'application/atom+xml,application/xml,text/xml'
        },
        onload: function(responseDetails) {
            console.log("Version data received.");
            versionData = eval(responseDetails.responseText);
            version_available = versionData['version'];
            console.log("Current version: " + script_version + ".   Version available: " + version_available);
            if (version_available > script_version) {
                console.log("Upgrade available!");
                upgrade(version_available, versionData['url'], versionData['whats-new']);
            }
        }
    });
}

function upgrade(version, link, whats_new) {
    $("body").append('<a style="display: none" id="upgrade" href="#upgrade-data"></a><div style="display: none; margin: 5px; background-color: white" id="upgrade-data"><img src="http://groups.csail.mit.edu/haystack/feedme/logo.png" /><h2>FeedMe upgrade</h2><div>FeedMe has released a new version of the script; we recommend that you upgrade as soon as possible.  To upgrade, <a style="color: #FFFFFF" href="' + link + '">click this link</a> and agree to install the script. Then, refresh the page.</div><div><div style="margin: 1em 0 0 0">What\'s new in version ' + version + ':</div>' + whats_new + '</div></div>');
    $("a#upgrade").fancybox( {
        hideOnContentClick: false
    });
    $("a#upgrade").click();
}

function expandListener(event) {
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
}

/*
 * Returns true if the target element is of class "entry" -- e.g., a post
 */
function isEntry(target)
{
    return $(target).hasClass("entry");
}

/*
 * Returns true if the entry element being queried is in expanded (card) view
 */
function isExpandedView(entryTarget)
{
    return $(entryTarget).parent().hasClass("cards");
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
        if (isExpandedView(target) || target.hasClass("expanded")) {
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
        } else {
            suggest_people($(context));
        }
    } catch (e) { 
        console.log(e);
    }
}


/*
 * Adds the friend suggestions contained in array people to node body.
 */
function suggest_people(context) {
    console.log("suggesting people");
    
    var defaultAutocompleteText = "type a name";
    $(".entry-body", context).before('<div class="feedme-suggestion-container"></div>');

    $(".feedme-suggestion-container", context)
    .append('<div class="feedme-suggestions"> \
                    <div class="feedme-placeholder"> \
                        <div class="feedme-person feedme-button"><div>&nbsp;</div></div> \
                        <div class="feedme-num-shared">&nbsp;</div> \
                    </div> \
                </div>')
    .append('<div class="feedme-more-recommendations wait-for-suggestions" style="display: none;"></div>')
    .append('<div class="feedme-autocomplete-added feedme-recommendations-group wait-for-suggestions"></div>')
    .append('<div class="feedme-controls wait-for-suggestions expand-container"></div>');
    
    $(".feedme-more-recommendations", context)
    .append('<div class="feedme-more-recommendations-button feedme-button wait-for-suggestions"><div>&nbsp;</div><div class="feedme-num-shared"><a class="" href="javascript:{}">more...</div></a></div>')
    .append('<div class="feedme-autocomplete-container"><input class="feedme-autocomplete feedme-autocompleteToggle wait-for-suggestions" value="' + defaultAutocompleteText + '"></input><img class="feedme-addImg wait-for-suggestions" src="http://groups.csail.mit.edu/haystack/feedme/plus.png"></img></div>');

    $(".feedme-controls", context)
    /*.append('<div class="feedme-comment-button feedme-button wait-for-suggestions"><img src="http://groups.csail.mit.edu/haystack/feedme/comment.png"></img></div>')*/
    .append('<textarea class="comment-textarea"></textarea></div>')
    .append('<div class="feedme-now-button feedme-button feedme-toggle wait-for-suggestions"><a class="" href="javascript:{}">Now</a></div>')
    .append('<div class="feedme-later-button feedme-button feedme-toggle wait-for-suggestions"><a class="" href="javascript:{}">Later</a></div>');
    //.append('<div class="feedme-toggle-hidden expand-container"><textarea class="comment-textarea"></textarea></div>');

    
    // Clear the autocomplete when they start typing
    suggest_autocomplete(context);
    console.log("autocomplete shit is turned off.");

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

    $('.feedme-now-button', context).click(share_post);
    $('.feedme-later-button', context).click(share_post);
    $('.feedme-more-recommendations-button', context).click(function() {
        var post_url = $('.entry-title a', context).attr('href');
        var postToPopulate = $('.entry-title-link[href="' + post_url + '"]').parents('.entry');
        recommendMorePeople(postToPopulate);
    });
    $('.feedme-comment-button', context).click(function() {
        console.log("comment button clicked");
        var comment_btn = $('.feedme-toggle-hidden', context);
        comment_btn.slideToggle("normal");
    });
    
    server_recommend(context);
}

function server_recommend(context) {
    server_vars = get_post_variables(context);
    
    var theurl = "recommend/";
    var data = {
        feed_title: server_vars["feed_title"],
        feed_url: server_vars["feed_url"],
        post_url: server_vars["post_url"],
        post_title: server_vars["post_title"],
        post_contents: server_vars["post_contents"]
    }
    
    console.log(data)
    ajax_post(theurl, data, populateSuggestions);
}

function get_post_variables(context)
{
    var post_url = $('.entry-title a', context).attr('href');
    var feed_title = $('a.entry-source-title', context).text()
    var feed_url = unescape($('a.entry-source-title', context).attr('href'));
    gReaderString = '/reader/view/feed/';
    var feed_url_loc = feed_url.indexOf(gReaderString);
    if (feed_url_loc >= 0) {
        feed_url = feed_url.substring(feed_url_loc + gReaderString.length);
    }
    var post_title = $('.entry-container .entry-title', context).text();
    var post_contents = $('.entry-body', context).html();	
    
    var post_vars = new Array();
    post_vars["post_url"] = post_url;
    post_vars["feed_title"] = feed_title;
    post_vars["feed_url"] = feed_url;
    post_vars["post_title"] = post_title;
    post_vars["post_contents"] = post_contents;
    return post_vars;
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
    var headers = {
        'User-Agent': 'Mozilla/4.0 (compatible) Greasemonkey',
        'Accept': 'application/json, text/javascript'
    }
    var postData = null;
    if (method == 'POST') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        postData = $.param(data)
    }
    
    url = 'http://feedme.csail.mit.edu:' + port + '/' + url;	// this mitigates a security risk -- we can be sure at worst we're just calling our own server cross-domain
    window.setTimeout(function() {	// window.setTimeout is a loophole to allow page code to call Greasemonkey code
        GM_xmlhttpRequest({
        method: method,
        url: url,
        data: postData,
        headers: headers,
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
    console.log('populating suggestions');
    var people = json["users"];
    var post_url = json["posturl"];
    var previously_shared = json["shared"];
    
    var postToPopulate = $('.entry-title-link[href="' + post_url + '"]').parents('.entry');
    // if we can't find the post, jettison
    if (postToPopulate.size() == 0 || $('.entry-title-link', postToPopulate).attr('href').indexOf(post_url) == -1)
    {
        console.log("cannot find post -- aborting.");
        return;
    }
    
    // if we've already suggested, exit
    if ($('.feedme-suggestions .feedme-placeholder', postToPopulate).size() == 0) {
        console.log("aborting -- results have already been returned for this post.  Otherwise we start adding multiple copies of folks from different AJAX requests.");
        return;
    }
    $('.feedme-placeholder', postToPopulate).remove();
    
    console.log('setting jquery data');
    $(postToPopulate).data('people', people);
    $(postToPopulate).data('previously_shared', previously_shared);
    $(postToPopulate).data('start_person', 0);
    recommendMorePeople(postToPopulate);
}

/*
 * Adds the next set of people to the list of people that can be recommended
 */
function recommendMorePeople(postToPopulate) {
    console.log("recommending more people");
    var people = $(postToPopulate).data('people');
    var start_person = $(postToPopulate).data('start_person');
    var previously_shared = $(postToPopulate).data('previously_shared');
    var header = $(".feedme-suggestions", postToPopulate);
    var div_class = 'feedme-recommendation-group-' + start_person;
    
    var min_length =  start_person + moreRecommendations < people.length ?
                     start_person + moreRecommendations : people.length;
    var expanded_div = null;
    
    if (start_person < min_length) {
        header.append('<div class="expand-container feedme-recommendations-group ' + div_class + '"></div>');
        expanded_div = $('.' + div_class, postToPopulate);
        for (var i = start_person; i < min_length; i++) {
            var person = people[i];
            addFriend(person['email'], person['email'], person['shared_today'], expanded_div, postToPopulate);
        }
     
        if (start_person == 0) {
            expanded_div.removeClass('expand-container');
            expanded_div.css("display", "inline");  // so the placeholder flows with it in the same line
            
            $('.feedme-recommendation-group-0', postToPopulate).append($(".feedme-more-recommendations", postToPopulate));
            $(".feedme-more-recommendations", postToPopulate).css('display', '');
        }
        else {
            expanded_div.slideToggle("normal");
        }        

            // Commented out until we decide what to do with previously shared
            // folks
        for (var j=0; j<previously_shared.length; j++) {
            var person = previously_shared[j];
            $('[email="' + person['email'] + '"]', postToPopulate).addClass("feedme-sent");
        }
    
        $(".wait-for-suggestions", postToPopulate).removeClass("wait-for-suggestions");
        $(postToPopulate).data('start_person', min_length);
    }
}

/*
 * Adds a single friend to the suggestion div.  Takes the name of the friend and the element to append to.
 */
function addFriend(name, email, shared_today, header, context) {
    var newPerson = $('<div class="feedme-person feedme-button" email="' + email + '"><div><a class="feedme-person-link" href="javascript:{}">' + name + '</a></div><div class="feedme-num-shared"></div></div>');
    header.append(newPerson);

    num_shared = $('[email="' + email + '"] .feedme-num-shared', context);
    if (shared_today == null) {
        num_shared.html('&nbsp;');
    }
    else {
        num_shared.text('Received ' + shared_today + ' today');
    }
    // Make the elements interactive
    newPerson.click(toggle_friend);
}

function addFriendAndSelect(name, context) {
    var header = $('.feedme-autocomplete-added', context);
    addFriend(name, name, null, header, context);
    // TODO: This is a horrible hack to replicate the functionality of toggle_friend...
    $(".feedme-person:last", context).toggleClass("feedme-toggle");
    $(".feedme-controls", context).slideDown("normal");
    
    // Because the following call generates a "Component is not available" error when called!
    // It's called out of the jQuery code, apparently because the elements in a GM script are
    // in an XPCNativeWrapper, and jQuery doesn't deal with this.  A similar issue:
    // http://stackoverflow.com/questions/564342/jquery-ui-dialog-throw-errors-when-invoked-from-greasemonkey
    // This seemed to break in FF 3.5 for me.
    //$(".feedme-person:last", context).click();
    
    $('.feedme-autocomplete').val('');
}

/* Selects or deselects a friend */
function toggle_friend(event)
{
    var context = $(this).parents('.entry');
    $(this).removeClass("feedme-sent");
    $(this).toggleClass("feedme-toggle");
    $(".feedme-controls", context).slideDown("normal");
}

function handle_ajax_response(data)
{
    console.log(data);
}

function share_post(event) 
{
    console.log("sharing post.");
    var context = $(this).parents('.entry');
    // remove comment box
    $('.feedme-toggle-hidden', context).slideUp("normal");
    
    // Flash the selected elements
    // Bottom____Color is necessary because jQuery color doesn't animate "borderColor"
    var animateHighlight = { 
        backgroundColor: '#F7EBBB', 
        borderBottomColor: '#9b9b9b',
        borderTopColor: '#9b9b9b',
        borderLeftColor: '#9b9b9b',
        borderRightColor: '#9b9b9b'		
    };
    var animateDefault = {
        backgroundColor: '#FFFFFF',
        borderBottomColor: '#FFFFFF',
        borderTopColor: '#FFFFFF',
        borderLeftColor: '#FFFFFF',
        borderRightColor: '#FFFFFF'
    };
    var animateSelected = {
        backgroundColor: '#f3f5fc',
        borderBottomColor: '#d2d2d2',
        borderTopColor: '#d2d2d2',
        borderLeftColor: '#d2d2d2',
        borderRightColor: '#d2d2d2'
    };
    var animateSent = {
        backgroundColor: '#e0e0e0',
        borderBottomColor: '#d2d2d2',
        borderTopColor: '#d2d2d2',
        borderLeftColor: '#d2d2d2',
        borderRightColor: '#d2d2d2'	
    };
    $(".feedme-person.feedme-toggle", context)
    .animate(animateHighlight, 750)
    .animate(animateSent, 750, function() {
        // clean up
        $(this).removeClass("feedme-toggle")
        .css('background-color', '')
        .css('border', '')
        .addClass("feedme-sent");
    });
    
    $(this)
    .animate(animateHighlight, 750)
    .animate(animateSelected, 750);
    
    var digest = $(this).hasClass("feedme-later-button");
    //var broadcast = ($('.feedme-suggest.feedme-toggle', context).length == 1);
    var recipientDivs = $(".feedme-person.feedme-toggle", context);
    if (recipientDivs.length == 0) {
        console.log("nobody to share with.");
        alert("Please select a contact to share the feed item with.");
        return;
    }
    
    var recipients = new Array();
    for (var i=0; i < recipientDivs.length; i++)
    {
        recipients[i] = recipientDivs[i].getAttribute("email");
    }
    
    server_vars = get_post_variables(context);
    
    var url = "share/";
    console.log("Sharing post with: " + recipients);
    var data = {
        post_url: server_vars["post_url"],
        feed_url: server_vars["feed_url"],
        recipients: recipients,
        comment: $('.comment-textarea', context).val(),
        bookmarklet: false,
        digest: digest
    }
    console.log(data);
    ajax_post(url, data, handle_ajax_response);
}

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
    try {
        $(".feedme-autocomplete", context).autocomplete({
            data: autocompleteData,
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
            },
            result: function(data, value) {            
                if (value) {
                    // add the newly suggested friend to the list
                    addFriendAndSelect(value.to, context);
                }
            }
        });

        $('.ac_results', context).blur(function() {
            var selected = $('.ac_over', context);
            console.log(selected);
            // store the last remembered highlighted person so that if they click '+', we know what they were pointing at
            $(this).data('last_selected_entry', selected);
            return true;
        });
        
        $('.feedme-addImg', context).click(function(event) { $('.feedme-autocomplete', context).trigger("result.autocomplete") });
        //$('.feedme-autocomplete', context).bind('keydown.autocomplete', unsafeWindow.imported);
        $('.feedme-autocomplete', context).bind('keydown.autocomplete', function(event) {
            if (event.which == 13) { // user pushed enter
                text = $('.feedme-autocomplete', context).val();
                // for some reason the following fails brilliantly, even though it works in ui.autocomplete.js
                //$(this).trigger("result.autocomplete", [text, text]);
                
                if (text != '') {
                    addFriendAndSelect(text, context);
                }
            }
        });
    }
    catch(err) {
        console.log(err)
    }
}

/*
 * Adds feedme:'s CSS styles to the page.
 */
function setupStyles() {
    var styles = (<r><![CDATA[
    
    .feedme-suggestions { 
        display: inline; 
    }
    .feedme-person { }
    .feedme-placeholder { 
        display: inline;
    }
    .feedme-button { 
        display: inline-block; 
        padding: 3px 6px; 
        margin: 0px 10px 5px 0px; 
        cursor: pointer; 
        border: 1px solid white;
        vertical-align: top; 
        text-align: center;
    }
    .feedme-toggle { 
        background-color: #f3f5fc;
        border: 1px solid #d2d2d2;
        -moz-border-radius: 5px; 
    }
    .feedme-sent {
        background-color: #e0e0e0;
        border: 1px solid #d2d2d2;
        -moz-border-radius: 5px;         
    }
    .feedme-autocomplete { 
        width: 100px; 
    }
    .feedme-autocomplete-container { 
        display: inline; 
        vertical-align: middle;
        margin-right: 10px; 
    }
    .feedme-autocomplete-added {
    }
    .feedme-autocompleteToggle { 
        color: gray; 
    }
    .feedme-addImg { 
        margin-left: 5px;
        cursor: pointer;
        }
    .wait-for-suggestions { 
        visibility: hidden;
    }
    .expand-container { 
        display: none; 
    }
    .comment-textarea { 
        height: 42px; 
        width: 415px; 
        margin-top: 10px;
        margin-right: 20px; 
    }
    .feedme-num-shared { 
        font-size: 7pt; 
        text-align: right; 
    }
    .feedme-recommend-header { 
        display: inline-block; 
        margin-right: 5px; 
    }
    .feedme-now-button { 
        width: 30px; 
        -moz-border-radius-topright: 0px;
        -moz-border-radius-bottomright: 0px;
        margin-right: 0px; 
        border-right: 0px; 
        vertical-align: bottom; 
    }
    .feedme-later-button { 
        width: 30px; 
        -moz-border-radius-topleft: 0px;
        -moz-border-radius-bottomleft: 0px; 
        vertical-align: bottom; 
    }
    .feedme-more-recommendations {
        display: inline;
    }
    .feedme-recommendations-group {
        position: relative;
        right: 7px;
    }
    /* This is probably a bit dangerous, to be overriding GReader's own CSS.  But we want the 
        buttons to align left, and the padding makes them push right.  So we need to let them
        extend beyond the usual edge of the div
    */
    .entry .entry-main {
        overflow: visible;
    }
    
    ]]></r>).toString();
    
    GM_addStyle(styles);
}

function log_in() {
    console.log('about to check login');
    ajax_get('check_logged_in/', {}, verify_login);
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
    //GM_JQ.src = 'http://code.jquery.com/jquery-latest.js';
    GM_JQ.src = 'http://groups.csail.mit.edu/haystack/feedme/jquery-1.3.2.js';
    GM_JQ.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(GM_JQ);    

/*
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
*/

    var dammit = document.createElement('script');
    dammit.src = 'http://groups.csail.mit.edu/haystack/feedme/imported.js';
    dammit.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(dammit);

    var JQ_autocomplete_uicore = document.createElement('script');
    JQ_autocomplete_uicore.src = 'http://groups.csail.mit.edu/haystack/feedme/jquery-ui-autocomplete/ui/ui.core.js';
    JQ_autocomplete_uicore.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(JQ_autocomplete_uicore); 
    var JQ_autocomplete = document.createElement('script');
    JQ_autocomplete.src = 'http://groups.csail.mit.edu/haystack/feedme/jquery-ui-autocomplete/ui/ui.autocomplete.js';
    JQ_autocomplete.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(JQ_autocomplete);    
    var ui_css_base = document.createElement('link');
    ui_css_base.rel = 'stylesheet';
    ui_css_base.href = 'http://groups.csail.mit.edu/haystack/feedme/jquery-ui-autocomplete/themes/base/ui.all.css';
    ui_css_base.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(ui_css_base);
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'http://groups.csail.mit.edu/haystack/feedme/jquery-ui-autocomplete/themes/base/ui.autocomplete.css';
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
        if(typeof unsafeWindow.jQuery == 'undefined' || typeof unsafeWindow.jQuery.ui == 'undefined' || typeof unsafeWindow.jQuery.ui.autocomplete == 'undefined' || typeof unsafeWindow.jQuery.fn == 'undefined' || typeof unsafeWindow.jQuery.fn.fancybox == 'undefined' || unsafeWindow.jQuery("#entries").size() == 0) {
            window.setTimeout(GM_wait,100);
        }
        
        else {
            $ = unsafeWindow.jQuery.noConflict();	// ensures that gReader gets its $ back
            $(document).ready( function() {
                window.setTimeout(init, 0);     // gives control back to greasemonkey window
            });
        }
    }
    GM_wait();
