from django.db import models
from django.contrib.auth.models import User

# Create your models here.
# TODO: at some point, remove primary keys for objects that don't need them
#  (Sharer, Receiver, SharedPost, etc.)

class Sharer(models.Model):
    user = models.ForeignKey(User, unique=True)
    
    def __unicode__(self):
        return unicode(self.user)
    
class Receiver(models.Model):
    user = models.ForeignKey(User, unique=True)
    
    def __unicode__(self):
        return unicode(self.user)

class Feed(models.Model):
    rss_url = models.URLField() # the rss feed url
    
    def __unicode__(self):
        return self.rss_url;

class Post(models.Model):
    url = models.URLField()
    feed = models.ForeignKey(Feed)
    title = models.TextField()
    contents = models.TextField()
    
    def __unicode__(self):
        return self.title + ": " + self.url;

class SharedPost(models.Model):
    post = models.ForeignKey(Post)
    sharer = models.ForeignKey(Sharer)
    comment = models.TextField()
    time = models.DateTimeField(auto_now_add=True)
    
    def __unicode__(self):
        return unicode(self.sharer) + u' ' + unicode(self.time);
    
class SharedPostReceiver(models.Model):
    shared_post = models.ForeignKey(SharedPost)
    receiver = models.ForeignKey(Receiver)
    def __unicode__(self):
        return u'receiver: ' + unicode(self.receiver) + u' sender: ' + unicode(self.shared_post);
