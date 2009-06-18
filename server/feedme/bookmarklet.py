from django.http import HttpResponse
from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required
import nltk
import re
import html5lib
from html5lib import treebuilders
from BeautifulSoup import BeautifulSoup

@login_required
def bookmarklet(request):
    text = request.POST['post_contents']
    parser = html5lib.HTMLParser(tree=treebuilders.getTreeBuilder("beautifulsoup"))
    text = parser.parse(text).prettify()

    new_request = request.POST.copy() # because the request dict is immutable
    new_request['post_contents'] = text
    
    text = re.sub(r'class\s?=\s?".*?"', '', text)
    text = re.sub(r"class\s?=\s?'.*?'", '', text)
    text = re.sub(r'id\s?=\s?".*?"', '', text)
    text = re.sub(r"id\s?=\s?'.*?'", '', text)
    text = re.sub('style\s?=\s?".*?"', '', text)
    text = re.sub("style\s?=\s?'.*?'", '', text)    
    
    output = u'<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN">\n'
    output += u"<html><head><script>\n"
    output += u"""
    var unsafeWindow = window;
    function GM_addStyle(css) {
      var head, style;
      head = document.getElementsByTagName('head')[0];
      if (!head) { return; }
      style = document.createElement('style');
      style.type = 'text/css';
      style.innerHTML = css;
      head.appendChild(style);
    }

    function GM_xmlhttpRequest(params) {
         if (params.url.indexOf('http://feedme.csail.mit.edu') != 0) {
              console.log('cannot do cross-domain request! canceling.');
              return;
         }
         $.ajax({
           type: "POST",
           url: params.url,
           data: params.data,
           complete: function (request, status) {
             params.onload(request);
           }
         });
    }
    
    </script>
    """
#    output += u"<script type='text/javascript' src='http://feedme-rss.googlecode.com/svn/trunk/client/feedme.user.js'></script>"
#    output += u"<script type='text/javascript' src='http://people.csail.mit.edu/msbernst/dev/feedme.user.js'></script>"
    output += u"<script type='text/javascript' src='http://people.csail.mit.edu/marcua/dev/feedme.user.js'></script>"
    output += u"<link type='text/css' href='http://groups.csail.mit.edu/haystack/feedme/greader.css' rel='stylesheet' />"
    output += u"""
    <!-- These are our tweaks to the GReader CSS to make things lay out correctly -->
    <style>
    #main {
      top: 0px;
    }
    #chrome {
      margin-left: 0px;
      border-left: 0px;
    }
    #entries {
      height: inherit;
    }
    body, html {
      overflow: auto;
    }
    #entries.list #current-entry.expanded {
      border-width: 0px;
    }
    #entries.list .entry .entry-container {
      padding-top: 0em;
    }
    .entry .entry-main {
      margin-left: 0px;
    }
    #entries, #viewer-page-container {
      overflow: auto;
    }
    .entry-body {
      background:#FFFFFF none repeat scroll 0 0;
      border:1px solid #CCCCCC;
      overflow: auto;
      overflow-x:hidden;
      overflow-y:auto;
      height: 200px;
    }
    #viewer-container {
      margin: 5px;
    }
    .entry-body img {
      max-height: 80px;
      max-width: 80px;
    }
    .entry-body embed {
      max-width:317px;
      max-height:195px
    }
    </style>
    """
    output += u"</head><body class='gecko loaded'>"
    output += u"""
    <div id='main'><div id='chrome'><table id='chrome-viewer-container'><tbody><tr><td id='chrome-viewer'><div id='viewer-container'><div id='entries' class='list' style='visbility: visible;'><div id='current-entry' class='entry expanded read'>
   <div class='entry-container'>
    <div class='entry-main'>
      <h2 class='entry-title'>
        <a class='entry-title-link' href='""" + request.POST['post_url'] + u"' target='_blank'>" + request.POST['post_title'] + u"""</a>
      </h2>
      <div class='entry-author'>
        <span class='entry-source-title-parent'>from
          <a class='entry-source-title' target='_blank' href='""" + request.POST['feed_url'] + u"'>" + request.POST['feed_title'] + u"""</a>
        </span>
        <span style='display: none;'> by 
          <span class='entry-author-name'>
          </span>
          </span>
      </div>
      <div class='entry-annotations'>
      </div>
      <div class='entry-body'>
        <div>
          <div class='item-body'>"""
    output += text.decode('utf-8')
    output += u"""</div>
          </div>
        </div>
      </div>
    </div>
    
    </div></div></div></div></td></tr></tbody></table></div></div>
    """
    output += u"""
    <script>
    $(document).ready(function() {
         autocompleteData = new Array();
         suggest_people($('#current-entry'));
    });
    </script>
    """
    output += u"</body></html>"    

    return HttpResponse(output)
