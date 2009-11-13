if(!window.removeLastScript){
	window.removeLastScript=function() { 
		var scriptNode=document.getElementsByTagName('body')[0].lastChild;
		var src=scriptNode.getAttribute('src');
		try{
			scriptNode.parentNode.removeChild(scriptNode);
		}
		catch(e){}
		return src;
	}
}

if(!window.removeFeedMeIframe){
    window.removeFeedMeIframe = function(event) {
	container = document.getElementById("feedme-bookmarklet");
	container.parentNode.removeChild(container);
    }
}

if(!window.embedFeedMeIframe){
	window.embedFeedMeIframe=function(){
	    var port = 80;
	    var submitURL = 'http://feedme.csail.mit.edu:' + port + '/bookmarklet/'

	    var feedMeHTML = document.body.innerHTML;
	    var feedMeTitle = document.title;
	    var feedMeURL = document.location.href;
	    var feedMeFeedTitle = document.domain;
	    var feedMeFeedURL = 'http://' + document.domain;

	    var feedmeContainer=document.createElement('div');
	    feedmeContainer.id = "feedme-bookmarklet";
	    feedmeContainer.style.position="fixed";
	    feedmeContainer.style.background = "#fff";
	    feedmeContainer.style.border = "4px solid #FF9900";
	    feedmeContainer.style.top = 6 + "px";
	    feedmeContainer.style.right = 6 + "px";
	    feedmeContainer.style.width = 675 + "px";
	    feedmeContainer.style.height = 350 + "px";
	    feedmeContainer.style.zIndex = 100000;
	    document.body.appendChild(feedmeContainer);

	    var headerContainer = document.createElement('div');
	    headerContainer.style.margin = "5px 5px 5px 15px";
	    feedmeContainer.appendChild(headerContainer);

	    var closeBtn = document.createElement('img');
	    closeBtn.id = "feedme-close";
	    closeBtn.src = "http://groups.csail.mit.edu/haystack/feedme/jquery.fancybox/fancy_closebox.png";
	    closeBtn.style.cssFloat = "right";
	    closeBtn.addEventListener("click", window.removeFeedMeIframe, false);
	    headerContainer.appendChild(closeBtn);

	    var logo = document.createElement('img');
	    logo.id = "feedme-logo";
	    logo.src = "http://groups.csail.mit.edu/haystack/feedme/logo.png";
	    logo.height = 50;
	    logo.align = "left";
	    headerContainer.appendChild(logo);

	    var iframe = document.createElement('iframe');
	    iframe.style.border = "0px none" ;
	    iframe.style.margin = "0px";
	    iframe.style.padding = "0px";
	    iframe.style.width = "100%";
	    iframe.style.height = "290px";
	    feedmeContainer.appendChild(iframe);

	    var iframeDoc=iframe.contentWindow.document;
	    iframeDoc.open();
	    iframeDoc.write("<html>"+"<head></head>"
			    +"<body onload='submitForm();'>"
			    +" <form id='feedmeForm' method='post' action='" + submitURL + "'>"
			    + '<input type="hidden" name="post_url" value="">'
			    + '<input type="hidden" name="feed_url" value="">'
			    + '<input type="hidden" name="feed_title" value="">'
			    + '<input type="hidden" name="post_title" value="">'
			    + '<input type="hidden" name="post_contents" value=""'
			    +" </form>"+" <script>"
			    +" function submitForm() {"
			    +"  var form = document.getElementById('feedmeForm');"
			    +"  form.post_title.value = unescape('" + escape(feedMeTitle) + "');"
			    +"  form.post_url.value = unescape('" + escape(feedMeURL) + "');"
			    +"  form.post_contents.value = unescape('" + escape(feedMeHTML) + "');"
			    +"  form.feed_title.value = unescape('" + escape(feedMeFeedTitle) + "');"
			    +"  form.feed_url.value = unescape('" + escape(feedMeFeedURL) + "');"
			    +"  form.submit();"
			    +" }"
			    +" </script>"
			    +"</body>"
			    +"</html>");
	    iframeDoc.close();

	}
}

if(!window.runFeedMeBookmarklet){
	window.runFeedMeBookmarklet=function(){
		var source=window.removeLastScript();
		window.embedFeedMeIframe();
	}
}

try{
	window.runFeedMeBookmarklet();
}
catch(e){}
