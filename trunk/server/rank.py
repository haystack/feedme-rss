from django.core.management import setup_environ
import settings
setup_environ(settings)
from django.contrib.auth.models import User
from server.feedme.models import *
import urllib
import feedparser
from django.utils import simplejson
import operator

def rank_posts():
    msb = Receiver.objects.get(user__username = 'msbernst@mit.edu')
    received = Post.objects.filter( \
        sharedpost__sharedpostreceiver__receiver = msb)

    print str(len(received)) + ' posts'

    # make the call to postrank -- set up post args correctly
    # http://www.postrank.com/developers/api#postrank
    posts = [post.url for post in received]
    post_args = dict()
    post_args['url[]'] = posts
    post_args = urllib.urlencode(post_args, True)
    url = 'http://api.postrank.com/v1/postrank?appkey=feedme.csail.mit.edu&format=json'
    url_handle = urllib.urlopen(url, post_args)

    # get the results back and sort by postrank score
    result_dict = simplejson.loads(url_handle.read())
    ranked_posts = []
    for post in result_dict.keys():
        ranked_posts.append((post, result_dict[post]['postrank']))
    ranked_posts.sort(key=operator.itemgetter(1))
    
    print ranked_posts

if __name__ == '__main__':
    rank_posts()
