from django.db import models
from django.contrib.auth.models import User
import nltk

# make email addresses be 75 characters like usernames
User._meta.get_field_by_name('username')[0].max_length=75

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

    def get_term_vector(self):
        "Returns a QuerySet term vector for this post"
        return TermVectorCell.objects.filter(post=self);

    def tokenize(self):
        "Returns a tokenized frequency distribution of the post contents"
        print 'tokenizing'
        text = nltk.clean_html(self.title) + ' ' + \
                   nltk.clean_html(self.contents)
        tokens = nltk.word_tokenize(text)
        text = nltk.Text(tokens)

        porter = nltk.PorterStemmer()
        stopwords = nltk.corpus.stopwords.words('english')
        words = []
        for w in text:
            w = w.lower()
            if w not in stopwords and w.isalpha():
                words.append(porter.stem(w))
        frequency_dist = nltk.FreqDist(words)
        return frequency_dist
    
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

class Term(models.Model):
    term = models.CharField(max_length=255, unique=True)

    def __unicode__(self):
        return unicode(self.term);

class TermVectorCell(models.Model):
    term = models.ForeignKey(Term)
    count = models.IntegerField()
    post = models.ForeignKey(Post)

    def __unicode__(self):
        return unicode(self.term) + u': ' + unicode(self.count);
