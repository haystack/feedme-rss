from django.core.management import setup_environ
import settings
setup_environ(settings)
from django.contrib.auth.models import User
from server.feedme.models import *
from django.db import transaction

def create_receiver_vectors():
    """Intended as an offline process -- creates term vectors to describe
    individuals, and attaches them to the individuals"""

    # todo: could eventually timestamp the last time we updated this
    # person's counts, then just add in the posts shared with them
    # since then instead of recomputing from scratch

    for receiver in Receiver.objects.all():
        print u'updating terms for: ' + receiver.user.username

        # clear old vectors on the person
        # todo: this will momentarily make the person have _no profile_,
        # which is undesirable, but there's no easy way to manage the
        # transaction to fix this
        old_terms = TermVectorCell.objects.filter(receiver = receiver).delete()
        
        # add new vectors
        received_posts = Post.objects.filter(
            sharedpost__sharedpostreceiver__receiver = receiver)
        for received_post in received_posts:
            frequency_distribution = received_post.tokenize()

            for frequency_item in frequency_distribution.items():
                # get or create the Term and the TermVectorCell
                try:
                    term = Term.objects.get(term=frequency_item[0])
                except Term.DoesNotExist:
                    term = Term(term=frequency_item[0])
                    term.save()

                try:
                    term_vector_cell = TermVectorCell.objects.get(
                        receiver = receiver,
                        term = term)
                except TermVectorCell.DoesNotExist:
                    term_vector_cell = TermVectorCell(
                        term=term,
                        count=0,
                        receiver = receiver)

                # increment the cell due to this new term
                term_vector_cell.count += frequency_item[1]
                term_vector_cell.save()

        TermVectorCell.objects.filter(receiver = receiver) \
                                               .filter(count = 0) \
                                               .delete()
        describe_receiver(receiver)

def describe_receiver(receiver):
    print u'describing ' + receiver.user.username
    vector = TermVectorCell.objects.filter(receiver = receiver) \
             .order_by('-count')
    for term_vector_cell in vector:
        print term_vector_cell.term.term + \
              u': ' + unicode(term_vector_cell.count)

    print '-------------------------------------------'


if __name__ == '__main__':
    print u'Updating receiver term vectors...'
    create_receiver_vectors()
