from django.core.management import setup_environ
import settings
setup_environ(settings)
from django.contrib.auth.models import User
from server.feedme.models import *
import urllib
import feedparser
from django.utils import simplejson
import operator
from feedme.recommend import *
import datetime
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

def rank_posts():
    week_ago = datetime.datetime.now() - datetime.timedelta(days = 7)
    for receiver in Receiver.objects.filter(recommend = True):
        if SharedPostReceiver.objects.filter(receiver = receiver).filter( \
            time__gte = week_ago).count() > 0:
            
            sharers = Sharer.objects.filter(sharedpost__sharedpostreceiver__receiver = receiver)        
            broadcasts = SharedPost.objects.filter(sharer__in = sharers) \
                         .exclude(sharer__user = receiver.user) \
                         .exclude(sharedpostreceiver__receiver = receiver) \
                         .filter(broadcast = True)

            print str(len(broadcasts)) + ' posts to broadcast'

            if len(broadcasts) > 0:
                # COSINE RANKING
                # -------------------
                print 'reviewing friend: ' + receiver.user.username
                term_vector = TermVectorCell.objects.filter(receiver = receiver) \
                              .order_by('term__term').select_related('term')
                cosine_ranked_posts = []
                for sharedpost in broadcasts:
                    freq_dist_counts = sharedpost.post.tokenize()
                    freq_dist = sorted(freq_dist_counts)        
                    cosine = cosine_distance(freq_dist = freq_dist, freq_dist_counts = freq_dist_counts, \
                                             term_vector = term_vector)
                    cosine_ranked_posts.append((sharedpost.post, cosine))
                    cosine_ranked_posts.sort(key=operator.itemgetter(1))
                    cosine_ranked_posts.reverse()
                print 'friendrank for ' + receiver.user.username + ': '
                print cosine_ranked_posts[:10]
                send_digest_posts(cosine_ranked_posts[:10], receiver)
            else:
                print 'don\'t have enough posts'
        else:
            print receiver.user.username + ' hasn\'t received posts recently'

    
def send_digest_posts(posts, receiver):
  """Sends the list of posts in an email to the recipient"""
  subject = u"FeedMe Personalized Newspaper: " + posts[0][0].title
  from_email = settings.DEFAULT_FROM_EMAIL
  to_emails = [receiver.user.email]

  print (u'sending ' + subject + u' to ' + unicode(to_emails)).encode('utf-8')
  
  html_content = u''
  html_content += u'Your friends on FeedMe thought that these posts ' +\
                  u'might be interesting. We\'ve selected just the ones ' +\
                  u'you\'re most likely to be interested in, and we\'ll ' +\
                  u'send them to you weekly. (Though we have another design' +\
                  u' building on this in the works.)<br />'

  for post_array in posts:
      post = post_array[0]
      html_content += u"<a href='" + post.url + \
                      u"'>" + post.title + u"</a> " +\
                      u"[<a href='" + post.feed.rss_url + u"'>" + \
                      post.feed.title + u"</a>] <br />\n"

  html_content += u"<br /><br /><span style='color: gray'>Sent via FeedMe: " +\
                  u"a (very) alpha tool at MIT. Have comments, or are your " +\
                  u"friends spamming you? Email us at feedme@csail.mit.edu." +\
                  u"<br /><br /><a href='http://feedme.csail.mit.edu" +\
                  u"/unsubscribe/'>Change your e-mail receiving settings" +\
                  u"</a> to get only a digest, or never be recommended posts."

  print html_content.encode('utf-8')
  text_content = nltk.clean_html(html_content)
  email = EmailMultiAlternatives(subject, text_content, from_email, to_emails)
  email.attach_alternative(html_content, "text/html")
  email.send()

if __name__ == '__main__':
    rank_posts()

##     # POSTRANK
##     # ---------------
##     # make the call to postrank -- set up post args correctly
##     # http://www.postrank.com/developers/api#postrank
##     posts = [sharedpost.post.url for sharedpost in broadcasts]
##     post_args = dict()
##     post_args['url[]'] = posts
##     post_args = urllib.urlencode(post_args, True)
##     url = 'http://api.postrank.com/v1/postrank?appkey=feedme.csail.mit.edu&format=json'
##     url_handle = urllib.urlopen(url, post_args)

    
##     # get the results back and sort by postrank score
##     result_dict = simplejson.loads(url_handle.read())
##     ranked_posts = []
##     for post in result_dict.keys():
##         ranked_posts.append((post, result_dict[post]['postrank']))
##     ranked_posts.sort(key=operator.itemgetter(1))
##     ranked_posts.reverse()
##     print 'postrank: '
##     print ranked_posts[:10]

