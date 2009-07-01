from django.core.management import setup_environ
import settings
setup_environ(settings)
from django.contrib.auth.models import User
from server.feedme.models import *
from django.db import transaction
import math
import datetime
import sys

@transaction.commit_manually
def reindex_all():
    """Intended as an offline process -- creates term vectors to describe
    individuals, and attaches them to the individuals"""
    
    receivers = Receiver.objects.all()
    update_receivers(receivers)

    transaction.commit()

@transaction.commit_manually
def incremental_update():
    """Updates the term vectors for anyone whose dirty bit is set"""
    receivers = Receiver.objects.filter(term_vector_dirty = True)
    print str(len(receivers)) + ' users to update incrementally'
    update_receivers(receivers)

    transaction.commit()
    

def update_receivers(receivers):
    # clear old vectors
    TermVectorCell.objects.filter(receiver__in = receivers).delete()
    
    # do online updating of profiles of people who received the post
    # it is very inefficient to loop through three times, but this
    # guarantees that all the terms are added to all people
    # before tf*idf is calculated and before vectors are trimmed.
    print "beginning recalculation of tf-idf scores"
    token_dict = dict()
    # first cache all the tokens
    print "tokenizing"
    for receiver in receivers:
        print "  tokenizing " + receiver.user.username
        token_dict[receiver.user.username] = receiver.tokenize()
    print "creating terms in database"
    for receiver in receivers:
        print u'  creating terms for: ' + receiver.user.username
        create_profile_terms(receiver, token_dict[receiver.user.username])
    print "updating tf-idf"
    for receiver in receivers:
        print u'  preliminary tf*idf for: ' + receiver.user.username        
        update_tf_idf(receiver, token_dict[receiver.user.username])
    print "trimming to top terms"
    for receiver in receivers:
        print u'  trimming tf*idf for: ' + receiver.user.username
        trim_profile_terms(receiver)

    for receiver in receivers:
        receiver.term_vector_dirty = False
        receiver.save()


def create_profile_terms(receiver, frequency_distribution):
    """creates profile terms for this user -- does not set tf-idf"""
    print '  ' + str(len(frequency_distribution.samples())) + ' words'

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
        print mode
        if mode == "incremental":
            incremental_update()
        elif mode == "reindex":
            yesterday = datetime.datetime.now() - datetime.timedelta(days = 1)
            newposts = SharedPost.objects \
                       .filter(sharedpostreceiver__time__gte = yesterday)
            print str(newposts.count()) + ' shared posts since yesterday'

            print u'Updating receiver term vectors...'
            reindex_all()
            print u'term vectors updated!'
    else:
        print 'Requires one argument: "incremental" or "reindex"'
