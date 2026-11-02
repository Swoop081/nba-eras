import re, unicodedata
ALIAS = {'nicclaxton': 'nicolasclaxton', 'jakobpoltl': 'jakobpoeltl', 'sviatoslavmykhailiuk': 'svimykhailiuk'}


def nm(s):
    s = re.sub(r'\((TW|GL|DP|FA|S)\)', '', s)
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'\b(jr|sr|ii|iii|iv)\b\.?', '', s.replace('.', ''))
    k = re.sub(r'[^a-z]', '', s)
    return ALIAS.get(k, k)
