/**
 * System to retrieve file list from a remote server.
 */
var ProjectFiles = {
    trie: null,
    
    init: function() {
        var self = this;
        var xhr = new XMLHttpRequest();
        var url = HOST + '/files';
        
        self.trie = {};
    
        /*if (ignoredExtensions) {
            url = HOST + '/files?ignored_extensions=' + ignoredExtensions.join(',');
        }*/
    
        xhr.open("GET", url);
    
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.responseText) {
                    var json = JSON.parse(xhr.responseText);
                    json.forEach(function(filename, i) {
                        self.makeAutoSuggestable(filename);
                    });
                }
            }
        };
    
        xhr.send();
    },
    
    makeAutoSuggestable: function(filename) {
        var self = this;
        var parts;
    
        function add(filename, fullFileName, isLastPart) {
            var i = 0;
            var key = '';
            var hash = self.trie;
    
            for (i = 0; i < filename.length; i += 1) {
                key += filename[i];
                if (!hash.hasOwnProperty(key)) {
                    hash[key] = {};
                }
                hash = hash[key];
    
                if (i === filename.length - 1 && isLastPart) {
                    hash['fullFileName'] = fullFileName;
                }
            }
        }
    
        add(filename, filename, true);
        parts = filename.split('/');
        parts.forEach(function(part, i) {
            add(part, filename, i === (parts.length - 1));
        });
    },
    
    getKeys: function(hash) {
        var self = this;
        var ret = [];
        var key = '';
    
        for (key in hash) {
            if (hash.hasOwnProperty(key)) {
                if (typeof(hash[key]) === 'string') {
                    ret.push(hash[key]);
                } else {
                    ret = ret.concat(self.getKeys(hash[key]));
                }
            }
        }
    
        return ret;
    },
    
    getAutoSuggestions: function(inputText) {
        var self = this;
        var i;
        var key = '';
        var hash = self.trie;
    
        for (i = 0; i < inputText.length; i += 1) {
            key += inputText[i];
            hash = hash[key];
            if (i === inputText.length - 1) {
                return self.getKeys(hash);
            }
        }
    }
};
