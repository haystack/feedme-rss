// Fail gracefully if Firebug's not installed
try { console.log('Firebug console found.'); } catch(e) { console = { log: function() {} }; }

function FeedMeChi() {

    $("div.paper").each(function(i, elt) {
        var paper_id = $(elt).parent().attr("id").split("_")[0] + "_" + $(elt).index();
        $(elt).attr("id", paper_id);
        
        var shareButton = $("<a>").text("Share with FeedMe")
                                  .attr("name", "#" + paper_id)
                                  .addClass("fm-share")
                                  .click(onShareButtonClick);
        $("div.authors", $(elt)).before(shareButton);	
    });
    
    function onShareButtonClick(e) {
        // if user is not logged in, show log in/sign up lightbox
        
        // otherwise generate request to fill recommendations
        suggest_people($(e.target).parents("div.paper"));
    }
    
    /** Given a sessionid and a 0-indexed paper number, sends a
     * request to feedme for a recommendation, and calls the
     * callback with the result
     **/
    function fm__request(session, index, callback) {
       var paper = $("td#" + session + "_details > div.paper:eq(" + index + ")");
       var feed_url = "http://www.nirmalpatel.com/chiProgram/program.html";
       var feed_title ="CHI 2010 Program";
       var post_url = feed_url + "#" + session + "_" + index;
       var post_title = $(".title", paper).html();
       var post_abstract = $(".abstractText", paper).html()
       var post_contents = post_title + " " + post_abstract;
       var data = {
            feed_title: feed_title,
            feed_url: feed_url,
            post_url: post_url,
            post_title: post_title,
            post_contents: post_contents,
            expanded_view: false
       };
       var feedme_url = "http://feedme.csail.mit.edu:8002/recommend_jsonp/";
       $.ajax({type: 'GET',
               url: feedme_url,
               data: data,
               success: function(data) {callback(data);},
               dataType: "jsonp"
       });
    }	
    
    var defaultAutocompleteText = "type a name";
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
        // adam's code
    }
    
    function populateSuggestions(json) {
        console.log('populating suggestions');
        var people = json["users"];
        var post_url = json["posturl"];
        var previously_shared = json["shared"];
        
        var paper_id = post_url.split("#")[1];
        var postToPopulate = $("#" + paper_id);
       
       // if we can't find the post, jettison
        if (postToPopulate.size() == 0 || postToPopulate.find('.entry-title-link').attr('href').indexOf(post_url) == -1)
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
    
    function share_post(event) {

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

