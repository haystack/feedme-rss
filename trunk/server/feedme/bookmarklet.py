from django.http import HttpResponse
from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required
from django.shortcuts import render_to_response
from html5lib import treebuilders
from BeautifulSoup import BeautifulSoup
import nltk
import re
import html5lib
import versionutils

@login_required
def bookmarklet(request):
    if 'post_contents' not in request.POST:
        return HttpResponse("Not a valid request.")
    text = request.POST['post_contents']
    parser = html5lib.HTMLParser(tree=treebuilders.getTreeBuilder("beautifulsoup"))
    soup = parser.parse(text)
    # kill all javascript
    for script in soup("script"):
        soup.script.extract()
    text = soup.prettify()

    new_request = request.POST.copy() # because the request dict is immutable
    new_request['post_contents'] = text

    new_request['bookmarklet'] = True
    
    text = re.sub(r'class\s?=\s?".*?"', '', text)
    text = re.sub(r"class\s?=\s?'.*?'", '', text)
    text = re.sub(r'id\s?=\s?".*?"', '', text)
    text = re.sub(r"id\s?=\s?'.*?'", '', text)
    text = re.sub('style\s?=\s?".*?"', '', text)
    text = re.sub("style\s?=\s?'.*?'", '', text)    

    return render_to_response('bookmarklet.html', \
                              {
                                'post_url' : request.POST['post_url'],
                                'post_title' : request.POST['post_title'],
                                'feed_url' : request.POST['feed_url'],
                                'feed_title' : request.POST['feed_title'],
                                'text' : text.decode('utf-8'),
                                'jsurl' : versionutils.latest_url()
                              })
