from django.http import HttpResponse
from django.contrib.auth.models import User
from models import *
from django.contrib.auth.decorators import login_required

@login_required
def comment(request):
    post_url = request.POST['post_url']
    comment = request.POST['comment']

    post = Post.objects.get(url = post_url)
    sharer = Sharer.objects.get(user=request.user)
    try:
        shared_post = SharedPost.objects.get(post=post, sharer=sharer)
    except SharedPost.DoesNotExist:
        shared_post = SharedPost(post=post, sharer=sharer)
    shared_post.comment = comment
    shared_post.save()

    script_output = "{\"response\": \"ok\"}"
    return HttpResponse(script_output, mimetype='application/json')
