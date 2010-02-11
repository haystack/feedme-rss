from django.contrib.syndication.feeds import Feed, FeedDoesNotExist
from django.core.exceptions import ObjectDoesNotExist
from models import Receiver, SharedPostReceiver

class PostFeed(Feed):
    def title(self, obj):
        return "FeedMe: Items Shared with %s" % obj.user.email
        
    def link(self, obj):
        if not obj:
            raise FeedDoesNotExist
        return "/feeds/posts/%s/%d/" % (obj.user.email, obj.settings_seed)
    
    def description(self, obj):
        return "Items recently shared with %s" % obj.user.email
        
    author_name = "FeedMe"
    author_email = "feedme@csail.mit.edu"
    author_link = "http://feedme.csail.mit.edu/"
    
    """Returns the 5 SharedPosts most recently shared with the receiver"""
    def items(self, obj):
        def get_post(spr): return spr.shared_post
        return map(get_post, SharedPostReceiver.objects.filter(receiver=obj).order_by('-time')[:5])
    
    """Looks for the receiver who corresponds to the feed url"""
    def get_object(self, bits):
        if len(bits) != 2:
            raise ObjectDoesNotExist

        receiver = Receiver.objects.get(user__email=bits[0])        
        """Check to make sure correct number is in feed url"""
        if receiver.settings_seed != long(bits[1]):
            raise ObjectDoesNotExist
        
        return receiver
        
    def item_link(self, item):
        return item.post.url
    
    def item_pubdate(self, item):
        """There can be multiple SharedPostReceivers for the same SharedPost"""
        return SharedPostReceiver.objects.filter(shared_post=item)[0].time
