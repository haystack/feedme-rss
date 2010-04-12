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

function log(aMsg) {
  Cc["@mozilla.org/consoleservice;1"].
    getService(Ci.nsIConsoleService).
    logStringMessage("FeedMe: " + aMsg);
  dump("FeedMe: " + aMsg + "\n");
}

var FEEDME_URL = "http://feedme.csail.mit.edu:8003";

var FeedMe = {
    
    always_hidden: false,
    
    logged_in: false,
    default_comment_text: "Add an (optional) comment...",
    default_autocomplete_text: "Add an email address...",
    
    default_disabled_sites: ["www.google.com", 
                             "mail.google.com",
                             "docs.google.com",
                             "facebook.com"],

    init: function() {        
        log("init");
        
        FeedMe.setupCommentArea();
        FeedMe.setupAutocomplete();
        FeedMe.setupDatabase();
        FeedMe.setupEvents();            
    },

    /*** login code ***/

    checkLoggedIn: function() {
        $.ajax({
            type: "GET",
            dataType: "json",
            url: FEEDME_URL + "/check_logged_in/",
            success: FeedMe.onCheckLoggedInSuccess,
            error: function() {
                FeedMe.showError("Oops, there was an error checking your login information.");
            }
        });
    },
    
    onCheckLoggedInSuccess: function(json) {
        FeedMe.logged_in = json["logged_in"];
        log("logged in: " + FeedMe.logged_in);
        
        FeedMe.hideError();
        
        if (!FeedMe.logged_in) {
            $("#fm-logged-out").attr("collapsed", "false");
        } else {
            $("#fm-logged-out").attr("collapsed", "true");
            FeedMe.getRecommendations();
        }
    },
    
    /*** ui setup ***/
   
    setupCommentArea: function() {
        $("#fm-comment-box").val(FeedMe.default_comment_text)
            .css('color', 'gray')
            .focus( function() {
                if ($(this).val() == FeedMe.default_comment_text) {
                    $(this).val('').css('color', '');
                }
            })
            .blur( function() {
                if ($(this).val() == '') {
                    $(this).val(FeedMe.default_comment_text).css('color', 'gray');
                }
            });
    },
    
    setupAutocomplete: function() {
        $("#fm-add-email").val(FeedMe.default_autocomplete_text)
            .css('color', 'gray')
            .focus(function() {
                if ($(this).val() == FeedMe.default_autocomplete_text) {
                    $(this).val('').css('color', '');
                }
            })
            .blur(function() {
                if ($(this).val() == '') {
                    $(this).val(FeedMe.default_autocomplete_text).css('color', 'gray');
                }
            })
            .keypress(function(event) {
                if (event.keyCode == 13) {
                    FeedMe.addNewPerson($("#fm-add-email").val());
                }
            });
            
        $("#fm-add-email-button")
            .click(function(event) {
                FeedMe.addNewPerson($("#fm-add-email").val());
            });
    },
    
    setupEvents: function() {
        var appcontent = document.getElementById("appcontent");
        if (appcontent) {
            appcontent.addEventListener("DOMContentLoaded", FeedMe.onPageLoad, false);
            appcontent.addEventListener("TabSelect", FeedMe.onPageLoad, false);   
        }
        
        var bar = $("#fm-bar");
        $(".feedme-share-button", bar).click(FeedMe.sharePost);
        $(".fm-enable", bar).click(FeedMe.enableSite);
        $(".fm-disable", bar).click(FeedMe.disableSite);
        $(".fm-toggle-controls", bar).click(FeedMe.toggleControls);        
        $(".fm-toggle-bar", bar).click(FeedMe.toggleBar);
       
        $(".fm-log-in", bar).click(function() {
            content.document.location = FEEDME_URL + "/accounts/login/";    
        });
        
        $("#status-bar .fm-toggle-bar").click(FeedMe.toggleBar);

        window.onresize = function() { $("#fm-suggestions").width(window.innerWidth - 60); }
    },
    
    
    /*** event handlers ***/
    
    onPageLoad: function(aEvent) {
        // don't request suggestions when frames load
        if (aEvent.originalTarget instanceof HTMLDocument) {
            var win = aEvent.originalTarget.defaultView;
            if (win.frameElement) {
                return;
            }
        }
        
        $("#fm-suggestions").empty();
        
        // this will fill the recommendations if the site is not disabled
        FeedMe.checkDisabled();
    },
    
    /** getting recommendations ***/
    
    suggestPeople: function() {
        log("suggestPeople");
        // make sure user is logged in
        if (!FeedMe.logged_in)
            FeedMe.checkLoggedIn();
        else
            FeedMe.getRecommendations();
    },
    
    getRecommendations: function() {
        $.ajax({
            type: "POST",
            data: FeedMe.get_post_variables(),
            dataType: "json",
            url: FEEDME_URL + "/recommend/",
            success: FeedMe.fillRecommendations,
            error: function() {
                FeedMe.showError("Oops, there was an error loading recommendations for this webpage.");
                FeedMe.checkLoggedIn();
            }
        });
        
        $("#fm-loading").attr("collapsed", "false");
        FeedMe.hideError();
        FeedMe.hideControls();
    },
    
    fillRecommendations: function(json) {
        var people = json["users"];
        var post_url = json["posturl"];
        
        $("#fm-loading").attr("collapsed", "true");

        // don't render recommendations for wrong tab
        if (post_url != content.document.location.href)
            return false;        
        
        $("#fm-suggestions").empty();
        for (var i = 0; i < people.length && i < 10; i++) {
            FeedMe.addPerson(people[i]);
        }        
    },
    
    addPerson: function(person) {
        var container = $("#fm-suggestions");
        var emailAnchor = $("<a>").addClass("feedme-person-link").text(person["email"]);
        var emailDiv = $("<div>").append(emailAnchor);
        
        var numSharedDiv = $("<div>").addClass("feedme-num-shared");
        var newPerson = $("<div>");
        newPerson.addClass("feedme-person").addClass("feedme-button")
                 .append(emailDiv)
                 .append(numSharedDiv);
                 
        if (person["sent"]) {
            numSharedDiv.text('Sent!');
            newPerson.addClass("feedme-sent");            
        } else if (person["seen_it"]) {
            numSharedDiv.text('Saw it already');
            newPerson.addClass("feedme-sent");
        } else if (person["shared_today"] != null) {
            var numShared = person["shared_today"] + " FeedMe";
            if (person["shared_today"] != 1)
                numShared = numShared + "s";
            numShared = numShared + " today";
            numSharedDiv.text(numShared);
        }
        
        newPerson.click(FeedMe.toggleFriend);
        container.append(newPerson);
    },
    
    addNewPerson: function(email) {
        if (!FeedMe.logged_in)
            return false;
        
        if (email == "" || email == FeedMe.default_autocomplete_text 
                        || !FeedMe.is_valid_email(email)) {
            FeedMe.showError("Oops, you didn't enter a valid email address.");
            return false;
        }
        FeedMe.hideError();
        $("#fm-add-email").val("");
    
        var server_vars = FeedMe.get_post_variables();
        var data = {
            post_url: server_vars["post_url"],
            feed_url: server_vars["feed_url"],
            recipient: email
        }
        
        $.ajax({
            type: "POST",
            data: data,
            dataType: "json",
            url: FEEDME_URL + "/seen_it/",
            success: FeedMe.renderNewPerson,
            error: function() {
                FeedMe.showError("Oops, there was an error adding a new recipient.");
            }
        });
    },
    
    renderNewPerson: function(json) {
        FeedMe.addPerson(json);
        FeedMe.toggleFriendButton($(".feedme-person:last"));
    },
    
    toggleFriend: function() {
        FeedMe.toggleFriendButton($(this));
    },
    
    toggleFriendButton: function(friend) {
        friend.removeClass("feedme-sent");
        friend.toggleClass("feedme-toggle");
        FeedMe.showControls();
    },
    
    sharePost: function(aEvent) {
        log("sharePost");
        if (!FeedMe.logged_in)
            return false;
        
        var shareButton = $(aEvent.target);
        var context = $("#fm-bar");
        var recipientDivs = context.find(".feedme-person.feedme-toggle")
                                   .removeClass("feedme-toggle")
                                   .css('background-color', '')
                                   .css('border', '')
                                   .addClass("feedme-sent")
                                   .find('.feedme-num-shared')
                                   .text('Sent!');
        
        if (recipientDivs.length == 0) {
            showError("Oops, you didn't select anybody to share with!");
            return;
        }
        
        var recipients = [];
        recipientDivs.each(function(i, elt) {
            recipients[i] = elt.parentNode.firstChild.textContent;
        });
        
        var comment = context.find("#fm-comment-box").val();
        if (comment == FeedMe.default_comment_text)
            comment = "";

        var server_vars = FeedMe.get_post_variables(context);
        var data = {
            post_url: server_vars["post_url"],
            feed_url: server_vars["feed_url"],
            recipients: recipients,
            comment: comment,
            bookmarklet: true,
            client: "plugin",
            digest: $(this).hasClass("feedme-later-button"),
            send_individually: false
        }
                
        $.ajax({
            type: "POST",
            data: data,
            dataType: "json",
            url: FEEDME_URL + "/share/",
            success: function() {
                log("email sent");
            },
            error: function() {
                FeedMe.showError("Oops, there was an error sending this email.");
            }
        });
    },

    /*** utility functions ***/

    get_post_variables: function() {
        var post_vars = {
            feed_title: content.document.domain,
            feed_url: 'http://' + content.document.domain,
            post_url: content.document.location.href,
            post_title: content.document.title,
            // todo: clean up html that gets passed for recommendations
            post_contents: content.document.body ? content.document.body.innerHTML : "",
            expanded_view: false
        }
        return post_vars;
    },
    
    is_valid_email: function(email) {
        return /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i.test(email);
    },
    
    /*** display toggling functions ***/
    
    showError: function(aMsg) {
        log("error: " + aMsg);
        $("#fm-loading").attr("collapsed", "true");
        $("#fm-error").attr("collapsed", "false").attr("value", aMsg);
    },
    
    hideError: function() {
        $("#fm-error").attr("collapsed", "true").attr("value", "");    
    },
    
    toggleBar: function() {
        var bar = $("#fm-bar");
        bar.attr("collapsed", bar.attr("collapsed") != "true");
    },
    
    toggleControls: function() {
        if ($("#fm-controls").attr("collapsed") == "true")
            FeedMe.showControls();
        else
            FeedMe.hideControls();
    },
    
    showControls: function() {
        $("#fm-toggle-controls").addClass("fm-arrow-down")
                                .removeClass("fm-arrow-up")
                                .attr("tooltiptext", "Collapse FeedMe Bar");
        $("#fm-bar .fm-extra-row").attr("collapsed", false);    
        $("#fm-controls").attr("collapsed", false);
        $("#fm-suggestions").css("overflow", "visible");
    },
   
    hideControls: function() {
        $("#fm-toggle-controls").addClass("fm-arrow-up")
                                .removeClass("fm-arrow-down")   
                                .attr("tooltiptext", "Expand FeedMe Bar");
        $("#fm-bar .fm-extra-row").attr("collapsed", true);
        $("#fm-controls").attr("collapsed", true);
        $("#fm-suggestions").css("overflow", "hidden");
    },
    
    /*** permanently closing bar for some sites ***/
        
    setupDatabase: function() {
        var file = Components.classes["@mozilla.org/file/directory_service;1"]  
                             .getService(Components.interfaces.nsIProperties)  
                             .get("ProfD", Components.interfaces.nsIFile);  
        file.append("feedme_bar.sqlite");  
           
        var storageService = Components.classes["@mozilla.org/storage/service;1"]  
                                       .getService(Components.interfaces.mozIStorageService);  
        // store database connection for future queries
        FeedMe.dbConn = storageService.openDatabase(file);
        
        if (!FeedMe.dbConn.tableExists("disabled_sites")) {
            log("create disabled_sites table");
            FeedMe.dbConn.createTable("disabled_sites", "id INTEGER PRIMARY KEY, domain VARCHAR(255)");
            FeedMe.populateDisabledSites();
        }
    },
    
    populateDisabledSites: function() {
        for (var i = 0; i < FeedMe.default_disabled_sites.length; i++) {
            FeedMe.dbConn.executeSimpleSQL("INSERT INTO disabled_sites (domain) VALUES ('" + FeedMe.default_disabled_sites[i] + "')");
        }
    },
    
    disableSite: function() {
        var domain = content.document.domain;
        log("disableSite: " + domain);
        FeedMe.dbConn.executeSimpleSQL("INSERT INTO disabled_sites (domain) VALUES ('" + domain + "')");
        
        $("#fm-bar").attr("collapsed", "true");
        $("#fm-disabled").attr("collapsed", "false");
        $("#fm-suggestions").empty();
        FeedMe.hideControls();
        FeedMe.hideError();
    },
    
    enableSite: function() {
        var domain = content.document.domain;
        log("enableSite: " + domain);
        FeedMe.dbConn.executeSimpleSQL("DELETE FROM disabled_sites WHERE domain = '" + domain + "'");
    
        $("#fm-disabled").attr("collapsed", "true");
        FeedMe.suggestPeople();
    },
    
    checkDisabled: function() {
        log("checkDisabled");
        
        var statement = FeedMe.dbConn.createStatement("SELECT COUNT(*) FROM disabled_sites WHERE domain = :domain"); 
        statement.params.domain = content.document.domain;
        
        statement.executeAsync({
            handleResult: function(aResultSet) {
                FeedMe.hideError();
                var row = aResultSet.getNextRow();
                if (row.getResultByIndex(0) != 0 || !content.document.domain) {
                    log("this site is disabled: " + content.document.domain);
                    $("#fm-disabled").attr("collapsed", "false");
                    $("#fm-bar").attr("collapsed", "true");                        
                } else {
                    FeedMe.suggestPeople();
                    $("#fm-disabled").attr("collapsed", "true");
                    if (FeedMe.always_hidden)
                        $("#fm-bar").attr("collapsed", "true");                        
                    else
                        $("#fm-bar").attr("collapsed", "false");
                }
            },
            
            handleError: function(aError) {
                log("Error: " + aError.message);
                FeedMe.showError("Oops, there was an error checking whether or not this website is disabled.");
            },
            
            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    log("Query canceled or aborted!");
                    FeedMe.showError("Oops, there was an error checking whether or not this website is disabled.");
                }
            }
        });
    }
}

// initialize FeedMe for every browser window
window.addEventListener("load", FeedMe.init, false);
