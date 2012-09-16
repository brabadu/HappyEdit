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
    
    /**
     * Gets a list of auto completions in the format expected by the
     * CommandLine
     */
    getSuggestions: function(q) {
        var suggestions = [];
        var i;
        var autoCompletions = this.autoSuggestList.getSuggestions(q);
        var autoCompletion;
        for (i = 0; i < autoCompletions.length; i += 1) {
            autoCompletion = autoCompletions[i];
            var split = autoCompletion.split(PATH_SEPARATOR);
            suggestions.push({
                title: split.pop(),
                extra: capFileName(autoCompletion, 60 - HOST.length) + ' @ ' + HOST,
                rel: autoCompletion,
                onclick: CommandLine.fileSuggestionClickCallback
            });
        }
        return suggestions;
    }
};
