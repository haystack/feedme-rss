import nltk
from HTMLParser import HTMLParseError

def clean_html(str):
  try:
    return nltk.clean_html(str)
  except HTMLParseError:
    return ""
