from models import *
import codecs, sys
from django.http import HttpResponseRedirect
from django.http import Http404

# set stdout to Unicode so we can write Unicode strings to stdout
# todo: create some sort of startup script which calls this
sys.stdout = codecs.getwriter('utf8')(sys.stdout)

def clickthrough(request, sharedpost_pk):
    try:
        shared_post = SharedPost.objects.get(pk = sharedpost_pk)
    except SharedPost.DoesNotExist:
        raise Http404
    shared_post.clickthroughs += 1
    shared_post.save()

    return HttpResponseRedirect(shared_post.post.url)
