from django.http import HttpResponse
from django.utils import simplejson
from django.contrib.auth.models import User 
from models import *
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.db import transaction
from django.forms.fields import email_re
import math
import operator
import datetime
import time

NUM_RECOMMENDATIONS = 21

@transaction.commit_manually

def recommend_jsonp(request):
  response = get_recommendation_json(request)
  response = "%s(%s);" % (request.REQUEST['callback'], response)
  return HttpResponse(response, \
                      mimetype='application/json')

def recommend(request):
  return HttpResponse(get_recommendation_json(request), \
                      mimetype='application/json')

def get_recommendation_json(request):  
  sharer_user = request.user
  
  if not sharer_user.is_authenticated():
    response = dict()
    response['auth_error'] = True
    return simplejson.dumps(response)

  feed_title = request.REQUEST['feed_title']
  feed_url = request.REQUEST['feed_url']
  post_url = request.REQUEST['post_url']
  post_title = request.REQUEST['post_title']
  post_contents = request.REQUEST['post_contents']
  expanded_view = (request.REQUEST['expanded_view'] == 'true')
  
  # If the feed or post or other items are viewed in two transactions at
  # the same time, one will fail with an IntegrityError.  We'll keep
  # looping until we either load them or create them in new transactions
  keep_looping = True
  while keep_looping:
    try:
      post_objects = get_post_objects(feed_url=feed_url, post_url=post_url, \
                                      post_title=post_title, \
                                      post_contents=post_contents, \
                                      sharer_user = sharer_user, \
                                      feed_title = feed_title, \
                                      expanded_view = expanded_view)
      keep_looping = False
    except IntegrityError:
      transaction.rollback()

  feed = post_objects['feed']
  post = post_objects['post']
  sharer = post_objects['sharer']
  shared_posts = post_objects['shared_posts']
  shared_post_receivers = post_objects['shared_post_receivers']
  shared_users = post_objects['shared_users']
  viewed_post = post_objects['viewed_post']
  study_participant = post_objects['study_participant']

  #print 'get recommendations'
  if study_participant is None or study_participant.user_interface:
    recommendations, sorted_friends = n_best_friends(post, sharer)
    #print recommendations
  else:
    #print 'no recommendations'
    recommendations = []
    sorted_friends = []
    
  seen_it = who_has_seen_it(recommendations, post)

  if viewed_post:
    log_recommendations(viewed_post, sorted_friends)

  response = dict()
  response['posturl'] = post.url
  response['users'] = create_user_json(recommendations, seen_it, shared_users)
  response_json = simplejson.dumps(response)
 
  transaction.commit()
  return response_json


def create_user_json(recommendations, seen_it, sent_already):
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
                   .filter(digest = False) \
                   .filter(time__gte = midnight_today) \
                   .count()
    person['shared_today'] = shared_today
    person['seen_it'] = recommendation in seen_it
    person['sent'] = recommendation in sent_already

    rec_list.append(person)

  return rec_list

def who_has_seen_it(recommendations, post):
  """who has already seen the link?"""
  received_query = SharedPostReceiver.objects \
            .filter(shared_post__post = post) \
            .filter(receiver__user__in = recommendations) \
            .select_related('receiver__user')
  received_it = [spr.receiver.user for spr in received_query]

  # who has already viewed it in GReader?
  viewed_query = ViewedPost.objects \
                 .filter(post = post) \
                 .filter(sharer__user__in = recommendations) \
                 .select_related('sharer__user')
  viewed_it = [vp.sharer.user for vp in viewed_query]

  return set(received_it + viewed_it)


def get_post_objects(feed_title, feed_url, post_url, post_title, \
                     post_contents, sharer_user, expanded_view):
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

  try:
    study_participant = StudyParticipant.objects.get(sharer = sharer)
    # check to see if study participant assignment is over
    assignment = StudyParticipantAssignment.objects.filter(study_participant = study_participant).order_by('-start_time')[0]
    if assignment.end_time < datetime.datetime.now():
       study_participant = None
  except StudyParticipant.DoesNotExist:
    study_participant = None

  # find out if we've already shared it with anyone
  shared_posts = SharedPost.objects.filter(post=post, sharer=sharer)
  shared_post_receivers = SharedPostReceiver.objects \
                            .filter(shared_post__in = shared_posts)
  shared_users = []
  for shared_user in shared_post_receivers:
    shared_users.append(shared_user.receiver.user)

  viewed = None
  # only log the view for active study participants
  if study_participant:
    viewed = ViewedPost(post=post, sharer=sharer, \
                        expanded_view = expanded_view)
    viewed.save()

  post_objects = dict()
  post_objects['feed'] = feed
  post_objects['post'] = post
  post_objects['sharer'] = sharer
  post_objects['shared_posts'] = shared_posts
  post_objects['shared_post_receivers'] = shared_post_receivers
  post_objects['shared_users'] = shared_users
  post_objects['viewed_post'] = viewed
  post_objects['study_participant'] = study_participant
  return post_objects


def n_best_friends(post, sharer):
  begin_time = time.clock()
  friends = Receiver.objects \
            .filter(sharedpostreceiver__shared_post__sharer=sharer) \
            .filter(recommend = True) \
            .distinct()    
  
  blacklist = sharer.blacklist.all()

  shared_posts = Post.objects \
                 .filter(sharedpost__sharer=sharer)
  total_shared = shared_posts.count()

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
    # skip people who aren't real email addresses or who are in blacklist
    if email_re.match(receiver.user.email) is None or receiver in blacklist:
      continue

    num_shared = shared_posts.filter(sharedpost__sharedpostreceiver__receiver=receiver).count()

    term_vector = TermVectorCell.objects.filter(receiver = receiver) \
                  .order_by('term__term').select_related('term')

    if len(term_vector) > 0:
      post_cosine_distance = cosine_distance(term_vector, freq_dist, freq_dist_counts)
      frequency_weight = (num_shared) / float(total_shared)
      score = {}
      score['receiver'] = receiver
      score['score'] = post_cosine_distance * frequency_weight
      score['fw'] = frequency_weight
      scores.append(score)
   
  # now find the top NUM_RECOMMENDATIONS
  sorted_friends = sorted(
    scores, key=operator.itemgetter('score'), reverse=True)
  if len(sorted_friends) > NUM_RECOMMENDATIONS:
    sorted_friends = sorted_friends[0:NUM_RECOMMENDATIONS]

  print "time for recommendation: " + str(time.clock() - begin_time)
  return map(lambda friend:friend['receiver'].user, sorted_friends), sorted_friends


def log_recommendations(viewed_post, recommendations):
  for i in range( len(recommendations) ):
    receiver = recommendations[i]['receiver']
    score = recommendations[i]['score']
    vp_rec = ViewedPostRecommendation(receiver=receiver, \
                                      viewed_post = viewed_post, \
                                      recommendation_order = i, \
                                      cosine_distance = score)
    vp_rec.save()
  

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
