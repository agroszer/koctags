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
# Davide Ficano.
# Portions created by the Initial Developer are Copyright (C) 2008
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   Davide Ficano <davide.ficano@gmail.com>
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
function DafizillaPrefs(prefix) {
    if (prefix) {
        this.prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService)
            .getBranch(prefix);
        this.prefBranch.QueryInterface(Components.interfaces.nsIPrefBranch2);
    }
}
    
DafizillaPrefs.prototype = {
    getString : function(prefName, defValue) {
        var prefValue;
        try {
            prefValue = this.prefBranch.getCharPref(prefName);
        } catch (ex) {
            prefValue = null;
        }
        return prefValue == null ? defValue : prefValue;
    },
    
    setString : function(prefName, prefValue) {
        this.prefBranch.setCharPref(prefName, prefValue);
    },

    getBool : function(prefName, defValue) {
        var prefValue = false;
        try {
            prefValue = this.prefBranch.getBoolPref(prefName);
        } catch (ex) {
            if (defValue != undefined) {
                prefValue = defValue;
            }
        }

        return prefValue;
    },

    setBool : function(prefName, prefValue) {
        this.prefBranch.setBoolPref(prefName, prefValue);
    },
    
    load : function() {
    },

    save : function() {
    }
}

DafizillaPrefs.safeInt = function(value, defValue, checkCallback) {
    var tmpValue;

    if (typeof(value) == "number") {
        tmpValue = value;
    } else {
        tmpValue = parseInt(value);
        if (isNaN(tmpValue)) {
            return defValue;
        }
    }

    if (typeof(checkCallback) == "function") {
        if (!checkCallback(tmpValue)) {
            return defValue;
        }
    }
    return tmpValue;
}

/////////////
/// List of checkers routines
/////////////

DafizillaPrefs.checkers = {};
DafizillaPrefs.checkers.checkGreaterOrEqualThan = function(value, greaterThanValue) {
    return value >= greaterThanValue;
}
