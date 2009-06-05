from django.core.management import setup_environ
import settings
setup_environ(settings)
from django.contrib.auth.models import User
from server.feedme.models import *
from django.db import transaction
import math

@transaction.commit_manually
def create_receiver_vectors():
    """Intended as an offline process -- creates term vectors to describe
    individuals, and attaches them to the individuals"""
    
    # clear old vectors
    TermVectorCell.objects.all().delete()

    print 'populating terms the first time'
    for receiver in Receiver.objects.all():
        print u'creating terms for: ' + receiver.user.username
        create_profile_terms(receiver = receiver, frequency_distribution = receiver.tokenize())

    for receiver in Receiver.objects.all():
        print u'creating preliminary tf*idf values for: ' + receiver.user.username
        update_tf_idf(receiver = receiver, frequency_distribution = receiver.tokenize())

    print 'repeating so that the idf terms are correct'
    for receiver in Receiver.objects.all():
        print u'trimming tf*idf values terms for: ' + receiver.user.username
        trim_profile_terms(receiver = receiver)    

    transaction.commit()


def create_profile_terms(receiver, frequency_distribution):
    """creates profile terms for this user -- does not set tf-idf"""
    print str(len(frequency_distribution.samples())) + ' words'

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

@transaction.commit_manually
def transaction_test():
    for receiver in Receiver.objects.all():
        old_terms = TermVectorCell.objects.filter(receiver = receiver).delete()

        transaction.commit()
        describe_receiver(receiver)

if __name__ == '__main__':
    print u'Updating receiver term vectors...'
    create_receiver_vectors()
    print u'term vectors updated!'
#    for receiver in Receiver.objects.all():
#        describe_receiver(receiver)
