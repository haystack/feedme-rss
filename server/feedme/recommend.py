from django.http import HttpResponse
from django.core import serializers
from django.utils import simplejson
from django.contrib.auth.models import User 
from models import *
from django.contrib.auth.decorators import login_required
import math
import operator
import datetime
import time

@login_required
def recommend(request):
  return HttpResponse(get_recommendation_json(request), \
                      mimetype='application/json')

def get_recommendation_json(request):
  sharer_user = request.user

  feed_title = request.POST['feed_title']
  feed_url = request.POST['feed_url']
  post_url = request.POST['post_url']
  post_title = request.POST['post_title']
  post_contents = request.POST['post_contents']

  post_objects = get_post_objects(feed_url=feed_url, post_url=post_url, \
                                  post_title=post_title, \
                                  post_contents=post_contents, \
                                  sharer_user = sharer_user, \
                                  feed_title = feed_title)
  feed = post_objects['feed']
  post = post_objects['post']
  sharer = post_objects['sharer']
  shared_post = post_objects['shared_post']
  shared_post_receivers = post_objects['shared_post_receivers']
  shared_users = post_objects['shared_users']

  print 'get recommendations'
  recommendations = n_best_friends(post, sharer)
  print recommendations

  response = dict()
  response['posturl'] = post.url
  response['users'] = create_user_json(recommendations)
  response['shared'] = create_user_json(shared_users)
  response_json = simplejson.dumps(response)
  print response_json
  
  return response_json


def create_user_json(recommendations):
  """Turns a list of users into a list of dicts with important properties
  for the Greasemonkey script exposed.  To be sent to simplejson.dumps
  to create a json object to return"""
  rec_list = []
  for recommendation in recommendations:
    person = dict()
    person['email'] = recommendation.email

    midnight_today = datetime.datetime.combine(datetime.date.today(), \
                                               datetime.time(0, 0))
    shared_today = SharedPostReceiver.objects \
                   .filter(receiver__user = recommendation) \
                   .filter(time__gte = midnight_today)
    person['shared_today'] = len(shared_today)
    
    rec_list.append(person)
  return rec_list


def get_post_objects(feed_title, feed_url, post_url, post_title, \
                     post_contents, sharer_user):
  # create objects if we need to
  try:
    feed = Feed.objects.get(rss_url=feed_url)
    if feed.title != feed_title:
      feed.title = feed_title
      feed.save()
  except Feed.DoesNotExist:
    feed = Feed(rss_url=feed_url, title = feed_title)
    feed.save()
  try:
    post = Post.objects.filter(feed = feed).get(url=post_url)
  except Post.DoesNotExist:
    post = Post(url=post_url, feed=feed, title=post_title,
                contents=post_contents)
    post.save()
  try:
    sharer = Sharer.objects.get(user=sharer_user)
  except Sharer.DoesNotExist:
    sharer = Sharer(user=sharer_user)
    sharer.save()

  # find out if we've already shared it with anyone
  try:
    shared_post = SharedPost.objects.get(post=post, sharer=sharer)
    shared_post_receivers = SharedPostReceiver.objects \
                            .filter(shared_post=shared_post)
    shared_users = []
    for shared_user in shared_post_receivers:
      shared_users.append(shared_user.receiver.user)
  except SharedPost.DoesNotExist:
    shared_post = None
    shared_users = []
    shared_post_receivers = []

  post_objects = dict()
  post_objects['feed'] = feed
  post_objects['post'] = post
  post_objects['sharer'] = sharer
  post_objects['shared_post'] = shared_post
  post_objects['shared_post_receivers'] = shared_post_receivers
  post_objects['shared_users'] = shared_users
  return post_objects


def n_best_friends(post, sharer):
  begin_time = time.clock()
  friends = Receiver.objects.filter(
    sharedpostreceiver__shared_post__sharer=sharer).distinct()

  #pseudocode
  # get freqdist (not term vector) for post
  #for each friend
  #get their term vector ordered by term
  # do 'merge-dot' on vectors:
  # keep post_counter and person_counter
  # increment whichever one has the strcmp lesser
  # if they match, multiply (for dotting) and increment both
  # at the end divide sum of dots by norm of person vector
  # (norm of post vector is constant across all people, so we can ignore term)

  scores = []

  freq_dist_counts = post.tokenize()
  freq_dist = sorted(freq_dist_counts)
  for receiver in friends:
    if not receiver.recommend:
      continue

    print 'reviewing friend: ' + receiver.user.username
    term_vector = TermVectorCell.objects.filter(receiver = receiver) \
                  .order_by('term__term').select_related('term')
    if len(term_vector) > 0:
      post_cosine_distance = cosine_distance(term_vector, freq_dist, freq_dist_counts)
      score = {}
      score['receiver'] = receiver
      score['score'] = post_cosine_distance
      scores.append(score)
   
  # now find the top 3
  sorted_friends = sorted(
    scores, key=operator.itemgetter('score'), reverse=True)
  if len(sorted_friends) > 3:
    sorted_friends = sorted_friends[0:3]
  print sorted_friends

  print "time for recommendation: " + str(time.clock() - begin_time)
  return map(lambda friend:friend['receiver'].user, sorted_friends)
  

def cosine_distance(term_vector, freq_dist, freq_dist_counts):
  friend_vector_norm = 0.0
  dot_product = 0.0
  freq_dist_i = 0 # start looking at the first alphabetical entry
  
  # do the merge-dot-product    
  for term_cell in term_vector:
    # summing squared values for the norm
    friend_vector_norm += math.pow(term_cell.count, 2)

    # move the counter forward until we catch up alphabetwise
    while freq_dist_i < len(freq_dist) and \
              freq_dist[freq_dist_i] < term_cell.term.term:
      freq_dist_i += 1

    # now, if we're not past the edge, check to see if we have a matching
    # term
    if freq_dist_i >= len(freq_dist):
      break
    else:
      term = freq_dist[freq_dist_i]
      if term == term_cell.term.term:
        # dot product -- multiply counts together
        dot_product += freq_dist_counts[term] * term_cell.count

  # now normalize the dot product by the norm of the friend's vector
  if friend_vector_norm == 0:
    return 0
  friend_vector_norm = math.sqrt(friend_vector_norm)
  cosine_distance = dot_product / friend_vector_norm
  return cosine_distance
  

def vector_norm(term_vectors):
  norm = 0
  for term_element in term_vectors:
    norm += math.pow(term_element.count, 2)

  return math.sqrt(norm)
