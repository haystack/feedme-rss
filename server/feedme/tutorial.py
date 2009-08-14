from django.shortcuts import render_to_response
from django.utils import simplejson
import urllib2

def tutorial(request):
  return render_to_response('tutorial_index.html')
def firefox(request):
  return render_to_response('tutorial_firefox.html')
def greasemonkey(request):
  return render_to_response('tutorial_greasemonkey.html')
def feedme(request):
  response = urllib2.urlopen('http://groups.csail.mit.edu/haystack/feedme/current_version.js')
  html = response.read()
  html = html.replace("versionData = ", "")
  version = simplejson.loads(html)
  return render_to_response('tutorial_feedme.html',
                            {'url' : version['url']})
def login(request):
  return render_to_response('tutorial_login.html')
def readpost(request):
  return render_to_response('tutorial_readpost.html')
def recommendations(request):
  return render_to_response('tutorial_recommendations.html')
def bookmarklet(request):
  return render_to_response('tutorial_bookmarklet.html')
def exercise(request):
  return render_to_response('tutorial_exercise.html')
