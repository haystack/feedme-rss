// Fail gracefully if Firebug's not installed
try { console.log('Firebug console found.'); } catch(e) { console = { log: function() {} }; }

function FeedMeChiActualPaperId(pid) {
  var parts = pid.split("_");
  // original paper format
  if (parts.length == 2) {
    var session_details = $("td#" + parts[0] + "_details");
    if (session_details.length > 0) {
      return $($(".paper", session_details)[parts[1]]).attr('id');
    }
  } else {
    // this is a new paper format
    return pid;
  }
}
    
function FeedMeChi() {

    var logged_in = false;
    /* data used to populate the autocomplete widget */
    var autocompleteData = null;
    /* number of recommendations to show when a person asks for more */
    var moreRecommendations = 3;   
    var FEED_URL = "http://www.nirmalpatel.com/chiProgram/program.html?";
//    var FEED_URL = "http://feedme.csail.mit.edu:8002/static/chiprogram/program.html";
    var FEED_TITLE ="CHI 2010 Program";
    var FEEDME_URL = "http://feedme.csail.mit.edu/";

    function check_logged_in(openDialog, shareEvent) {
        $.ajax({type: 'GET',
           url: FEEDME_URL + "check_logged_in_jsonp/",
           success: function(data) {verify_login(data, openDialog, shareEvent);},
           dataType: "jsonp"
        });
    }
    
    function verify_login(json, openDialog, shareEvent) {
        logged_in = json.logged_in;
        console.log(logged_in ? "logged in" : "logged out");
        if (logged_in) {
            /* Set up recommended items */
            get_recommended_items(populateRecommendedItems);
            if (shareEvent)
                onShareButtonClick(shareEvent);
            return false;
        }
        
        if (openDialog || location.hash != "") {
            /* render login light box */
            requestLogin();
        }
    }
    
    function onShareButtonClick(e) {
        if (!logged_in) {
            check_logged_in(true, e);
            return false;
        }
    
        var context = $(e.target).parents("div.paper");
        var container = $(".feedme-suggestion-container", context);
                
        if (container.length == 0)
            suggest_people(context);
        else 
            container.toggle();
    }	
    
    /* Attach error messages as invisible divs in the DOM so that if they occur,
       callError() can bring them up in a fancybox */
    function setupErrorMessages() {
        setupErrorMessage('feedme-invalid-email', 'The email you entered is not a valid email address. Please enter a valid address, in the form "feedme@csail.mit.edu".');
        setupErrorMessage('feedme-unselected-contact', 'Please select a contact to share the feed item with.');
        setupErrorMessage('feedme-orphaned-email', "It looks like you have an e-mail address in the textbox, but haven't clicked '+' or pressed Enter to confirm the address. Please confirm the address or clear the textbox before sharing.");
    }
    
    /* Attach error messages as invisible divs in the DOM so that if they occur,
       callError() can bring them up in a fancybox */
    function setupErrorMessage(errorname, errormessage) {
        $("body").append('<a style="display: none" id="' + errorname + '" href="#' + errorname + '-data"></a><div style="display: none;"><div style="width:500px;height:300px;overflow:auto;" id="' + errorname + '-data"><img src="http://groups.csail.mit.edu/haystack/feedme/logo.png" style="width: 425px;" /><div style="margin:20px;"><h2>Error</h2><div>' + errormessage + '</div></div></div></div>');
      $("a#" + errorname).fancybox({
        'titlePosition'   : 'inside',
        'transitionIn'    : 'none',
        'transitionOut'   : 'none'
      });
    }

    function setupLogin() {
        var url = FEEDME_URL + "accounts/register?iframe";
        
        $("body").append('<a style="display: none;" id="login-iframe" href="' + url + '">login</a>');
        $("a#login-iframe").fancybox({
            type: "iframe",
            width: "90%",
            height: "90%",
            onClosed: function() { check_logged_in(false, null);},
            autoScale: false,
            transitionIn: "none",
            transitionOut: "none"
        });

    }

    function requestLogin() {
        $("a#login-iframe").click();        
    }
    
    /* Bring up the error message generated in setupErrorMessage() */
    function callError(errorname) {
        $("a#" + errorname).click();
    }

    var defaultAutocompleteText = "Add an email address";
    function suggest_people(context) {
        console.log("suggesting people");
        
        context.find("div.authors").before('<div class="feedme-suggestion-container"></div>');
    
        context.find(".feedme-suggestion-container")
        .append('<div class="feedme-loading">Loading recommendations...</div>')
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
        controls.append('<div class="feedme-now-button feedme-share-button feedme-button feedme-toggle wait-for-suggestions"><a class="" href="javascript:{}">Share</a></div>');
        //.append('<div class="feedme-later-button feedme-share-button feedme-button feedme-toggle wait-for-suggestions"><a class="" href="javascript:{}">Later</a></div>')
    
        context.find('.feedme-autocomplete')
            .focus(function() {
                if ($(this).val() == defaultAutocompleteText) {
                    $(this).val('');
                }
                $(this).toggleClass('feedme-autocompleteToggle');
            })
            .blur(function() { 
                if ($(this).val() == '') {
                    $(this).val(defaultAutocompleteText);
                }
                $(this).toggleClass('feedme-autocompleteToggle');
                return true;
            })
            .keypress(function(event) {
                if (event.keyCode == 13) {
                    addFriendAndSelect(context.find('.feedme-autocomplete').val(), context);
                }
            });
    
        context.find('.feedme-addImg').click(function(event) {
            text = context.find('.feedme-autocomplete').val();
            if (text != '' && text != defaultAutocompleteText) {
                addFriendAndSelect(text, context);
            }
        });
    
        context.find('.feedme-now-button').click(share_post);
        context.find('.feedme-later-button').click(share_post);
        context.find('.feedme-more-recommendations-button').click(function() {
            recommendMorePeople(context);
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

    function get_post_variables(context) {
       var post_abstract = $(".abstractText", context).html();
       var post_title = $(".title", context).html();
       var post_authors = $(".authors", context).clone();
       var authors = $(".author", post_authors);
       var affiliations = $(".affiliation", post_authors);
       var post_contents = "<b>" + post_title + "</b><br><br>" 
       authors.each(function(index, element) {
         post_contents = post_contents + $(element).text();
         if (index < affiliations.length) {
             post_contents = post_contents + " (" + $(affiliations[index]).text() + ")";
         }
         post_contents = post_contents + "<br>";
       });
       if (post_abstract) {
           post_contents = post_contents + "<br>" + post_abstract;
       }
       return {
         post_url: FEED_URL + "#" + context.attr("id"),
         post_title: "CHI 2010 Paper: " + post_title,
         post_contents: post_contents
       };
    }
 
    /** Given a sessionid and a 0-indexed paper number, sends a
     * request to feedme for a recommendation, and calls the
     * callback with the result
     **/
    function recommend_recipients(context, callback) {
       post_variables = get_post_variables(context);
       var data = {
            feed_title: FEED_TITLE,
            feed_url: FEED_URL,
            post_url: post_variables.post_url,
            post_title: post_variables.post_title,
            post_contents: post_variables.post_contents,
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
    
    function populateRecommendedItems(json) {
        for (var i = 0; i < json.length; i++) {
            var paper_id = json[i].split("#")[1];
            paper_id = FeedMeChiActualPaperId(paper_id);
            var starIcon = $("<img>").attr("src", "http://groups.csail.mit.edu/haystack/feedme/star_bullet_transparent.gif")
                                     .attr("title", "Someone recommended this paper to you.")
                                     .height(20);
            $("a.fm-share",  $("#" + paper_id)).before(starIcon);
            var session_id = $("div#" + paper_id).parent().attr('id').split("_")[0];
            var starDiv = $("td#" + session_id + " .fm-stars");
            // Put stars on their own line in a session box
            if (starDiv.length == 0) {
              starDiv = $("<div class='fm-stars'>");
              $("td#" + session_id).append(starDiv);
            }
            starIcon = starIcon.clone().attr("title", "Someone recommended a paper in this session to you.");
            starDiv.append(starIcon);
        }
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
        
        $(".feedme-loading", postToPopulate).remove();
        
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
//             var containerWidth = postToPopulate.find("div.feedme-suggestions").outerWidth(true);  	
// just check width of contents of newly added div  	
//             var contentWidth = 0;
//             expanded_div.children("div.feedme-person").each(function() {
//                 contentWidth += $(this).outerWidth(true);
//             });
//             contentWidth += expanded_div.find("div.feedme-more-recommendations-button").outerWidth(true);
//             contentWidth += expanded_div.find("input.feedme-autocomplete").outerWidth(true);
//             contentWidth += expanded_div.find("img.feedme-addImg").outerWidth(true);
//             
//             while (contentWidth >= containerWidth) {
//                 console.log(contentWidth);
//                 console.log(containerWidth);
//                 // remove last person from the newly added div
//                 contentWidth -= expanded_div.find(".feedme-person:last").outerWidth(true);
//                 expanded_div.find(".feedme-person:last").remove();
//                 // decrement min_length so that start_person is set to correct value
//                 min_length -= 1;
//             }
    
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
        // TODO: create jsonp request
//         var url = 'seen_it/';
//         var server_vars = get_post_variables(context);
//         var data = {
//             post_url: server_vars["post_url"],
//             feed_url: server_vars["feed_url"],
//             recipient: name
//         }
//         console.log(data);
//         ajax_post(url, data, seen_it_response);
    }
    
    function seen_it_response(response) {
        console.log("Seen it response:");
        console.log(response);
        var post_url = response['posturl'];
        var shared_today = response['shared_today'];
        var seen_it = response['seen_it'];
        var sent = response['sent'];
        var email = response['email'];
        
        var postToPopulate = $('.a[name="' + post_url.split("#")[1] + '"]').parents('.paper');    
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
        var context = friend.parents('.paper');
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

  
    function setup_likes() {
      $("div.paper").each(function(i, elt) {
        var paper_id = $(elt).attr("id");//$(elt).parent().attr("id").split("_")[0] + "_" + $(elt).index();
//        $(elt).attr("id", paper_id);
        if ($("img.feedme-logo-icon", $(elt)).size() == 0) {
          var shareIcon = $("<img>").attr("src", "http://groups.csail.mit.edu/haystack/feedme/like2.png")
                                   .attr("title", "Share this paper with FeedMe!")
                                    .attr("style",
                                    "vertical-align:text-bottom;padding: 0px 2px 0px 5px");
                                    //.height(20);
          var shareAnchor = $("<a>").html(shareIcon)
                                    .attr("name", paper_id)
                                    .addClass("fm-share")
                                    .attr("style", "border-style:solid;border-width:1px;padding: 2px 2px 2px 0px;background:white;text-decoration:none;")
                                    .click(onShareButtonClick);
          shareAnchor.append("<span style='vertical-align:middle;font-variant:small-caps'>share</span>");
          $("div.authors", $(elt)).before(shareAnchor);	
        }
      });
    }
 

    function share_post(event) {
        console.log("sharing post.");
        var context = $(this).parents('.paper');
        
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
        var recipients = ""
        for (var i=0; i < recipientDivs.length; i++)
        {
            recipients = recipients + recipientDivs[i].getAttribute("email");
            if (i < recipientDivs.length - 1) {
                recipients = recipients + ",";
            }
        }
        
        var comment = context.find('.comment-textarea').val();
        console.log("comment: " + comment);
        if (comment == default_comment_text) {
            comment = '';
        }    
    
        var send_individually = context.find('.feedme-send-individually').attr('checked'); 
        var server_vars = get_post_variables(context); 
        var data = {
          post_url: server_vars.post_url,
          feed_url: FEED_URL,
          recipients: recipients,
          comment: comment,
          bookmarklet: false,
          client: "chiprogram",
          digest: digest,
          send_individually: send_individually
        };
        $.ajax({type: 'GET',
                url: FEEDME_URL + "share_jsonp/",
                data: data,
                success: function(data) { console.log("share success"); },
                dataType: "jsonp"
                });
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
    
    setupErrorMessages();
    setupLogin();
    check_logged_in(false, null);
    setup_likes();
    /* Set up recommend buttons */
}

