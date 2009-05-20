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
        print u'1x: updating terms for: ' + receiver.user.username
        create_profile_terms(receiver)

    print 'repeating so that the idf terms are correct'
    for receiver in Receiver.objects.all():
        print u'2x: updating terms for: ' + receiver.user.username
        create_profile_terms(receiver)    

    transaction.commit()


def create_profile_terms(receiver):
    """creates profile terms and initializes tf-idf"""
    frequency_distribution = receiver.tokenize()
    print str(len(frequency_distribution.samples())) + ' words'
    num_people = Receiver.objects.count() * 1.0 # we need a double

    MAX_TERMS = 100
    cur_terms = 0
    for frequency_item in frequency_distribution.items():
        cur_terms += 1
        # the FreqDist iterates in decreasing order of counts, so we can
        # cut off after 100 and get just the top 100 posts
        if cur_terms > MAX_TERMS:
            break
        
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

        tf = frequency_distribution.freq(frequency_item[0])
        num_receivers_with_term_shared = Receiver.objects.filter(termvectorcell__term = term).count()
        idf = math.log(num_people / (1 + num_receivers_with_term_shared))
        
        tf_idf = tf*idf
        term_vector_cell.count = tf_idf
        term_vector_cell.save()
    

def describe_receiver(receiver):
    print u'describing ' + receiver.user.username
    vector = TermVectorCell.objects.filter(receiver = receiver) \
             .order_by('-count')
    for term_vector_cell in vector:
        print term_vector_cell.term.term + \
              u': ' + unicode(term_vector_cell.count)

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
    #transaction_test()
