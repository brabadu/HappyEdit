/**
 * List that provides auto complete/suggest functionality. It is specially
 * designed for file names, so that for example "main.js" will match
 * "scripts/main.js".
 */
function AutoSuggestableFileList(data) {
    var self = this;
    self.data = null;
    self.trie = {};
    
    self.load = function(data) {
        self.data = data;
        self.index();
    };
    
    /**
     * Indexes the passed in filename.
     */
    self._makeAutoSuggestable = function(filename) {
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
    };
    
    /**
     * (Re)indexes the source data array.
     */
    self.index = function() {
        self.data.forEach(function(filename, i) {
            self._makeAutoSuggestable(filename);
        });
    };
    
    /**
     * Returns a list of keys in a hash and its subhases.
     */
    self.getKeys = function(hash) {
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
    };
    
    /**
     * Returns a list of suggestions for a passed in input string.
     */
    self.getSuggestions = function(q) {
        var i;
        var key = '';
        var hash = self.trie;
    
        for (i = 0; i < q.length; i += 1) {
            key += q[i];
            hash = hash[key];
            if (i === q.length - 1) {
                return self.getKeys(hash);
            }
        }
    };
}
