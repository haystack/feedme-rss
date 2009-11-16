from __future__ import with_statement 

from django.core.management import setup_environ
import settings
setup_environ(settings)
from django.contrib.auth.models import User
from server.feedme.models import *
from django.db import transaction
import math
import datetime
import sys, codecs, traceback
from flock import flock


# set stdout to Unicode so we can write Unicode strings to stdout
# todo: create some sort of startup script which calls this
sys.stdout = codecs.getwriter('utf8')(sys.stdout)

@transaction.commit_manually
def reindex_all():
    """Intended as an offline process -- creates term vectors to describe
    individuals, and attaches them to the individuals"""

    try:
        receivers = Receiver.objects.all()
        update_receivers(receivers)
    except:
        exceptionType, exceptionValue, exceptionTraceback = sys.exc_info()
        traceback.print_exception(exceptionType, exceptionValue, exceptionTraceback, file=sys.stdout)
        transaction.rollback()
    else:
        print 'before committing: ' + str(datetime.datetime.now())
        transaction.commit()
        print 'after committing: ' + str(datetime.datetime.now())
        

@transaction.commit_manually
def incremental_update():
    """Updates the term vectors for anyone whose dirty bit is set"""
    receivers = Receiver.objects.filter(term_vector_dirty = True)

    print str(len(receivers)) + ' users to update incrementally'
    for receiver in receivers:
       # we do them individually to make any other blocking activity
       # not need to wait quite as long
       update_receivers([receiver])
       transaction.commit()
    

def update_receivers(receivers):
    # clear old vectors
    print 'deleting old vectors'
    TermVectorCell.objects.filter(receiver__in = receivers).delete() 
    print 'deleted old vectors '
    print str(datetime.datetime.now())   
    
    # do online updating of profiles of people who received the post
    # it is very inefficient to loop through three times, but this
    # guarantees that all the terms are added to all people
    # before tf*idf is calculated and before vectors are trimmed.
    print "beginning recalculation of tf-idf scores"
    token_dict = dict()
    # first cache all the tokens
    print "tokenizing"
    for receiver in receivers:
        #print "  tokenizing " + receiver.user.username
        token_dict[receiver.user.username] = receiver.tokenize()
    print str(datetime.datetime.now())        
    print "creating terms in database"
    for receiver in receivers:
        #print u'  creating terms for: ' + receiver.user.username
        create_profile_terms(receiver, token_dict[receiver.user.username])
    print str(datetime.datetime.now())        
    print "updating tf-idf"
    for receiver in receivers:
        #print u'  preliminary tf*idf for: ' + receiver.user.username        
        update_tf_idf(receiver, token_dict[receiver.user.username])
    print str(datetime.datetime.now())        
    print "trimming to top terms"
    for receiver in receivers:
        #print u'  trimming tf*idf for: ' + receiver.user.username
        trim_profile_terms(receiver)
    print str(datetime.datetime.now())

    print 'saving new info'
    for receiver in receivers:
        receiver.term_vector_dirty = False
        receiver.save()
    print str(datetime.datetime.now())

def create_profile_terms(receiver, frequency_distribution):
    """creates profile terms for this user -- does not set tf-idf"""
    # print '  ' + str(len(frequency_distribution.samples())) + ' words'

    for frequency_item in frequency_distribution.items():
        # get or create the Term and the TermVectorCell
        try:
            term = Term.objects.get(term=frequency_item[0])
        except Term.DoesNotExist:
            term = Term(term=frequency_item[0])
            term.save()
            
        try:
            term_vector_cell = TermVectorCell.objects \
                               .filter(receiver = receiver) \
                               .get(term = term)
        except TermVectorCell.DoesNotExist:
            term_vector_cell = TermVectorCell(
                term=term,
                count=0,
                receiver = receiver)
            term_vector_cell.save()


def update_tf_idf(receiver, frequency_distribution):
    """assumes that all terms have been updated for all users. updates tf*idf scores."""
    num_people = Receiver.objects.count() * 1.0 # we need a double

    for term_vector_cell in TermVectorCell.objects.filter(receiver = receiver).select_related('term'):
        term = term_vector_cell.term
        tf = frequency_distribution.freq(term.term)
        num_receivers_with_term_shared = Receiver.objects.filter(termvectorcell__term = term).count()
        idf = math.log(num_people / (1 + num_receivers_with_term_shared))
    
        tf_idf = tf*idf
        term_vector_cell.count = tf_idf
        term_vector_cell.save()


def trim_profile_terms(receiver):
    """trims a person's term vector to just the top 100 terms by tf*idf score"""
    MAX_TERMS = 100

    query = TermVectorCell.objects.filter(receiver = receiver).order_by('-count')
    if query.count() > 0:
        cutoff = query[min(len(query), MAX_TERMS)-1].count
        TermVectorCell.objects.filter(receiver = receiver).filter(count__lt = cutoff).delete()

def describe_receiver(receiver):
    print u'describing ' + receiver.user.username
    vector = TermVectorCell.objects.filter(receiver = receiver) \
             .order_by('-count')
    for term_vector_cell in vector:
        output = term_vector_cell.term.term + \
              u': ' + unicode(term_vector_cell.count)
        print output.encode('utf-8')

    print '-------------------------------------------'


if __name__ == '__main__':
    if len(sys.argv) == 2:
        mode = str(sys.argv[1])
        lock_directory = '/tmp/'
        
        if mode == "incremental":
            with flock(lock_directory + '.feedme-incremental-termvector'):
                incremental_update()
        elif mode == "reindex":
            with flock(lock_directory + '.feedme-reindex-termvector'):
                print str(datetime.datetime.now()) + ' starting'
                yesterday = datetime.datetime.now() - datetime.timedelta(days = 1)
                newposts = SharedPost.objects \
                           .filter(sharedpostreceiver__time__gte = yesterday) \
                           .distinct()
                newpost_sharers = Sharer.objects \
                                  .filter(sharedpost__in = newposts) \
                                  .distinct()

                print str(newpost_sharers.count()) + ' people shared since yesterday'
                print str(datetime.datetime.now())
                print str(newposts.count()) + ' shared posts since yesterday'
                print str(datetime.datetime.now())                

                sp_clicked = SharedPost.objects \
                             .filter(sharedpostreceiver__time__gte = yesterday) \
                             .filter(clickthroughs__gte = 1) \
                             .distinct()
                print str(sp_clicked.count()) + ' FeedMe links sent yesterday had at least one clickthrough to the link'
                print str(datetime.datetime.now())

                sp_thanked = SharedPost.objects \
                             .filter(sharedpostreceiver__time__gte = yesterday) \
                             .filter(thanks__gte = 1) \
                             .distinct()
                print str(sp_thanked.count()) + ' FeedMe links sent yesterday had a thank you'
                print str(datetime.datetime.now())
                
                             
                logins = LoggedIn.objects.filter(time__gte = yesterday)
                print str(logins.count()) + ' GReader views/refreshes since yesterday'
                print str(datetime.datetime.now())


                viewed = ViewedPost.objects.filter(time__gte = yesterday)
                print str(viewed.count()) + ' posts viewed since yesterday'
                print str(datetime.datetime.now())

                clicked = ViewedPost.objects.filter(time__gte = yesterday) \
                          .filter(link_clickthrough = True)
                print str(clicked.count()) + ' GReader posts with clicked-through links yesterday'
                print str(datetime.datetime.now())

                print
                print 'sharing records:'

                sharers = Sharer.objects.filter(sharedpost__in = newposts).distinct()
                for sharer in sharers:
                    shared_by_person = newposts.filter(sharer = sharer)
                    print sharer.user.email + ': ' \
                          + str(len(shared_by_person)) + ' posts'
                    print str(datetime.datetime.now())
                
                print u'Updating receiver term vectors...'
                reindex_all()
                print str(datetime.datetime.now())
                print u'term vectors updated!'
    else:
        print 'Requires one argument: "incremental" or "reindex"'
