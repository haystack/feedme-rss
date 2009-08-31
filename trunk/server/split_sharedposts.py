from django.core.management import setup_environ
import settings
setup_environ(settings)
from server.feedme.models import *
from datetime import datetime, timedelta

split_delta = timedelta(seconds = 5)
def split_sharedposts():
    """Finds and splits all sharedposts with multiple receivers over a large period of time
    into separate sharedposts"""
    for sp in SharedPost.objects.all():
        splits = generate_splits(sp)
        if len(splits) > 1:
            print [len(split) for split in splits]
        # uncomment the next line to actually make the change
        # update_splits(sp, groups)

def generate_splits(sp):        
    sp_receivers = SharedPostReceiver.objects \
                   .filter(shared_post = sp) \
                   .order_by('time')

    if sp_receivers.count() == 0:
        return []

    splits = [ set() ] # useful for debugging output
    current_shared_post = sp    
    earliest_time = sp_receivers[0].time
            
    for spr in sp_receivers:
        if spr.time - earliest_time >= split_delta:
            print 'needs to be split! ' + str(spr.shared_post.id) \
                  + ':  ' + str(earliest_time) + '  ...  ' + str(spr.time)

            # start a new set of posts
            splits.append( set() )
            earliest_time = spr.time

        splits[-1].add(spr)

    return splits

def update_splits(shared_post, splits):
    """updates the shared post receivers to a new shared post if necessary"""
    for i, split in enumerate(splits):
        if i > 0: # the first group (index 0) can keep the original post
            sp_copy = copy_shared_post(shared_post)
            sp_copy.save()
            
            for spr in split:
                spr.shared_post = sp_copy
                spr.save()
        

def copy_shared_post(shared_post):
    new_shared_post = SharedPost( \
        post = current_shared_post.post,
        sharer = current_shared_post.sharer,
        comment = current_shared_post.comment,
        bookmarklet = current_shared_post.bookmarklet,
        thanks = current_shared_post.thanks,
        clickthroughs = current_shared_post.clickthroughs)
    return new_shared_post   
    

if __name__ == '__main__':
    split_sharedposts()
