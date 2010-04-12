from django.db import models
from django.contrib.auth.models import User
import nltk
import textutil

# make email addresses be 75 characters like usernames
User._meta.get_field_by_name('username')[0].max_length=75     
    
class Receiver(models.Model):
    user = models.ForeignKey(User, unique=True)
    digest = models.BooleanField(default = False)
    recommend = models.BooleanField(default = True)
    settings_seed = models.IntegerField(default = 0)
    term_vector_dirty = models.BooleanField(default = False)
    feed_only = models.BooleanField(default = False)

    def tokenize(self):
        """Creates a FreqDist representing all the posts shared
        with this person"""
        text = u''
        posts = []
        received_posts = Post.objects.filter( \
            sharedpost__sharedpostreceiver__receiver = self)
        for received_post in received_posts:
            posts.append(textutil.clean_html(received_post.title))
            posts.append(textutil.clean_html(received_post.contents))
            posts.append(textutil.clean_html(received_post.feed.title))
        text = u" ".join(posts)

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

class Sharer(models.Model):
    user = models.ForeignKey(User, unique=True)
    cc_me = models.BooleanField("CC me on e-mails when I share a post", default = True)
    blacklist = models.ManyToManyField(Receiver)
    
    def __unicode__(self):
        return self.name()
    
    def name(self):
        if self.user.first_name != u'' or self.user.last_name != u'':
            return self.user.first_name + u' ' + self.user.last_name
        else:
            return self.user.email   

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
        text = textutil.clean_html(self.title) + u' ' + \
                   textutil.clean_html(self.contents) + u' ' + \
                   textutil.clean_html(self.feed.title)
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
    bookmarklet = models.BooleanField(default = False)
    client = models.TextField(default = "greader")
    thanks = models.IntegerField(default = 0)
    clickthroughs = models.IntegerField(default = 0)
    
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

# For Logging
class ViewedPost(models.Model):
    post = models.ForeignKey(Post)
    sharer = models.ForeignKey(Sharer)
    time = models.DateTimeField(auto_now_add=True)
    expanded_view = models.BooleanField()
    link_clickthrough = models.BooleanField(default = False)

class ViewedPostRecommendation(models.Model):
    receiver = models.ForeignKey(Receiver)
    viewed_post = models.ForeignKey(ViewedPost)
    cosine_distance = models.FloatField()
    recommendation_order = models.IntegerField()

class LoggedIn(models.Model):
    sharer = models.ForeignKey(Sharer)
    time = models.DateTimeField(auto_now_add=True)

class StudyParticipant(models.Model):
    sharer = models.ForeignKey(Sharer, unique=True)
    user_interface = models.BooleanField()
    social_features = models.BooleanField()
    study_group = models.CharField(max_length = 20)

    def __unicode__(self):
        return self.sharer.name() + u"---" + self.sharer.user.email

class StudyParticipantAssignment(models.Model):
    study_participant = models.ForeignKey(StudyParticipant)
    user_interface = models.BooleanField()
    social_features = models.BooleanField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

    def __unicode__(self):
        return "%s: %s, ui=%s, social=%s, start=%s, end=%s" % ( \
            unicode(self.study_participant), \
            self.study_participant.study_group, \
            str(self.user_interface), \
            str(self.social_features), \
            unicode(self.start_time), \
            unicode(self.end_time) \
        )
