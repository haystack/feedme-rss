"""Will attempt to get a lock, and quit if unavailable.
Adapted from http://code.activestate.com/recipes/576572/"""

import contextlib, errno, os, sys

@contextlib.contextmanager
def flock(path):
    try:
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_RDWR)
    except OSError, e:
        if e.errno != errno.EEXIST:
            raise
        print 'Cannot get lockfile; exiting.'
        sys.exit(1)

    try:
        yield fd
    finally:
        os.unlink(path)


                                                                                                    
