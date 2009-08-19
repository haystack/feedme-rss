from django.utils import simplejson
import urllib2

def latest_url():
  response = urllib2.urlopen('http://groups.csail.mit.edu/haystack/feedme/current_version.js')
  html = response.read()
  html = html.replace("versionData = ", "")
  version = simplejson.loads(html)
  return version['url']
