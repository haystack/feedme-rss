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

var port = 80;
var script_version = 0.20;
/* data used to populate the autocomplete widget */
var autocompleteData = null;
/* for toggling on and off parts of the interface */
var user_interface = true;
var social_features = true;
// number of recommendations to show when a person asks for more
var moreRecommendations = 3;
/* is this being loaded through the bookmarklet? */
var bookmarklet = false;
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
    
    var entryContainer = $('#entries');
    if (entryContainer.hasClass('list')) {
        $('.entry').bind("DOMAttrModified", entry_class_modified);
    }
    else if (entryContainer.hasClass('cards')) {
        $('.entry').each(entry_class_modified);
    }
    
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
    $("body").append('<a style="display: none" id="upgrade" href="#upgrade-data"></a><div style="display: none; margin: 20px; background-color: white" id="upgrade-data"><img src="http://groups.csail.mit.edu/haystack/feedme/logo.png" style="width: 425px;" /><div style="margin: 20px;"><h2>FeedMe upgrade</h2><div>FeedMe has released a new version of the script; we recommend that you upgrade as soon as possible.  To upgrade, <a style="color: #FFFFFF" href="' + link + '">click this link</a> and agree to install the script. Then, refresh the page.</div><div><div style="margin: 1em 0 0 0">What\'s new in version ' + version + ':</div>' + whats_new + '</div></div></div>');
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
    return $(entryTarget).parent().hasClass("list");
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
        if($(context).find(".feedme-suggestions").size() > 0) {
            // if we're still looking at an item we've populated before
            return;
        } else {
            suggest_people($(context));
            log_clicks($(context));
        }
    } catch (e) { 
        console.log(e);
    }
}


/*
 * Adds the friend suggestions contained in array people to node body.
 */

var defaultAutocompleteText = "type a name";
function suggest_people(context) {
    console.log("suggesting people");
    
    context.find(".entry-body").before('<div class="feedme-suggestion-container"></div>');

    context.find(".feedme-suggestion-container")
    .append('<div class="feedme-suggestions"> \
                    <div class="feedme-placeholder"> \
                        <div class="feedme-person feedme-button"><div>&nbsp;</div></div> \
                        <div class="feedme-num-shared">&nbsp;</div> \
                    </div> \
                </div>')
    .append('<div class="feedme-more-recommendations wait-for-suggestions" style="display: none;"></div>')
    .append('<div class="feedme-autocomplete-added feedme-recommendations-group wait-for-suggestions"></div>')
    .append('<div class="feedme-controls wait-for-suggestions expand-container"></div>');
    
    context.find(".feedme-more-recommendations")
    .append('<div class="feedme-more-recommendations-button feedme-button wait-for-suggestions"><div>&nbsp;</div><div class="feedme-num-shared"><a class="" href="javascript:{}">more...</div></a></div>')
    .append('<div class="feedme-autocomplete-container"><input class="feedme-autocomplete feedme-autocompleteToggle wait-for-suggestions" value="' + defaultAutocompleteText + '"></input><img class="feedme-addImg wait-for-suggestions" src="http://groups.csail.mit.edu/haystack/feedme/plus.png"></img></div>');

    var controls = context.find(".feedme-controls");
    /*.append('<div class="feedme-comment-button feedme-button wait-for-suggestions"><img src="http://groups.csail.mit.edu/haystack/feedme/comment.png"></img></div>')*/
    controls.append('<textarea class="comment-textarea"></textarea>');
    if (social_features) {
        controls.append('<div class="feedme-now-button feedme-share-button feedme-button feedme-toggle wait-for-suggestions"><a class="" href="javascript:{}">Now</a></div>')
        .append('<div class="feedme-later-button feedme-share-button feedme-button feedme-toggle wait-for-suggestions"><a class="" href="javascript:{}">Later</a></div>');
        //.append('<div class="feedme-toggle-hidden expand-container"><textarea class="comment-textarea"></textarea></div>');
    } else {
        controls.append('<div class="feedme-now-button no-social feedme-share-button feedme-button feedme-toggle wait-for-suggestions"><a class="" href="javascript:{}">Send</a></div>')
    }
    
    // Clear the autocomplete when they start typing
    suggest_autocomplete(context);

    context.find('.feedme-autocomplete').focus(function() {
        if ($(this).val() == defaultAutocompleteText) {
            $(this).val('');
        }
        $(this).toggleClass('feedme-autocompleteToggle');
    });
    context.find('.feedme-autocomplete').blur(function() { 
        if ($(this).val() == '') {
            $(this).val(defaultAutocompleteText);
        }
        $(this).toggleClass('feedme-autocompleteToggle');
        return true;
    });

    context.find('.feedme-now-button').click(share_post);
    context.find('.feedme-later-button').click(share_post);
    context.find('.feedme-more-recommendations-button').click(function() {
        var post_url = context.find('.entry-title a').attr('href');
        var postToPopulate = $('.entry-title-link[href="' + post_url + '"]').parents('.entry');
        recommendMorePeople(postToPopulate);
    });
    context.find('.feedme-comment-button').click(function() {
        console.log("comment button clicked");
        var comment_btn = context.find('.feedme-toggle-hidden');
        comment_btn.slideToggle("normal");
    });
    
    setup_comment_area(context.find('.comment-textarea'));
    
    server_recommend(context);
}

var default_comment_text = "Add an (optional) comment...";
function setup_comment_area(comment) {
    comment.text(default_comment_text)
        .css('color', 'gray')
        .elastic()
        .focus( function() {
            if ($(this).val() == default_comment_text) {
                $(this).val('').css('color', '');
            }
        })
        .blur( function() {
            if ($(this).val() == '') {
                $(this).val(default_comment_text).css('color', 'gray');
            }
        });
}

function server_recommend(context) {
    var server_vars = get_post_variables(context);
    
    var theurl = "recommend/";
    var data = {
        feed_title: server_vars["feed_title"],
        feed_url: server_vars["feed_url"],
        post_url: server_vars["post_url"],
        post_title: server_vars["post_title"],
        post_contents: server_vars["post_contents"],
        expanded_view: server_vars["expanded_view"]
    }
    
    console.log(data)
    ajax_post(theurl, data, populateSuggestions);
}

function log_clicks(context) {
    var links = context.find('.entry-body a, a.entry-title-link').click( link_clicked );
}

function link_clicked() {
    console.log("Link clicked: ")
    console.log($(this));
    
    var entry = $(this).parents('.entry');
    var server_vars = get_post_variables(entry);
    
    var url = "reader_click/";
    var data = {
        post_url: server_vars["post_url"],
        feed_url: server_vars["feed_url"],
    }
    console.log(data);
    ajax_post(url, data, handle_ajax_response);
}

function get_post_variables(context)
{
    var entry_main = context.find('.entry-container .entry-main');
  
    var post_url = entry_main.find('.entry-title a').attr('href');
    var feed_title = entry_main.find('a.entry-source-title').text()
    var feed_url = unescape(entry_main.find('a.entry-source-title').attr('href'));
    gReaderString = '/reader/view/feed/';
    var feed_url_loc = feed_url.indexOf(gReaderString);
    if (feed_url_loc >= 0) {
        feed_url = feed_url.substring(feed_url_loc + gReaderString.length);
    }
    var post_title = entry_main.find('.entry-title').text();
    var post_contents = entry_main.find('.entry-body').html();

    if ($('#view-cards.link-selected').length == 1) {
        var expanded_view = true;
    }
    else {
        var expanded_view = false;
    }

    var post_vars = new Array();
    post_vars["post_url"] = post_url;
    post_vars["feed_title"] = feed_title;
    post_vars["feed_url"] = feed_url;
    post_vars["post_title"] = post_title;
    post_vars["post_contents"] = post_contents;
    post_vars["expanded_view"] = expanded_view;    
    return post_vars;
}

function ajax_post(url, data, callback) {
    ajax_req(url, data, callback, 'POST');
}

function ajax_get(url, data, callback) {
    ajax_req(url, data, callback, 'GET');
}

function generate_url(page_url) {
    url = 'http://feedme.csail.mit.edu'
    if (port != 80) {
        url = url + ':' + port;
    }
    url = url + '/' + page_url;	// this mitigates a security risk -- we can be sure at worst we're just calling our own server cross-domain
    return url;
}

// gives Greasemonkey control so we can call the XMLhttprequest. This is a security risk.
function ajax_req(page_url, data, callback, method)
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
    
    var url = generate_url(page_url);
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
                console.log(responseDetails.responseText);
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
    
    postToPopulate.data('people', people);
    postToPopulate.data('previously_shared', previously_shared);
    postToPopulate.data('start_person', 0);
    recommendMorePeople(postToPopulate);

    postToPopulate.find('.feedme-placeholder').remove();
}

/*
 * Adds the next set of people to the list of people that can be recommended
 */
function recommendMorePeople(postToPopulate) {
    console.log("recommending more people");
    var people = postToPopulate.data('people');
    var start_person = postToPopulate.data('start_person');
    var previously_shared = postToPopulate.data('previously_shared');
    var header = postToPopulate.find(".feedme-suggestions");
    var div_class = 'feedme-recommendation-group-' + start_person;
    
    var min_length =  start_person + moreRecommendations < people.length ?
                     start_person + moreRecommendations : people.length;
    var expanded_div = null;
    
    if (start_person < min_length || people.length == 0) {
        header.append('<div class="expand-container feedme-recommendations-group ' + div_class + '"></div>');
        expanded_div = postToPopulate.find('.' + div_class);
        for (var i = start_person; i < min_length; i++) {
            var person = people[i];
            addFriend(person['email'], person['email'], person['shared_today'], person['seen_it'], expanded_div, postToPopulate);
        }
     
        if (start_person == 0) {
            expanded_div.removeClass('expand-container');
            expanded_div.css("display", "inline");  // so the placeholder flows with it in the same line
            
            postToPopulate.find('.feedme-recommendation-group-0').append(postToPopulate.find(".feedme-more-recommendations"));
            postToPopulate.find(".feedme-more-recommendations").css('display', '');
            
            if (people.length == 0) {
                var more_recommendations_button = postToPopulate.find('.feedme-more-recommendations-button');
                // move the more recommendations to the end of the list and make it invisible; this retains the usual layout with just the autocomplete visible
                postToPopulate.find('.feedme-recommendation-group-0').append(more_recommendations_button);
                more_recommendations_button.css('visibility', 'hidden');
                
                // Undo the special css we usually put there
                postToPopulate.find('.feedme-recommendation-group-0').css('position', 'static').css('right', '0');
                postToPopulate.find('.feedme-recommendation-group-0').prepend($('<span>FeedMe<img src="http://groups.csail.mit.edu/haystack/feedme/like.png" class="feedme-logo-icon" />share with:&nbsp;&nbsp;</span>'));
            }
        }
        else {
            expanded_div.slideToggle("normal");
        }        

        // Initialize previously-shared folks
        for (var j=0; j<previously_shared.length; j++) {
            var person = previously_shared[j];
            postToPopulate.find('[email="' + person['email'] + '"]')
            .addClass("feedme-sent")
            .find('.feedme-num-shared').text('Sent!');
        }

        postToPopulate.data('start_person', min_length);
        postToPopulate.find(".wait-for-suggestions").removeClass("wait-for-suggestions");
    }
}

/*
 * Adds a single friend to the suggestion div.  Takes the name of the friend and the element to append to.
 */
function addFriend(name, email, shared_today, seen_it, header, context) {
    var newPerson = $('<div class="feedme-person feedme-button" email="' + email + '"><div><a class="feedme-person-link" href="javascript:{}">' + name + '</a></div><div class="feedme-num-shared">&nbsp;</div></div>');
    header.append(newPerson);

    num_shared = $('[email="' + email + '"] .feedme-num-shared', context);
    set_social_feedback(num_shared, newPerson, shared_today, seen_it);
    // Make the elements interactive
    newPerson.click(toggle_friend);
}

function set_social_feedback(num_shared, newPerson, shared_today, seen_it) {
    if (social_features) {
        if (seen_it) {
            num_shared.text('Saw it already');
            newPerson.addClass("feedme-sent");
        }
        else if (shared_today != null) {
            var numShared = shared_today + ' FeedMe';
            if (shared_today != 1) {
                numShared = numShared + 's'
            }
            numShared = numShared + ' today';
            num_shared.text(numShared);
        }
    }
}

function addFriendAndSelect(name, context) {
    var header = context.find('.feedme-autocomplete-added');
    addFriend(name, name, null, false, header, context);
    // TODO: This is a horrible hack to replicate the functionality of toggle_friend...
    context.find(".feedme-person:last").toggleClass("feedme-toggle");
    context.find(".feedme-controls").slideDown("normal");
    
    // Because the following call generates a "Component is not available" error when called!
    // It's called out of the jQuery code, apparently because the elements in a GM script are
    // in an XPCNativeWrapper, and jQuery doesn't deal with this.  A similar issue:
    // http://stackoverflow.com/questions/564342/jquery-ui-dialog-throw-errors-when-invoked-from-greasemonkey
    // This seemed to break in FF 3.5 for me.
    //$(".feedme-person:last", context).click();
    
    context.find('.feedme-autocomplete').val('');
    
    // Get social feedback information about them
    var url = 'seen_it/';
    var server_vars = get_post_variables(context);
    var data = {
        post_url: server_vars["post_url"],
        feed_url: server_vars["feed_url"],
        recipient: name
    }
    console.log(data);
    ajax_post(url, data, seen_it_response);
}

function seen_it_response(response) {
    console.log("Seen it response:");
    console.log(response);
    var post_url = response['posturl'];
    var shared_today = response['shared_today'];
    var seen_it = response['seen_it'];
    var email = response['email'];
    
    var postToPopulate = $('.entry-title-link[href="' + post_url + '"]').parents('.entry');    
    var newPerson = postToPopulate.find('.feedme-person[email="' + email + '"]');
    
    set_social_feedback(num_shared, newPerson, shared_today, seen_it);
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
    animate_share($(this), context);
    
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
    
    var comment = context.find('.comment-textarea').val();
    console.log("comment: " + comment);
    if (comment == default_comment_text) {
        comment = '';
    }    
    
    var server_vars = get_post_variables(context);
    
    var url = "share/";
    console.log("Sharing post with: " + recipients);
    var data = {
        post_url: server_vars["post_url"],
        feed_url: server_vars["feed_url"],
        recipients: recipients,
        comment: comment,
        bookmarklet: bookmarklet,
        digest: digest
    }
    console.log(data);
    ajax_post(url, data, handle_ajax_response);
}

function animate_share(shareButton, context) {
    // remove comment box
    context.find('.feedme-toggle-hidden').slideUp("normal");
    
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
    context.find(".feedme-person.feedme-toggle")
    .animate(animateHighlight, 750)
    .animate(animateSent, 750, function() {
        // clean up
        $(this).removeClass("feedme-toggle")
        .css('background-color', '')
        .css('border', '')
        .addClass("feedme-sent");
    })
    .find('.feedme-num-shared')
    .text('Sent!');
    
    shareButton.animate(animateHighlight, 750)
    .animate(animateSelected, 750);
}    

var gdocs_autocompleteData = null;
var feedme_autocompleteData = null;
// Original author mattkolb
// http://userscripts.org/scripts/show/29604
function initAutocomplete() {
    console.log('initializing autocomplete');
    
    // GDocs
    var contacts_xml_url = "http://docs.google.com/c/data/contacts?max=1000";
    GM_xmlhttpRequest({
        method: 'GET',
        url: contacts_xml_url,
        headers: {
        'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey/0.3',
        'Accept': 'application/atom+xml,application/xml,text/xml'
        },
        onload: gdocs_autocomplete_response
    });
    
    // FeedMe
    var feedme_contacts_url = 'address_book/';
    ajax_get(feedme_contacts_url, null, feedme_autocomplete_response);
    
    // Now wait for them to return
    merge_autocomplete();
}

function gdocs_autocomplete_response(responseDetails) {
    console.log('gdocs autocomplete data received');
    var contact_entries = [];
    try {
        // whether to add your gmail address to the list of suggestions
        var add_gmail = true;
        
        // my email address
        // add your email to have it display as the top result on all searches
        // example: var my_email = ["me@myself.com", "my_other@address.com"];
        var my_email = [];    
        
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
    } catch (e) {
        console.log(e);
    }
    gdocs_autocompleteData = contact_entries;
    console.log('gdocs autocomplete data set');
}

function feedme_autocomplete_response(result) {
    console.log('feedme address book autocomplete data received.');
    var contact_entries = []
    for (var i=0; i<result.length; i++) {
        contact_entries.push( { name: result[i]['email'], to: result[i]['email'] } );
    }
    feedme_autocompleteData = contact_entries;
    console.log('feedme address book autocomplete data set.');
}

function merge_autocomplete() {
    if(gdocs_autocompleteData == null || feedme_autocompleteData == null) {
        window.setTimeout(merge_autocomplete, 100);
    } else {         
        console.log('merging autocomplete data');
        autocompleteData = $.merge(gdocs_autocompleteData, feedme_autocompleteData);
        // Garbage collect
        gdocs_autocompleteData = null;
        feedme_autocompleteData = null;
    }
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
        
        $('.feedme-addImg', context).click(function(event) {
            text = $('.feedme-autocomplete', context).val();
            // for some reason the following fails brilliantly, even though it works in ui.autocomplete.js
            //$(this).trigger("result.autocomplete", [text, text]);
            
            if (text != '' && text !=defaultAutocompleteText) {
                addFriendAndSelect(text, context);
            }
        });
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
    console.log('autocomplete ready.');
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
        height: 21px; 
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
    .feedme-share-button {
        width: 30px;
        vertical-align: bottom;
        /*border-color: #FF9900;*/
    }
    .feedme-now-button { 
        -moz-border-radius-topright: 0px;
        -moz-border-radius-bottomright: 0px;
        margin-right: 0px; 
        border-right: 0px;  
    }
    .feedme-now-button.no-social {
        border: 1px solid #d2d2d2;
        -moz-border-radius: 5px; 
    }
    .feedme-later-button { 
        -moz-border-radius-topleft: 0px;
        -moz-border-radius-bottomleft: 0px; 
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
    .feedme-logo-icon {
        position: relative;
        right: 3px;
        top: -3px;
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
        var url = generate_url('accounts/login?iframe');
        $("body").append('<a style="display: none;" id="login-iframe" href="' + url + '">login</a>');
        $("a#login-iframe").fancybox({
            frameWidth: 800,
            frameHeight: 225,
            hideOnContentClick: false,
        });
        $("a#login-iframe").click();
    } else {
        user_interface = json.user_interface == 1;
        console.log("User interface on?: " + user_interface);
        social_features = json.social_features == 1;
        console.log("Social features on?: " + social_features);
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
    
    var JQ_elastic = document.createElement('script');
    JQ_elastic.src = 'http://groups.csail.mit.edu/haystack/feedme/jquery.elastic-1.6.source.js';
    JQ_elastic.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(JQ_elastic);
    
    // Add jQuery-color animation
    var JQ_color = document.createElement('script');
    JQ_color.src = 'http://groups.csail.mit.edu/haystack/feedme/jquery.color.js';
    JQ_color.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(JQ_color);
    
    var $;
    /**
        * We want to give GReader the $ function back ASAP because it tends to mess with the user interface.
        * GReader uses $ in its minified code, and jQuery bashes that up.  So, as soon as jQuery is loaded,
        * we release the $ function.  TODO: we could change our hosted version of jQuery.js 
        * to (at the bottom of the code) call jQuery.noConflict() a first time to absolutely avoid any problems.
        **/
    function safe_$() {
        if(typeof unsafeWindow.jQuery == 'undefined') {
            window.setTimeout(safe_$, 50);
        } else {
            $ = unsafeWindow.jQuery.noConflict();	// ensures that gReader gets its $ back
            console.log("jQuery has released $()");
        }
    }
    safe_$();
    
    function GM_wait() {
        // wait if jQuery or jQuery Autocomplete aren't loaded, or if GReader hasn't finished populating its entries div.
        // TODO: can't figure out how to wait for jQuery Color Animation
        if(typeof unsafeWindow.jQuery == 'undefined' || typeof unsafeWindow.jQuery.ui == 'undefined' || typeof unsafeWindow.jQuery.ui.autocomplete == 'undefined' || typeof unsafeWindow.jQuery.fn == 'undefined' || typeof unsafeWindow.jQuery.fn.fancybox == 'undefined' || typeof unsafeWindow.jQuery.fn.elastic == 'undefined' || unsafeWindow.jQuery(".entry").size() == 0) {
            window.setTimeout(GM_wait,100);
        }
        
        else {
            safe_$();   // just to make double-extra sure that the other callback has occurred
            $(document).ready( function() {
                window.setTimeout(init, 0);     // gives control back to greasemonkey window
            });
        }
    }
    GM_wait();
