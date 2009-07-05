from django.db import models
from django.contrib.auth.models import User
import nltk

# make email addresses be 75 characters like usernames
User._meta.get_field_by_name('username')[0].max_length=75

# TODO: at some point, remove primary keys for objects that don't need them
#  (Sharer, Receiver, SharedPost, etc.)

class Sharer(models.Model):
    user = models.ForeignKey(User, unique=True)
    
    def __unicode__(self):
        return unicode(self.user)
    
class Receiver(models.Model):
    user = models.ForeignKey(User, unique=True)
    digest = models.BooleanField(default = False)
    recommend = models.BooleanField(default = True)
    settings_seed = models.IntegerField(default = 0)
    term_vector_dirty = models.BooleanField(default = False)

    def tokenize(self):
        """Creates a FreqDist representing all the posts shared
        with this person"""
        text = u''
        received_posts = Post.objects.filter( \
            sharedpost__sharedpostreceiver__receiver = self)
        for received_post in received_posts:
            post_text = nltk.clean_html(received_post.title) + u' ' + \
                        nltk.clean_html(received_post.contents) + u' ' + \
                        nltk.clean_html(received_post.feed.title)
            text = text + post_text
        
        tokens = nltk.word_tokenize(text)
        
        porter = nltk.PorterStemmer()
        stopwords = nltk.corpus.stopwords.words('english')
        words = []
        for w in tokens:
            w = w.lower()
            if w not in stopwords and w.isalpha():
                words.append(porter.stem(w))
        frequency_dist = nltk.FreqDist(words)
        return frequency_dist
        

    def __unicode__(self):
        return unicode(self.user)

class Feed(models.Model):
    rss_url = models.TextField(unique=True) # the rss feed url
    title = models.TextField()
    
    def __unicode__(self):
        return self.rss_url;

class Post(models.Model):
    url = models.TextField()
    feed = models.ForeignKey(Feed)
    title = models.TextField()
    contents = models.TextField()

    def get_term_vector(self):
        "Returns a QuerySet term vector for this post"
        return TermVectorCell.objects.filter(post=self);

    def tokenize(self):
        """Returns a tokenized frequency distribution of the post contents
        Each item in the list has [0] = the string, and [1] = the count
        """
        text = nltk.clean_html(self.title) + ' ' + \
                   nltk.clean_html(self.contents) + \
                   nltk.clean_html(self.feed.title)
        tokens = nltk.word_tokenize(text)

        porter = nltk.PorterStemmer()
        stopwords = nltk.corpus.stopwords.words('english')
        words = []
        for w in tokens:
            w = w.lower()
            if w not in stopwords and w.isalpha():
                words.append(porter.stem(w))
        frequency_dist = nltk.FreqDist(words)
        return frequency_dist
    
    def __unicode__(self):
        return self.title + ": " + self.url;

    class Meta:
        unique_together = ("url", "feed")
   

class SharedPost(models.Model):
    post = models.ForeignKey(Post)
    sharer = models.ForeignKey(Sharer)
    comment = models.TextField()
    bookmarklet = models.BooleanField()
    
    def __unicode__(self):
        return unicode(self.sharer) + u' post: ' + unicode(self.post);
    
class SharedPostReceiver(models.Model):
    shared_post = models.ForeignKey(SharedPost)
    receiver = models.ForeignKey(Receiver)
    time = models.DateTimeField(auto_now_add=True)
    sent = models.BooleanField(default = False)
    digest = models.BooleanField(default = False)
    
    def __unicode__(self):
        return u'receiver: ' + unicode(self.receiver) + u' sender: ' + unicode(self.shared_post);

class Term(models.Model):
    term = models.CharField(max_length=255, unique=True)

    def __unicode__(self):
        return unicode(self.term);

class TermVectorCell(models.Model):
    term = models.ForeignKey(Term)
    count = models.FloatField()
    receiver = models.ForeignKey('Receiver')

    def __unicode__(self):
        return unicode(self.term) + u': ' + unicode(self.count);
