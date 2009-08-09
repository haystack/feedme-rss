from django.http import HttpResponse
from django.utils import simplejson
from django.contrib.auth.models import User
from models import *
from django.contrib.auth.decorators import login_required
from recommend import create_user_json

@login_required
def seen_it(request):
    feed_objects = get_feed_objects(request.POST['post_url'],
                                    request.POST['feed_url'],
                                    request.POST['recipient'],
                                    request.user)

    received_query = SharedPostReceiver.objects \
                     .filter(shared_post__post = feed_objects['post']) \
                     .filter(receiver = feed_objects['receiver']) \
                     .count()

    # who has already viewed it in GReader?
    viewed_query = ViewedPost.objects \
                   .filter(post = feed_objects['post']) \
                   .filter(sharer = feed_objects['sharer']) \
                   .count()

    has_seen_it = set()
    if received_query > 0 or viewed_query > 0:
        has_seen_it.add(feed_objects['receiver'].user.email)
    user_info = create_user_json([ feed_objects['receiver'].user ],
                                 has_seen_it)
    user_info[0]['posturl'] = request.POST['post_url']
    
    user_info_json = simplejson.dumps(user_info[0])
    
    return HttpResponse(user_info_json, mimetype='application/json')
    

def get_feed_objects(post_url, feed_url, recipient_email, sharer_user):
    feed_objects = dict()

    # get the post
    post = Post.objects.filter(feed__rss_url = feed_url).get(url=post_url)
    feed_objects['post'] = post
    
    try:
        user_receiver = User.objects.get(email = recipient_email)
    except User.DoesNotExist:
        # Create a user with that username, email and password.
        user_receiver = User.objects.create_user(recipient_email, \
                                                 recipient_email, \
                                                 recipient_email)
        user_receiver.save()
    try:
        receiver = Receiver.objects.get(user=user_receiver)
    except Receiver.DoesNotExist:
        receiver = Receiver(user=user_receiver)
        receiver.save()
    feed_objects['receiver'] = receiver

    sharer = Sharer.objects.get(user=sharer_user)
    feed_objects['sharer'] = sharer

    return feed_objects

   
