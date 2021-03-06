/*
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
*/

var gKoCtagslog          = ko.logging.getLogger("ko.extensions.koctags")

const DELIMITER_LEFT = ' "'+"'({[<,:"
const DELIMITER_ANY = DELIMITER_LEFT + ")}]>;"

// XXX: refactor the whole class to "ko.extensions.koctags" later
var gKoCtags = {
    searchPattern : "",
    prefs : new CTagsPrefs(),
    contentDocument: null,
    treeView : null,

    getElement : function(name) {
        try {
            return this.contentDocument.getElementById(name)
        } catch (e) {
            gKoCtagslog.exception(e);
        }
        return null;
    },

    onGetDefinitionsBottomButton : function() {
        try {
            //alert('onGetDefinitionsBottomButton');
            gKoCtags.getElement("koctags-bottomtab-filter").value = '';
            var text = this.getElement("koctags-bottomtab-findtext").value;
            var filename = ko.views.manager.currentView.koDoc.displayPath;
            //alert(filename+" "+text);
            this.treeView.fillArray(text, filename, '');
            this.treeView.refresh();
        } catch (e) {
            gKoCtagslog.exception(e);
        }
    },

    onOpenFileBottomButton : function(event) {
      try {
        var fname = ko.filepicker.openFile();
        if (fname) {
            this.getElement("koctags-bottomtab-filename").value = fname;
            this.getElement("koctags-bottomtab-pinTagFile").checked = true;
            this.prefs.pinTagFile = true;
        }
      } catch (e) {
          gKoCtagslog.exception(e);
      }
    },

    onClearFileBottomButton : function(event) {
      try {
        this.getElement("koctags-bottomtab-filename").value = '';
      } catch (e) {
        gKoCtagslog.exception(e);
      }
    },

    onPinBottomButton : function(event) {
      try {
        var pin = this.getElement("koctags-bottomtab-pinTagFile").checked;
        this.prefs.pinTagFile = pin;
      } catch (e) {
          gKoCtagslog.exception(e);
      }
    },

    onFindKeypress : function(event) {
        try {
            if(event.keyCode == 13) {
                this.onGetDefinitionsBottomButton();
            }
        } catch (e) {
            gKoCtagslog.exception(e);
        }
    },

    onTreeDblClick : function() {
        try {
            var fileName = this.treeView.currentSelectedItem.tagfile;
            var pos = this.treeView.currentSelectedItem.taginfo;

            this.openFileWithPosition(fileName, pos);
        } catch (e) {
            gKoCtagslog.exception(e);
        }
    },

    onTreeKeypress : function(event) {
        try {
            if(event.keyCode == 13) {
                this.onTreeDblClick();
            }
        } catch (e) {
            gKoCtagslog.exception(e);
        }
    },

    escapeRegExp : function(text) {
        //no whitespace escaping here
        return text.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&");
    },

    openFileWithPosition : function(fileName, pos) {
        try {
            this.openfile(fileName, function(view) {
                if (!view) {return;}

                try {
                    if (pos.slice(0, 2) == '/^') {
                        //this is a find-position
                        if (pos.indexOf(';"') >= 0) {
                            // cut crap
                            pos = pos.substr(0, pos.indexOf(';"'));
                        }
                        // cut both slashes and ^$
                        pos = pos.slice(2, pos.length-2);
                        pos = gKoCtags.escapeRegExp(pos);
                        pos = "^"+pos+"$";
                        //alert(pos);

                        var findit = new RegExp(pos, "gm");
                        //alert(ko.views.manager.currentView.document.displayPath);
                        var mymatch = findit.exec(ko.views.manager.currentView.scimoz.text);

                        if (mymatch) {
                            var fndpos = mymatch.index;
                            //alert('found at '+fndpos);

                            //ko.statusBar.AddMessage(
                            //    "found at: "+fndpos,
                            //    "open_errs", 3000, true);

                            ko.views.manager.currentView.scimoz.gotoPos(fndpos);
                            ko.views.manager.currentView.scimoz.scrollCaret();
                        } else {
                            //alert('no match found');
                            ko.statusBar.AddMessage(
                                "no match found: "+pos,
                                "open_errs", 3000, true);
                        }
                    } else {
                        try {
                            var posint = parseInt(pos);
                        } catch (e) {
                            var posint = null;
                        }
                        if (typeof(posint) == "number") {
                            //this is a line number
                            ko.views.manager.currentView.scimoz.gotoLine(posint);
                        }
                    }
                    //alert("view opened "+ko.views.manager.currentView.document.displayPath+
                    //      " "+pos);
                } catch (e) {
                    gKoCtagslog.exception(e);
                }
            });

        } catch (e) {
            gKoCtagslog.exception(e);
        }
    },

    fileExists : function(fname) {
        var fileSvc = Components.classes["@activestate.com/koFileService;1"].
          getService();
        var file = fileSvc.getFileFromURI(fname);
        return (file.exists);
    },

    getFullFilename : function(fname, prefs) {
        try {
            if (!prefs) {
                prefs = Components.classes["@activestate.com/koPrefService;1"].
                            getService(Components.interfaces.koIPrefService).effectivePrefs;
            }
            var mapping = null;
            if (prefs.hasPrefHere('mappedPaths'))
                mapping = prefs.getStringPref('mappedPaths');
            if (!mapping) {
            // try all pref layers for a match
                if (prefs.parent) {
                    return this.getFullFilename(fname, prefs.parent);
                }
                return "";
            }
            var paths = mapping.split('::');
            var myregexp = new RegExp('^((file|ftp|ftps|sftp|scp)://.*?)/.*', "gim");
            var seen = '##';

            for (var i = 0; i < paths.length; i++) {
                var data = paths[i].split('##');
                var mymatch = myregexp.exec(data[0]);

                if (mymatch) {
                    if (seen.indexOf("##"+mymatch[1]+"##")== -1) {
                        //alert(mymatch[1]);
                        //localname = ko.uriparse.pathToURI(mymatch[1]+fname);
                        localname = ko.uriparse.getMappedURI(mymatch[1]+fname);

                        //alert(localname)

                        if (this.fileExists(localname)) {
                            //alert("have it");
                            return localname
                        }
                        seen = seen + mymatch[1]+"##";
                    }
                }
            }
            // this layer had mappings, but none matched, look at parent prefs
            if (prefs.parent) return this.getFullFilename(fname, prefs.parent);

        } catch (e) {
            gKoCtagslog.exception(e);
        }
        return "";
    },

    openfile : function(fname, callback) {
        var localname = "file://"+fname;
        if (this.fileExists(localname)) {
            //alert(localname);
            ko.open.URI(localname, null, false, callback);
            return true;
        } else {
            localname = this.getFullFilename(fname);
            //alert(localname);
            if (localname) {
                //alert(localname);
                ko.open.URI(localname, null, false, callback);
                return true;
            }
        }

        ko.statusBar.AddMessage(
                "Can't open or map file: "+fname,
                "open_errs", 3000, true);

        return false;
    },

    findHint : function () {
        var ke = ko.views.manager.currentView.scimoz;
        var curinsert = ke.currentPos;
        var curlpos = ke.lineFromPosition(curinsert);
        var linestart = ke.positionFromLine(curlpos);
        var lineend = ke.getLineEndPosition(curlpos);
        var security = 1024;
        var found = false;
        var lmove = 0;
        var startpos = 0;
        var endpos = 0;
        while ((lmove < security) && !found) {
            var lchar = ke.getWCharAt(curinsert - lmove);
            var lidx = DELIMITER_LEFT.indexOf(lchar);
            if ((lidx > -1) || ((curinsert - lmove + 1) == linestart)) {
                startpos = curinsert - lmove+1;
                var txt = ke.getTextRange(startpos, curinsert);
                //alert('x'+txt);
                found = true;
            }
            lmove += 1;
        }

        if (!found) {
            return '';
        }

        found = false;
        var rmove = 0;
        while ((rmove < security) && !found) {
            var lchar = ke.getWCharAt(curinsert + rmove);
            var lidx = DELIMITER_ANY.indexOf(lchar);
            if ((lidx > -1) || ((curinsert + rmove) == lineend)) {
                endpos = curinsert + rmove;
                var txt = ke.getTextRange(startpos, endpos);
                //alert('x'+txt);
                found = true;
                return txt;
            }
            rmove += 1;
        }

        return '';
    },

    waitForTab : function() {
        // First make sure the tab widget exists ,and then verify the tree is loaded.
        ko.widgets.getWidgetAsync('koctags_ctags_tab', function() {
            var delayFunc;
            var limit = 20; // iterations
            var delay = 200;  // time in msec
            delayFunc = function(tryNum) {
                try {
                    var tab = ko.widgets.getWidget("koctags_ctags_tab");
                    if (tab.contentDocument.getElementById("koctags-ctags-tree")) {
                        gKoCtags.onLoadWithTab(tab);
                        return;
                    }
                } catch(ex) {
                    //gKoCtagslog.exception(ex);
                    //gKoCtagslog.info("waitForTab: Failure: " + tryNum + ": "  + ex);
                };
                if (tryNum < limit) {
                    setTimeout(delayFunc, delay, tryNum + 1);
                } else {
                    gKoCtagslog.error("waitForTab: Gave up");
                }
            }
            setTimeout(delayFunc, delay, 0);
        });
    },

    onLoad : function() {
        this.waitForTab();
    },

    onLoadWithTab : function(tab) {
        try {
            //window.openDialog('chrome://global/content/console.xul', '_blank'); // debug console

            // push ourselves into the ko-pane
            this.contentDocument = tab.contentDocument;
            tab.contentWindow.gKoCtags = this;

            this.treeView = new CTagsTreeView(this.getElement("koctags-ctags-tree"));
            //gKoCtagslog.warn("this.treeView filled with"+ this.treeView);

            this.CTagSvc = Components.classes["@pyte.hu/koCTags;1"].
                    getService(Components.interfaces.nsIPykoCTags);

            this.prefsChanged();

            var obs = DafizillaCommon.getObserverService();
            obs.addObserver(this, "koctags_pref_changed", false);

            this.addListeners();

        } catch (e) {
            gKoCtagslog.exception(e);
        }
    },

    onUnLoad : function() {
        try {
            //alert("onUnLoad");

            var obs = DafizillaCommon.getObserverService();
            obs.removeObserver(this, "koctags_pref_changed");

            this.removeListeners();
        } catch (e) {
            gKoCtagslog.exception(e);
        }
    },

    observe : function(subject, topic, data) {
        try {
            switch (topic) {
                case "koctags_pref_changed":
                    this.prefsChanged(subject, data);
                    break;
            }
        } catch (e) {
            gKoCtagslog.exception(e);
        }
    },

    onGetDefinitionsHotkey : function(event) {
        try {
            //alert('onGetDefinitionsHotkey');
            gKoCtags.getElement("koctags-bottomtab-filter").value = '';
            var ke = ko.views.manager.currentView.scimoz;
            if (ke.selectionEnd == ke.selectionStart) {
                // if nothing selected
                var text = ko.interpolate.getWordUnderCursor();
                var hint = gKoCtags.findHint();
            } else {
                var text = ko.interpolate.interpolateStrings('%s');
                var hint = '';
            }
            var filename = ko.views.manager.currentView.koDoc.displayPath;
            //alert("hotkey "+text);

            this.treeView.fillArray(text, filename, hint);
            this.treeView.refresh();
        } catch (e) {
            gKoCtagslog.exception(e);
        }
    },

    prefsChanged : function(subject, data) {
        try {
            //alert("prefsChanged");

            this.prefs = new CTagsPrefs();

            this.CTagSvc.pushSettings(this.prefs.tagFileName,
                                      this.prefs.tagFilePrefix,
                                      this.prefs.reuseLastTagFile);

            this.getElement("koctags-bottomtab-pinTagFile").checked = this.prefs.pinTagFile;
        } catch (e) {
            gKoCtagslog.exception(e);
        }
    },

    addListeners : function() {
        var self = this;
    },

    removeListeners : function() {
    }
}

try {
    //window.addEventListener("load", function(event) { gKoCtags.onLoad(event); }, false);
    //window.addEventListener("load",
    //                        function(event) { setTimeout("gKoCtags.onLoad()", 3000); },
    //                        false);

    if ("getWidgetAsync" in ko.widgets) {
        ko.widgets.getWidgetAsync("koctags_ctags_tab",
            function(widget) {
                gKoCtags.onLoad(); }
        );
    } else {
        //addEventListener("load", function() { gKoCtags.onLoad(); } );
        window.setTimeout(function() {
            window.alert("this version of KO is not supported ko.widgets.getWidgetAsync missing");
        }, 10000);

    }

    window.addEventListener("unload", function(event) { gKoCtags.onUnLoad(event); }, false);
} catch (e) {
    gKoCtagslog.exception(e);
}


function CTagsTreeView(treeElement) {
    this.treeElement = treeElement;
    this.allItems = [];
    this.items = [];

    this.treebox = null;

    this.treeElement.view = this;
}

CTagsTreeView.prototype = {
    fillArray : function(text, fileName, hint) {
        if (hint) {
            ko.statusBar.AddMessage(
                "Hint: "+hint,
                "open_errs", 3000, true);

        }

        var tagFileNameOut = {};
        var tags = {};
        var count = {};

        var pin = gKoCtags.getElement("koctags-bottomtab-pinTagFile").checked;
        if (pin) {
          var tagFileNameIn = gKoCtags.getElement("koctags-bottomtab-filename").value;
        } else {
          var tagFileNameIn = '';
        }

        gKoCtags.CTagSvc.getDefinitions(
                                        fileName,
                                        text,
                                        hint,
                                        tagFileNameIn,
                                        tagFileNameOut,
                                        count,
                                        tags
                                        );
        //var itemCount = count.value;
        var newItems = tags.value;
        var tagFile = tagFileNameOut.value;

        gKoCtags.getElement("koctags-bottomtab-findtext").value = text;
        gKoCtags.getElement("koctags-bottomtab-filename").value = tagFile;

        //this.treebox.rowCountChanged(0, newItems.length - this.items.length);
        this.allItems = newItems;
        this.filterArray();

        var itemCount = this.items.length;

        if (itemCount == 0) {
            // just a message
            ko.statusBar.AddMessage(
                "No items found",
                "open_errs", 3000, true);

        } else {
            if (itemCount > 1) {
                //open the bottom tab
                ko.uilayout.ensureTabShown('koctags_ctags_tab', true);
                gKoCtags.getElement("koctags-ctags-tree").focus();
                this.selectAndEnsureVisible(0);
            }
            if (itemCount == 1 || gKoCtags.prefs.alwaysOpenFirst) {
                //just open the file
                gKoCtags.openFileWithPosition(newItems[0].tagfile,
                                              newItems[0].taginfo)
            }
        }
    },

    filterKeypress : function(event) {
        try {
            this.filterArray();
            if(event.keyCode == 13) {
                gKoCtags.getElement("koctags-ctags-tree").focus();
                this.selectAndEnsureVisible(0);
            }
        } catch (e) {
            gKoCtagslog.exception(e);
        }
    },

    filterArray : function() {
        try {
            var filter = gKoCtags.getElement("koctags-bottomtab-filter").value;
            //var filter='';
            var oldLength = this.items.length;
            //alert("'"+filter+"'");
            if (filter.length == 0) {
                this.items = this.allItems;
                //alert(this.allItems+this.items);
            } else {
                this.items = [];
                for (var i = 0; i < this.allItems.length; i++) {
                    var item = this.allItems[i];
                    if ((item.tagfile.indexOf(filter) !== -1)
                        || (item.taginfo.indexOf(filter) !== -1)) {
                        this.items.push(item);
                    }
                }
            };
            this.treebox.rowCountChanged(0, this.items.length - oldLength);
        } catch (err) {
            alert(err);
        }
    },

    get selectedItems() {
        var ar = [];
        var selIndexes = this.selectedIndexes;

        for (var i = 0; i < selIndexes.length; i++) {
            ar.push(this.items[selIndexes[i]]);
        }

        return ar;
    },

    get selectedIndexes() {
        var selection = this.selection;
        var items = [];

        for (var i = 0; i < selection.getRangeCount(); i++) {
            var minIdx = {};
            var maxIdx = {};
            selection.getRangeAt(i, minIdx, maxIdx);
            for (var selIdx = minIdx.value; selIdx <= maxIdx.value; selIdx++) {
                items.push(selIdx);
            }
        }

        return items;
    },

    deleteItems : function(items) {
        if (items && items.length > 0) {
            for (var i = items.length - 1; i >= 0; i--) {
                this.items.splice(items[i], 1);
            }
            this.treebox.rowCountChanged(items[0], -items.length);
        }
    },

    deleteSelectedItem : function() {
        try {
            var selIdx = this.selection.currentIndex;

            if (selIdx < 0) {
                return;
            }
            var newItems = new Array();

            for (var i = 0; i < this.items.length; i++) {
                if (i != selIdx) {
                    newItems.push(this.items[i]);
                }
            }

            this.items = newItems;
            // -1 means remove (< 0)
            this.treebox.rowCountChanged(selIdx, -1);

            if (newItems.length > 0) {
                this.selection.select(this.rowCount == selIdx ? selIdx - 1 : selIdx);
            }
        } catch (err) {
            alert(err);
        }
    },

    invalidate : function() {
        this.treebox.invalidate();
    },

    get currentSelectedItem() {
        if (this.selection.currentIndex < 0) {
            return null;
        }
        return this.items[this.selection.currentIndex];
    },

    refresh : function() {
        this.selection.clearSelection();
        this.treebox.invalidate();
    },

    selectAndEnsureVisible : function(index) {
        this.selection.select(index);
        this.treebox.ensureRowIsVisible(index);
    },

    getCellText : function(row, column) {
        switch (column.id || column) {
            case "koctags_ctags-filename":
                return this.items[row].tagfile
            case "koctags_ctags-taginfo":
                return this.items[row].taginfo;
        }

        return "";
    },

    get rowCount() {
        return this.items.length;
    },

    cycleCell: function(row, column) {},

    getImageSrc: function (row, column) {
        return null;
    },

    setTree: function(treebox) {
        this.treebox = treebox;
    },

    isContainerOpen: function(index) {},
    isContainerEmpty: function(index) {},
    canDrop: function(index, orientation, dataTransfer) {},
    drop: function(row, orientation, dataTransfer) {},
    getParentIndex: function(rowIndex) {},
    hasNextSibling: function(rowIndex, afterIndex) {},
    getProgressMode: function(row, col) {},
    getCellValue: function(row, col) {},
    toggleOpenState: function(index) {},
    selectionChanged: function() {},
    isEditable: function(row, col) {},
    isSelectable: function(row, col) {},
    setCellValue: function(row, col, value) {},
    setCellText: function(row, col, value) {},
    performAction: function(action) {},
    performActionOnRow: function(action, row) {},
    performActionOnCell: function(action, row, col) {},
    getCellProperties: function(row, column, props) {},
    cycleHeader: function(col, elem) {},
    isContainer: function(row){ return false; },
    isSeparator: function(row){ return false; },
    isSorted: function(row){ return false; },
    getLevel: function(row){ return 0; },
    getRowProperties: function(row,props){},
    getColumnProperties: function(colid,col,props){}
};


// var svc= Components.classes["@pyte.hu/koCTags;1"]. getService(Components.interfaces.nsIPykoCTags);
//svc.getDefinitions('g:\\refline\\packages\\branches\\py26\\smart\\src\\smart\\api.py', 'Interface', '', o1, o2, o3);
