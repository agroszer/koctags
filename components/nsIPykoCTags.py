# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Initial Developer of the Original Code is
# Adam Groszer.
# Portions created by the Initial Developer are Copyright (C) 2010
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   Adam Groszer <agroszer@gmail.com>
#   Davide Ficano <davide.ficano@gmail.com>
#   ActiveState Software Inc
#   Brandon Corfman (via kNose)
# Some code and lots of knowledge taken from the above
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****

# TODO:
# do NOT keep the tagfile open

import os, traceback, logging
import sys
import stat
import time

try:
    from xpcom import components
    from xpcom._xpcom import PROXY_SYNC, PROXY_ALWAYS, PROXY_ASYNC, getProxyForObject
except ImportError:
    components = None

log = logging.getLogger('koCTags')
log.setLevel(logging.DEBUG)

class Stats(object):
    def __init__(self):
        self.reads = 0
        self.loops = 0
        self.start = time.time()

    def finish(self):
        log.debug("lookup done. time elapsed: %s, reads: %s, loops: %s" %(
            time.time()-self.start, self.reads, self.loops ))

class Tag(object):
    if components:
        _com_interfaces_ = components.interfaces.koICTagInfo

    _reg_desc_ = "CTag info"
    _reg_contractid_ = "@pyte.hu/koCTagInfo;1"
    _reg_clsid_ = "{af341b40-a454-11df-981c-0800200c9a66}"

    def __init__(self, text, fpos):
        parts = text.split('\t', 2)
        self.tagname = parts[0]
        self.tagfile = parts[1]
        self.taginfo = parts[2]
        self.fpos = fpos

HEADERMAP = {
    '!_TAG_FILE_FORMAT': 'tagFileFormat',
    '!_TAG_FILE_SORTED': 'tagFileSorted',
    '!_TAG_PROGRAM_AUTHOR': '',
    '!_TAG_PROGRAM_NAME': '',
    '!_TAG_PROGRAM_URL': '',
    '!_TAG_PROGRAM_VERSION': '',
}

class CTagFile(object):
    def __init__(self, filename):
        self.filename = filename
        self.getStatinfo()
        self.getHeader(open(self.filename, 'r'))

    def getStatinfo(self):
        statinfo = os.stat(self.filename)
        self.size = statinfo[stat.ST_SIZE]
        self.lastmod = statinfo[stat.ST_MTIME]

        log.debug("%s filesize %s" % (self.filename, self.size))
        recsize = self.size/512
        log.debug("est record count %s" % recsize)

    def getHeader(self, fle):
        #!_TAG_FILE_FORMAT	2	/extended format; --format=1 will not append ;" to lines/
        #!_TAG_FILE_SORTED	1	/0=unsorted, 1=sorted, 2=foldcase/
        #!_TAG_PROGRAM_AUTHOR	Darren Hiebert	/dhiebert@users.sourceforge.net/
        #!_TAG_PROGRAM_NAME	Exuberant Ctags	//
        #!_TAG_PROGRAM_URL	http://ctags.sourceforge.net	/official site/
        #!_TAG_PROGRAM_VERSION	5.8	//
        for k,v in HEADERMAP.items():
            if v:
                setattr(self, v, None)

        line ="!"
        while line.startswith('!'):
            line = fle.readline()
            parts = line.split('\t')
            attr = HEADERMAP.get(parts[0])
            if attr:
                setattr(self, attr, parts[1])

        if self.tagFileSorted != '1':
            raise ValueError("tagfile sorted != 1")
        if self.tagFileFormat not in ('1','2'):
            raise ValueError("tagfile format not in 1,2")


    def parse(self, line, fpos):
        return Tag(line, fpos)

    def __getitem__(self, key):
        return self.findKey(key)

    def _readline(self, fle, fpos=None, stat=None):
        if fpos:
            fpos = max(fpos, 0)

            fle.seek(fpos)
            if fpos <> 0:
                # may not start at a line break! Discard.
                log.debug("read at %s" % fpos)
                baddata = fle.readline()
                if stat:
                    stat.reads += 1

        linepos = fle.tell()
        log.debug("read next line at %s" % linepos)
        line = fle.readline()

        if stat:
            stat.reads += 1

        if not line:
            return None

        tag = self.parse(line, linepos)
        log.debug("read %s, %s" % (tag.tagname, tag.tagfile))
        return tag

    def _findKey(self, fle, textToFind, startpoint=0, endpoint=None,
                matcher=lambda tag,text: tag.tagname==text,
                stat=None):
        endpoint = self.size
        lastTag = None

        while True:
            if stat:
                stat.loops += 1

            currentpoint = (startpoint + endpoint) // 2

            tag = self._readline(fle, currentpoint, stat)

            if not tag:
                # read returned empty - end of file
                return None
                #raise KeyError('key %s not found'%(textToFind,))

            if matcher(tag, textToFind):
                #print 'key found at ', linestart, ' with value ', tag
                return tag

            if (endpoint == startpoint) or (lastTag and lastTag.fpos == tag.fpos):
                #second part means no move
                return None
                #raise KeyError('key %d not found'%(textToFind,))

            if tag.tagname > textToFind:
                endpoint = currentpoint
                #return self.findKey(textToFind, startpoint, currentpoint)
            else:
                startpoint = currentpoint
                #return self.findKey(textToFind, currentpoint, endpoint)
            lastTag = tag

    def getCompletion(self, text, maxcount, stat):
        """get at most maxcount definitions beginning with text"""
        matcher=lambda tag,text: tag.tagname.startswith(text)

        fnd = []
        fle = open(self.filename, 'r')
        one = self._findKey(fle, text, matcher=matcher)
        if one is not None:
            #try to find the first occurrence
            first = one
            diff = 1024 #one entry should be max 512
            while matcher(first, text) and (first.fpos>0):
                first = self._readline(fle, first.fpos - diff, stat)
                diff = min(diff*2, 10240)

            while (not matcher(first, text)):
                first = self._readline(fle, stat=stat)

            while (matcher(first, text) and len(fnd) < maxcount):
                #we care here only on unique tagnames
                if not fnd:
                    fnd.append(first)
                elif fnd[-1].tagname != first.tagname:
                    fnd.append(first)
                first = self._readline(fle, stat=stat)

        return fnd

    def getDefinitions(self, text, stat):
        """get ALL definitions for a given token"""
        fnd = []
        fle = open(self.filename, 'r')
        one = self._findKey(fle, text, stat=stat)
        if one is not None:
            #try to find the first occurrence
            first = one
            diff = 1024 #one entry should be max 512
            while (first.tagname == text) and (first.fpos>0):
                first = self._readline(fle, first.fpos - diff, stat)
                diff = min(diff*2, 10240)

            while (first.tagname != text):
                first = self._readline(fle, stat=stat)

            while (first.tagname == text):
                fnd.append(first)
                first = self._readline(fle, stat=stat)

        #put class and def's first
        fnd.sort(
            key=lambda item:(
                '0' if ('class' in item.taginfo
                        or 'def' in item.taginfo
                        or 'function' in item.taginfo) else '1')+item.taginfo)

        return fnd


MESSAGE = 'default'

TAGFILES = None
FILETOTAGMAP = None
TAGFILE = 'tags'
PREFIXES = ''

class koCTags:
    if components:
        _com_interfaces_ = components.interfaces.nsIPykoCTags
    _reg_clsid_ = "{22a03430-9dff-11df-981c-0800200c9a66}"
    _reg_contractid_ = "@pyte.hu/koCTags;1"

    def _tagFileExists(self, path):
        tagFile = os.path.join(path, TAGFILE)
        if os.path.exists(tagFile) and os.path.isfile(tagFile):
            return tagFile

        for prefix in PREFIXES.split(';'):
            if (((sys.platform == 'win32') and (prefix[1:2] == ':\\'))
                or prefix.startswith('/')):

                #this is an absolute path
                tagFile = os.path.join(prefix, TAGFILE)
                if os.path.exists(tagFile) and os.path.isfile(tagFile):
                    return tagFile

            tagFile = os.path.join(path, prefix, TAGFILE)
            if os.path.exists(tagFile) and os.path.isfile(tagFile):
                return tagFile

        return ''

    def _findTagsFile(self, fileName):
        global FILETOTAGMAP
        if FILETOTAGMAP is None:
            FILETOTAGMAP = {}

        try:
            return FILETOTAGMAP[fileName]
        except KeyError:
            pass

        tagPath = os.path.dirname(fileName)
        oldPath = tagPath
        tagFile = self._tagFileExists(tagPath)
        while not tagFile:
            tagPath = os.path.dirname(tagPath)
            if not tagPath or tagPath == oldPath:
                return None
            oldPath = tagPath
            tagFile = self._tagFileExists(tagPath)

        FILETOTAGMAP[fileName] = tagFile

        return tagFile

    def _openTagsFile(self, tagFile):
        global TAGFILES
        if TAGFILES is None:
            TAGFILES = {}

        try:
            tags = TAGFILES[tagFile]
            lastmod = os.stat(tagFile)[stat.ST_MTIME]
            if lastmod == tags.lastmod:
                return tags
        except KeyError:
            pass

        try:
            tags = CTagFile(tagFile)
        except ValueError, e:
            log.warn("%s: %r" %(tagFile, e))
            return None
        TAGFILES[tagFile] = tags

        return tags

    def getCompletion(self, fileName, text, maxcount):
        stat = Stats()

        log.debug('called getCompletion')

        tagFile = self._findTagsFile(fileName)
        if tagFile is None:
            return []
        tags = self._openTagsFile(tagFile)

        if tags is None:
            return []

        fnd = tags.getCompletion(text, maxcount, stat)
        rv = [item.tagname for item in fnd]

        stat.finish()
        return rv

    def getDefinitions(self, fileName, text, tagFileNameIn=''):
        stat = Stats()

        log.debug('called getDefinitions with %s %s %s' % (
            fileName, text, tagFileNameIn) )

        if tagFileNameIn:
            tagFile = tagFileNameIn
        else:
            tagFile = self._findTagsFile(fileName)
        log.debug('getDefinitions tagFile=%s', tagFile)

        if tagFile is None:
            return '', []
        tags = self._openTagsFile(tagFile)

        if tags is None:
            return '', []

        fnd = tags.getDefinitions(text, stat)
        log.debug('getDefinitions len(fnd)=%s', len(fnd))

        stat.finish()
        return tagFile, fnd

    def pushSettings(self, tagFileName, tagFilePrefix):
        log.debug('pushSettings %s %s' % (tagFileName, tagFilePrefix))

        global PREFIXES
        PREFIXES = tagFilePrefix

        global TAGFILE
        if tagFileName:
            TAGFILE = tagFileName
        else:
            TAGFILE = 'tags'

    #def globol(self, message):
    #    log.debug('called globol')
    #    try:
    #        global MESSAGE
    #        rv = MESSAGE
    #        MESSAGE = message
    #        return rv
    #    except:
    #        exc = traceback.format_exc()
    #        if exc:
    #            log.debug('%s', exc)



def test_suite():
    class CtagTestsHuge(unittest.TestCase):
        def setUp(self):
            fname = os.path.join('CVS', 'hugetags')
            if not os.path.exists(fname):
                import bz2
                open(fname, "wb").write(bz2.BZ2File(fname+'.bz2', "rb").read())

            #got to place it here, otherwise it gets into the xpi
            global PREFIXES
            PREFIXES = 'CVS'
            global TAGFILE
            TAGFILE = 'hugetags'

        def testGetDef(self):
            obj = koCTags()

            rv = obj.getDefinitions(__file__, 'ZzZz')
            self.assertEqual(rv[0], 'CVS\\hugetags')
            self.assertEqual(len(rv[1]), 0)

            rv = obj.getDefinitions(__file__, 'EditForm')
            self.assertEqual(len(rv[1]), 1)
            first = rv[1][0]

            #self.assertEqual(first.fpos, 1870341)
            self.assertEqual(first.tagname, 'EditForm')
            self.assertEqual(first.tagfile, '/home/adi/zopefix/z3c.form/src/z3c/form/form.py')

            rv = obj.getDefinitions(__file__, 'Blob')
            self.assertEqual(len(rv[1]), 6)

            for tag in rv[1]:
                self.assertEqual(tag.tagname, 'Blob')

            rv = obj.getDefinitions(__file__, 'Data')
            self.assertEqual(len(rv[1]), 19)

            for tag in rv[1]:
                self.assertEqual(tag.tagname, 'Data')


        def testGetCompl(self):
            obj = koCTags()

            rv = obj.getCompletion(__file__, 'ZzZz', 100)
            self.assertEqual(len(rv), 0)

            rv = obj.getCompletion(__file__, 'EditForm', 100)
            self.assertEqual(len(rv), 1)
            first = rv[0]

            self.assertEqual(first, 'EditForm')

            rv = obj.getCompletion(__file__, 'Bucket', 10)
            self.assertEqual(len(rv), 10)

            for tag in rv:
                self.assertTrue(tag.startswith('Bucket'))

            self.assertEqual(rv[0], 'Bucket')
            self.assertEqual(rv[1], 'BucketType')
            self.assertEqual(rv[2], 'Bucket_as_mapping')
            self.assertEqual(rv[3], 'Bucket_as_sequence')
            self.assertEqual(rv[4], 'Bucket_deleteNextBucket')
            self.assertEqual(rv[5], 'Bucket_findRangeEnd')
            self.assertEqual(rv[6], 'Bucket_getiter')
            self.assertEqual(rv[7], 'Bucket_grow')
            self.assertEqual(rv[8], 'Bucket_init')
            self.assertEqual(rv[9], 'Bucket_iteritems')


            rv = obj.getCompletion(__file__, 'CommandP', 10)
            self.assertEqual(len(rv), 2)

            self.assertEqual(rv[0], 'CommandProcessor')
            self.assertEqual(rv[1], 'CommandPush')

            rv = obj.getCompletion(__file__, 'Comment', 10)
            self.assertEqual(len(rv), 4)

            self.assertEqual(rv[0], 'Comment')
            self.assertEqual(rv[1], 'CommentHandler')
            self.assertEqual(rv[2], 'CommentPattern')
            self.assertEqual(rv[3], 'CommentTests')


    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(CtagTestsHuge))
    return suite

if __name__ == '__main__':
    import unittest
    unittest.main(defaultTest='test_suite')
