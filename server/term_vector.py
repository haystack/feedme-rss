from django.core.management import setup_environ
import settings
setup_environ(settings)
from django.contrib.auth.models import User
from server.feedme.models import *
from django.db import transaction

@transaction.commit_manually
def create_receiver_vectors():
    """Intended as an offline process -- creates term vectors to describe
    individuals, and attaches them to the individuals"""

    # todo: could eventually timestamp the last time we updated this
    # person's counts, then just add in the posts shared with them
    # since then instead of recomputing from scratch

    # clear old vectors
    TermVectorCell.objects.all().delete()
      
    for receiver in Receiver.objects.all():
        print u'updating terms for: ' + receiver.user.username

        # add new vectors
        received_posts = Post.objects.filter(
            sharedpost__sharedpostreceiver__receiver = receiver)
        for received_post in received_posts:
            add_profile_terms(received_post, receiver)

    transaction.commit()

def add_profile_terms(received_post, receiver):
    """Adds the post's terms to the person's profile"""
    frequency_distribution = received_post.tokenize()
    
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

        # increment the cell due to this new term
        term_vector_cell.count += frequency_item[1]
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
