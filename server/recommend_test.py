from django.core.management import setup_environ
import settings
setup_environ(settings)
from server.feedme.models import *
from server.feedme.recommend import n_best_friends
from server.feedme.share import create_shared_post, send_post
from server.term_vector import update_receivers

# sharer for testing
USER_SHARER = User.objects.get(email="margaret.leibovic@gmail.com")
SHARER = Sharer.objects.get(user=USER_SHARER)

# email addresses for new test users
EMAIL_A = "margaret.leibovic+a@gmail.com"
EMAIL_B = "margaret.leibovic+b@gmail.com"

# feed urls for test feeds (feeds already exist in db)
FEED_X = "http://sfbay.craigslist.org/apa/index.rss"
FEED_Y = "http://www.codinghorror.com/blog/index.xml"

# post urls for test posts (posts already exist in db)
POSTS_X = Post.objects.filter(feed=Feed.objects.filter(rss_url=FEED_X))
POSTS_Y = Post.objects.filter(feed=Feed.objects.filter(rss_url=FEED_Y))


def send_test_post(post, feed, test_receiver):
  print "RECOMMEND TEST: sending post to", test_receiver, "from feed", feed
  shared_post = create_shared_post(USER_SHARER, \
                                   post, feed, \
                                   [test_receiver], "", \
                                   False, False)
  receivers = Receiver.objects \
    .filter(sharedpostreceiver__shared_post = shared_post)
  
  # update term vectors
  update_receivers(receivers)

  send_post(shared_post, False)

def clean_up():
  print "RECOMMEND TEST: cleaning up"
  # delete test users and receivers to clean up before re-running test
  user_a = User.objects.get(email=EMAIL_A)
  user_b = User.objects.get(email=EMAIL_B)
  Receiver.objects.get(user=user_a).delete()
  Receiver.objects.get(user=user_b).delete()
  user_a.delete()
  user_b.delete()

def run_test():     
  # recommend a post to user A from feed X
  send_test_post(POSTS_X[0].url, FEED_X, EMAIL_A)
  
  for post in POSTS_Y:  
    # recommend a post to user B from feed Y
    send_test_post(post.url, FEED_Y, EMAIL_B)
    
    # make a call to n_best_friends with a post from feed X
    recommendations, sorted_friends = n_best_friends(POSTS_X[1], SHARER)
    
    # at some point user B's score should be higher than user A's score
    # due to an increasing frequency_weight
    for friend in sorted_friends:
      if friend['receiver'].user.email == EMAIL_A:
        print "RECOMMEND TEST: user A score", friend['score']
      if friend['receiver'].user.email == EMAIL_B:
        print "RECOMMEND TEST: user B score", friend['score']
    
  clean_up()

if __name__ == '__main__':
  run_test()
