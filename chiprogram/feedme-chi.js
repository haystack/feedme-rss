// Fail gracefully if Firebug's not installed
try { console.log('Firebug console found.'); } catch(e) { console = { log: function() {} }; }

function FeedMeChi() {

    // number of recommendations to show when a person asks for more
    var moreRecommendations = 6;
    var FEED_URL = "http://www.nirmalpatel.com/chiProgram/";
    var FEED_TITLE ="CHI 2010 Program";
    var FEEDME_URL = "http://feedme.csail.mit.edu:8002/";
    
    $("div.paper").each(function(i, elt) {
        var paper_id = $(elt).parent().attr("id").split("_")[0] + "_" + $(elt).index();
        $(elt).attr("id", paper_id);
        
        var shareIcon = $("<img>").attr("src", "share.png")
                                  .height(20);
        var shareAnchor = $("<a>").html(shareIcon)
                                  .attr("name", "#" + paper_id)
                                  .addClass("fm-share")
                                  .click(onShareButtonClick);
        $("div.authors", $(elt)).before(shareAnchor);	
    });
    
    function onShareButtonClick(e) {
        // if user is not logged in, show log in/sign up lightbox
        
        // otherwise generate request to fill recommendations
        suggest_people($(e.target).parents("div.paper"));
    }	
    
    var defaultAutocompleteText = "Add a name";
    function suggest_people(context) {
        console.log("suggesting people");
        
        context.find("div.authors").before('<div class="feedme-suggestion-container"></div>');
    
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
        controls.append('<div style="display: inline-block; margin-right: 20px;"> \
                                    <div class="display: inline;"><textarea class="comment-textarea"></textarea></div> \
                                    <div class="feedme-send-individually-area" style="display: inline;"><input class="feedme-send-individually" type="checkbox"></input>send individual emails</div> \
                                </div>');
        controls.append('<div class="feedme-now-button feedme-share-button feedme-button feedme-toggle wait-for-suggestions"><a class="" href="javascript:{}">Now</a></div>')
        .append('<div class="feedme-later-button feedme-share-button feedme-button feedme-toggle wait-for-suggestions"><a class="" href="javascript:{}">Later</a></div>')
        
        // Clear the autocomplete when they start typing
        //suggest_autocomplete(context);
    
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
        
        recommend_recipients(context, populateSuggestions);
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
    
    
    /** Given a sessionid and a 0-indexed paper number, sends a
     * request to feedme for a recommendation, and calls the
     * callback with the result
     **/
    function recommend_recipients(context, callback) {
       var paper = context;
       var post_url = FEED_URL + "#" + context.attr("id");
       var post_title = $(".title", paper).html();
       var post_abstract = $(".abstractText", paper).html()
       var post_contents = post_title + " " + post_abstract;
       var data = {
            feed_title: FEED_TITLE,
            feed_url: FEED_URL,
            post_url: post_url,
            post_title: post_title,
            post_contents: post_contents,
            expanded_view: false
       };
       $.ajax({type: 'GET',
               url: FEEDME_URL + "recommend_jsonp/",
               data: data,
               success: function(data) {callback(data);},
               dataType: "jsonp"
       });
    }
 
    function get_recommended_items(callback) {
        var data = {
            limit: 100,
            feed_url: FEED_URL,
        };
        $.ajax({type: 'GET',
                 url: FEEDME_URL + "recommendation_list/",
                 data: data,
                 success: function(data) {callback(data);},
                 dataType: "jsonp"
        });
    }

    function populateSuggestions(json) {
        console.log('populating suggestions');
        var people = json["users"];
        var post_url = json["posturl"];
        var previously_shared = json["shared"];
        
        var paper_id = post_url.split("#")[1];
        var postToPopulate = $("#" + paper_id);
       
       // if we can't find the post, jettison
        if (postToPopulate.size() == 0 /*|| postToPopulate.find('.entry-title-link').attr('href').indexOf(post_url) == -1*/)
        {
            console.log("cannot find post -- aborting.");
            return;
        }
        
        // if we've already suggested, exit
        if (postToPopulate.find('.feedme-suggestions .feedme-placeholder').size() == 0) {
            console.log("aborting -- results have already been returned for this post.  Otherwise we start adding multiple copies of folks from different AJAX requests.");
            return;
        }
        
        postToPopulate.data('people', people);
        postToPopulate.data('previously_shared', previously_shared);
        postToPopulate.data('start_person', 0);
        recommendMorePeople(postToPopulate);
    
        postToPopulate.find('.feedme-placeholder').remove();
    }
    
    function recommendMorePeople(postToPopulate) {
        console.log("recommending more people");
        var people = postToPopulate.data('people');
        var start_person = postToPopulate.data('start_person');
        var previously_shared = postToPopulate.data('previously_shared');
        var header = postToPopulate.find(".feedme-suggestions");
        var div_class = 'feedme-recommendation-group-' + start_person;
        
        var min_length = start_person + moreRecommendations < people.length ?
                         start_person + moreRecommendations : people.length;
        var expanded_div = null;
        
        if (start_person < min_length || people.length == 0) {
            header.append('<div class="expand-container feedme-recommendations-group ' + div_class + '"></div>');
            expanded_div = postToPopulate.find('.' + div_class);
            for (var i = start_person; i < min_length; i++) {
                var person = people[i];
                addFriend(person['email'], person['email'], person['shared_today'], person['seen_it'], person['sent'], expanded_div, postToPopulate);
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
        
            // use .outerWidth() to account for margin and padding
            var containerWidth = postToPopulate.find("div.feedme-suggestions").outerWidth(true);  	
            // just check width of contents of newly added div  	
            var contentWidth = 0;
            expanded_div.children("div.feedme-person").each(function() {
                contentWidth += $(this).outerWidth(true);
            });
            contentWidth += expanded_div.find("div.feedme-more-recommendations-button").outerWidth(true);
            contentWidth += expanded_div.find("input.feedme-autocomplete").outerWidth(true);
            contentWidth += expanded_div.find("img.feedme-addImg").outerWidth(true);
            
            console.log(containerWidth);
            console.log(contentWidth);
            
            while (contentWidth >= containerWidth) {
                // remove last person from the newly added div
                contentWidth -= expanded_div.find(".feedme-person:last").outerWidth(true);
                expanded_div.find(".feedme-person:last").remove();
                // decrement min_length so that start_person is set to correct value
                min_length -= 1;
            }
    
            postToPopulate.data('start_person', min_length);
            postToPopulate.find(".wait-for-suggestions").removeClass("wait-for-suggestions");
        }
    }

    function is_valid_email(email) {
        return /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i.test(email)
    }
    
    /*
     * Adds a single friend to the suggestion div.  Takes the name of the friend and the element to append to.
     */
    function addFriend(name, email, shared_today, seen_it, sent, header, context) {
        if (!is_valid_email(email)) {
            callError('feedme-invalid-email');
            return false;
        }
        
        var newPerson = $('<div class="feedme-person feedme-button" email="' + email + '"><div><a class="feedme-person-link" href="javascript:{}">' + name + '</a></div><div class="feedme-num-shared">&nbsp;</div></div>');
        header.append(newPerson);
    
        num_shared = context.find('[email="' + email + '"] .feedme-num-shared');
        set_social_feedback(num_shared, newPerson, shared_today, seen_it, sent);
        // Make the elements interactive
        newPerson.click(toggle_friend);
        return true;
    }
    
    function set_social_feedback(num_shared, newPerson, shared_today, seen_it, sent) {
        if (sent) {
            num_shared.text('Sent!');
            newPerson.addClass("feedme-sent");            
        }
        else if (seen_it) {
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
      
    function addFriendAndSelect(name, context) {
        var header = context.find('.feedme-autocomplete-added');
        var result = addFriend(name, name, null, false, false, header, context);
        
        if (!result) {
            return;
        }
        // TODO: This is a horrible hack to replicate the functionality of toggle_friend...
        toggle_friend_button(context.find(".feedme-person:last"));
        
        // Because the following call generates a "Component is not available" error when called!
        // It's called out of the jQuery code, apparently because the elements in a GM script are
        // in an XPCNativeWrapper, and jQuery doesn't deal with this.  A similar issue:
        // http://stackoverflow.com/questions/564342/jquery-ui-dialog-throw-errors-when-invoked-from-greasemonkey
        // This seemed to break in FF 3.5 for me.
        //context.find(".feedme-person:last").click();
        
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
        var sent = response['sent'];
        var email = response['email'];
        
        var postToPopulate = $('.entry-title-link[href="' + post_url + '"]').parents('.entry');    
        var newPerson = postToPopulate.find('.feedme-person[email="' + email + '"]');
        
        set_social_feedback(num_shared, newPerson, shared_today, seen_it, sent);
    }
    
    /* Selects or deselects a friend */
    function toggle_friend(event)
    {
        toggle_friend_button($(this));
    }
    
    function toggle_friend_button(friend)
    {
        var context = friend.parents('.entry');
        friend.removeClass("feedme-sent");
        friend.toggleClass("feedme-toggle");
        context.find(".feedme-controls").slideDown("normal");
        
        // If there is more than one friend toggled, give them the option to cc blindly
        var cc_friends = context.find(".feedme-send-individually-area")
        if (context.find(".feedme-person.feedme-toggle").size() > 1 && cc_friends.css("opacity") == 0) {
            console.log('fading in');
            cc_friends.css('opacity', 0).animate({'opacity': 100});
        }
        else if (context.find(".feedme-person.feedme-toggle").size() == 1 && cc_friends.css('opacity') == 100) {
            cc_friends.animate({'opacity': 0});
        }
    }
      
    function share_post(event) {
        console.log("sharing post.");
        var context = $(this).parents('.paper');
        
        //var broadcast = (context.find('.feedme-suggest.feedme-toggle').length == 1);
        var recipientDivs = context.find(".feedme-person.feedme-toggle");
        if (recipientDivs.length == 0) {
            console.log("nobody to share with.");
            callError('feedme-unselected-contact');
            return;
        }
        
        var autocompleteText = context.find(".feedme-autocomplete").val()
        console.log(autocompleteText);
        if (autocompleteText != "" && autocompleteText != defaultAutocompleteText) {
            console.log("email in autocomplete");
            callError('feedme-orphaned-email');
            context.find(".feedme-autocomplete").focus();
            return;
        }
        
        animate_share($(this), context);    
        var digest = $(this).hasClass("feedme-later-button");    
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
    
        var send_individually = context.find('.feedme-send-individually').attr('checked');
        
        var server_vars = get_post_variables(context);
        
        // TODO: create jsonp share request
        
//         var url = "share/";
//         console.log("Sharing post with: " + recipients);
//         var data = {
//             post_url: server_vars["post_url"],
//             feed_url: server_vars["feed_url"],
//             recipients: recipients,
//             comment: comment,
//             bookmarklet: bookmarklet,
//             digest: digest,
//             send_individually: send_individually
//         }
//         console.log(data);
//         ajax_post(url, data, handle_ajax_response);
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
}

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

