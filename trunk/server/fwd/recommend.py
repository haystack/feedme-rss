from django.http import HttpResponse
from django.core import serializers
from django.utils import simplejson
from django.contrib.auth.models import User 
from models import *
from django.contrib.auth.decorators import login_required
import nltk
import math
import operator


@login_required
def recommend(request):
  sharer_user = request.user

  feed_url = request.POST['feed_url']
  post_url = request.POST['post_url']
  post_title = request.POST['post_title']
  post_contents = request.POST['post_contents']

  post_objects = get_post_objects(feed_url=feed_url, post_url=post_url, \
                                  post_title=post_title, \
                                  post_contents=post_contents, \
                                  sharer_user = sharer_user)
  feed = post_objects['feed']
  post = post_objects['post']
  sharer = post_objects['sharer']
  shared_post = post_objects['shared_post']
  shared_post_receivers = post_objects['shared_post_receivers']
  shared_users = post_objects['shared_users']

  print 'get recommendations'
  recommendations = n_best_friends(post, sharer)
  print recommendations
  json = serializers.serialize('json', recommendations, ensure_ascii=False)
  shared_json = serializers.serialize('json', shared_users, ensure_ascii=False)
  
  script_output = '{"posturl": "' + post.url + '", "users": ' + \
                  json + ', "shared": ' + shared_json + '}'
  return HttpResponse(script_output, mimetype='application/json')


def get_post_objects(feed_url, post_url, post_title, post_contents, \
                     sharer_user):
  # create objects if we need to
  try:
    feed = Feed.objects.get(rss_url=feed_url)
  except Feed.DoesNotExist:
    feed = Feed(rss_url=feed_url)
    feed.save()
  try:
    post = Post.objects.get(url=post_url)
    print 'post exists'    
  except Post.DoesNotExist:
    post = Post(url=post_url, feed=feed, title=post_title,
                contents=post_contents)
    post.save()
    print 'creating term vector'
    create_term_vector(post)
    print 'created term vector'
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


def create_term_vector(post):
  "Creates objects for the term vector for the post"
  frequency_distribution = post.tokenize()
  print 'tokenized'
  for frequency_item in frequency_distribution.items():
    try:
      term = Term.objects.get(term=frequency_item[0])
    except Term.DoesNotExist:
      term = Term(term=frequency_item[0])
      term.save()

    term_vector_cell = TermVectorCell(term=term, count=frequency_item[1],
                                      post=post)
    term_vector_cell.save()

        
def n_best_friends(post, sharer):
  post_vector = TermVectorCell.objects.filter(
    post=post).select_related()
  post_norm = vector_norm(post_vector)
  print post_norm
  if post_norm == 0:
    return []
  
  scores = []
  friends = Receiver.objects.filter(
    sharedpostreceiver__shared_post__sharer=sharer).distinct()

  for receiver in friends:
    print 'reviewing friend: ' + receiver.user.username
    # Get all term vector cells in posts that were recommended to receiver
    shared_posts = SharedPost.objects.filter(sharedpostreceiver__receiver = receiver)
        
    # will contain the distances to all the articles that have been shared
    cosine_distances = []

    for shared_post in shared_posts:
      term_counts = TermVectorCell.objects.filter(post=shared_post.post). \
                    select_related()
      if len(term_counts) == 0:
        continue
      
      dot_product = 0
      for term_count in term_counts:
        try:
          post_count = post_vector.get(term__term__exact=term_count.term.term)
          dot_product += (term_count.count * post_count.count)
        except TermVectorCell.DoesNotExist:
          continue

      cosine_distance = dot_product / (vector_norm(term_counts) * post_norm)
      cosine_distances.append(cosine_distance)

    if len(cosine_distances) > 0:
      mean_cosine = sum(cosine_distances) / len(cosine_distances)
      score = {}
      score['receiver'] = receiver
      score['score'] = mean_cosine
      scores.append(score)

  # now find the top 3
  print scores
  sorted_friends = sorted(
    scores, key=operator.itemgetter('score'))
  if len(sorted_friends) > 3:
    sorted_friends = sorted_friends[len(sorted_friends)-3:]
  print sorted_friends
  return map(lambda friend:friend['receiver'].user, sorted_friends)

  
def vector_norm(term_vectors):
  norm = 0
  for term_element in term_vectors:
    norm += math.pow(term_element.count, 2)

  return math.sqrt(norm)
