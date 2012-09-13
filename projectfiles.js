/**
 * System to retrieve file list from a remote server.
 */
var ProjectFiles = {
    autoSuggestList: null,
    
    init: function() {
        var self = this;
        var xhr = new XMLHttpRequest();
        var url = HOST + '/files';
        
        self.autoSuggestList = new AutoSuggestableFileList();
    
        /*if (ignoredExtensions) {
            url = HOST + '/files?ignored_extensions=' + ignoredExtensions.join(',');
        }*/
    
        xhr.open("GET", url);
    
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.responseText) {
                    var json = JSON.parse(xhr.responseText);
                    self.autoSuggestList.load(json);
                }
            }
        };
    
        xhr.send();
    },
    
    getSuggestions: function(q) {
        return this.autoSuggestList.getSuggestions(q);
    }
};
