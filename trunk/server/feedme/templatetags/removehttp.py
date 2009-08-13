from django import template
from django.template.defaultfilters import stringfilter

register = template.Library()

@register.filter(name='removehttp')
@stringfilter
def removehttp(value):
    if value.startswith('http://'):
        return value.partition('http://')[2]
    elif value.startswith('https://'):
        return value.partition('https://')[2]
    else:
        return value
        
    

