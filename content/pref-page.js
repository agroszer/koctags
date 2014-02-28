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
*/

var prefs = new CTagsPrefs();

var tagFileNameWidget;
var tagFilePrefixWidget;
var pinTagFileWidget;
var alwaysOpenFirstWidget;

function OnPreferencePageOK(prefset) {
    prefs.tagFileName = tagFileNameWidget.value;
    prefs.tagFilePrefix = tagFilePrefixWidget.value;
    prefs.pinTagFile = pinTagFileWidget.checked;
    prefs.alwaysOpenFirst = alwaysOpenFirstWidget.checked;

    prefs.save();
    var obs = DafizillaCommon.getObserverService();
    obs.notifyObservers(null, "koctags_pref_changed", null);
    return true;
}

function OnPreferencePageInitalize(prefset) {
    tagFileNameWidget = document.getElementById("tagFileName");
    tagFilePrefixWidget = document.getElementById("tagFilePrefix");
    pinTagFileWidget = document.getElementById("pinTagFile");
    alwaysOpenFirstWidget = document.getElementById("alwaysOpenFirst");
}

function OnPreferencePageLoading(prefset) {
    prefs.load();
    tagFileNameWidget.value = prefs.tagFileName;
    tagFilePrefixWidget.value = prefs.tagFilePrefix;
    pinTagFileWidget.checked = prefs.pinTagFile;
    alwaysOpenFirstWidget.checked = prefs.alwaysOpenFirst;
}

function CTagsPreferencesOnLoad() {
    parent.hPrefWindow.onpageload();
}
